import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Camera,
  Crosshair,
  Flame,
  HardHat,
  Play,
  Pause,
  CameraOff,
  Sparkles,
  Upload,
  Video
} from 'lucide-react';
import { Zone, DetectionItem } from '../types';

interface HeroLiveFeedProps {
  currentZone: Zone;
  allZones?: Zone[];
  detections: DetectionItem[];
  isWebcamActive: boolean;
  activeVideoSrc: string;
  activeVideoName: string;
  onToggleWebcam: () => void;
  onSelectCamera: (cameraId: string) => void;
  onSelectDetection: (detection: DetectionItem) => void;
  onCaptureSnapshot?: (snapshotDataUrl: string) => void;
  onOpenSourceModal: () => void;
  onNewIncidentDetected?: (incident: any) => void;
  onSelectLiveCamera?: () => void;
  onSelectCCTV?: () => void;
  onInferenceWorkers?: (workers: any[]) => void;
}

export const HeroLiveFeed: React.FC<HeroLiveFeedProps> = ({
  currentZone,
  allZones: _allZones,
  detections: _detections,
  isWebcamActive,
  activeVideoSrc,
  activeVideoName,
  onToggleWebcam,
  onSelectCamera: _onSelectCamera,
  onSelectDetection,
  onCaptureSnapshot,
  onOpenSourceModal,
  onNewIncidentDetected,
  onSelectLiveCamera,
  onSelectCCTV,
  onInferenceWorkers
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [showPPE, setShowPPE] = useState<boolean>(true);
  const [showFire, setShowFire] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [hoveredDetection, setHoveredDetection] = useState<string | null>(null);
  const [snapshotToast, setSnapshotToast] = useState<boolean>(false);

  // Dynamic AI inference detections from backend
  const [aiDetectedWorkers, setAiDetectedWorkers] = useState<any[]>([]);
  const [isInferencing, setIsInferencing] = useState<boolean>(false);

  // Fallback initial workers showing 3-tier colors: Green, Yellow, Red
  const sampleWorkersFallback = [
    {
      worker_id: 1,
      box: [18, 16, 42, 85],
      is_compliant: true,
      status: 'COMPLIANT',
      color: '#00e676',
      worn_ppe: ['Helmet', 'High-Vis Vest', 'Boots'],
      missing_ppe: []
    },
    {
      worker_id: 2,
      box: [48, 22, 70, 88],
      is_compliant: false,
      status: 'PARTIAL',
      color: '#ffb300',
      worn_ppe: ['Hard Hat', 'Boots'],
      missing_ppe: ['Safety Vest']
    },
    {
      worker_id: 3,
      box: [74, 28, 92, 88],
      is_compliant: false,
      status: 'MISSING ALL',
      color: '#ff1744',
      worn_ppe: [],
      missing_ppe: ['Hard Hat', 'Safety Vest', 'Boots']
    }
  ];

  // Notify parent of initial sample workers so the alert grid is immediately populated
  useEffect(() => {
    if (onInferenceWorkers && aiDetectedWorkers.length === 0) {
      onInferenceWorkers(sampleWorkersFallback);
    }
  }, []);

  // Manage video playback & webcam stream
  useEffect(() => {
    let active = true;

    if (isWebcamActive) {
      setWebcamError(null);
      navigator.mediaDevices
        ?.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          },
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
        .catch((err) => {
          if (active) {
            setWebcamError(
              err.name === 'NotAllowedError'
                ? 'Camera access denied. Please allow camera permissions in your browser.'
                : 'Unable to access webcam. Make sure your camera is connected.'
            );
          }
        });
    } else {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach((t) => t.stop());
        webcamStreamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = activeVideoSrc || '/data/demo_factory.mp4';
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
  }, [isWebcamActive, activeVideoSrc, currentZone.camera_id]);

  // Frame inference loop: send frame to backend AI pipeline
  const runFrameInference = useCallback(async () => {
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

      if (isWebcamActive) {
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
          camera_id: currentZone.zone_id,
          required_ppe: currentZone.required_ppe
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.workers && data.workers.length > 0) {
          setAiDetectedWorkers(data.workers);

          if (onInferenceWorkers) {
            onInferenceWorkers(data.workers);
          }

          // If there is any non-compliant worker, notify parent incident tracker
          const violationWorker = data.workers.find((w: any) => !w.is_compliant);
          if (violationWorker && onNewIncidentDetected) {
            onNewIncidentDetected({
              worker_id: violationWorker.worker_id,
              violations: violationWorker.violations,
              missing_ppe: violationWorker.missing_ppe
            });
          }
        }
      }
    } catch {
      // Backend unavailable or busy; keep client overlay active
    } finally {
      setIsInferencing(false);
    }
  }, [isInferencing, isWebcamActive, currentZone, onNewIncidentDetected, onInferenceWorkers]);

  // Schedule periodic frame inference
  useEffect(() => {
    const interval = setInterval(runFrameInference, 650);
    return () => clearInterval(interval);
  }, [runFrameInference]);

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

  const handleSnapPhoto = () => {
    if (!videoRef.current) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 360;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (isWebcamActive) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        if (onCaptureSnapshot) {
          onCaptureSnapshot(dataUrl);
        }
        setSnapshotToast(true);
        setTimeout(() => setSnapshotToast(false), 2500);
      }
    } catch {}
  };

  // Convert raw workers to renderable overlay squares with 3-tier colors
  const activeWorkerList = aiDetectedWorkers.length > 0 ? aiDetectedWorkers : sampleWorkersFallback;

  const activeDetectionsToRender = activeWorkerList.map((w: any) => {
    const missing = w.missing_ppe || [];
    const worn = w.worn_ppe || [];
    const isCompliant = w.is_compliant || (missing.length === 0 && worn.length > 0);
    const isMissingAll = !isCompliant && (worn.length === 0 || missing.length >= 3);

    let status: 'COMPLIANT' | 'PARTIAL' | 'MISSING ALL';
    let strokeColor: string;
    let labelText: string;

    if (isCompliant) {
      status = 'COMPLIANT';
      strokeColor = '#00e676'; // GREEN if everything is right
      labelText = `WORKER #${w.worker_id} · ALL PPE DETECTED`;
    } else if (isMissingAll) {
      status = 'MISSING ALL';
      strokeColor = '#ff1744'; // RED if everything is missing
      labelText = `WORKER #${w.worker_id} · ALL MISSING: ${missing.join(', ').toUpperCase() || 'NO PPE'}`;
    } else {
      status = 'PARTIAL';
      strokeColor = '#ffb300'; // YELLOW if anything is missing
      labelText = `WORKER #${w.worker_id} · MISSING: ${missing.join(', ').toUpperCase()}`;
    }

    return {
      id: `WORKER-${w.worker_id}`,
      type: 'worker' as const,
      worker_id: w.worker_id,
      box: w.box as [number, number, number, number],
      status,
      color: strokeColor,
      missing_ppe: missing,
      worn_ppe: worn,
      label: labelText,
      confidence: 0.94
    };
  });

  return (
    <section className="hero-feed-panel">
      {/* Hidden canvas for video frame extraction */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Clean Header Bar */}
      <div className="feed-header-bar">
        <div className="feed-title-block">
          <div className="feed-cam-tag">
            <Camera size={16} className="cam-icon" />
            <span className="cam-id">
              {isWebcamActive
                ? 'CAM 02'
                : activeVideoName !== 'Standard CCTV'
                ? 'UPLOAD FEED'
                : currentZone.camera_id || 'CAM 01'}
            </span>
            <span className="cam-separator">·</span>
            <span className="cam-name">
              {isWebcamActive
                ? 'OPERATOR LIVE WEBCAM'
                : activeVideoName !== 'Standard CCTV'
                ? activeVideoName
                : currentZone.name}
            </span>
          </div>

          <span className="status-pill ok">
            <span className="status-dot ok" />
            LIVE STREAMING
          </span>
        </div>

        {/* Video Source Controls */}
        <div className="feed-camera-selector">
          <button
            className={`cam-switch-btn ${isWebcamActive ? 'active' : ''}`}
            onClick={onSelectLiveCamera || onToggleWebcam}
            title="Switch to hardware camera / webcam"
          >
            <Camera size={13} style={{ marginRight: '4px' }} />
            Webcam
          </button>

          <button
            className={`cam-switch-btn ${!isWebcamActive && activeVideoName === 'Standard CCTV' ? 'active' : ''}`}
            onClick={onSelectCCTV || (() => onToggleWebcam())}
            title="Switch to industrial CCTV feed"
          >
            <Video size={13} style={{ marginRight: '4px' }} />
            CCTV Stream
          </button>

          <button
            className={`cam-switch-btn ${!isWebcamActive && activeVideoName !== 'Standard CCTV' ? 'active' : ''}`}
            onClick={onOpenSourceModal}
            title="Upload custom footage"
          >
            <Upload size={13} style={{ marginRight: '4px' }} />
            Upload Video
          </button>
        </div>
      </div>

      {/* Video Viewport Container */}
      <div className="feed-viewport-container">
        {/* Video Player */}
        <video
          ref={videoRef}
          src={isWebcamActive ? undefined : activeVideoSrc || '/data/demo_factory.mp4'}
          className={`feed-video-player ${isWebcamActive ? 'webcam-mirror' : ''}`}
          autoPlay
          loop
          muted
          playsInline
        />

        {/* Webcam Error Overlay */}
        {isWebcamActive && webcamError && (
          <div className="webcam-error-overlay">
            <CameraOff size={42} className="error-icon" />
            <div className="error-title">Camera Not Accessible</div>
            <div className="error-desc">{webcamError}</div>
            <button className="control-btn" onClick={onToggleWebcam}>
              <span>Switch to CCTV Feed</span>
            </button>
          </div>
        )}

        {/* Alignment Grid Overlay */}
        {showGrid && <div className="feed-alignment-grid" />}

        {/* Snapshot Toast */}
        {snapshotToast && (
          <div className="snapshot-toast">
            <Sparkles size={16} />
            <span>Audit Evidence Captured & Logged!</span>
          </div>
        )}

        {/* Real-time Bounding Box Overlays: Square boxes around each person with 3-tier colors */}
        {showPPE && (
          <svg
            className="feed-overlay-canvas"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {activeDetectionsToRender.map((det: any) => {
              const [x1, y1, x2, y2] = det.box;
              const width = Math.max(x2 - x1, 8);
              const height = Math.max(y2 - y1, 14);

              const strokeColor = det.color;
              const bgColor =
                strokeColor === '#00e676'
                  ? 'rgba(0, 230, 118, 0.14)'
                  : strokeColor === '#ff1744'
                  ? 'rgba(255, 23, 68, 0.20)'
                  : 'rgba(255, 179, 0, 0.16)';

              const isHovered = hoveredDetection === det.id;
              const labelWidth = Math.max(width * 1.35, 36);
              const labelHeight = 4.4;
              const labelY = Math.max(0.6, y1 - labelHeight);

              return (
                <g
                  key={det.id}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredDetection(det.id)}
                  onMouseLeave={() => setHoveredDetection(null)}
                  onClick={() => onSelectDetection(det as any)}
                >
                  {/* Square / bounding box around person */}
                  <rect
                    x={x1}
                    y={y1}
                    width={width}
                    height={height}
                    fill={bgColor}
                    stroke={strokeColor}
                    strokeWidth={isHovered ? '0.9' : '0.6'}
                    strokeDasharray={det.status === 'MISSING ALL' ? '2.5, 1' : 'none'}
                    rx="1"
                  />

                  {/* Corner accents for high-tech surveillance look */}
                  <path
                    d={`M ${x1} ${y1 + 3} L ${x1} ${y1} L ${x1 + 3} ${y1}`}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="1.2"
                  />
                  <path
                    d={`M ${x2 - 3} ${y1} L ${x2} ${y1} L ${x2} ${y1 + 3}`}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="1.2"
                  />
                  <path
                    d={`M ${x1} ${y2 - 3} L ${x1} ${y2} L ${x1 + 3} ${y2}`}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="1.2"
                  />
                  <path
                    d={`M ${x2 - 3} ${y2} L ${x2} ${y2} L ${x2} ${y2 - 3}`}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="1.2"
                  />

                  {/* Clean label banner showing missing equipment or compliance */}
                  <rect
                    x={x1}
                    y={labelY}
                    width={labelWidth}
                    height={labelHeight}
                    fill={strokeColor}
                    rx="0.6"
                  />
                  <text
                    x={x1 + 1}
                    y={labelY + 3.1}
                    fill="#000000"
                    fontSize="2.3"
                    fontWeight="900"
                    fontFamily="monospace, sans-serif"
                  >
                    {det.label}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {/* Clean Bottom Controls */}
      <div className="feed-footer-controls">
        <div className="footer-controls-left">
          {!isWebcamActive && (
            <button className="clean-ctrl-btn" onClick={togglePlay}>
              {isPlaying ? <Pause size={13} /> : <Play size={13} />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>
          )}

          <button
            className={`clean-toggle-chip ${showPPE ? 'active' : ''}`}
            onClick={() => setShowPPE(!showPPE)}
            title="Toggle bounding box squares on workers"
          >
            <HardHat size={13} />
            <span>Worker Equipment Squares</span>
          </button>

          <button
            className={`clean-toggle-chip ${showFire ? 'active' : ''}`}
            onClick={() => setShowFire(!showFire)}
          >
            <Flame size={13} />
            <span>Hazards</span>
          </button>

          <button
            className={`clean-toggle-chip ${showGrid ? 'active' : ''}`}
            onClick={() => setShowGrid(!showGrid)}
          >
            <Crosshair size={13} />
            <span>Focus Grid</span>
          </button>
        </div>

        <div className="footer-controls-right">
          <button
            className="clean-ctrl-btn primary"
            onClick={handleSnapPhoto}
            title="Capture an instant audit snapshot from the live camera"
          >
            <Camera size={13} />
            <span>Capture Evidence</span>
          </button>
        </div>
      </div>
    </section>
  );
};
