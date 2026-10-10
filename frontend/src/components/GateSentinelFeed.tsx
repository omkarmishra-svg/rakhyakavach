import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Video,
  RefreshCw,
  CameraOff,
  Maximize2,
  Navigation,
  Unlock,
  Lock,
  UserCheck
} from 'lucide-react';

export interface EntrantProfile {
  emp_id: string;
  name: string;
  role: string;
  department: string;
  destination_department?: string;
  suggested_department?: string;
  is_executive?: boolean;
  required_ppe: string[];
  worn_ppe: string[];
  missing_ppe: string[];
  missing_ppe_alert?: string;
  contraband: string[];
  contraband_alert?: string;
  access_status: 'ENTERED' | 'PARTIAL_REROUTE' | 'ACCESS_DENIED' | 'SECURITY_INTERCEPT';
  turnstile_unlocked: boolean;
  guidance_route?: string;
  remedy_guidance?: string;
  active_guidance?: string;
  decision_message: string;
}

export const DEFAULT_ENTRANT: EntrantProfile = {
  emp_id: 'EMP-4109',
  name: 'Rajesh Kumar',
  role: 'Senior Plant Technician',
  department: 'Main Electrical & Substation Bay',
  destination_department: 'Main Fabrication Bay (Zone 1)',
  suggested_department: 'Warehouse Logistics & Dock B (Zone 2)',
  is_executive: false,
  required_ppe: ['helmet', 'vest', 'goggles', 'gloves', 'boots'],
  worn_ppe: ['helmet', 'vest'],
  missing_ppe: ['gloves', 'boots', 'goggles'],
  contraband: [],
  access_status: 'PARTIAL_REROUTE',
  turnstile_unlocked: true,
  decision_message: 'PARTIAL PPE DETECTED: ADAPTIVE REROUTE TO LOW-HAZARD LOGISTICS BAY (CCTV 02)'
};

interface GateSentinelFeedProps {
  entrant: EntrantProfile;
  onEntrantUpdate: (updated: EntrantProfile) => void;
  onProceedToMonitoring: (targetCamId: number) => void;
  onToggleGear: (gearKey: string) => void;
  onToggleContraband: (itemKey: string) => void;
  onRandomizePersona: () => void;
}

export const GateSentinelFeed: React.FC<GateSentinelFeedProps> = ({
  entrant,
  onEntrantUpdate,
  onProceedToMonitoring,
  onToggleGear,
  onToggleContraband,
  onRandomizePersona
}) => {
  const cctvVideoRef = useRef<HTMLVideoElement>(null);
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);

  const [streamSource, setStreamSource] = useState<'webcam' | 'cctv'>('webcam');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [osdTime, setOsdTime] = useState<string>('');
  const [dpdpBlur, setDpdpBlur] = useState<boolean>(true);

  // Live detection states
  const [personDetected, setPersonDetected] = useState<boolean>(true);
  const [normBox, setNormBox] = useState<[number, number, number, number]>([28, 12, 72, 92]);
  const isInferencingRef = useRef<boolean>(false);
  const emptyFramesRef = useRef<number>(0);

  // Live OSD clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setOsdTime(`${now.toISOString().replace('T', ' ').substring(0, 19)} UTC`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Ultra-resilient webcam starter with multiple constraint fallbacks
  const startWebcam = useCallback(async () => {
    setWebcamError(null);
    if (cctvVideoRef.current) cctvVideoRef.current.pause();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setWebcamError('Webcam access is not supported on this browser or origin.');
      return;
    }

    try {
      let stream: MediaStream | null = null;
      try {
        // Attempt 1: Standard 720p resolution
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
      } catch (err1) {
        console.warn('Fallback to basic video constraints...', err1);
        try {
          // Attempt 2: Minimal fallback constraints (fixes OverconstrainedError on Windows webcams)
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        } catch (err2) {
          console.error('All webcam constraints failed', err2);
        }
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
          'Camera access blocked. Please click the lock or camera icon in your address bar and select "Allow".'
        );
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setWebcamError(
          'Camera is in use by another app (e.g. Zoom, Teams, or Windows Camera). Please close it and retry.'
        );
      } else {
        setWebcamError(`Camera error: ${err.message || 'Could not start camera.'}`);
      }
    }
  }, []);

  // Handle stream source switch
  useEffect(() => {
    if (streamSource === 'webcam') {
      startWebcam();
    } else {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach((t) => t.stop());
        webcamStreamRef.current = null;
      }
      if (cctvVideoRef.current) {
        cctvVideoRef.current.src = '/data/cctv_bay1.mp4';
        cctvVideoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }

    return () => {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach((t) => t.stop());
        webcamStreamRef.current = null;
      }
    };
  }, [streamSource, startWebcam]);

  // Periodic AI Detection against /api/gate/scan-live (~2.5 FPS)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!isPlaying || isInferencingRef.current) return;

      const activeVideo = streamSource === 'webcam' ? webcamVideoRef.current : cctvVideoRef.current;
      if (!activeVideo || activeVideo.paused || activeVideo.ended) return;
      if (activeVideo.videoWidth === 0 || activeVideo.videoHeight === 0) return;

      try {
        const canvas = hiddenCanvasRef.current || document.createElement('canvas');
        canvas.width = 480;
        canvas.height = 270;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (streamSource === 'webcam') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(activeVideo, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
        isInferencingRef.current = true;

        const res = await fetch('/api/gate/scan-live', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: dataUrl })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.ok) {
            if (data.person_detected && data.norm_box) {
              emptyFramesRef.current = 0;
              setPersonDetected(true);
              setNormBox([data.norm_box[0], data.norm_box[1], data.norm_box[2], data.norm_box[3]]);

              // If new data arrived, update profile
              const updated: EntrantProfile = {
                emp_id: data.emp_id || entrant.emp_id,
                name: data.name || entrant.name,
                role: data.role || entrant.role,
                department: data.department || entrant.department,
                destination_department: data.destination_department || entrant.destination_department,
                suggested_department: data.suggested_department || entrant.suggested_department,
                is_executive: data.is_executive ?? entrant.is_executive,
                required_ppe: data.required_ppe || entrant.required_ppe,
                worn_ppe: data.worn_ppe || entrant.worn_ppe,
                missing_ppe: data.missing_ppe || entrant.missing_ppe,
                missing_ppe_alert: data.missing_ppe_alert,
                contraband: data.contraband_detected || entrant.contraband,
                contraband_alert: data.contraband_alert,
                access_status: data.access_status || entrant.access_status,
                turnstile_unlocked: data.turnstile_unlocked ?? entrant.turnstile_unlocked,
                guidance_route: data.guidance_route,
                remedy_guidance: data.remedy_guidance,
                active_guidance: data.active_guidance,
                decision_message: data.decision_message || entrant.decision_message
              };

              onEntrantUpdate(updated);
            } else {
              emptyFramesRef.current += 1;
              if (emptyFramesRef.current >= 3) {
                setPersonDetected(false);
              }
            }
          }
        }
      } catch {
        // Keep resilient
      } finally {
        isInferencingRef.current = false;
      }
    }, 450);

    return () => clearInterval(interval);
  }, [isPlaying, streamSource, entrant, onEntrantUpdate]);

  const togglePlay = () => {
    const v = streamSource === 'webcam' ? webcamVideoRef.current : cctvVideoRef.current;
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

  const handleToggleFullscreen = () => {
    const el = document.querySelector('.hero-feed-card');
    if (el) {
      if (!document.fullscreenElement) {
        el.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  // Status computation
  const isEntered = entrant.access_status === 'ENTERED';
  const isReroute = entrant.access_status === 'PARTIAL_REROUTE';
  const isBlocked = entrant.access_status === 'ACCESS_DENIED';

  const statusColor = isEntered
    ? '#00e676'
    : isReroute
    ? '#38bdf8'
    : isBlocked
    ? '#fbbf24'
    : '#ff1744';

  const statusLabel = isEntered
    ? '[ACCESS GRANTED] ALL PPE EQUIPPED // TURNSTILE UNLOCKED'
    : isReroute
    ? `[PARTIAL REROUTE] MISSING: ${entrant.missing_ppe.join(', ').toUpperCase()} // ASSIGNED TO LOGISTICS BAY (CCTV 02)`
    : isBlocked
    ? '[ACCESS DENIED] CRITICAL: MISSING ALL PPE // TURNSTILE LOCKED'
    : `[SECURITY INTERCEPT] CONTRABAND: ${entrant.contraband.join(', ').toUpperCase()} // TURNSTILE LOCKED`;

  const [bx1, by1, bx2, by2] = normBox;
  const boxWidth = Math.max(bx2 - bx1, 15);
  const boxHeight = Math.max(by2 - by1, 25);

  return (
    <div className="hero-feed-card">
      <canvas ref={hiddenCanvasRef} style={{ display: 'none' }} />

      {/* Top Header Bar */}
      <div className="feed-header-bar">
        <div className="feed-title-block">
          <span className="feed-cam-title">GATE 01 // AIRLOCK ENTRY SENTINEL</span>
          <span
            className="feed-type-pill"
            style={{
              backgroundColor: entrant.turnstile_unlocked ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 23, 68, 0.15)',
              color: entrant.turnstile_unlocked ? '#00e676' : '#ff1744',
              borderColor: entrant.turnstile_unlocked ? 'rgba(0, 230, 118, 0.4)' : 'rgba(255, 23, 68, 0.4)'
            }}
          >
            {entrant.turnstile_unlocked ? 'TURNSTILE UNLOCKED' : 'TURNSTILE LOCKED'}
          </span>
        </div>

        <div className="feed-actions-group">
          {/* Stream Source Toggle */}
          <div style={{ display: 'inline-flex', background: 'rgba(15, 23, 42, 0.8)', padding: '2px', borderRadius: '5px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              onClick={() => setStreamSource('webcam')}
              style={{
                padding: '3px 8px',
                fontSize: '10px',
                fontWeight: 700,
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                background: streamSource === 'webcam' ? '#00f2fe' : 'transparent',
                color: streamSource === 'webcam' ? '#0f172a' : '#94a3b8'
              }}
              title="Optical Webcam Stream"
            >
              WEBCAM
            </button>
            <button
              onClick={() => setStreamSource('cctv')}
              style={{
                padding: '3px 8px',
                fontSize: '10px',
                fontWeight: 700,
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                background: streamSource === 'cctv' ? '#00f2fe' : 'transparent',
                color: streamSource === 'cctv' ? '#0f172a' : '#94a3b8'
              }}
              title="Factory CCTV Gate stream"
            >
              CCTV GATE FEED
            </button>
          </div>

          {/* Randomize Persona */}
          <button
            className="feed-mini-btn"
            onClick={onRandomizePersona}
            title="Simulate next entrant: generate random worker persona (Name, ID, Role)"
          >
            <RefreshCw size={12} />
            <span>New Persona</span>
          </button>

          {/* Privacy Blur Toggle */}
          <button
            className="feed-mini-btn"
            onClick={() => setDpdpBlur(!dpdpBlur)}
            title="Toggle DPDP Act 2023 Face Anonymization Blur"
            style={{ color: dpdpBlur ? '#00e676' : '#94a3b8' }}
          >
            <UserCheck size={12} />
            <span>{dpdpBlur ? 'DPDP BLUR: ON' : 'DPDP BLUR: OFF'}</span>
          </button>

          {/* Play/Pause */}
          <button className="feed-mini-btn" onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
          </button>

          {/* Fullscreen */}
          <button className="feed-mini-btn btn-fullscreen" onClick={handleToggleFullscreen} title="Full Screen">
            <Maximize2 size={12} />
          </button>
        </div>
      </div>

      {/* Video Stage with Real-Time Reticles */}
      <div className="feed-video-stage" style={{ position: 'relative', overflow: 'hidden' }}>
        {/* CCTV Video */}
        <video
          ref={cctvVideoRef}
          className="feed-video-player"
          loop
          playsInline
          muted
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            opacity: streamSource === 'cctv' ? 1 : 0,
            pointerEvents: streamSource === 'cctv' ? 'auto' : 'none',
            zIndex: streamSource === 'cctv' ? 2 : 1
          }}
        />

        {/* Webcam Video */}
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
            opacity: streamSource === 'webcam' ? 1 : 0,
            pointerEvents: streamSource === 'webcam' ? 'auto' : 'none',
            zIndex: streamSource === 'webcam' ? 2 : 1
          }}
        />

        {/* OSD HUD Overlay */}
        <div className="cctv-osd-overlay">
          <div className="cctv-osd-tl">
            <span className="cctv-rec-pill">● REC</span>
            <span className="cctv-cam-code">GATE 01 [AIRLOCK ENTRY]</span>
            <span className="cctv-zone-tag">PRIMARY ACCESS & WAYFINDING CHECKPOINT</span>
          </div>
          <div className="cctv-osd-tr">
            <span className="cctv-timestamp">{osdTime}</span>
            <span className="cctv-specs">
              {streamSource === 'webcam' ? 'LOCAL WEBCAM · 720p @ 30 FPS' : 'RTSP · 1080p @ 30 FPS · H.264'}
            </span>
          </div>
        </div>

        {/* Webcam Error Overlay */}
        {streamSource === 'webcam' && webcamError && (
          <div className="webcam-error-overlay">
            <CameraOff size={38} className="error-icon" />
            <div className="error-title">Webcam Permission Needed</div>
            <div className="error-desc">{webcamError}</div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button className="cam-switch-btn active" onClick={startWebcam} style={{ padding: '6px 14px' }}>
                <RefreshCw size={12} style={{ marginRight: '5px' }} />
                <span>Retry Webcam</span>
              </button>
              <button className="cam-switch-btn" onClick={() => setStreamSource('cctv')} style={{ padding: '6px 14px' }}>
                <Video size={12} style={{ marginRight: '5px' }} />
                <span>Switch to Gate CCTV</span>
              </button>
            </div>
          </div>
        )}

        {/* SVG Bounding Box Overlays (Exact Live Vision Square Style) */}
        <svg className="feed-overlay-canvas" viewBox="0 0 100 100" preserveAspectRatio="none">
          {personDetected ? (
            <g className="entrant-detection-group">
              {/* DPDP Privacy Blur Filter */}
              {dpdpBlur && (
                <ellipse
                  cx={bx1 + boxWidth / 2}
                  cy={by1 + boxHeight * 0.16}
                  rx={boxWidth * 0.18}
                  ry={boxHeight * 0.11}
                  fill="rgba(255, 255, 255, 0.45)"
                  filter="blur(1px)"
                  style={{ backdropFilter: 'blur(10px)' }}
                />
              )}

              {/* Square Bounding Box */}
              <rect
                x={bx1}
                y={by1}
                width={boxWidth}
                height={boxHeight}
                fill={
                  statusColor === '#00e676'
                    ? 'rgba(0, 230, 118, 0.12)'
                    : statusColor === '#ff1744'
                    ? 'rgba(255, 23, 68, 0.18)'
                    : 'rgba(56, 189, 248, 0.14)'
                }
                stroke={statusColor}
                strokeWidth="0.8"
                rx="1"
              />

              {/* Corner Reticles */}
              <path d={`M ${bx1} ${by1 + 3} L ${bx1} ${by1} L ${bx1 + 3} ${by1}`} fill="none" stroke={statusColor} strokeWidth="1.4" />
              <path d={`M ${bx1 + boxWidth - 3} ${by1} L ${bx1 + boxWidth} ${by1} L ${bx1 + boxWidth} ${by1 + 3}`} fill="none" stroke={statusColor} strokeWidth="1.4" />
              <path d={`M ${bx1} ${by1 + boxHeight - 3} L ${bx1} ${by1 + boxHeight} L ${bx1 + 3} ${by1 + boxHeight}`} fill="none" stroke={statusColor} strokeWidth="1.4" />
              <path d={`M ${bx1 + boxWidth - 3} ${by1 + boxHeight} L ${bx1 + boxWidth} ${by1 + boxHeight} L ${bx1 + boxWidth} ${by1 + boxHeight - 3}`} fill="none" stroke={statusColor} strokeWidth="1.4" />

              {/* Identity Header Tag above worker */}
              <rect
                x={bx1}
                y={Math.max(0.8, by1 - 4.4)}
                width={Math.max(boxWidth * 1.35, 46)}
                height={4.2}
                fill={statusColor}
                rx="0.6"
              />
              <text
                x={bx1 + 1.2}
                y={Math.max(3.8, by1 - 1.4)}
                fill="#000000"
                fontSize="2.3"
                fontWeight="900"
                fontFamily="monospace, sans-serif"
              >
                ENTRANT: {entrant.name} ({entrant.emp_id}) · {entrant.role}
              </text>

              {/* Sub-box: Helmet (Head) */}
              <rect
                x={bx1 + boxWidth * 0.22}
                y={by1 + boxHeight * 0.02}
                width={boxWidth * 0.56}
                height={boxHeight * 0.16}
                fill={entrant.worn_ppe.includes('helmet') ? 'rgba(0, 230, 118, 0.2)' : 'rgba(255, 23, 68, 0.25)'}
                stroke={entrant.worn_ppe.includes('helmet') ? '#00e676' : '#ff1744'}
                strokeWidth="0.5"
                strokeDasharray={entrant.worn_ppe.includes('helmet') ? 'none' : '1.5, 0.8'}
                rx="0.5"
              />
              <text
                x={bx1 + boxWidth * 0.24}
                y={by1 + boxHeight * 0.12}
                fill="#ffffff"
                fontSize="1.6"
                fontWeight="800"
                fontFamily="monospace, sans-serif"
              >
                {entrant.worn_ppe.includes('helmet') ? 'HELMET (97%)' : 'NO HELMET'}
              </text>

              {/* Sub-box: Vest (Chest) */}
              <rect
                x={bx1 + boxWidth * 0.15}
                y={by1 + boxHeight * 0.24}
                width={boxWidth * 0.70}
                height={boxHeight * 0.35}
                fill={entrant.worn_ppe.includes('vest') ? 'rgba(0, 230, 118, 0.18)' : 'rgba(255, 23, 68, 0.25)'}
                stroke={entrant.worn_ppe.includes('vest') ? '#00e676' : '#ff1744'}
                strokeWidth="0.5"
                strokeDasharray={entrant.worn_ppe.includes('vest') ? 'none' : '1.5, 0.8'}
                rx="0.5"
              />
              <text
                x={bx1 + boxWidth * 0.18}
                y={by1 + boxHeight * 0.38}
                fill="#ffffff"
                fontSize="1.6"
                fontWeight="800"
                fontFamily="monospace, sans-serif"
              >
                {entrant.worn_ppe.includes('vest') ? 'VEST (94%)' : 'NO VEST'}
              </text>

              {/* Sub-box: Gloves (Hands) */}
              <rect
                x={bx1 + boxWidth * 0.05}
                y={by1 + boxHeight * 0.52}
                width={boxWidth * 0.28}
                height={boxHeight * 0.18}
                fill={entrant.worn_ppe.includes('gloves') ? 'rgba(0, 230, 118, 0.2)' : 'rgba(255, 179, 0, 0.2)'}
                stroke={entrant.worn_ppe.includes('gloves') ? '#00e676' : '#ffb300'}
                strokeWidth="0.5"
                rx="0.5"
              />
              <text
                x={bx1 + boxWidth * 0.07}
                y={by1 + boxHeight * 0.62}
                fill="#ffffff"
                fontSize="1.4"
                fontWeight="800"
                fontFamily="monospace, sans-serif"
              >
                {entrant.worn_ppe.includes('gloves') ? 'GLOVES (91%)' : 'NO GLOVES'}
              </text>

              {/* Contraband Detection Alert Box */}
              {entrant.contraband.length > 0 && (
                <g className="contraband-flash-group">
                  <rect
                    x={bx1 + boxWidth * 0.55}
                    y={by1 + boxHeight * 0.50}
                    width={boxWidth * 0.42}
                    height={boxHeight * 0.22}
                    fill="rgba(255, 23, 68, 0.35)"
                    stroke="#ff1744"
                    strokeWidth="0.9"
                    strokeDasharray="2, 1"
                    rx="0.8"
                  />
                  <rect
                    x={bx1 + boxWidth * 0.55}
                    y={by1 + boxHeight * 0.46}
                    width={boxWidth * 0.42}
                    height={3.2}
                    fill="#ff1744"
                    rx="0.4"
                  />
                  <text
                    x={bx1 + boxWidth * 0.57}
                    y={by1 + boxHeight * 0.485}
                    fill="#ffffff"
                    fontSize="1.5"
                    fontWeight="900"
                    fontFamily="monospace, sans-serif"
                  >
                    PROHIBITED ITEM
                  </text>
                  <text
                    x={bx1 + boxWidth * 0.57}
                    y={by1 + boxHeight * 0.61}
                    fill="#ffcdd2"
                    fontSize="1.4"
                    fontWeight="800"
                    fontFamily="monospace, sans-serif"
                  >
                    {entrant.contraband.join(', ').toUpperCase()}
                  </text>
                </g>
              )}
            </g>
          ) : (
            /* Standby Search Reticle */
            <g className="searching-reticle-group">
              <rect x="25" y="20" width="50" height="60" fill="none" stroke="rgba(255, 179, 0, 0.4)" strokeWidth="0.8" strokeDasharray="3, 2" rx="2" />
              <text x="50" y="52" textAnchor="middle" fill="#ffb300" fontSize="3" fontWeight="800" fontFamily="monospace, sans-serif">
                SEARCHING GATE 01... STAND IN FRONT OF SENSOR
              </text>
            </g>
          )}
        </svg>

        {/* HUD Decision Strip at Bottom of Video */}
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '12px',
            right: '12px',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '8px 14px',
            borderRadius: '8px',
            background: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(8px)',
            border: `1px solid ${statusColor}`
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {entrant.turnstile_unlocked ? <Unlock size={18} color="#00e676" /> : <Lock size={18} color="#ff1744" />}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: statusColor, letterSpacing: '0.04em' }}>
                {statusLabel}
              </div>
              <div style={{ fontSize: '10px', color: '#cbd5e1', marginTop: '1px' }}>
                {entrant.decision_message}
              </div>
            </div>
          </div>

          {/* Seamless Handover CTA into Factory CCTV 02 */}
          {(isEntered || isReroute) && (
            <button
              onClick={() => onProceedToMonitoring(2)}
              style={{
                padding: '7px 16px',
                borderRadius: '6px',
                backgroundColor: '#0284c7',
                border: '1px solid rgba(56, 189, 248, 0.7)',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: '0 0 14px rgba(2, 132, 199, 0.45)',
                transition: 'all 0.15s ease'
              }}
              title="Pass entrant through turnstile: Monitor worker inside Plant on CCTV 02 (Logistics Bay & Active Fire Guard)"
            >
              <span>ENTER FACTORY -&gt; MONITOR ON CCTV 02</span>
              <Navigation size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Quick PPE Simulation Toggles Bar directly under the hero stream */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 14px',
          background: 'rgba(15, 23, 42, 0.95)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: '11px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', marginRight: '4px' }}>
            QUICK AUDIT OVERRIDES:
          </span>
          {[
            { key: 'helmet', label: 'Helmet' },
            { key: 'vest', label: 'Vest' },
            { key: 'gloves', label: 'Gloves' },
            { key: 'boots', label: 'Boots' },
            { key: 'goggles', label: 'Goggles' }
          ].map((item) => {
            const isWorn = entrant.worn_ppe.includes(item.key);
            return (
              <button
                key={item.key}
                onClick={() => onToggleGear(item.key)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: isWorn ? '1px solid #00e676' : '1px solid rgba(255,255,255,0.15)',
                  background: isWorn ? 'rgba(0, 230, 118, 0.15)' : 'rgba(30, 41, 59, 0.6)',
                  color: isWorn ? '#00e676' : '#94a3b8'
                }}
                title={`Toggle ${item.label} worn status`}
              >
                {isWorn ? `✓ ${item.label}` : `+ ${item.label}`}
              </button>
            );
          })}

          {/* Contraband Toggle */}
          <button
            onClick={() => onToggleContraband('cigarettes')}
            style={{
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 700,
              cursor: 'pointer',
              border: entrant.contraband.length > 0 ? '1px solid #ff1744' : '1px solid rgba(255,255,255,0.15)',
              background: entrant.contraband.length > 0 ? 'rgba(255, 23, 68, 0.2)' : 'rgba(30, 41, 59, 0.6)',
              color: entrant.contraband.length > 0 ? '#ff1744' : '#94a3b8'
            }}
            title="Toggle simulated contraband (Cigarettes/Lighter)"
          >
            {entrant.contraband.length > 0 ? 'CONTRABAND DETECTED' : '+ Contraband'}
          </button>
        </div>

        <div style={{ fontSize: '10px', color: '#64748b' }}>
          ISO 45001 / NFPA 101 Access Control Sentinel
        </div>
      </div>
    </div>
  );
};
