import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Maximize2, Minimize2, Upload, Play, Pause } from 'lucide-react';
import { WorkerAlertItem } from './SquareAlertGrid';

export interface CameraConfig {
  id: number;
  name: string;
  type: 'video' | 'cctv' | 'webcam';
  source: string | number;
}

interface MultiCameraFeedProps {
  fullscreenCamId: number | null;
  onToggleFullscreen: (camId: number | null) => void;
  onOpenSourceModalForCam: (camId: number) => void;
  onWorkersDetected: (workers: WorkerAlertItem[], hasHazard: boolean, hazardInfo: string) => void;
  configs: CameraConfig[];
}

export const MultiCameraFeed: React.FC<MultiCameraFeedProps> = ({
  fullscreenCamId,
  onToggleFullscreen,
  onOpenSourceModalForCam,
  onWorkersDetected,
  configs
}) => {
  const activeConfigs = fullscreenCamId !== null
    ? configs.filter((c) => c.id === fullscreenCamId)
    : configs;

  return (
    <div className={`multi-cam-container ${fullscreenCamId !== null ? 'fullscreen-mode' : 'grid-mode'}`}>
      {activeConfigs.map((cfg) => (
        <SingleCameraSlot
          key={cfg.id}
          config={cfg}
          isFullscreen={fullscreenCamId === cfg.id}
          onToggleFullscreen={() => {
            onToggleFullscreen(fullscreenCamId === cfg.id ? null : cfg.id);
          }}
          onChangeSource={() => onOpenSourceModalForCam(cfg.id)}
          onInferenceResults={(workers, hasHazard, hazardInfo) => {
            onWorkersDetected(workers, hasHazard, hazardInfo);
          }}
        />
      ))}
    </div>
  );
};

interface SingleCameraSlotProps {
  config: CameraConfig;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onChangeSource: () => void;
  onInferenceResults: (workers: WorkerAlertItem[], hasHazard: boolean, hazardInfo: string) => void;
}

const SingleCameraSlot: React.FC<SingleCameraSlotProps> = ({
  config,
  isFullscreen,
  onToggleFullscreen,
  onChangeSource,
  onInferenceResults
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isInferencing, setIsInferencing] = useState<boolean>(false);
  const [detectedBoxes, setDetectedBoxes] = useState<any[]>([]);
  const [hazardBoxes, setHazardBoxes] = useState<any[]>([]);

  // Setup video or webcam stream
  useEffect(() => {
    let active = true;

    if (config.type === 'webcam') {
      navigator.mediaDevices
        ?.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: false
        })
        .then((stream) => {
          if (!active) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          webcamStreamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
            setIsPlaying(true);
          }
        })
        .catch(() => {});
    } else {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach((t) => t.stop());
        webcamStreamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = typeof config.source === 'string' ? config.source : '/data/demo_factory.mp4';
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }

    return () => {
      active = false;
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach((t) => t.stop());
        webcamStreamRef.current = null;
      }
    };
  }, [config.type, config.source]);

  // Frame Inference Loop
  const runInference = useCallback(async () => {
    if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;
    if (isInferencing) return;

    try {
      const v = videoRef.current;
      if (v.videoWidth === 0 || v.videoHeight === 0) return;

      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = 480;
      canvas.height = 270;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (config.type === 'webcam') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
      setIsInferencing(true);

      const res = await fetch('/api/analyze-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: dataUrl,
          camera_id: `cam_0${config.id}`,
          required_ppe: ['helmet', 'vest']
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          const rawWorkers = data.workers || [];
          const rawHazards = data.hazards || [];

          setDetectedBoxes(rawWorkers);
          setHazardBoxes(rawHazards);

          const alertItems: WorkerAlertItem[] = rawWorkers.map((w: any) => ({
            worker_id: w.worker_id,
            cam_id: config.id,
            camera_name: config.name,
            status: w.status || (w.is_compliant ? 'COMPLIANT' : 'PARTIAL'),
            color: w.color || (w.is_compliant ? '#00e676' : '#ffb300'),
            missing_ppe: w.missing_ppe || [],
            worn_ppe: w.worn_ppe || []
          }));

          const hasHaz = rawHazards.length > 0;
          const hazInfo = hasHaz
            ? `Hazard detected on CAM 0${config.id} (${config.name})`
            : '';

          onInferenceResults(alertItems, hasHaz, hazInfo);
        }
      }
    } catch {
      // Backend busy or offline
    } finally {
      setIsInferencing(false);
    }
  }, [config, isInferencing, onInferenceResults]);

  useEffect(() => {
    const interval = setInterval(runInference, 700);
    return () => clearInterval(interval);
  }, [runInference]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  return (
    <div className={`camera-feed-card ${isFullscreen ? 'card-fullscreen' : ''}`}>
      {/* Header bar */}
      <div className="feed-header-bar">
        <div className="feed-title-block">
          <span className="feed-cam-title">{config.name}</span>
          <span className={`feed-type-pill ${config.type}`}>{config.type.toUpperCase()}</span>
        </div>

        <div className="feed-actions-group">
          <button
            className="feed-mini-btn"
            onClick={onChangeSource}
            title="Change video source (Upload file / CCTV RTSP / Live webcam)"
          >
            <Upload size={13} />
            <span>Source</span>
          </button>

          <button
            className="feed-mini-btn"
            onClick={togglePlay}
            title={isPlaying ? 'Pause stream' : 'Play stream'}
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} />}
          </button>

          <button
            className="feed-mini-btn btn-fullscreen"
            onClick={onToggleFullscreen}
            title={isFullscreen ? 'Exit Full Screen' : 'Expand to Full Screen'}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            <span>{isFullscreen ? 'Exit' : 'Full Screen'}</span>
          </button>
        </div>
      </div>

      {/* Video Viewport with Overlay */}
      <div className="feed-viewport-wrapper">
        <video
          ref={videoRef}
          className="feed-video-element"
          autoPlay
          muted
          loop
          playsInline
        />

        {/* Real-Time SVG Overlay for Bounding Boxes */}
        <svg className="feed-svg-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
          {detectedBoxes.map((w, i) => {
            const [x1, y1, x2, y2] = w.box || [0, 0, 0, 0];
            const width = Math.max(0, x2 - x1);
            const height = Math.max(0, y2 - y1);
            const color = w.color || (w.is_compliant ? '#00e676' : '#ffb300');
            const statusLabel =
              w.status === 'COMPLIANT'
                ? `Worker #${w.worker_id} [ALL OK]`
                : w.status === 'MISSING ALL'
                ? `Worker #${w.worker_id} [NO PPE]`
                : `Worker #${w.worker_id} [MISSING: ${(w.missing_ppe || []).join(', ').toUpperCase()}]`;

            return (
              <g key={`box-${i}`}>
                {/* Person Square Bounding Box */}
                <rect
                  x={x1}
                  y={y1}
                  width={width}
                  height={height}
                  fill="none"
                  stroke={color}
                  strokeWidth="0.8"
                  rx="1"
                />
                {/* Tag Banner */}
                <rect
                  x={x1}
                  y={Math.max(0, y1 - 4)}
                  width={Math.min(width * 1.5, 45)}
                  height="3.8"
                  fill={color}
                  rx="0.5"
                />
                <text
                  x={x1 + 1}
                  y={Math.max(2.8, y1 - 1.2)}
                  fill={color === '#ffb300' ? '#000000' : '#ffffff'}
                  fontSize="2.4"
                  fontWeight="bold"
                >
                  {statusLabel}
                </text>
              </g>
            );
          })}

          {/* Hazard Boxes */}
          {hazardBoxes.map((h, i) => {
            const [hx1, hy1, hx2, hy2] = h.box || [0, 0, 0, 0];
            const hw = Math.max(0, hx2 - hx1);
            const hh = Math.max(0, hy2 - hy1);
            return (
              <g key={`haz-${i}`}>
                <rect
                  x={hx1}
                  y={hy1}
                  width={hw}
                  height={hh}
                  fill="rgba(239, 68, 68, 0.2)"
                  stroke="#ef4444"
                  strokeWidth="1"
                  strokeDasharray="2,1"
                />
                <text
                  x={hx1 + 1}
                  y={Math.max(3, hy1 - 1)}
                  fill="#ef4444"
                  fontSize="2.8"
                  fontWeight="bold"
                >
                  HAZARD: {h.hazard_type?.toUpperCase()}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
