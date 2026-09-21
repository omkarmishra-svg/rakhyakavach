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
}

export const HeroLiveFeed: React.FC<HeroLiveFeedProps> = ({
  currentZone,
  allZones: _allZones,
  detections,
  isWebcamActive,
  activeVideoSrc,
  activeVideoName,
  onToggleWebcam,
  onSelectCamera,
  onSelectDetection,
  onCaptureSnapshot,
  onOpenSourceModal,
  onNewIncidentDetected,
  onSelectLiveCamera,
  onSelectCCTV
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

  // Dynamic AI inference detections from backend
  const [aiDetectedWorkers, setAiDetectedWorkers] = useState<any[]>([]);
  const [isInferencing, setIsInferencing] = useState<boolean>(false);

  // Face webcam compliance simulation state
  const [simulatedHelmet, setSimulatedHelmet] = useState<boolean>(true);
  const [simulatedVest, setSimulatedVest] = useState<boolean>(true);
  const [simulatedGoggles, setSimulatedGoggles] = useState<boolean>(true);
  const [snapshotToast, setSnapshotToast] = useState<boolean>(false);

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

          // If there is any non-compliant worker, notify parent
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
      // Backend unavailable or busy; client overlay remains active
    } finally {
      setIsInferencing(false);
    }
  }, [isInferencing, isWebcamActive, currentZone, onNewIncidentDetected]);

  // Schedule periodic frame inference
  useEffect(() => {
    const interval = setInterval(runFrameInference, 600);
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

  // Combine static fallback detections with backend AI detections
  const activeDetectionsToRender = aiDetectedWorkers.length > 0
    ? aiDetectedWorkers.map((w) => ({
        id: `AI-WORKER-${w.worker_id}`,
        type: 'worker' as const,
        worker_id: w.worker_id,
        box: w.box as [number, number, number, number],
        status: w.is_compliant ? ('compliant' as const) : ('violation' as const),
        label: w.is_compliant
          ? `WORKER #${w.worker_id} · COMPLIANT`
          : `WORKER #${w.worker_id} · MISSING ${(w.missing_ppe || []).join(', ').toUpperCase() || 'PPE'}`,
        confidence: 0.88
      }))
    : detections.filter((d) => {
        if (d.type === 'hazard' && !showFire) return false;
        if (d.type === 'worker' && !showPPE) return false;
        return true;
      });

  const isWebcamCompliant = simulatedHelmet && simulatedVest;

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
                ? 'LIVE WEBCAM'
                : activeVideoName !== 'Standard CCTV'
                ? 'UPLOADED VIDEO'
                : currentZone.camera_id}
            </span>
            <span className="cam-separator">·</span>
            <span className="cam-name">
              {isWebcamActive
                ? 'OPERATOR FACE SENTINEL'
                : activeVideoName !== 'Standard CCTV'
                ? activeVideoName
                : currentZone.name}
            </span>
          </div>

          <span
            className={`status-pill ${
              isWebcamActive
                ? isWebcamCompliant
                  ? 'ok'
                  : 'warn'
                : currentZone.status === 'OK'
                ? 'ok'
                : currentZone.status === 'WARN'
                ? 'warn'
                : 'critical'
            }`}
          >
            <span
              className={`status-dot ${
                isWebcamActive
                  ? isWebcamCompliant
                    ? 'ok'
                    : 'warn'
                  : currentZone.status.toLowerCase()
              }`}
            />
            {isWebcamActive
              ? isWebcamCompliant
                ? 'PPE COMPLIANT'
                : 'PPE BREACH DETECTED'
              : currentZone.status === 'OK'
              ? 'SAFE'
              : currentZone.status === 'WARN'
              ? 'PPE WARNING'
              : 'CRITICAL HAZARD'}
          </span>
        </div>

        {/* Video Source Controls: Exactly 1 Live Camera, 1 CCTV, 1 Upload */}
        <div className="feed-camera-selector">
          {/* 1. Live Camera */}
          <button
            className={`cam-switch-btn ${isWebcamActive ? 'active' : ''}`}
            onClick={onSelectLiveCamera || onToggleWebcam}
            title="Single live hardware camera / webcam feed"
          >
            <Camera size={13} style={{ marginRight: '4px' }} />
            Live Camera
          </button>

          {/* 2. CCTV Feed */}
          <button
            className={`cam-switch-btn ${!isWebcamActive && activeVideoName === 'Standard CCTV' ? 'active' : ''}`}
            onClick={onSelectCCTV || (() => onSelectCamera('CCTV'))}
            title="Industrial CCTV surveillance feed"
          >
            <Video size={13} style={{ marginRight: '4px' }} />
            CCTV Feed
          </button>

          {/* 3. Upload Video */}
          <button
            className={`cam-switch-btn ${!isWebcamActive && activeVideoName !== 'Standard CCTV' ? 'active' : ''}`}
            onClick={onOpenSourceModal}
            title="Upload custom factory video"
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

        {/* Webcam Error / Permission Prompt */}
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

        {/* Snapshot Captured Toast Notification */}
        {snapshotToast && (
          <div className="snapshot-toast">
            <Sparkles size={16} />
            <span>Audit Snapshot Captured & Logged!</span>
          </div>
        )}

        {/* 1. CCTV / Uploaded Video Overlay: Real-time Bounding Boxes */}
        {!isWebcamActive && (
          <svg
            className="feed-overlay-canvas"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {activeDetectionsToRender.map((det) => {
              const [x1, y1, x2, y2] = det.box;
              const width = x2 - x1;
              const height = y2 - y1;

              const isHazard = det.status === 'hazard';
              const isViolation = det.status === 'violation';

              const strokeColor = isHazard
                ? 'var(--safety-red)'
                : isViolation
                ? 'var(--safety-amber)'
                : 'var(--safety-green)';

              const bgColor = isHazard
                ? 'rgba(239, 68, 68, 0.18)'
                : isViolation
                ? 'rgba(245, 158, 11, 0.15)'
                : 'rgba(34, 197, 94, 0.08)';

              const isHovered = hoveredDetection === det.id;

              return (
                <g
                  key={det.id}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredDetection(det.id)}
                  onMouseLeave={() => setHoveredDetection(null)}
                  onClick={() => onSelectDetection(det as any)}
                >
                  <rect
                    x={x1}
                    y={y1}
                    width={width}
                    height={height}
                    fill={bgColor}
                    stroke={strokeColor}
                    strokeWidth={isHovered ? '0.8' : '0.45'}
                    rx="1"
                  />

                  {/* Clean Label Pill */}
                  <rect
                    x={x1}
                    y={Math.max(1, y1 - 4.2)}
                    width={Math.max(width * 1.15, 26)}
                    height="4.0"
                    fill={strokeColor}
                    rx="0.8"
                  />
                  <text
                    x={x1 + 1}
                    y={Math.max(1, y1 - 4.2) + 2.8}
                    fill="#000000"
                    fontSize="2.1"
                    fontWeight="800"
                    fontFamily="sans-serif"
                  >
                    {det.label.toUpperCase()}
                  </text>
                </g>
              );
            })}
          </svg>
        )}

        {/* 2. Webcam Mode: Live Face & Operator Sentinel HUD */}
        {isWebcamActive && !webcamError && (
          <div className="webcam-hud-overlay">
            <div
              className={`face-target-box ${
                isWebcamCompliant ? 'compliant' : 'violation'
              }`}
            >
              <span className="corner top-l" />
              <span className="corner top-r" />
              <span className="corner btm-l" />
              <span className="corner btm-r" />

              <div className="target-tag">
                <span className="target-title">WORKER #ME (OPERATOR)</span>
                <span className="target-status">
                  {isWebcamCompliant ? 'COMPLIANT' : 'MISSING REQUIRED PPE'}
                </span>
              </div>

              <div className="target-ppe-indicators">
                <span className={`indicator-pill ${simulatedHelmet ? 'ok' : 'missing'}`}>
                  Hardhat: {simulatedHelmet ? 'Detected' : 'MISSING'}
                </span>
                <span className={`indicator-pill ${simulatedVest ? 'ok' : 'missing'}`}>
                  Safety Vest: {simulatedVest ? 'Detected' : 'MISSING'}
                </span>
                <span className={`indicator-pill ${simulatedGoggles ? 'ok' : 'missing'}`}>
                  Goggles: {simulatedGoggles ? 'Detected' : 'Optional'}
                </span>
              </div>
            </div>

            <div className="face-simulator-bar">
              <span className="sim-title">Test Your Compliance:</span>
              <button
                className={`sim-toggle ${simulatedHelmet ? 'active' : ''}`}
                onClick={() => setSimulatedHelmet(!simulatedHelmet)}
              >
                Helmet: {simulatedHelmet ? 'ON' : 'OFF'}
              </button>
              <button
                className={`sim-toggle ${simulatedVest ? 'active' : ''}`}
                onClick={() => setSimulatedVest(!simulatedVest)}
              >
                Vest: {simulatedVest ? 'ON' : 'OFF'}
              </button>
              <button
                className={`sim-toggle ${simulatedGoggles ? 'active' : ''}`}
                onClick={() => setSimulatedGoggles(!simulatedGoggles)}
              >
                Goggles: {simulatedGoggles ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
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
          >
            <HardHat size={13} />
            <span>Safety Gear Boxes</span>
          </button>

          <button
            className={`clean-toggle-chip ${showFire ? 'active' : ''}`}
            onClick={() => setShowFire(!showFire)}
          >
            <Flame size={13} />
            <span>Fire / Smoke Hazards</span>
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
            title="Take an instant audit evidence snapshot from the live camera"
          >
            <Camera size={13} />
            <span>Capture Evidence</span>
          </button>
        </div>
      </div>
    </section>
  );
};
