import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Video,
  Camera,
  RefreshCw,
  CameraOff,
  Maximize2,
  Navigation,
  Unlock,
  Lock,
  UserCheck,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Volume2,
  VolumeX
} from 'lucide-react';
import { soundEngine } from '../utils/audio';

export interface EntrantProfile {
  emp_id: string;
  name: string;
  role: string;
  department: string;
  sector?: string;
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
  emp_id: 'ELEC-1041',
  name: 'Rajesh Sharma',
  role: 'Senior High-Voltage Lineman',
  department: 'Grid Transmission & 66kV Substations',
  sector: 'Electrical',
  destination_department: 'Bay 3 Switchgear Enclosure (Zone A)',
  suggested_department: 'SCADA Automation & Control Center (Zone 3 - Low Voltage Area)',
  is_executive: false,
  required_ppe: ['helmet', 'vest'],
  worn_ppe: [],
  missing_ppe: ['helmet', 'vest'],
  contraband: [],
  access_status: 'ACCESS_DENIED',
  turnstile_unlocked: false,
  decision_message: 'STAND IN FRONT OF GATE 01 SENSOR FOR REAL-TIME PPE DETECTION'
};

interface GateSentinelFeedProps {
  entrant: EntrantProfile;
  onEntrantUpdate: (updated: EntrantProfile) => void;
  onProceedToMonitoring: (targetCamId: number) => void;
  onToggleGear: (gearKey: string) => void;
  onToggleContraband?: (itemKey: string) => void;
  onRandomizePersona: () => void;
}

export const GateSentinelFeed: React.FC<GateSentinelFeedProps> = ({
  entrant,
  onEntrantUpdate,
  onProceedToMonitoring,
  onToggleGear,
  onRandomizePersona
}) => {
  const cctvVideoRef = useRef<HTMLVideoElement>(null);
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);

  const [streamSource, setStreamSource] = useState<'webcam' | 'cctv'>('webcam');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isWebcamActive, setIsWebcamActive] = useState<boolean>(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [osdTime, setOsdTime] = useState<string>('');
  const [dpdpBlur, setDpdpBlur] = useState<boolean>(true);

  // Live detection states
  const [personDetected, setPersonDetected] = useState<boolean>(true);
  const [normBox, setNormBox] = useState<[number, number, number, number]>([28, 12, 72, 92]);
  const isInferencingRef = useRef<boolean>(false);
  const emptyFramesRef = useRef<number>(0);
  const entrantRef = useRef<EntrantProfile>(entrant);

  // Automated Supervisor Voice Advisory Engine
  const [voiceAlertsEnabled, setVoiceAlertsEnabled] = useState<boolean>(true);
  const lastSpokenTextRef = useRef<string>('');
  const lastSpokenTimeRef = useRef<number>(0);

  const speakVoiceWarning = useCallback((text: string, force = false) => {
    if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (!voiceAlertsEnabled && !force) return;

    const now = Date.now();
    // Intelligent debounce: prevent audio stutter across fast camera frames
    if (!force && lastSpokenTextRef.current === text && now - lastSpokenTimeRef.current < 7500) {
      return;
    }
    if (!force && now - lastSpokenTimeRef.current < 4000) {
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.98;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find(
        (v) =>
          v.lang.includes('en') &&
          (v.name.includes('Natural') ||
            v.name.includes('Google') ||
            v.name.includes('David') ||
            v.name.includes('Zira') ||
            v.name.includes('Samantha') ||
            v.name.includes('English'))
      );
      if (englishVoice) {
        utterance.voice = englishVoice;
      }
      window.speechSynthesis.speak(utterance);
      lastSpokenTextRef.current = text;
      lastSpokenTimeRef.current = now;
    } catch (err) {
      console.warn('Speech synthesis note:', err);
    }
  }, [voiceAlertsEnabled]);

  useEffect(() => {
    entrantRef.current = entrant;
  }, [entrant]);

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
      setIsWebcamActive(false);
      return;
    }

    try {
      let stream: MediaStream | null = null;
      try {
        // Attempt 1: Standard 720p resolution
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: false
        });
      } catch (err1) {
        console.warn('Fallback to basic video constraints...', err1);
        try {
          // Attempt 2: Facing mode only
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: false
          });
        } catch (err2) {
          console.warn('Fallback to unconstrained video...', err2);
          try {
            // Attempt 3: Any video track
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false
            });
          } catch (err3) {
            console.error('All webcam constraints failed', err3);
          }
        }
      }

      if (!stream) {
        setWebcamError('Unable to access webcam. Please check camera connections.');
        setIsWebcamActive(false);
        return;
      }

      webcamStreamRef.current = stream;
      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = stream;
        webcamVideoRef.current.muted = true;
        webcamVideoRef.current.playsInline = true;

        webcamVideoRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
            setIsWebcamActive(true);
          })
          .catch(() => {
            if (webcamVideoRef.current) {
              webcamVideoRef.current.onloadedmetadata = () => {
                webcamVideoRef.current
                  ?.play()
                  .then(() => {
                    setIsPlaying(true);
                    setIsWebcamActive(true);
                  })
                  .catch(() => {});
              };
            }
          });
      }
      setWebcamError(null);
    } catch (err: any) {
      console.error('Webcam error:', err);
      setIsWebcamActive(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setWebcamError(
          'Camera access was blocked by browser. Please click the lock or camera icon in your address bar and select "Allow".'
        );
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setWebcamError(
          'Camera is currently in use by another app (e.g. Zoom, Teams, or Windows Camera). Please close it and retry.'
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
      setIsWebcamActive(false);
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
      setIsWebcamActive(false);
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
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Reset transformation matrix completely to avoid canvas coordinate drift
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(activeVideo, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        const dataUrl = canvas.toDataURL('image/jpeg', 0.80);
        isInferencingRef.current = true;

        const res = await fetch('/api/gate/scan-live', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: dataUrl,
            emp_id_override: entrantRef.current.emp_id,
            manual_contraband: entrantRef.current.contraband,
            detected_ppe: entrantRef.current.worn_ppe
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.ok) {
            if (data.person_detected && data.norm_box) {
              emptyFramesRef.current = 0;
              setPersonDetected(true);
              setNormBox([data.norm_box[0], data.norm_box[1], data.norm_box[2], data.norm_box[3]]);

              // Real-time live detections directly from camera/LLM inference fused with manual toggles
              const serverWorn: string[] = Array.isArray(data.worn_ppe) ? data.worn_ppe : [];
              const manualWorn: string[] = entrantRef.current.worn_ppe || [];
              const currentWorn: string[] = Array.from(new Set([...serverWorn, ...manualWorn]));
              const currentReq: string[] = ['helmet', 'vest'];
              const currentMissing = currentReq.filter((r) => !currentWorn.includes(r));

              // Automated Supervisor Voice Advisory Trigger
              if (data.voice_warning) {
                speakVoiceWarning(data.voice_warning);
              } else if (currentMissing.length > 0) {
                const missingText = currentMissing.join(' and ');
                speakVoiceWarning(
                  `Attention Supervisor: Worker ${data.name || entrantRef.current.name} is missing ${missingText}. Turnstile locked at Gate 1.`
                );
              } else if (currentWorn.includes('helmet') && currentWorn.includes('vest')) {
                speakVoiceWarning(`Access granted for ${data.name || entrantRef.current.name}. All safety equipment verified.`);
              }

              // If supervisor previously granted manual override, preserve unlocked status
              const isSupervisorOverridden = entrantRef.current.turnstile_unlocked && entrantRef.current.decision_message?.includes('SUPERVISOR');
              const finalUnlocked = isSupervisorOverridden ? true : (data.turnstile_unlocked ?? entrantRef.current.turnstile_unlocked);
              const finalStatus = isSupervisorOverridden ? 'ENTERED' : (data.access_status || entrantRef.current.access_status);
              const finalDecision = isSupervisorOverridden ? entrantRef.current.decision_message : (data.decision_message || entrantRef.current.decision_message);

              // Update profile with live detection results
              const updated: EntrantProfile = {
                emp_id: data.emp_id || entrantRef.current.emp_id,
                name: data.name || entrantRef.current.name,
                role: data.role || entrantRef.current.role,
                department: data.department || entrantRef.current.department,
                sector: data.sector || entrantRef.current.sector || 'Electrical',
                destination_department: data.destination_department || entrantRef.current.destination_department,
                suggested_department: data.suggested_department || entrantRef.current.suggested_department,
                is_executive: data.is_executive ?? entrantRef.current.is_executive,
                required_ppe: currentReq,
                worn_ppe: currentWorn,
                missing_ppe: currentMissing,
                missing_ppe_alert: currentMissing.length > 0 ? `MISSING: ${currentMissing.join(', ').toUpperCase()}` : undefined,
                contraband: data.contraband_detected || entrantRef.current.contraband,
                contraband_alert: data.contraband_alert,
                access_status: finalStatus,
                turnstile_unlocked: finalUnlocked,
                guidance_route: data.guidance_route,
                remedy_guidance: data.remedy_guidance,
                active_guidance: data.active_guidance,
                decision_message: finalDecision
              };

              onEntrantUpdate(updated);
            } else {
              emptyFramesRef.current += 1;
              if (emptyFramesRef.current >= 4) {
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
    }, 400);

    return () => clearInterval(interval);
  }, [isPlaying, streamSource, onEntrantUpdate]);

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
    const el = document.querySelector('.hero-feed-panel');
    if (el) {
      if (!document.fullscreenElement) {
        el.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const handleSupervisorAllowEntry = async () => {
    try {
      await fetch('/api/gate/supervisor-override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supervisor_id: 'SUP-701',
          entrant_name: entrant.name,
          entrant_emp_id: entrant.emp_id,
          reason: 'Shift Supervisor authorized entry through Airlock Gate 01'
        })
      });
    } catch {}

    const updated: EntrantProfile = {
      ...entrant,
      turnstile_unlocked: true,
      access_status: 'ENTERED',
      decision_message: 'SUPERVISOR ACCESS GRANTED: Shift Supervisor (SUP-701) unlocked turnstile for entry'
    };
    onEntrantUpdate(updated);
    soundEngine.playChime();
    speakVoiceWarning(`Supervisor emergency override authorized. Gate turnstile unlocked for ${entrant.name}.`, true);
  };

  const handleSupervisorDenyEntry = async () => {
    try {
      await fetch('/api/gate/supervisor-deny', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supervisor_id: 'SUP-701',
          entrant_name: entrant.name,
          entrant_emp_id: entrant.emp_id,
          reason: 'Shift Supervisor prohibited worker entry due to safety non-compliance'
        })
      });
    } catch {}

    const updated: EntrantProfile = {
      ...entrant,
      turnstile_unlocked: false,
      access_status: 'ACCESS_DENIED',
      decision_message: 'SUPERVISOR LOCKDOWN: Shift Supervisor (SUP-701) refused worker entry'
    };
    onEntrantUpdate(updated);
    soundEngine.playCriticalSiren();
    speakVoiceWarning(`Supervisor refusal enforced. Worker entry blocked at Gate 1 for ${entrant.name}.`, true);
  };

  // Equipment compliance status computation (Authentic CCTV square color logic)
  const missingList = entrant.missing_ppe || [];
  const wornList = entrant.worn_ppe || [];

  // Primary airlock rule: Helmet and Vest are mandatory optical entry gear
  const hasHelmet = wornList.includes('helmet');
  const hasVest = wornList.includes('vest');
  const hasPrimaryPpe = hasHelmet && hasVest;

  // 1. Fully equipped: Both helmet & vest worn
  const isFullyEquipped = hasPrimaryPpe;

  // 2. Partially equipped: either helmet OR vest worn
  const isPartiallyEquipped = !isFullyEquipped && (hasHelmet || hasVest);

  // 3. Completely missing: Neither helmet nor vest worn
  const isCompletelyMissing = !isFullyEquipped && !isPartiallyEquipped;

  // Square color requested:
  // Green (#00e676) if fully equipped
  // Yellow (#ffb300) if partially equipped
  // Red (#ff1744) if completely missing
  const squareColor = isFullyEquipped
    ? '#00e676'
    : isPartiallyEquipped
    ? '#ffb300'
    : '#ff1744';

  const squareBg = isFullyEquipped
    ? 'rgba(0, 230, 118, 0.14)'
    : isPartiallyEquipped
    ? 'rgba(255, 179, 0, 0.16)'
    : 'rgba(255, 23, 68, 0.20)';

  const statusTitle = isFullyEquipped
    ? 'MANDATORY PPE EQUIPPED - COMPLIANT'
    : isPartiallyEquipped
    ? (hasHelmet && !hasVest ? 'MISSING: VEST' : hasVest && !hasHelmet ? 'MISSING: HELMET' : `MISSING: ${missingList.join(', ').toUpperCase()}`)
    : 'CRITICAL: NO PPE DETECTED';

  const isEntered = entrant.access_status === 'ENTERED' || isFullyEquipped;
  const isReroute = !isEntered && (entrant.access_status === 'PARTIAL_REROUTE' || isPartiallyEquipped);

  const statusLabel = isEntered
    ? '[ACCESS GRANTED] MANDATORY PPE EQUIPPED // TURNSTILE UNLOCKED'
    : isReroute
    ? `[PARTIAL ACCESS] ${statusTitle} // CONTROL ZONE REASSIGNMENT`
    : '[ACCESS DENIED] CRITICAL: MISSING MANDATORY PPE // TURNSTILE LOCKED';

  // Bounding box dimensions
  const [rawX1, rawY1, rawX2, rawY2] = normBox;
  const bx1 = Math.max(3, Math.min(75, rawX1));
  const by1 = Math.max(6, Math.min(70, rawY1));
  const bx2 = Math.min(97, Math.max(bx1 + 22, rawX2));
  const by2 = Math.min(96, Math.max(by1 + 25, rawY2));
  const boxWidth = bx2 - bx1;
  const boxHeight = by2 - by1;

  const labelHeight = 8.2;
  const labelY = by1 < 14 ? by1 + 1 : Math.max(1.0, by1 - labelHeight - 0.5);
  const labelWidth = Math.min(92, Math.max(boxWidth * 1.05, 58));
  const labelX = Math.max(2, Math.min(98 - labelWidth, bx1));

  return (
    <section className="hero-feed-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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

        <div className="feed-actions-group" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Stream Source Toggle (Segmented Pill) */}
          <div
            style={{
              display: 'inline-flex',
              background: 'rgba(15, 23, 42, 0.85)',
              padding: '2px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.12)'
            }}
          >
            <button
              onClick={() => {
                setStreamSource('webcam');
                startWebcam();
              }}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 700,
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                background: streamSource === 'webcam' ? '#00f2fe' : 'transparent',
                color: streamSource === 'webcam' ? '#0a0f1d' : '#94a3b8',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease'
              }}
              title="Switch to Laptop Webcam feed"
            >
              <Camera size={12} />
              Webcam
            </button>
            <button
              onClick={() => setStreamSource('cctv')}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 700,
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                background: streamSource === 'cctv' ? '#00f2fe' : 'transparent',
                color: streamSource === 'cctv' ? '#0a0f1d' : '#94a3b8',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease'
              }}
              title="Switch to Factory CCTV stream"
            >
              <Video size={12} />
              CCTV Feed
            </button>
          </div>

          {/* Next Worker Persona */}
          <button
            className="feed-mini-btn"
            onClick={onRandomizePersona}
            title="Simulate next entrant: generate random worker persona"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 9px',
              borderRadius: '6px'
            }}
          >
            <RefreshCw size={12} />
            <span>Next Worker</span>
          </button>

          {/* Privacy Blur Toggle */}
          <button
            className="feed-mini-btn"
            onClick={() => setDpdpBlur(!dpdpBlur)}
            title="Toggle DPDP Act 2023 Face Privacy Blur"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 9px',
              borderRadius: '6px',
              color: dpdpBlur ? '#00e676' : '#94a3b8',
              borderColor: dpdpBlur ? 'rgba(0, 230, 118, 0.35)' : 'rgba(255, 255, 255, 0.1)'
            }}
          >
            <UserCheck size={12} />
            <span>{dpdpBlur ? 'Privacy Blur: ON' : 'Privacy Blur: OFF'}</span>
          </button>

          {/* Supervisor Voice Warning Toggle */}
          <button
            className="feed-mini-btn"
            onClick={() => setVoiceAlertsEnabled(!voiceAlertsEnabled)}
            title="Toggle Automated Supervisor Voice Advisory"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 9px',
              borderRadius: '6px',
              color: voiceAlertsEnabled ? '#00e676' : '#94a3b8',
              borderColor: voiceAlertsEnabled ? 'rgba(0, 230, 118, 0.35)' : 'rgba(255, 255, 255, 0.1)'
            }}
          >
            {voiceAlertsEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
            <span>{voiceAlertsEnabled ? 'Voice Advisory: ON' : 'Voice Advisory: OFF'}</span>
          </button>

          {/* Play/Pause */}
          <button
            className="feed-mini-btn"
            onClick={togglePlay}
            title={isPlaying ? 'Pause Feed' : 'Resume Feed'}
            style={{ padding: '4px 8px', borderRadius: '6px' }}
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
          </button>

          {/* Fullscreen */}
          <button
            className="feed-mini-btn btn-fullscreen"
            onClick={handleToggleFullscreen}
            title="Full Screen"
            style={{ padding: '4px 8px', borderRadius: '6px' }}
          >
            <Maximize2 size={12} />
          </button>
        </div>
      </div>

      {/* Automated AI Inspection Banner for Project Presentation */}
      <div
        style={{
          padding: '6px 14px',
          background: 'rgba(2, 132, 199, 0.08)',
          borderBottom: '1px solid rgba(0, 242, 254, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: '#cbd5e1'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              padding: '2px 7px',
              borderRadius: '4px',
              background: '#00f2fe',
              color: '#0a0f1d',
              fontWeight: 800,
              fontSize: '10px',
              letterSpacing: '0.05em'
            }}
          >
            AUTOMATED AI SENTINEL
          </span>
          <span>
            Replacing manual supervisor logging with automated vision verification & instant voice warnings.
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: 700 }}>
          <span style={{ color: voiceAlertsEnabled ? '#00e676' : '#94a3b8' }}>
            ● {voiceAlertsEnabled ? 'VOICE ADVISORY ACTIVE' : 'VOICE MUTED'}
          </span>
        </div>
      </div>

      {/* Video Viewport Container with Real-Time Reticles */}
      <div
        className="feed-viewport-container"
        style={{
          flex: 1,
          minHeight: '520px',
          width: '100%',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#050709'
        }}
      >
        {/* CCTV Video */}
        <video
          ref={cctvVideoRef}
          src="/data/cctv_bay1.mp4"
          className="feed-video-player"
          loop
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
          onCanPlay={(e) => {
            const v = e.currentTarget;
            v.play().then(() => {
              setIsPlaying(true);
              setIsWebcamActive(true);
            }).catch(() => {});
          }}
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            v.play().then(() => {
              setIsPlaying(true);
              setIsWebcamActive(true);
            }).catch(() => {});
          }}
          onPlaying={() => {
            setIsPlaying(true);
            setIsWebcamActive(true);
          }}
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
            <span className="cctv-rec-pill">REC</span>
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

        {/* Webcam Standby / 1-Click Activation Overlay */}
        {streamSource === 'webcam' && !isWebcamActive && !webcamError && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 14,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'radial-gradient(circle at center, rgba(15, 23, 42, 0.90) 0%, rgba(5, 7, 9, 0.98) 100%)',
              backdropFilter: 'blur(8px)',
              padding: '24px',
              textAlign: 'center',
              gap: '16px'
            }}
          >
            <div
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                background: 'rgba(0, 242, 254, 0.12)',
                border: '2px solid rgba(0, 242, 254, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 30px rgba(0, 242, 254, 0.4)'
              }}
            >
              <Camera size={36} color="#00f2fe" />
            </div>

            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.04em' }}>
                GATE 01 AIRLOCK OPTICAL WEBCAM
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px', maxWidth: '420px', lineHeight: 1.5 }}>
                Direct optical AI scanner for facial recognition, OSHA 1926 / NFPA 70E PPE compliance, and prohibited contraband interception.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={startWebcam}
                style={{
                  padding: '11px 24px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #00f2fe 0%, #00c6ff 100%)',
                  border: 'none',
                  color: '#0a0f1d',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 0 24px rgba(0, 242, 254, 0.5)',
                  letterSpacing: '0.04em'
                }}
              >
                <Camera size={16} />
                <span>START LIVE WEBCAM</span>
              </button>

              <button
                onClick={() => setStreamSource('cctv')}
                style={{
                  padding: '11px 20px',
                  borderRadius: '6px',
                  background: 'rgba(30, 41, 59, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#cbd5e1',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Video size={16} />
                <span>Switch to CCTV Gate Feed</span>
              </button>
            </div>
          </div>
        )}

        {/* Webcam Error Overlay */}
        {streamSource === 'webcam' && webcamError && (
          <div className="webcam-error-overlay" style={{ zIndex: 15 }}>
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

        {/* SVG Bounding Box Overlays (Exact Industrial CCTV Live Vision Square Style) */}
        <svg className="feed-overlay-canvas" viewBox="0 0 100 100" preserveAspectRatio="none">
          {personDetected ? (
            <g className="entrant-detection-group">
              {/* DPDP Privacy Blur Filter (Face Anonymization) */}
              {dpdpBlur && (
                <ellipse
                  cx={bx1 + boxWidth / 2}
                  cy={by1 + boxHeight * 0.18}
                  rx={boxWidth * 0.18}
                  ry={boxHeight * 0.12}
                  fill="rgba(255, 255, 255, 0.45)"
                  filter="blur(1px)"
                  style={{ backdropFilter: 'blur(10px)' }}
                />
              )}

              {/* 1. Main Worker Detection Square (Green if Fully Equipped, Yellow if Partially, Red if Completely Missing / Contraband) */}
              <rect
                x={bx1}
                y={by1}
                width={boxWidth}
                height={boxHeight}
                fill={squareBg}
                stroke={squareColor}
                strokeWidth="1.0"
                strokeDasharray={isCompletelyMissing ? '3, 1.2' : 'none'}
                rx="1.5"
              />

              {/* 2. High-Tech Corner Reticle Brackets */}
              <path d={`M ${bx1} ${by1 + 4.5} L ${bx1} ${by1} L ${bx1 + 4.5} ${by1}`} fill="none" stroke={squareColor} strokeWidth="1.6" />
              <path d={`M ${bx2 - 4.5} ${by1} L ${bx2} ${by1} L ${bx2} ${by1 + 4.5}`} fill="none" stroke={squareColor} strokeWidth="1.6" />
              <path d={`M ${bx1} ${by2 - 4.5} L ${bx1} ${by2} L ${bx1 + 4.5} ${by2}`} fill="none" stroke={squareColor} strokeWidth="1.6" />
              <path d={`M ${bx2 - 4.5} ${by2} L ${bx2} ${by2} L ${bx2 - 4.5} ${by2}`} fill="none" stroke={squareColor} strokeWidth="1.6" />

              {/* 3. Identity & PPE Compliance Tag Badge Header (Above Worker Square) */}
              <g className="worker-header-badge">
                <rect
                  x={labelX}
                  y={labelY}
                  width={labelWidth}
                  height={labelHeight}
                  fill={squareColor}
                  rx="0.8"
                />
                {/* Line 1: Worker Name, ID, & Department */}
                <text
                  x={labelX + 1.2}
                  y={labelY + 2.5}
                  fill={isCompletelyMissing ? '#ffffff' : '#000000'}
                  fontSize="2.1"
                  fontWeight="900"
                  fontFamily="monospace, sans-serif"
                >
                  NAME: {entrant.name} ({entrant.emp_id}) | DEPT: {entrant.department || entrant.role}
                </text>
                {/* Line 2: Equipment Worn */}
                <text
                  x={labelX + 1.2}
                  y={labelY + 4.9}
                  fill={isCompletelyMissing ? '#ffffff' : '#000000'}
                  fontSize="1.85"
                  fontWeight="800"
                  fontFamily="monospace, sans-serif"
                >
                  WORN: {wornList.length > 0 ? wornList.join(', ').toUpperCase() : 'NONE DETECTED'}
                </text>
                {/* Line 3: Equipment Compliance Status & Missing Gear */}
                <text
                  x={labelX + 1.2}
                  y={labelY + 7.3}
                  fill={isCompletelyMissing ? '#ffffff' : '#000000'}
                  fontSize="1.9"
                  fontWeight="900"
                  fontFamily="monospace, sans-serif"
                >
                  {statusTitle}
                </text>
              </g>
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
            border: `1px solid ${squareColor}`
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {entrant.turnstile_unlocked ? <Unlock size={18} color="#00e676" /> : <Lock size={18} color="#ff1744" />}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: squareColor, letterSpacing: '0.04em' }}>
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

      {/* DOWN SECTION: Dedicated Supervisor Airlock Access Control Station */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          padding: '12px 16px',
          background: 'rgba(15, 23, 42, 0.98)',
          borderTop: '1px solid rgba(56, 189, 248, 0.25)',
          boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.45)',
          fontSize: '11px'
        }}
      >
        {/* Station Header & Real-time Turnstile Authorization Status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: entrant.turnstile_unlocked ? 'rgba(0, 230, 118, 0.2)' : 'rgba(255, 23, 68, 0.2)',
                border: `1px solid ${entrant.turnstile_unlocked ? '#00e676' : '#ff1744'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {entrant.turnstile_unlocked ? <ShieldCheck size={18} color="#00e676" /> : <ShieldAlert size={18} color="#ff1744" />}
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 900, color: '#f8fafc', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>SUPERVISOR AIRLOCK ACCESS CONTROL STATION</span>
                <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '3px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                  AUTH: SUP-701
                </span>
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '1px' }}>
                Worker: <strong style={{ color: '#ffffff' }}>{entrant.name}</strong> ({entrant.emp_id}) · Dept: <strong style={{ color: '#ffffff' }}>{entrant.department}</strong> · Role: {entrant.role}
              </div>
            </div>
          </div>

          {/* Turnstile Access Indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '6px',
              backgroundColor: entrant.turnstile_unlocked ? 'rgba(0, 230, 118, 0.14)' : 'rgba(255, 23, 68, 0.14)',
              border: `1px solid ${entrant.turnstile_unlocked ? '#00e676' : '#ff1744'}`,
              boxShadow: entrant.turnstile_unlocked ? '0 0 12px rgba(0, 230, 118, 0.25)' : '0 0 12px rgba(255, 23, 68, 0.25)'
            }}
          >
            {entrant.turnstile_unlocked ? <Unlock size={16} color="#00e676" /> : <Lock size={16} color="#ff1744" />}
            <span
              style={{
                fontSize: '11px',
                fontWeight: 900,
                letterSpacing: '0.04em',
                color: entrant.turnstile_unlocked ? '#00e676' : '#ff1744'
              }}
            >
              {entrant.turnstile_unlocked ? 'TURNSTILE UNLOCKED // ENTRY ALLOWED' : 'TURNSTILE LOCKED // HOLD AT AIRLOCK'}
            </span>
          </div>
        </div>

        {/* Primary Supervisor Action Control Buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '10px 14px',
            borderRadius: '8px',
            background: 'rgba(30, 41, 59, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#e2e8f0' }}>
              SUPERVISOR DECISION:
            </span>

            {/* Button 1: Allow Worker Entry */}
            <button
              onClick={handleSupervisorAllowEntry}
              style={{
                padding: '8px 18px',
                borderRadius: '6px',
                backgroundColor: '#059669',
                border: '1px solid #10b981',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 900,
                letterSpacing: '0.04em',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 0 14px rgba(16, 185, 129, 0.35)',
                transition: 'all 0.15s ease'
              }}
              title="Supervisor Manual Override: Unlock turnstile and permit worker entry into facility"
            >
              <CheckCircle2 size={16} color="#ffffff" />
              <span>ALLOW WORKER ENTRY (UNLOCK TURNSTILE)</span>
            </button>

            {/* Button 2: Deny Access */}
            <button
              onClick={handleSupervisorDenyEntry}
              style={{
                padding: '8px 18px',
                borderRadius: '6px',
                backgroundColor: '#dc2626',
                border: '1px solid #ef4444',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 900,
                letterSpacing: '0.04em',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 0 14px rgba(239, 68, 68, 0.35)',
                transition: 'all 0.15s ease'
              }}
              title="Supervisor Manual Denial: Lock turnstile and hold worker outside airlock"
            >
              <XCircle size={16} color="#ffffff" />
              <span>DENY ACCESS / LOCK TURNSTILE</span>
            </button>
          </div>

          {/* Button 3: Handover to Factory Monitoring (When Unlocked) */}
          {entrant.turnstile_unlocked && (
            <button
              onClick={() => onProceedToMonitoring(2)}
              style={{
                padding: '8px 18px',
                borderRadius: '6px',
                backgroundColor: '#0284c7',
                border: '1px solid #38bdf8',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 900,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 0 16px rgba(2, 132, 199, 0.55)',
                transition: 'all 0.15s ease'
              }}
              title="Worker Entered: Switch surveillance directly to CCTV 02 (Logistics Bay & Fire Guard)"
            >
              <span>WORKER ENTERED -&gt; MONITOR ON CCTV 02</span>
              <Navigation size={14} color="#ffffff" />
            </button>
          )}
        </div>

        {/* Quick Physical Inspection & Gear Toggles */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap',
            paddingTop: '2px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8' }}>
              PHYSICAL GEAR AUDIT:
            </span>
            {[
              { key: 'helmet', label: 'Helmet' },
              { key: 'vest', label: 'Vest' },
              { key: 'gloves', label: entrant.sector === 'Electrical' ? '1000V Gloves' : 'Gloves' },
              { key: 'boots', label: 'Boots' },
              { key: 'goggles', label: 'Goggles' },
              ...(entrant.sector === 'Construction' || (entrant.required_ppe && entrant.required_ppe.includes('safety_harness'))
                ? [
                    { key: 'safety_harness', label: 'Harness' },
                    { key: 'welding_shield', label: 'Shield' }
                  ]
                : [])
            ].map((item) => {
              const isWorn = entrant.worn_ppe.includes(item.key);
              return (
                <button
                  key={item.key}
                  onClick={() => onToggleGear(item.key)}
                  style={{
                    padding: '4px 9px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    border: isWorn ? '1px solid #00e676' : '1px solid rgba(255,255,255,0.15)',
                    background: isWorn ? 'rgba(0, 230, 118, 0.18)' : 'rgba(30, 41, 59, 0.8)',
                    color: isWorn ? '#00e676' : '#94a3b8',
                    transition: 'all 0.15s ease'
                  }}
                  title={`Toggle ${item.label} worn inspection status`}
                >
                  {isWorn ? `[EQUIPPED] ${item.label}` : `[ADD] ${item.label}`}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={onRandomizePersona}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 800,
                cursor: 'pointer',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                background: 'rgba(56, 189, 248, 0.1)',
                color: '#38bdf8',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Randomize worker from plant registry"
            >
              <RefreshCw size={11} />
              <span>SWITCH WORKER</span>
            </button>
            <span style={{ fontSize: '9px', color: '#64748b' }}>
              ISO 45001 / OSHA 1910.132 / NFPA 101 Station
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
