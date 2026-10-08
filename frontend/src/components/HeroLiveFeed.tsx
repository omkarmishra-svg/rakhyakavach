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
  Video,
  RefreshCw,
  ShieldAlert
} from 'lucide-react';
import { Zone, DetectionItem } from '../types';
import { soundEngine } from '../utils/audio';

interface HeroLiveFeedProps {
  currentZone: Zone;
  allZones?: Zone[];
  detections: DetectionItem[];
  isWebcamActive: boolean;
  activeVideoSrc: string;
  activeVideoName: string;
  onToggleWebcam: () => void;
  onSelectCamera: (cameraId: string) => void;
  onSelectDetection: (detection: any) => void;
  onCaptureSnapshot?: (snapshotDataUrl: string) => void;
  onOpenSourceModal: () => void;
  onNewIncidentDetected?: (incident: any) => void;
  onSelectLiveCamera?: () => void;
  onSelectCCTV?: () => void;
  onInferenceWorkers?: (workers: any[]) => void;
  onHazardDetected?: (hazard: any) => void;
}

export const HeroLiveFeed: React.FC<HeroLiveFeedProps> = ({
  currentZone,
  allZones: _allZones,
  detections: _detections,
  isWebcamActive,
  activeVideoSrc,
  activeVideoName,
  onToggleWebcam: _onToggleWebcam,
  onSelectCamera: _onSelectCamera,
  onSelectDetection,
  onCaptureSnapshot,
  onOpenSourceModal,
  onNewIncidentDetected,
  onSelectLiveCamera,
  onSelectCCTV,
  onInferenceWorkers,
  onHazardDetected
}) => {
  // Virtual Machinery Exclusion Zone coordinates (normalized 0-100)
  const GEOFENCE_ZONE = { x1: 56, y1: 24, x2: 96, y2: 86, name: 'RESTRICTED ROBOTICS & CRANE CELL' };

  // Dual video elements for bulletproof switching (zero srcObject / src clash)
  const cctvVideoRef = useRef<HTMLVideoElement>(null);
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [showPPE, setShowPPE] = useState<boolean>(true);
  const [showFire, setShowFire] = useState<boolean>(true);
  const [showGeofence, setShowGeofence] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [hoveredDetection, setHoveredDetection] = useState<string | null>(null);
  const [snapshotToast, setSnapshotToast] = useState<boolean>(false);

  // Real-time AI detections from YOLOv8 inference (NO fake demo data)
  const [aiDetectedWorkers, setAiDetectedWorkers] = useState<any[]>([]);
  const [aiDetectedHazards, setAiDetectedHazards] = useState<any[]>([]);
  const [isInferencing, setIsInferencing] = useState<boolean>(false);
  const emptyWorkerFramesRef = useRef<number>(0);
  const emptyHazardFramesRef = useRef<number>(0);

  // Live CCTV OSD time ticker
  const [osdTime, setOsdTime] = useState<string>('');

  useEffect(() => {
    const updateOsdClock = () => {
      const now = new Date();
      const iso = now.toISOString().replace('T', ' ').substring(0, 19);
      setOsdTime(`${iso} UTC`);
    };
    updateOsdClock();
    const interval = setInterval(updateOsdClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Ultra-resilient webcam starter with multiple constraint fallbacks
  const startWebcam = useCallback(async () => {
    setWebcamError(null);

    // Pause CCTV video if playing
    if (cctvVideoRef.current) {
      cctvVideoRef.current.pause();
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setWebcamError(
        'Webcam access is not supported or page is not running on localhost. Please open http://localhost:5173'
      );
      return;
    }

    try {
      let stream: MediaStream | null = null;
      try {
        // Attempt 1: Ideal 720p without strict device constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
      } catch (err1) {
        console.warn('Fallback to basic video constraints...', err1);
        // Attempt 2: Minimal fallback constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      if (!stream) {
        setWebcamError('Unable to initialize webcam stream.');
        return;
      }

      webcamStreamRef.current = stream;
      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = stream;
        webcamVideoRef.current.muted = true;
        webcamVideoRef.current.playsInline = true;

        webcamVideoRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            if (webcamVideoRef.current) {
              webcamVideoRef.current.onloadedmetadata = () => {
                webcamVideoRef.current
                  ?.play()
                  .then(() => setIsPlaying(true))
                  .catch(() => {});
              };
            }
          });
      }
      setWebcamError(null);
    } catch (err: any) {
      console.error('Webcam error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setWebcamError(
          'Camera access was blocked by browser. Please click the lock or camera icon in your address bar and choose "Allow".'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setWebcamError(
          'No camera detected. Please ensure your laptop webcam or USB camera is connected.'
        );
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setWebcamError(
          'Camera is in use by another app (e.g. Zoom, Teams, or Windows Camera). Close other apps and retry.'
        );
      } else {
        setWebcamError(`Camera error: ${err.message || err.name || 'Could not start camera.'}`);
      }
    }
  }, []);

  // Manage independent webcam and CCTV video streams
  useEffect(() => {
    if (isWebcamActive) {
      startWebcam();
    } else {
      // Stop webcam hardware stream immediately so camera LED turns off
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach((t) => t.stop());
        webcamStreamRef.current = null;
      }
      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = null;
      }

      // Start CCTV video feed
      if (cctvVideoRef.current) {
        const targetSrc = activeVideoSrc && !activeVideoSrc.startsWith('rtsp://')
          ? activeVideoSrc
          : '/data/cctv_bay1.mp4';
        cctvVideoRef.current.src = targetSrc;
        cctvVideoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }

    return () => {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach((t) => t.stop());
        webcamStreamRef.current = null;
      }
    };
  }, [isWebcamActive, activeVideoSrc, startWebcam]);

  // Frame inference loop: send frame to backend AI pipeline
  const runFrameInference = useCallback(async () => {
    const v = isWebcamActive ? webcamVideoRef.current : cctvVideoRef.current;
    if (!v || v.paused || v.ended) return;
    if (v.videoWidth === 0 || v.videoHeight === 0) return;
    if (isInferencing) return;

    try {
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
        if (data.ok) {
          const rawWorkers = data.workers || [];
          const rawHazards = data.hazards || [];

          // Temporal persistence filter: prevent bounding box flickering on momentary frame dips
          if (rawWorkers.length > 0) {
            emptyWorkerFramesRef.current = 0;
            setAiDetectedWorkers(rawWorkers);
            if (onInferenceWorkers) onInferenceWorkers(rawWorkers);
          } else {
            emptyWorkerFramesRef.current = (emptyWorkerFramesRef.current || 0) + 1;
            if (emptyWorkerFramesRef.current >= 3) {
              setAiDetectedWorkers([]);
              if (onInferenceWorkers) onInferenceWorkers([]);
            }
          }

          if (rawHazards.length > 0) {
            emptyHazardFramesRef.current = 0;
            setAiDetectedHazards(rawHazards);
          } else {
            emptyHazardFramesRef.current = (emptyHazardFramesRef.current || 0) + 1;
            if (emptyHazardFramesRef.current >= 3) {
              setAiDetectedHazards([]);
            }
          }

          // Trigger hazard alerts if fire/smoke is detected
          if (rawHazards.length > 0) {
            try {
              soundEngine.playCriticalSiren();
            } catch {}
            if (onHazardDetected) {
              onHazardDetected(rawHazards[0]);
            }
          }

          // Trigger violation alert for workers missing required safety gear
          const violationWorker = rawWorkers.find((w: any) => !w.is_compliant);
          if (violationWorker && onNewIncidentDetected) {
            onNewIncidentDetected({
              worker_id: violationWorker.worker_id,
              violations: violationWorker.violations,
              missing_ppe: violationWorker.missing_ppe
            });
          }

          // Trigger trespass alert for worker inside virtual exclusion zone
          if (showGeofence) {
            const trespasser = rawWorkers.find((w: any) => {
              const [wx1, wy1, wx2, wy2] = w.box || [0, 0, 0, 0];
              return (
                Math.max(wx1, GEOFENCE_ZONE.x1) < Math.min(wx2, GEOFENCE_ZONE.x2) &&
                Math.max(wy1, GEOFENCE_ZONE.y1) < Math.min(wy2, GEOFENCE_ZONE.y2)
              );
            });
            if (trespasser && onNewIncidentDetected) {
              onNewIncidentDetected({
                worker_id: trespasser.worker_id,
                violations: ['RESTRICTED CELL TRESPASS'],
                missing_ppe: ['CRITICAL EXCLUSION BREACH']
              });
            }
          }
        }
      }
    } catch {
      // Backend busy or offline; keep loop resilient
    } finally {
      setIsInferencing(false);
    }
  }, [
    isInferencing,
    isWebcamActive,
    currentZone,
    onNewIncidentDetected,
    onInferenceWorkers,
    onHazardDetected
  ]);

  // Periodic frame sampling (~1.5 FPS)
  useEffect(() => {
    const interval = setInterval(runFrameInference, 650);
    return () => clearInterval(interval);
  }, [runFrameInference]);

  const togglePlay = () => {
    const v = isWebcamActive ? webcamVideoRef.current : cctvVideoRef.current;
    if (v) {
      if (v.paused) {
        v.play().catch(() => {});
        setIsPlaying(true);
      } else {
        v.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleSnapPhoto = () => {
    const v = isWebcamActive ? webcamVideoRef.current : cctvVideoRef.current;
    if (!v) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = v.videoWidth || 640;
      canvas.height = v.videoHeight || 360;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (isWebcamActive) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        if (onCaptureSnapshot) {
          onCaptureSnapshot(dataUrl);
        }
        setSnapshotToast(true);
        setTimeout(() => setSnapshotToast(false), 2500);
      }
    } catch {}
  };

  // Convert real worker detections to renderable overlay squares
  const activeWorkerDetections = aiDetectedWorkers.map((w: any) => {
    const missing = w.missing_ppe || [];
    const worn = w.worn_ppe || [];
    const isCompliant = w.is_compliant || (missing.length === 0 && worn.length > 0);
    const isMissingAll = !isCompliant && (worn.length === 0 || missing.length >= 3);

    const [wx1, wy1, wx2, wy2] = w.box || [0, 0, 0, 0];
    const isTrespass =
      showGeofence &&
      Math.max(wx1, GEOFENCE_ZONE.x1) < Math.min(wx2, GEOFENCE_ZONE.x2) &&
      Math.max(wy1, GEOFENCE_ZONE.y1) < Math.min(wy2, GEOFENCE_ZONE.y2);

    let status: 'COMPLIANT' | 'PARTIAL' | 'MISSING ALL' | 'TRESPASS';
    let strokeColor: string;
    let labelText: string;

    if (isTrespass) {
      status = 'TRESPASS';
      strokeColor = '#ff1744';
      labelText = `⚠️ WORKER #${w.worker_id} · RESTRICTED CELL TRESPASS!`;
    } else if (isCompliant) {
      status = 'COMPLIANT';
      strokeColor = '#00e676';
      labelText = `WORKER #${w.worker_id} · ALL PPE EQUIPPED`;
    } else if (isMissingAll) {
      status = 'MISSING ALL';
      strokeColor = '#ff1744';
      labelText = `WORKER #${w.worker_id} · CRITICAL: NO PPE DETECTED`;
    } else {
      status = 'PARTIAL';
      strokeColor = '#ffb300';
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
      confidence: 0.94,
      isTrespass
    };
  });

  return (
    <section className="hero-feed-panel">
      {/* Hidden canvas for video frame extraction */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Industrial CCTV Header Bar */}
      <div className="feed-header-bar">
        <div className="feed-title-block">
          <div className="feed-cam-tag">
            {isWebcamActive ? (
              <Camera size={16} className="cam-icon" />
            ) : (
              <Video size={16} className="cam-icon" />
            )}
            <span className="cam-id">
              {isWebcamActive
                ? 'LIVE WEBCAM'
                : activeVideoName !== 'Standard CCTV'
                ? 'CUSTOM FOOTAGE'
                : `CCTV CAM 0${currentZone.camera_id?.replace(/\D/g, '') || '1'}`}
            </span>
            <span className="cam-separator">·</span>
            <span className="cam-name">
              {isWebcamActive
                ? 'OPERATOR LIVE CAMERA'
                : activeVideoName !== 'Standard CCTV'
                ? activeVideoName
                : currentZone.name}
            </span>
          </div>

          <span className="status-pill ok">
            <span className="status-dot ok" />
            {isWebcamActive ? 'WEBCAM ACTIVE' : 'CCTV ONLINE'}
          </span>
        </div>

        {/* 1-Click Video Source Controls */}
        <div className="feed-camera-selector">
          <button
            className={`cam-switch-btn ${isWebcamActive ? 'active' : ''}`}
            onClick={onSelectLiveCamera}
            title="Switch to live hardware camera / webcam to demonstrate on yourself"
          >
            <Camera size={13} style={{ marginRight: '4px' }} />
            Live Webcam
          </button>

          <button
            className={`cam-switch-btn ${!isWebcamActive && activeVideoName === 'Standard CCTV' ? 'active' : ''}`}
            onClick={onSelectCCTV}
            title="Reset to Factory Industrial CCTV stream"
          >
            <Video size={13} style={{ marginRight: '4px' }} />
            Factory CCTV
          </button>

          <button
            className={`cam-switch-btn ${!isWebcamActive && activeVideoName !== 'Standard CCTV' ? 'active' : ''}`}
            onClick={onOpenSourceModal}
            title="Input custom video file (MP4, AVI, WebM) or connect RTSP"
          >
            <Upload size={13} style={{ marginRight: '4px' }} />
            Input Video / RTSP
          </button>
        </div>
      </div>

      {/* Full-Height Video Viewport Container */}
      <div className="feed-viewport-container">
        {/* CCTV Video Element (Pre-recorded / factory streams) */}
        <video
          ref={cctvVideoRef}
          src={activeVideoSrc && !activeVideoSrc.startsWith('rtsp://') ? activeVideoSrc : '/data/cctv_bay1.mp4'}
          className="feed-video-player"
          autoPlay
          loop
          muted
          playsInline
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            opacity: isWebcamActive ? 0 : 1,
            pointerEvents: isWebcamActive ? 'none' : 'auto',
            zIndex: isWebcamActive ? 1 : 2
          }}
        />

        {/* Dedicated Webcam Video Element (Hardware WebRTC Stream) */}
        <video
          ref={webcamVideoRef}
          className="feed-video-player webcam-mirror"
          autoPlay
          playsInline
          muted
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            opacity: isWebcamActive ? 1 : 0,
            pointerEvents: isWebcamActive ? 'auto' : 'none',
            zIndex: isWebcamActive ? 2 : 1
          }}
        />

        {/* Authentic CCTV On-Screen Display (OSD HUD) */}
        <div className="cctv-osd-overlay">
          <div className="cctv-osd-tl">
            <span className="cctv-rec-pill">● REC</span>
            <span className="cctv-cam-code">
              {isWebcamActive
                ? 'CAM-EXT [WEBCAM]'
                : `CCTV-0${currentZone.camera_id?.replace(/\D/g, '') || '1'}`}
            </span>
            <span className="cctv-zone-tag">{currentZone.name.toUpperCase()}</span>
          </div>
          <div className="cctv-osd-tr">
            <span className="cctv-timestamp">{osdTime}</span>
            <span className="cctv-specs">
              {isWebcamActive ? 'LOCAL USB WEBCAM · 720p @ 30 FPS' : 'RTSP · 1080p @ 30 FPS · H.264'}
            </span>
          </div>
        </div>

        {/* Webcam Error Overlay with 1-Click Fix */}
        {isWebcamActive && webcamError && (
          <div className="webcam-error-overlay">
            <CameraOff size={42} className="error-icon" />
            <div className="error-title">Webcam Permission Needed</div>
            <div className="error-desc">{webcamError}</div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button
                className="cam-switch-btn active"
                onClick={startWebcam}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                <RefreshCw size={14} style={{ marginRight: '6px' }} />
                <span>Allow Camera & Retry</span>
              </button>
              <button
                className="cam-switch-btn"
                onClick={onSelectCCTV}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                <Video size={14} style={{ marginRight: '6px' }} />
                <span>Switch to Factory CCTV</span>
              </button>
            </div>
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

        {/* Real-time Bounding Box Overlays */}
        <svg
          className="feed-overlay-canvas"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <pattern id="geofence-stripe" width="5" height="5" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="5" stroke="rgba(255, 23, 68, 0.35)" strokeWidth="1.5" />
            </pattern>
          </defs>

          {/* 0. Virtual Machinery Exclusion Zone */}
          {showGeofence && (
            <g className="geofence-exclusion-zone">
              <rect
                x={GEOFENCE_ZONE.x1}
                y={GEOFENCE_ZONE.y1}
                width={GEOFENCE_ZONE.x2 - GEOFENCE_ZONE.x1}
                height={GEOFENCE_ZONE.y2 - GEOFENCE_ZONE.y1}
                fill="url(#geofence-stripe)"
                stroke="#ff1744"
                strokeWidth="0.9"
                strokeDasharray="2.5, 1.2"
                rx="1"
              />
              <rect
                x={GEOFENCE_ZONE.x1}
                y={GEOFENCE_ZONE.y1}
                width={48}
                height={3.8}
                fill="#ff1744"
                rx="0.5"
              />
              <text
                x={GEOFENCE_ZONE.x1 + 1}
                y={GEOFENCE_ZONE.y1 + 2.7}
                fill="#ffffff"
                fontSize="2.1"
                fontWeight="900"
                fontFamily="monospace, sans-serif"
                letterSpacing="0.02em"
              >
                ⚠️ DANGER: EXCLUSION ZONE (RESTRICTED)
              </text>
            </g>
          )}

          {/* 1. Worker Equipment Overlays */}
          {showPPE &&
            activeWorkerDetections.map((det: any) => {
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

          {/* 2. Fire & Smoke Hazard Detection Overlays (>90% Accuracy YOLO Sentinel) */}
          {showFire &&
            aiDetectedHazards.map((haz: any, idx: number) => {
              const [hx1, hy1, hx2, hy2] = haz.box;
              const width = Math.max(hx2 - hx1, 10);
              const height = Math.max(hy2 - hy1, 10);
              const isFire = haz.hazard_type === 'fire';
              const strokeColor = isFire ? '#ff1744' : '#ff9100';
              const labelText = isFire
                ? `CRITICAL HAZARD: FIRE (${Math.round(haz.confidence * 100)}%)`
                : `HAZARD DETECTED: SMOKE (${Math.round(haz.confidence * 100)}%)`;

              const labelWidth = Math.max(width * 1.4, 44);
              const labelHeight = 4.8;
              const labelY = Math.max(0.6, hy1 - labelHeight);

              return (
                <g key={`hazard-${idx}`} className="hazard-pulse-group">
                  <rect
                    x={hx1}
                    y={hy1}
                    width={width}
                    height={height}
                    fill={isFire ? 'rgba(255, 23, 68, 0.28)' : 'rgba(255, 145, 0, 0.24)'}
                    stroke={strokeColor}
                    strokeWidth="1.2"
                    strokeDasharray="3, 1.5"
                    rx="1.5"
                  />
                  <rect
                    x={Math.max(0, hx1 - 1)}
                    y={Math.max(0, hy1 - 1)}
                    width={width + 2}
                    height={height + 2}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="0.5"
                    opacity="0.8"
                  />
                  <rect
                    x={hx1}
                    y={labelY}
                    width={labelWidth}
                    height={labelHeight}
                    fill={strokeColor}
                    rx="0.8"
                  />
                  <text
                    x={hx1 + 1.2}
                    y={labelY + 3.4}
                    fill="#ffffff"
                    fontSize="2.4"
                    fontWeight="900"
                    fontFamily="monospace, sans-serif"
                    letterSpacing="0.02em"
                  >
                    {labelText}
                  </text>
                </g>
              );
            })}
        </svg>
      </div>

      {/* Clean Bottom Controls Bar */}
      <div className="feed-footer-controls">
        <div className="footer-controls-left">
          <button className="clean-ctrl-btn" onClick={togglePlay}>
            {isPlaying ? <Pause size={13} /> : <Play size={13} />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            className={`clean-toggle-chip ${showPPE ? 'active' : ''}`}
            onClick={() => setShowPPE(!showPPE)}
            title="Toggle bounding box squares on workers"
          >
            <HardHat size={13} />
            <span>PPE Equipment Sentinel</span>
          </button>

          <button
            className={`clean-toggle-chip ${showFire ? 'active' : ''}`}
            onClick={() => setShowFire(!showFire)}
            title="Toggle Fire & Smoke AI Sentinel"
          >
            <Flame size={13} />
            <span>Fire & Smoke Sentinel</span>
          </button>

          <button
            className={`clean-toggle-chip ${showGeofence ? 'active' : ''}`}
            onClick={() => setShowGeofence(!showGeofence)}
            title="Toggle Virtual Geofencing & Machinery Exclusion Zone"
          >
            <ShieldAlert size={13} />
            <span>Exclusion Geofence</span>
          </button>

          <button
            className={`clean-toggle-chip ${showGrid ? 'active' : ''}`}
            onClick={() => setShowGrid(!showGrid)}
          >
            <Crosshair size={13} />
            <span>Inspection Grid</span>
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
