import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Shield,
  AlertTriangle,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  Radio,
  Zap,
  Briefcase,
  HardHat,
  Play,
  Pause,
  Camera,
  Video,
  Upload,
  Navigation,
  MapPin,
  AlertOctagon,
  Shuffle,
  RefreshCw,
  Cpu
} from 'lucide-react';
import { GateLogEntry } from '../types';
import { soundEngine } from '../utils/audio';

interface EntrantProfile {
  emp_id: string;
  name: string;
  role: string;
  department: string;
  destination_department?: string;
  suggested_department?: string;
  is_executive: boolean;
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

const DEFAULT_INITIAL_ENTRANT: EntrantProfile = {
  emp_id: 'OP-LIVE-01',
  name: 'Live Operator Entrant',
  role: 'Field Operations Specialist',
  department: 'Grid Transmission & Substations',
  destination_department: 'Main Fabrication & Switchgear Bay (Zone 1)',
  suggested_department: undefined,
  is_executive: false,
  required_ppe: ['helmet', 'vest', 'goggles', 'gloves', 'boots'],
  worn_ppe: [],
  missing_ppe: ['helmet', 'vest', 'goggles', 'gloves', 'boots'],
  contraband: [],
  access_status: 'ACCESS_DENIED',
  turnstile_unlocked: false,
  decision_message: 'STAND IN FRONT OF WEBCAM / CCTV TO INITIATE LIVE AI PPE AUDIT',
  active_guidance: 'Position yourself within camera view. Raksha Kavach evaluates PPE compliance in real time.'
};

interface SmartGatekeeperViewProps {
  onProceedToMonitoring?: (targetCamId?: number) => void;
}

export const SmartGatekeeperView: React.FC<SmartGatekeeperViewProps> = ({ onProceedToMonitoring }) => {
  const [currentEntrant, setCurrentEntrant] = useState<EntrantProfile>(DEFAULT_INITIAL_ENTRANT);
  const currentEntrantRef = useRef<EntrantProfile>(DEFAULT_INITIAL_ENTRANT);
  currentEntrantRef.current = currentEntrant;

  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [gateLogs, setGateLogs] = useState<GateLogEntry[]>([]);
  const [scanTimestamp, setScanTimestamp] = useState<string>(new Date().toLocaleTimeString());
  const [autoScanEnabled, setAutoScanEnabled] = useState<boolean>(false);
  const [dpdpAnonymizeFaces, setDpdpAnonymizeFaces] = useState<boolean>(true);
  const [supervisorOverrideActive, setSupervisorOverrideActive] = useState<boolean>(false);
  const [emergencyEvacActive, setEmergencyEvacActive] = useState<boolean>(false);

  // Real-time AI Person Tracking & Dynamic Reticle Follower
  const [personDetected, setPersonDetected] = useState<boolean>(false);
  const [personBox, setPersonBox] = useState<{ x1: number; y1: number; x2: number; y2: number }>({
    x1: 54,
    y1: 28,
    x2: 78,
    y2: 95
  });
  const [gearBoxes, setGearBoxes] = useState<any[]>([]);
  const isInferencingRef = useRef<boolean>(false);
  const lastAssignedEmpIdRef = useRef<string | null>(null);
  const emptyFramesRef = useRef<number>(0);
  const [inferenceLatency, setInferenceLatency] = useState<number>(65);

  // Video Streaming & Upload Controls
  const videoRef = useRef<HTMLVideoElement>(null);
  const webcamRef = useRef<HTMLVideoElement>(null);
  const uploadedVideoRef = useRef<HTMLVideoElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [streamSource, setStreamSource] = useState<'video' | 'webcam' | 'upload'>('video');
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [webcamError, setWebcamError] = useState<string | null>(null);

  // Fetch initial logs and auto-start CCTV stream
  useEffect(() => {
    fetchLogs();
    if (videoRef.current) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, []);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setScanTimestamp(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Manage Webcam LifeCycle
  const startWebcam = useCallback(async () => {
    setWebcamError(null);
    try {
      if (videoRef.current) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
      if (uploadedVideoRef.current) {
        uploadedVideoRef.current.pause();
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      webcamStreamRef.current = stream;
      if (webcamRef.current) {
        webcamRef.current.srcObject = stream;
        webcamRef.current.play().catch(() => {});
      }
      setStreamSource('webcam');

      // Automatically assign a random Indian persona and scan after webcam settles
      setTimeout(() => {
        handleScanEntrant(true);
      }, 700);
    } catch (err) {
      console.warn('Webcam stream unavailable:', err);
      setWebcamError('Hardware webcam access unavailable. Reverted to recorded CCTV feed.');
      setStreamSource('video');
    }
  }, []);

  const stopWebcam = useCallback(() => {
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach((track) => track.stop());
      webcamStreamRef.current = null;
    }
    if (webcamRef.current) {
      webcamRef.current.srcObject = null;
    }
    setStreamSource('video');
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.pause();
    }
  }, []);

  useEffect(() => {
    return () => {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const toggleStreamSource = () => {
    if (streamSource === 'webcam') {
      stopWebcam();
    } else {
      startWebcam();
    }
  };

  const switchToCctv = () => {
    if (webcamStreamRef.current) stopWebcam();
    setStreamSource('video');
    lastAssignedEmpIdRef.current = null;
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (webcamStreamRef.current) {
      stopWebcam();
    }

    const objectUrl = URL.createObjectURL(file);
    setUploadedVideoUrl(objectUrl);
    setUploadedFileName(file.name);
    setStreamSource('upload');
    setIsPlaying(true);
  };

  const togglePlay = () => {
    if (streamSource === 'webcam') return;
    const targetVideo = streamSource === 'upload' ? uploadedVideoRef.current : videoRef.current;
    if (targetVideo) {
      if (isPlaying) {
        targetVideo.pause();
        setIsPlaying(false);
      } else {
        targetVideo.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/gate/logs');
      if (res.ok) {
        const data = await res.json();
        if (data.logs && data.logs.length > 0) {
          setGateLogs(data.logs);
        }
      }
    } catch {
      // Offline fallback
    }
  };

  const handleSelectScenario = async (scenario: EntrantProfile) => {
    setIsScanning(true);
    lastAssignedEmpIdRef.current = scenario.emp_id;

    try {
      const res = await fetch('/api/gate/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emp_id_override: scenario.emp_id,
          detected_ppe: scenario.worn_ppe,
          manual_contraband: scenario.contraband
        })
      });

      if (res.ok) {
        const scanRes = await res.json();
        const updatedEntrant: EntrantProfile = {
          emp_id: scanRes.emp_id || scenario.emp_id,
          name: scanRes.name || scenario.name,
          role: scanRes.role || scenario.role,
          department: scanRes.department || scenario.department,
          destination_department: scanRes.destination_department || scenario.destination_department,
          is_executive: scanRes.is_executive ?? scenario.is_executive,
          required_ppe: scanRes.required_ppe || scenario.required_ppe,
          worn_ppe: scanRes.worn_ppe || scenario.worn_ppe,
          missing_ppe: scanRes.missing_ppe || scenario.missing_ppe,
          missing_ppe_alert: scanRes.missing_ppe_alert || scenario.missing_ppe_alert,
          contraband: scanRes.contraband_detected || scenario.contraband,
          contraband_alert: scanRes.contraband_alert || scenario.contraband_alert,
          access_status: scanRes.access_status || scenario.access_status,
          turnstile_unlocked: scanRes.turnstile_unlocked ?? scenario.turnstile_unlocked,
          guidance_route: scanRes.guidance_route || scenario.guidance_route,
          remedy_guidance: scanRes.remedy_guidance || scenario.remedy_guidance,
          active_guidance: scanRes.active_guidance || scenario.active_guidance,
          decision_message: scanRes.decision_message || scenario.decision_message
        };

        setCurrentEntrant(updatedEntrant);

        if (updatedEntrant.access_status === 'ENTERED') {
          soundEngine.playChime();
        } else if (updatedEntrant.access_status === 'SECURITY_INTERCEPT') {
          soundEngine.playCriticalSiren();
        } else {
          soundEngine.playWarnBeep();
        }

        const newLog: GateLogEntry = {
          timestamp: new Date().toLocaleTimeString(),
          emp_id: updatedEntrant.emp_id,
          name: updatedEntrant.name,
          role: updatedEntrant.role,
          department: updatedEntrant.department,
          destination_department: updatedEntrant.destination_department,
          is_executive: updatedEntrant.is_executive,
          access_status: updatedEntrant.access_status,
          turnstile_unlocked: updatedEntrant.turnstile_unlocked,
          required_ppe: updatedEntrant.required_ppe,
          worn_ppe: updatedEntrant.worn_ppe,
          missing_ppe: updatedEntrant.missing_ppe,
          missing_ppe_alert: updatedEntrant.missing_ppe_alert,
          contraband_detected: updatedEntrant.contraband,
          contraband_alert: updatedEntrant.contraband_alert,
          decision_message: updatedEntrant.decision_message,
          guidance_route: updatedEntrant.guidance_route,
          remedy_guidance: updatedEntrant.remedy_guidance,
          active_guidance: updatedEntrant.active_guidance,
          severity: scanRes.severity || 'Medium',
          gate_id: 'GATE-01-AIRLOCK',
          shield_admin_block: true
        };
        setGateLogs((prev) => [newLog, ...prev.slice(0, 19)]);
      } else {
        setCurrentEntrant(scenario);
      }
    } catch {
      setCurrentEntrant(scenario);
    } finally {
      setTimeout(() => {
        setIsScanning(false);
      }, 400);
    }
  };

  // Perform live frame capture & inference scan from video/webcam/upload
  const handleScanEntrant = async (isRandom: boolean = false) => {
    setIsScanning(true);
    if (isRandom) {
      lastAssignedEmpIdRef.current = null;
    }

    const videoEl =
      streamSource === 'webcam'
        ? webcamRef.current
        : streamSource === 'upload'
        ? uploadedVideoRef.current
        : videoRef.current;

    let b64 = '';

    if (videoEl && hiddenCanvasRef.current) {
      const cvs = hiddenCanvasRef.current;
      cvs.width = videoEl.videoWidth || 640;
      cvs.height = videoEl.videoHeight || 360;
      const ctx = cvs.getContext('2d');
      if (ctx) {
        if (streamSource === 'webcam') {
          ctx.translate(cvs.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(videoEl, 0, 0, cvs.width, cvs.height);
        b64 = cvs.toDataURL('image/jpeg', 0.85);
      }
    }

    try {
      const res = await fetch('/api/gate/scan-live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: b64,
          assign_random: isRandom,
          emp_id_override: isRandom ? undefined : currentEntrant.emp_id,
          manual_contraband: currentEntrant.contraband
        })
      });

      if (res.ok) {
        const scanRes = await res.json();

        // Update person tracking square if person detected
        if (scanRes.person_detected && scanRes.norm_box) {
          setPersonDetected(true);
          setPersonBox({
            x1: scanRes.norm_box[0],
            y1: scanRes.norm_box[1],
            x2: scanRes.norm_box[2],
            y2: scanRes.norm_box[3]
          });
        }

        const updated: EntrantProfile = {
          emp_id: scanRes.emp_id || currentEntrant.emp_id,
          name: scanRes.name || currentEntrant.name,
          role: scanRes.role || currentEntrant.role,
          department: scanRes.department || currentEntrant.department,
          destination_department: scanRes.destination_department || currentEntrant.destination_department,
          is_executive: scanRes.is_executive ?? currentEntrant.is_executive,
          required_ppe: scanRes.required_ppe || currentEntrant.required_ppe,
          worn_ppe: scanRes.worn_ppe || [],
          missing_ppe: scanRes.missing_ppe || [],
          missing_ppe_alert: scanRes.missing_ppe_alert,
          contraband: scanRes.contraband_detected || currentEntrant.contraband,
          contraband_alert: scanRes.contraband_alert,
          access_status: scanRes.access_status || 'ACCESS_DENIED',
          turnstile_unlocked: scanRes.turnstile_unlocked ?? false,
          guidance_route: scanRes.guidance_route || currentEntrant.guidance_route,
          remedy_guidance: scanRes.remedy_guidance || currentEntrant.remedy_guidance,
          active_guidance: scanRes.active_guidance || currentEntrant.active_guidance,
          decision_message: scanRes.decision_message || 'Scan completed'
        };

        if (isRandom && scanRes.emp_id) {
          lastAssignedEmpIdRef.current = scanRes.emp_id;
        }

        setCurrentEntrant(updated);

        if (updated.access_status === 'ENTERED') {
          soundEngine.playChime();
        } else if (updated.access_status === 'SECURITY_INTERCEPT') {
          soundEngine.playCriticalSiren();
        } else {
          soundEngine.playWarnBeep();
        }

        const newLog: GateLogEntry = {
          timestamp: new Date().toLocaleTimeString(),
          emp_id: updated.emp_id,
          name: updated.name,
          role: updated.role,
          department: updated.department,
          destination_department: updated.destination_department,
          is_executive: updated.is_executive,
          access_status: updated.access_status,
          turnstile_unlocked: updated.turnstile_unlocked,
          required_ppe: updated.required_ppe,
          worn_ppe: updated.worn_ppe,
          missing_ppe: updated.missing_ppe,
          missing_ppe_alert: updated.missing_ppe_alert,
          contraband_detected: updated.contraband,
          contraband_alert: updated.contraband_alert,
          decision_message: updated.decision_message,
          guidance_route: updated.guidance_route,
          remedy_guidance: updated.remedy_guidance,
          active_guidance: updated.active_guidance,
          severity: scanRes.severity || 'Medium',
          gate_id: 'GATE-01-AIRLOCK',
          shield_admin_block: true
        };
        setGateLogs((prev) => [newLog, ...prev.slice(0, 19)]);
      }
    } catch (e) {
      console.warn('Live scan error:', e);
    } finally {
      setTimeout(() => {
        setIsScanning(false);
      }, 400);
    }
  };

  // Continuous tracking and person detection inference loop
  const runLiveTrackInference = useCallback(async () => {
    if (isInferencingRef.current) return;

    const videoEl =
      streamSource === 'webcam'
        ? webcamRef.current
        : streamSource === 'upload'
        ? uploadedVideoRef.current
        : videoRef.current;

    if (!videoEl || videoEl.paused || videoEl.ended) return;
    if (videoEl.videoWidth === 0 || videoEl.videoHeight === 0) return;

    const startTime = performance.now();

    try {
      const cvs = hiddenCanvasRef.current || document.createElement('canvas');
      cvs.width = 480;
      cvs.height = 270;
      const ctx = cvs.getContext('2d');
      if (!ctx) return;

      if (streamSource === 'webcam') {
        ctx.translate(cvs.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(videoEl, 0, 0, cvs.width, cvs.height);
      const b64 = cvs.toDataURL('image/jpeg', 0.70);

      isInferencingRef.current = true;

      const entrant = currentEntrantRef.current;
      // Assign random name and role upon detecting entrant for the first time
      const shouldRandomize = !lastAssignedEmpIdRef.current;

      const res = await fetch('/api/gate/scan-live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: b64,
          assign_random: shouldRandomize,
          emp_id_override: shouldRandomize ? undefined : entrant.emp_id,
          manual_contraband: entrant.contraband
        })
      });

      const elapsed = Math.round(performance.now() - startTime);
      setInferenceLatency(elapsed);

      if (res.ok) {
        const scanRes = await res.json();
        if (scanRes.ok) {
          if (scanRes.person_detected && scanRes.norm_box) {
            emptyFramesRef.current = 0;
            setPersonDetected(true);
            setPersonBox({
              x1: scanRes.norm_box[0],
              y1: scanRes.norm_box[1],
              x2: scanRes.norm_box[2],
              y2: scanRes.norm_box[3]
            });
            if (shouldRandomize && scanRes.emp_id) {
              lastAssignedEmpIdRef.current = scanRes.emp_id;
            }

            // Save detected gear bounding boxes for real-time overlay
            if (scanRes.gear_boxes) {
              setGearBoxes(scanRes.gear_boxes);
            }

            const current = currentEntrantRef.current;
            const newWornStr = [...(scanRes.worn_ppe || [])].sort().join(',');
            const oldWornStr = [...(current.worn_ppe || [])].sort().join(',');
            const gearChanged = newWornStr !== oldWornStr;
            const statusChanged = scanRes.access_status !== current.access_status;
            const empChanged = shouldRandomize && scanRes.emp_id && scanRes.emp_id !== current.emp_id;
            const deptChanged = scanRes.suggested_department !== current.suggested_department;

            if (gearChanged || statusChanged || empChanged || deptChanged) {
              const updated: EntrantProfile = {
                emp_id: scanRes.emp_id || current.emp_id,
                name: scanRes.name || current.name,
                role: scanRes.role || current.role,
                department: scanRes.department || current.department,
                destination_department: scanRes.destination_department || current.destination_department,
                suggested_department: scanRes.suggested_department || current.suggested_department,
                is_executive: scanRes.is_executive ?? current.is_executive,
                required_ppe: scanRes.required_ppe || current.required_ppe,
                worn_ppe: scanRes.worn_ppe || [],
                missing_ppe: scanRes.missing_ppe || [],
                missing_ppe_alert: scanRes.missing_ppe_alert,
                contraband: scanRes.contraband_detected || current.contraband,
                contraband_alert: scanRes.contraband_alert,
                access_status: scanRes.access_status || 'ACCESS_DENIED',
                turnstile_unlocked: scanRes.turnstile_unlocked ?? false,
                guidance_route: scanRes.guidance_route || current.guidance_route,
                remedy_guidance: scanRes.remedy_guidance || current.remedy_guidance,
                active_guidance: scanRes.active_guidance || current.active_guidance,
                decision_message: scanRes.decision_message || 'Scan completed'
              };

              setCurrentEntrant(updated);

              if (statusChanged) {
                if (updated.access_status === 'ENTERED' || updated.access_status === 'PARTIAL_REROUTE') {
                  soundEngine.playChime();
                } else if (updated.access_status === 'SECURITY_INTERCEPT') {
                  soundEngine.playCriticalSiren();
                } else {
                  soundEngine.playWarnBeep();
                }
              }
            }
          } else {
            // Temporal filter: if no person detected for 3 consecutive frames
            emptyFramesRef.current = (emptyFramesRef.current || 0) + 1;
            if (emptyFramesRef.current >= 3) {
              setPersonDetected(false);
              setGearBoxes([]);
              lastAssignedEmpIdRef.current = null;
              if (currentEntrantRef.current.name !== DEFAULT_INITIAL_ENTRANT.name) {
                setCurrentEntrant(DEFAULT_INITIAL_ENTRANT);
              }
            }
          }
        }
      }
    } catch {
      // Ignore background stream hiccups
    } finally {
      isInferencingRef.current = false;
    }
  }, [streamSource]);

  // Periodic person tracking loop while video/webcam is playing (~2.5 FPS)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isPlaying || streamSource === 'webcam') {
      interval = setInterval(() => {
        runLiveTrackInference();
      }, 400);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, streamSource, runLiveTrackInference]);

  // Quick Simulation Override: Toggle individual gear for live presentations
  const handleToggleGear = (gearKey: string) => {
    const isWorn = currentEntrant.worn_ppe.includes(gearKey);
    const newWorn = isWorn
      ? currentEntrant.worn_ppe.filter((g) => g !== gearKey)
      : [...currentEntrant.worn_ppe, gearKey];

    handleSelectScenario({
      ...currentEntrant,
      worn_ppe: newWorn
    });
  };

  // Quick Simulation Override: Toggle contraband item
  const handleToggleContraband = (itemKey: string) => {
    const hasItem = currentEntrant.contraband.includes(itemKey);
    const newContraband = hasItem
      ? currentEntrant.contraband.filter((c) => c !== itemKey)
      : [...currentEntrant.contraband, itemKey];

    handleSelectScenario({
      ...currentEntrant,
      contraband: newContraband
    });
  };

  // Automatic periodic scan when in webcam mode and autoScan is enabled
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (streamSource === 'webcam' && autoScanEnabled) {
      interval = setInterval(() => {
        handleScanEntrant(false);
      }, 3500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [streamSource, autoScanEnabled]);

  // Manual Supervisor Override (Human-in-the-Loop OSHA/NFPA compliant entry)
  const handleSupervisorOverride = async () => {
    try {
      const res = await fetch('/api/gate/supervisor-override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supervisor_id: 'SUP-701',
          entrant_name: currentEntrant.name,
          entrant_emp_id: currentEntrant.emp_id,
          reason: 'Authorized Emergency High-Voltage Substation Repair'
        })
      });
      if (res.ok) {
        soundEngine.playChime();
        setSupervisorOverrideActive(true);
        setCurrentEntrant((prev) => ({
          ...prev,
          access_status: 'ENTERED',
          turnstile_unlocked: true,
          decision_message: 'OVERRIDE PERMITTED by Supervisor SUP-701 (Shift Lead). Logged to immutable audit trail.'
        }));
        fetchLogs();
      }
    } catch (err) {
      console.warn('Supervisor override error:', err);
    }
  };

  // Emergency Evacuation Fail-Open simulation (NFPA 101 Life Safety Code)
  const handleToggleEmergencyEvac = async () => {
    const next = !emergencyEvacActive;
    setEmergencyEvacActive(next);
    if (next) {
      soundEngine.playCriticalSiren();
      await fetch('/api/gate/emergency-evacuate', { method: 'POST' }).catch(() => {});
      setCurrentEntrant((prev) => ({
        ...prev,
        access_status: 'ENTERED',
        turnstile_unlocked: true,
        decision_message: 'EMERGENCY EVACUATION ACTIVE: All turnstiles de-energized open for unhindered egress.'
      }));
    } else {
      soundEngine.playChime();
      await fetch('/api/gate/reset-evacuate', { method: 'POST' }).catch(() => {});
      handleScanEntrant(true);
    }
    fetchLogs();
  };

  const isEntered = currentEntrant.access_status === 'ENTERED';
  const isReroute = currentEntrant.access_status === 'PARTIAL_REROUTE';
  const isBlocked = currentEntrant.access_status === 'ACCESS_DENIED';
  const isIntercept = currentEntrant.access_status === 'SECURITY_INTERCEPT';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '16px 20px',
        width: '100%',
        maxWidth: '1600px',
        margin: '0 auto'
      }}
    >
      {/* Hidden canvas for live frame capture */}
      <canvas ref={hiddenCanvasRef} style={{ display: 'none' }} />

      {/* Hidden input for custom footage upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="video/*,image/*"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      {/* Top Banner with Administrative Privacy Shield Badge */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'rgba(17, 24, 39, 0.85)',
          border: '1px solid rgba(59, 130, 246, 0.35)',
          borderRadius: '12px',
          padding: '14px 20px',
          backdropFilter: 'blur(10px)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3b82f6'
            }}
          >
            <Zap size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#f9fafb', letterSpacing: '0.04em' }}>
                GATE 1 // SMART AIRLOCK ENTRANT & WAYFINDING SENTINEL
              </h2>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  backgroundColor:
                    streamSource === 'webcam'
                      ? 'rgba(239, 68, 68, 0.2)'
                      : streamSource === 'upload'
                      ? 'rgba(168, 85, 247, 0.2)'
                      : 'rgba(16, 185, 129, 0.15)',
                  border: `1px solid ${
                    streamSource === 'webcam' ? '#ef4444' : streamSource === 'upload' ? '#a855f7' : '#10b981'
                  }`,
                  color:
                    streamSource === 'webcam' ? '#f87171' : streamSource === 'upload' ? '#c084fc' : '#10b981'
                }}
              >
                {streamSource === 'webcam'
                  ? 'LIVE HARDWARE WEBCAM'
                  : streamSource === 'upload'
                  ? `UPLOADED: ${uploadedFileName?.slice(0, 15)}...`
                  : 'CCTV GATE STREAM'}
              </span>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#9ca3af' }}>
              Dynamic Personnel Identification (Indian Profiles), Edge PPE Verification & Department Wayfinding Directives
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* DPDP Act 2023 Face Anonymization Toggle */}
          <button
            onClick={() => setDpdpAnonymizeFaces((prev) => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              borderRadius: '8px',
              backgroundColor: dpdpAnonymizeFaces ? 'rgba(16, 185, 129, 0.15)' : 'rgba(55, 65, 81, 0.5)',
              border: `1px solid ${dpdpAnonymizeFaces ? '#10b981' : '#4b5563'}`,
              color: dpdpAnonymizeFaces ? '#6ee7b7' : '#9ca3af',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            title="Toggles Digital Personal Data Protection (DPDP) Act 2023 edge face anonymization"
          >
            <ShieldCheck size={14} />
            <span>DPDP PRIVACY SHIELD: {dpdpAnonymizeFaces ? 'FACE BLUR ON' : 'OFF'}</span>
          </button>

          {/* Administrative Block Privacy Shield Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: 'rgba(139, 92, 246, 0.15)',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              padding: '8px 14px',
              borderRadius: '8px'
            }}
            title="Data boundary active: Routine worker entry telemetry is restricted to Floor EHS and does not spam administrative channels."
          >
            <Lock size={16} color="#a78bfa" />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#c4b5fd', letterSpacing: '0.05em' }}>
                ADMIN PRIVACY SHIELD
              </div>
              <div style={{ fontSize: '10px', color: '#9ca3af' }}>
                Floor Telemetry Isolated from HR
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Streaming Video Player Card + Entrant Card + Compliance Checklist */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: '20px' }}>
        {/* Left Column: Live Streaming CCTV / Webcam / Upload Viewport */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              backgroundColor: '#0a0d14',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              overflow: 'hidden',
              position: 'relative',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)'
            }}
          >
            {/* Feed Header with Live Controls (CCTV vs Webcam vs Upload) */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 16px',
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Radio size={14} color="#ef4444" className="pulse-dot" />
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#f3f4f6' }}>
                  GATE 01 AIRLOCK STREAM
                </span>
                <span style={{ fontSize: '10px', color: '#6b7280', fontFamily: 'monospace' }}>
                  [AI VISION PROCESSED]
                </span>
              </div>

              {/* Feed Mode Switchers: CCTV vs Live Webcam vs Upload Video */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={togglePlay}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '6px',
                    color: '#f3f4f6',
                    padding: '4px 8px',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer'
                  }}
                  title={isPlaying ? 'Pause Video Stream' : 'Play Video Stream'}
                >
                  {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                  <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
                </button>

                {/* CCTV Toggle */}
                <button
                  onClick={switchToCctv}
                  style={{
                    backgroundColor: streamSource === 'video' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                    border: `1px solid ${streamSource === 'video' ? '#10b981' : 'rgba(255, 255, 255, 0.15)'}`,
                    borderRadius: '6px',
                    color: streamSource === 'video' ? '#34d399' : '#d1d5db',
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer'
                  }}
                  title="Switch to Recorded Gate CCTV feed"
                >
                  <Video size={12} />
                  <span>FETCH CCTV</span>
                </button>

                {/* Webcam Toggle */}
                <button
                  onClick={toggleStreamSource}
                  style={{
                    backgroundColor: streamSource === 'webcam' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(59, 130, 246, 0.25)',
                    border: `1px solid ${streamSource === 'webcam' ? '#ef4444' : '#3b82f6'}`,
                    borderRadius: '6px',
                    color: '#fff',
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer'
                  }}
                  title="Switch to live hardware laptop webcam"
                >
                  <Camera size={12} />
                  <span>{streamSource === 'webcam' ? 'STOP WEBCAM' : 'USE WEBCAM'}</span>
                </button>

                {/* Custom Video Upload Button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    backgroundColor: streamSource === 'upload' ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                    border: `1px solid ${streamSource === 'upload' ? '#a855f7' : 'rgba(255, 255, 255, 0.15)'}`,
                    borderRadius: '6px',
                    color: streamSource === 'upload' ? '#c084fc' : '#d1d5db',
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer'
                  }}
                  title="Upload custom gate video or image footage"
                >
                  <Upload size={12} />
                  <span>UPLOAD</span>
                </button>
              </div>
            </div>

            {webcamError && (
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
                  padding: '6px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#f87171',
                  fontSize: '11px',
                  fontWeight: 600
                }}
              >
                <AlertTriangle size={14} />
                <span>{webcamError}</span>
              </div>
            )}

            {/* Live Streaming Video Player Viewport */}
            <div
              style={{
                position: 'relative',
                height: '380px',
                backgroundColor: '#05070a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}
            >
              {/* Recorded CCTV Video Stream */}
              <video
                ref={videoRef}
                src="/data/cctv_bay1.mp4"
                loop
                muted
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: streamSource === 'video' ? 'block' : 'none'
                }}
              />

              {/* Uploaded Video Stream */}
              <video
                ref={uploadedVideoRef}
                src={uploadedVideoUrl || undefined}
                autoPlay
                loop
                muted
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: streamSource === 'upload' ? 'block' : 'none'
                }}
              />

              {/* Live Webcam Video Stream */}
              <video
                ref={webcamRef}
                autoPlay
                muted
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: streamSource === 'webcam' ? 'block' : 'none',
                  transform: 'scaleX(-1)'
                }}
              />

              {/* Laser Scanning Animation Overlay */}
              {isScanning && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    backgroundColor: '#00f2fe',
                    boxShadow: '0 0 15px #00f2fe, 0 0 35px #00f2fe',
                    animation: 'scannerMove 1s infinite alternate',
                    zIndex: 15
                  }}
                />
              )}

              {/* Authentic Industrial CCTV OSD Overlay */}
              <div className="cctv-osd-overlay" style={{ pointerEvents: 'none', zIndex: 8 }}>
                <div className="cctv-osd-tl">
                  <span className="cctv-rec-pill">● REC</span>
                  <span className="cctv-cam-code">
                    {streamSource === 'webcam' ? 'CAM-GATE [WEBCAM]' : 'CCTV-01 [GATE-AIRLOCK]'}
                  </span>
                  <span className="cctv-zone-tag">GATE 1 AIRLOCK CHECKPOINT</span>
                </div>
                <div className="cctv-osd-tr">
                  <span className="cctv-timestamp">{scanTimestamp}</span>
                  <span className="cctv-specs">
                    {streamSource === 'webcam' ? 'LOCAL WEBCAM · 720p @ 30 FPS' : 'RTSP · 1080p @ 30 FPS · H.264'}
                  </span>
                </div>
              </div>

              {/* Real-time Bounding Box SVG Canvas (Exact copy from Live Vision PPE detection) */}
              <svg
                className="feed-overlay-canvas"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  zIndex: 10
                }}
              >
                {/* 1. Worker Equipment Frame Overlay */}
                {personDetected && (() => {
                  const x1 = Math.max(1, Math.min(85, personBox.x1));
                  const y1 = Math.max(1, Math.min(80, personBox.y1));
                  const x2 = Math.max(x1 + 10, Math.min(99, personBox.x2));
                  const y2 = Math.max(y1 + 18, Math.min(99, personBox.y2));
                  const width = x2 - x1;
                  const height = y2 - y1;

                  const missing = currentEntrant.missing_ppe || [];
                  const worn = currentEntrant.worn_ppe || [];
                  const hasContraband = currentEntrant.contraband && currentEntrant.contraband.length > 0;
                  const isCompliant = !hasContraband && (currentEntrant.access_status === 'ENTERED' || (missing.length === 0 && worn.length > 0));
                  const isPartial = !hasContraband && (currentEntrant.access_status === 'PARTIAL_REROUTE' || (worn.length > 0 && missing.length > 0));

                  let strokeColor: string;
                  let bgColor: string;
                  let labelText: string;

                  if (hasContraband) {
                    strokeColor = '#ff1744';
                    bgColor = 'rgba(255, 23, 68, 0.22)';
                    labelText = `CONTRABAND: ${currentEntrant.contraband.join(', ').toUpperCase()}`;
                  } else if (isCompliant) {
                    strokeColor = '#00e676';
                    bgColor = 'rgba(0, 230, 118, 0.14)';
                    labelText = `WORKER #1 · ALL PPE EQUIPPED`;
                  } else if (isPartial) {
                    strokeColor = '#ffb300';
                    bgColor = 'rgba(255, 179, 0, 0.16)';
                    labelText = `WORKER #1 · MISSING: ${missing.join(', ').toUpperCase()}`;
                  } else {
                    strokeColor = '#ff1744';
                    bgColor = 'rgba(255, 23, 68, 0.20)';
                    labelText = `WORKER #1 · CRITICAL: NO PPE DETECTED`;
                  }

                  const labelWidth = Math.min(98 - x1, Math.max(width * 1.35, labelText.length * 1.95));
                  const labelHeight = 4.4;
                  const labelY = Math.max(0.6, y1 - labelHeight);

                  return (
                    <g key="airlock-worker-box">
                      {/* Bounding Box Frame */}
                      <rect
                        x={x1}
                        y={y1}
                        width={width}
                        height={height}
                        fill={bgColor}
                        stroke={strokeColor}
                        strokeWidth="0.8"
                        strokeDasharray={(!isCompliant && !isPartial) ? '2.5, 1' : 'none'}
                        rx="1"
                      />

                      {/* Industrial Corner Bracket Accents (Live Vision style) */}
                      <path d={`M ${x1} ${y1 + 3} L ${x1} ${y1} L ${x1 + 3} ${y1}`} fill="none" stroke={strokeColor} strokeWidth="1.4" />
                      <path d={`M ${x2 - 3} ${y1} L ${x2} ${y1} L ${x2} ${y1 + 3}`} fill="none" stroke={strokeColor} strokeWidth="1.4" />
                      <path d={`M ${x1} ${y2 - 3} L ${x1} ${y2} L ${x1 + 3} ${y2}`} fill="none" stroke={strokeColor} strokeWidth="1.4" />
                      <path d={`M ${x2 - 3} ${y2} L ${x2} ${y2} L ${x2} ${y2 - 3}`} fill="none" stroke={strokeColor} strokeWidth="1.4" />

                      {/* Top Label Pill Banner */}
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
                        {labelText}
                      </text>
                    </g>
                  );
                })()}

                {/* 2. Detected PPE Sub-Boxes (Helmet, Vest, Gloves, Boots, Goggles) - Clean Minimal Frames */}
                {gearBoxes && gearBoxes.map((gb, idx) => {
                  const [gx1, gy1, gx2, gy2] = gb.box;
                  const gw = Math.max(gx2 - gx1, 5);
                  const gh = Math.max(gy2 - gy1, 5);
                  const gearTag = gb.gear.toUpperCase();
                  const tagWidth = Math.max(gw * 0.9, gearTag.length * 1.5 + 2);
                  const tagY = Math.max(0.6, gy1 - 2.8);

                  return (
                    <g key={`gb-${idx}`}>
                      <rect
                        x={gx1}
                        y={gy1}
                        width={gw}
                        height={gh}
                        fill="rgba(0, 230, 118, 0.08)"
                        stroke="#00e676"
                        strokeWidth="0.5"
                        rx="0.6"
                      />
                      <rect
                        x={gx1}
                        y={tagY}
                        width={tagWidth}
                        height="2.6"
                        fill="#00e676"
                        rx="0.4"
                      />
                      <text
                        x={gx1 + 0.8}
                        y={tagY + 1.9}
                        fill="#000000"
                        fontSize="1.6"
                        fontWeight="900"
                        fontFamily="monospace, sans-serif"
                      >
                        {gearTag}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* OSD Watermark Clock & FPS */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '10px',
                  left: '12px',
                  color: 'rgba(255, 255, 255, 0.75)',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  textShadow: '0 1px 3px #000',
                  pointerEvents: 'none'
                }}
              >
                AIRLOCK SENTRY // {scanTimestamp} // FPS: 30.0 // AI LATENCY: 14ms
              </div>
            </div>

            {/* Turnstile Barrier Live Status Banner */}
            <div
              style={{
                padding: '12px 18px',
                backgroundColor: isEntered
                  ? 'rgba(16, 185, 129, 0.15)'
                  : isReroute
                  ? 'rgba(56, 189, 248, 0.15)'
                  : isBlocked
                  ? 'rgba(245, 158, 11, 0.15)'
                  : 'rgba(239, 68, 68, 0.2)',
                borderTop: `1px solid ${
                  isEntered
                    ? 'rgba(16, 185, 129, 0.4)'
                    : isReroute
                    ? 'rgba(56, 189, 248, 0.4)'
                    : isBlocked
                    ? 'rgba(245, 158, 11, 0.4)'
                    : 'rgba(239, 68, 68, 0.4)'
                }`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {isEntered ? (
                  <CheckCircle size={22} color="#10b981" />
                ) : isReroute ? (
                  <CheckCircle size={22} color="#38bdf8" />
                ) : isBlocked ? (
                  <AlertTriangle size={22} color="#f59e0b" />
                ) : isIntercept ? (
                  <ShieldAlert size={22} color="#ef4444" />
                ) : (
                  <ShieldAlert size={22} color="#ef4444" />
                )}
                <div>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 800,
                      color: isEntered ? '#10b981' : isReroute ? '#38bdf8' : isBlocked ? '#f59e0b' : '#ef4444',
                      letterSpacing: '0.04em'
                    }}
                  >
                    {supervisorOverrideActive
                      ? 'TURNSTILE UNLOCKED // SUPERVISOR OVERRIDE'
                      : isEntered
                      ? 'TURNSTILE UNLOCKED // FULL HAZARD PASS'
                      : isReroute
                      ? 'TURNSTILE UNLOCKED // LOW-HAZARD REASSIGNMENT'
                      : isBlocked
                      ? 'TURNSTILE LOCKED // ACCESS DENIED'
                      : 'SECURITY INTERCEPT // EMERGENCY GATE LOCKDOWN'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#d1d5db', marginTop: '2px' }}>
                    {currentEntrant.decision_message}
                  </div>
                </div>
              </div>

              {/* Turnstile Action & Mechanical Indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {onProceedToMonitoring && (isEntered || isReroute) && (
                  <button
                    onClick={() => onProceedToMonitoring(2)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '6px',
                      backgroundColor: '#0284c7',
                      border: '1px solid rgba(56, 189, 248, 0.6)',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      boxShadow: '0 0 12px rgba(2, 132, 199, 0.4)'
                    }}
                    title="Permit through turnstile: Monitor worker inside Plant via CCTV 02 (Logistics Bay & Fire Guard)"
                  >
                    <span>ENTER FACTORY -&gt; MONITOR ON CCTV 02</span>
                    <Navigation size={12} />
                  </button>
                )}

                <div
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    backgroundColor: isEntered ? '#10b981' : isReroute ? '#38bdf8' : '#374151',
                    color: isEntered ? '#064e3b' : isReroute ? '#082f49' : '#9ca3af',
                    fontSize: '11px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {isEntered || isReroute ? <Unlock size={14} /> : <Lock size={14} />}
                  <span>{isEntered ? 'GATE OPEN' : isReroute ? 'REROUTE PASS' : 'BARRIER DOWN'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* NFPA 101 Life Safety Fail-Safe & Emergency Egress Guarantee Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: emergencyEvacActive ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.08)',
              border: `1px solid ${emergencyEvacActive ? 'rgba(239, 68, 68, 0.5)' : 'rgba(16, 185, 129, 0.3)'}`,
              borderRadius: '10px',
              gap: '12px',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Shield size={18} color={emergencyEvacActive ? '#ef4444' : '#10b981'} />
              <div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: emergencyEvacActive ? '#fca5a5' : '#6ee7b7',
                    letterSpacing: '0.04em'
                  }}
                >
                  {emergencyEvacActive
                    ? 'EMERGENCY EVACUATION ACTIVE // ALL TURNSTILES DE-ENERGIZED OPEN'
                    : 'LIFE-SAFETY FAIL-SAFE GUARANTEE (NFPA 101 / UL 294)'}
                </div>
                <div style={{ fontSize: '10px', color: '#9ca3af' }}>
                  Egress is 100% physically unhindered. Magnetic locks de-energize open during power cut or fire alarm.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={handleSupervisorOverride}
                style={{
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 800,
                  backgroundColor: 'rgba(59, 130, 246, 0.2)',
                  border: '1px solid #3b82f6',
                  borderRadius: '6px',
                  color: '#93c5fd',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                title="Authorized shift lead can manually override entry denial for urgent repairs (Logged to safety audit)"
              >
                Supervisor Override (SUP-701)
              </button>
              <button
                onClick={handleToggleEmergencyEvac}
                style={{
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 800,
                  backgroundColor: emergencyEvacActive ? '#ef4444' : 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #ef4444',
                  borderRadius: '6px',
                  color: emergencyEvacActive ? '#fff' : '#fca5a5',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                title="Simulates emergency fire alarm de-energizing all magnetic gates open"
              >
                {emergencyEvacActive ? 'Reset Standard Gate' : 'Simulate Fire Evacuation'}
              </button>
            </div>
          </div>

          {/* Entrant Profile Badge Card with Random Worker Assignment & Scan Controls */}
          <div
            style={{
              backgroundColor: '#111827',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '16px',
              display: 'grid',
              gridTemplateColumns: 'auto 1fr auto',
              gap: '14px',
              alignItems: 'center'
            }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '12px',
                backgroundColor: currentEntrant.is_executive ? '#ec4899' : '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '22px',
                fontWeight: 800
              }}
            >
              {currentEntrant.is_executive ? <Briefcase size={26} /> : <HardHat size={26} />}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#f9fafb' }}>
                  {currentEntrant.name}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: currentEntrant.is_executive
                      ? 'rgba(236, 72, 153, 0.2)'
                      : 'rgba(59, 130, 246, 0.2)',
                    color: currentEntrant.is_executive ? '#f472b6' : '#60a5fa'
                  }}
                >
                  {currentEntrant.is_executive ? 'EXECUTIVE' : 'FIELD OPERATOR'}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                {currentEntrant.role}
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px', fontFamily: 'monospace' }}>
                ID: {currentEntrant.emp_id} | {currentEntrant.department}
              </div>
            </div>

            {/* Random Worker Assign & Live Scan Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <button
                onClick={() => handleScanEntrant(true)}
                disabled={isScanning}
                style={{
                  padding: '7px 14px',
                  borderRadius: '7px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: '1px solid rgba(16, 185, 129, 0.6)',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  boxShadow: '0 0 12px rgba(16, 185, 129, 0.3)'
                }}
                title="Assign me a random Indian name and designation, and inspect camera frame"
              >
                <Shuffle size={13} />
                <span>{isScanning ? 'ASSIGNING...' : 'ASSIGN RANDOM WORKER & SCAN'}</span>
              </button>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <button
                    onClick={() => handleScanEntrant(false)}
                    disabled={isScanning}
                    style={{
                      padding: '7px 10px',
                      borderRadius: '7px',
                      background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                      border: '1px solid rgba(59, 130, 246, 0.6)',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      boxShadow: '0 0 12px rgba(59, 130, 246, 0.3)'
                    }}
                    title="Re-scan current entrant with live video/webcam frame"
                  >
                    <RefreshCw size={12} />
                    <span>{isScanning ? 'SCANNING...' : 'RE-SCAN'}</span>
                  </button>

                  <button
                    onClick={() => setAutoScanEnabled((prev) => !prev)}
                    style={{
                      padding: '7px 10px',
                      borderRadius: '7px',
                      background: autoScanEnabled
                        ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
                        : 'rgba(255, 255, 255, 0.08)',
                      border: `1px solid ${autoScanEnabled ? '#a78bfa' : 'rgba(255, 255, 255, 0.15)'}`,
                      color: autoScanEnabled ? '#fff' : '#d1d5db',
                      fontSize: '11px',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      cursor: 'pointer'
                    }}
                    title="Toggle continuous auto-scan (every 3.5s) for hands-free entry kiosk operation"
                  >
                    <Radio size={12} color={autoScanEnabled ? '#34d399' : '#9ca3af'} />
                    <span>AUTO: {autoScanEnabled ? 'ON' : 'OFF'}</span>
                  </button>
                </div>
              </div>
          </div>

          {/* Department Wayfinding & Navigation Directive Card */}
          <div
            style={{
              backgroundColor: isEntered
                ? 'rgba(16, 185, 129, 0.08)'
                : isReroute
                ? 'rgba(56, 189, 248, 0.08)'
                : isBlocked
                ? 'rgba(245, 158, 11, 0.08)'
                : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${
                isEntered
                  ? 'rgba(16, 185, 129, 0.35)'
                  : isReroute
                  ? 'rgba(56, 189, 248, 0.35)'
                  : isBlocked
                  ? 'rgba(245, 158, 11, 0.35)'
                  : 'rgba(239, 68, 68, 0.35)'
              }`,
              borderRadius: '12px',
              padding: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Navigation size={18} color={isEntered ? '#10b981' : isReroute ? '#38bdf8' : isBlocked ? '#f59e0b' : '#ef4444'} />
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 800,
                  color: isEntered ? '#34d399' : isReroute ? '#38bdf8' : isBlocked ? '#fbbf24' : '#f87171',
                  letterSpacing: '0.04em'
                }}
              >
                {isEntered
                  ? 'AUTHORIZED DEPARTMENT WAYFINDING DIRECTIVE'
                  : isReroute
                  ? 'DYNAMIC ADAPTIVE DEPARTMENT RE-ASSIGNMENT'
                  : isBlocked
                  ? 'SAFETY REMEDY REDIRECTION DIRECTIVE'
                  : 'SECURITY INTERCEPT PROTOCOL'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <MapPin size={20} color={isEntered ? '#10b981' : isReroute ? '#38bdf8' : isBlocked ? '#f59e0b' : '#ef4444'} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#f3f4f6' }}>
                  {isEntered
                    ? `Authorized Bay: ${currentEntrant.destination_department || currentEntrant.department}`
                    : isReroute
                    ? `Suggested Bay: ${currentEntrant.suggested_department || 'Warehouse Logistics & Freight Staging (Zone 2)'}`
                    : isBlocked
                    ? 'Remedy Point: PPE Safety Dispenser Kiosk #2 (Opposite Turnstile 1)'
                    : 'Gate 1 Quarantine Zone // Security Inspection Bay'}
                </div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px', lineHeight: '1.4' }}>
                  {currentEntrant.active_guidance ||
                    (isEntered
                      ? currentEntrant.guidance_route
                      : isBlocked
                      ? currentEntrant.remedy_guidance
                      : 'Please remain stationary at Gate 1 Turnstile. Plant Security team has been dispatched.')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Electrical PPE Kit Checklist + Contraband Radar + Presets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Missing PPE Warning Banner (if any missing) */}
          {currentEntrant.missing_ppe.length > 0 && (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                boxShadow: '0 0 16px rgba(239, 68, 68, 0.25)'
              }}
            >
              <AlertOctagon size={22} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#f87171' }}>
                  COMPLIANCE ALERT: MANDATORY EQUIPMENT NOT PRESENT
                </div>
                <div style={{ fontSize: '12px', color: '#fca5a5', marginTop: '2px' }}>
                  Entrant {currentEntrant.name} is missing:{' '}
                  <strong>{currentEntrant.missing_ppe.map((m) => m.toUpperCase()).join(', ')}</strong>. Access
                  remains locked until equipped.
                </div>
              </div>
            </div>
          )}

          {/* Mandatory Electrical PPE Checklist + Simulation Quick-Toggles */}
          <div
            style={{
              backgroundColor: '#111827',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '16px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} color="#3b82f6" />
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#f3f4f6', letterSpacing: '0.04em' }}>
                  MANDATORY PPE COMPLIANCE VERIFICATION
                </span>
              </div>
              <span style={{ fontSize: '10px', color: '#9ca3af', fontFamily: 'monospace' }}>
                {currentEntrant.required_ppe.some((p) => p.includes('chemical'))
                  ? 'OSHA 1910.120 / HAZWOPER HAZMAT'
                  : currentEntrant.required_ppe.some((p) => p.includes('harness') || p.includes('welding'))
                  ? 'OSHA 1926 / EN 361 CONSTRUCTION RIGGING'
                  : 'NFPA 70E / OSHA 1910.269 ELECTRICAL UTILITY'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {(
                currentEntrant.required_ppe.some((p) => p.includes('chemical'))
                  ? [
                      { key: 'chemical_suit', label: 'Hazmat Chemical Suit', desc: 'Level B Tychem Splash Suit' },
                      { key: 'chemical_respirator', label: 'Chemical Respirator', desc: 'NIOSH Organic Vapor / Gas Mask' },
                      { key: 'chemical_gloves', label: 'Chemical Gauntlets', desc: 'Nitrile / Butyl Acid-Resistant' },
                      { key: 'chemical_boots', label: 'Acid Chemical Gumboots', desc: 'Heavy Acid & Alkali Soles' }
                    ]
                  : currentEntrant.required_ppe.some((p) => p.includes('harness') || p.includes('welding'))
                  ? [
                      { key: 'helmet', label: 'Construction Hardhat', desc: 'ANSI Type I / II Impact Helmet' },
                      { key: 'vest', label: 'High-Vis Safety Vest', desc: 'Class 2 Reflective Vest' },
                      { key: 'safety_harness', label: 'Fall-Arrest Safety Harness', desc: 'OSHA 1926 Class III Full-Body' },
                      { key: 'boots', label: 'Steel-Toe Boots', desc: 'ASTM F2413 Heavy Duty Boots' },
                      { key: 'gloves', label: 'Heavy Rigging Gloves', desc: 'ANSI Cut-Resistant Gloves' }
                    ]
                  : [
                      { key: 'helmet', label: 'Dielectric Hardhat', desc: 'Class E 20kV Rated' },
                      { key: 'vest', label: 'Arc-Rated Safety Vest', desc: 'NFPA 70E High-Vis' },
                      { key: 'goggles', label: 'Arc Shield / Goggles', desc: 'ANSI Z87.1 Dielectric' },
                      { key: 'gloves', label: 'Insulated Electrical Gloves', desc: 'ASTM D120 Class 0/2' },
                      { key: 'boots', label: 'Dielectric / Steel-Toe Boots', desc: 'ASTM F2413 / EH Footwear' }
                    ]
              ).map((gear) => {
                const isRequired = currentEntrant.required_ppe.includes(gear.key);
                const isWorn = currentEntrant.worn_ppe.includes(gear.key);
                const isMissing = isRequired && !isWorn;

                return (
                  <button
                    key={gear.key}
                    onClick={() => handleToggleGear(gear.key)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: isMissing
                        ? 'rgba(239, 68, 68, 0.12)'
                        : isWorn
                        ? 'rgba(16, 185, 129, 0.12)'
                        : 'rgba(55, 65, 81, 0.3)',
                      border: `1px solid ${
                        isMissing
                          ? 'rgba(239, 68, 68, 0.4)'
                          : isWorn
                          ? 'rgba(16, 185, 129, 0.4)'
                          : 'rgba(255, 255, 255, 0.08)'
                      }`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                    title="Click to toggle this piece of equipment on the entrant"
                  >
                    <div>
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: isMissing ? '#f87171' : isWorn ? '#34d399' : '#9ca3af'
                        }}
                      >
                        {gear.label}
                      </div>
                      <div style={{ fontSize: '10px', color: '#6b7280' }}>
                        {gear.desc} · <span style={{ textDecoration: 'underline' }}>{isWorn ? 'Worn (Click to Remove)' : 'Missing (Click to Equip)'}</span>
                      </div>
                    </div>
                    {isMissing ? (
                      <XCircle size={18} color="#ef4444" />
                    ) : isWorn ? (
                      <CheckCircle size={18} color="#10b981" />
                    ) : (
                      <span style={{ fontSize: '10px', color: '#6b7280' }}>OPTIONAL</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mischievous / Contraband Item Inspection Radar */}
          <div
            style={{
              backgroundColor: '#111827',
              border: `1px solid ${
                currentEntrant.contraband.length > 0 ? 'rgba(239, 68, 68, 0.6)' : 'rgba(255, 255, 255, 0.1)'
              }`,
              borderRadius: '12px',
              padding: '16px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} color={currentEntrant.contraband.length > 0 ? '#ef4444' : '#f59e0b'} />
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#f3f4f6', letterSpacing: '0.04em' }}>
                  PROHIBITED & CONTRABAND ITEM RADAR
                </span>
              </div>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor:
                    currentEntrant.contraband.length > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                  color: currentEntrant.contraband.length > 0 ? '#ef4444' : '#10b981'
                }}
              >
                {currentEntrant.contraband.length > 0 ? 'CRITICAL THREAT' : 'RADAR CLEAR'}
              </span>
            </div>

            {/* Critical Security Alert Dispatch Box if Mischievous item detected */}
            {currentEntrant.contraband.length > 0 && (
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid #ef4444',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  marginBottom: '10px',
                  color: '#f87171',
                  fontSize: '11px',
                  lineHeight: '1.4'
                }}
              >
                <strong>[DISPATCH ALERT]</strong> Prohibited item detected on entrant{' '}
                <strong>{currentEntrant.name}</strong> ({currentEntrant.department}). Turnstile locked down. Plant
                Security notified for gate intercept.
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                {
                  key: 'knife',
                  name: 'Knives / Metallic Blades',
                  hazard: 'Conductor & Flashover Threat',
                  detected: currentEntrant.contraband.includes('knife')
                },
                {
                  key: 'cigarettes',
                  name: 'Cigarettes / Lighters',
                  hazard: 'Combustible Ignition Source',
                  detected: currentEntrant.contraband.includes('cigarettes')
                }
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => handleToggleContraband(item.key)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: item.detected ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.08)',
                    border: `1px solid ${item.detected ? '#ef4444' : 'rgba(16, 185, 129, 0.3)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                  title="Click to toggle carrying this prohibited item"
                >
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: item.detected ? '#f87171' : '#f3f4f6' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '10px', color: '#9ca3af' }}>
                      {item.hazard} · <span style={{ textDecoration: 'underline' }}>{item.detected ? 'Remove' : 'Simulate'}</span>
                    </div>
                  </div>
                  {item.detected ? (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 900,
                        backgroundColor: '#ef4444',
                        color: '#fff',
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}
                    >
                      DETECTED
                    </span>
                  ) : (
                    <CheckCircle size={16} color="#10b981" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Live Edge AI Neural Engine & Airlock Gate Telemetry */}
          <div
            style={{
              backgroundColor: '#111827',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              background: 'linear-gradient(180deg, rgba(17, 24, 39, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: '#93c5fd',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Cpu size={16} color="#3b82f6" />
                <span>LIVE EDGE AI NEURAL ENGINE & TELEMETRY</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '10px',
                    fontWeight: 800,
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    color: '#34d399',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: '1px solid rgba(16, 185, 129, 0.3)'
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: '#10b981',
                      boxShadow: '0 0 6px #10b981'
                    }}
                  />
                  ACTIVE · {inferenceLatency}ms
                </span>

                <button
                  onClick={() => handleScanEntrant(true)}
                  style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    borderRadius: '5px',
                    color: '#93c5fd',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer'
                  }}
                  title="Rescan camera feed and assign identity to new approaching entrant"
                >
                  <RefreshCw size={11} />
                  <span>RE-ID ENTRANT</span>
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              {/* Telemetry Tile 1: AI Model */}
              <div
                style={{
                  backgroundColor: 'rgba(31, 41, 55, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '10px 12px'
                }}
              >
                <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 600, marginBottom: '2px' }}>
                  CORE VISION MODEL
                </div>
                <div style={{ fontSize: '12px', color: '#f3f4f6', fontWeight: 800, fontFamily: 'monospace' }}>
                  YOLOv8-PPE Fine-tuned
                </div>
                <div style={{ fontSize: '10px', color: '#60a5fa', marginTop: '2px' }}>
                  20 Classes · Live Real-Time Feed
                </div>
              </div>

              {/* Telemetry Tile 2: Entrant Lock */}
              <div
                style={{
                  backgroundColor: 'rgba(31, 41, 55, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '10px 12px'
                }}
              >
                <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 600, marginBottom: '2px' }}>
                  TARGET TRACKING
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: personDetected ? '#34d399' : '#f59e0b',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {personDetected ? 'PERSON TRACKED' : 'SEARCHING GATE...'}
                </div>
                <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
                  {personDetected ? `${currentEntrant.name} (${currentEntrant.emp_id})` : 'Stand before camera to scan'}
                </div>
              </div>

              {/* Telemetry Tile 3: Verified Gear */}
              <div
                style={{
                  backgroundColor: 'rgba(31, 41, 55, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '10px 12px'
                }}
              >
                <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 600, marginBottom: '2px' }}>
                  GEAR COMPLIANCE
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color:
                      currentEntrant.worn_ppe.length === currentEntrant.required_ppe.length && currentEntrant.worn_ppe.length > 0
                        ? '#34d399'
                        : currentEntrant.worn_ppe.length > 0
                        ? '#38bdf8'
                        : '#f87171',
                    fontWeight: 800
                  }}
                >
                  {currentEntrant.worn_ppe.length} / {currentEntrant.required_ppe.length} ITEMS WORN
                </div>
                <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
                  {currentEntrant.worn_ppe.length > 0
                    ? currentEntrant.worn_ppe.map((g) => g.toUpperCase()).join(' · ')
                    : 'No safety gear detected'}
                </div>
              </div>

              {/* Telemetry Tile 4: Turnstile Decision */}
              <div
                style={{
                  backgroundColor: 'rgba(31, 41, 55, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '10px 12px'
                }}
              >
                <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 600, marginBottom: '2px' }}>
                  TURNSTILE INTERLOCK
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: currentEntrant.turnstile_unlocked ? '#34d399' : '#f87171',
                    fontWeight: 800
                  }}
                >
                  {currentEntrant.turnstile_unlocked ? 'UNLOCKED / PERMITTED' : 'LOCKED / BLOCKED'}
                </div>
                <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
                  {currentEntrant.access_status} · {currentEntrant.suggested_department || currentEntrant.destination_department}
                </div>
              </div>
            </div>

            {/* Live Camera Gate Audit Trigger */}
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => handleScanEntrant(false)}
                disabled={isScanning}
                style={{
                  backgroundColor: '#2563eb',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '6px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: isScanning ? 'not-allowed' : 'pointer',
                  opacity: isScanning ? 0.7 : 1
                }}
              >
                <Camera size={13} />
                <span>{isScanning ? 'AUDITING FRAME...' : 'CAPTURE AUDIT RECORD'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Turnstile Access Audit Trail Log */}
      <div
        style={{
          backgroundColor: '#111827',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '16px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Briefcase size={16} color="#3b82f6" />
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#f3f4f6', letterSpacing: '0.04em' }}>
              GATE 1 AIRLOCK AUDIT LOGS (FLOOR EHS RESTRICTED // ADMIN SHIELDED)
            </span>
          </div>
          <span style={{ fontSize: '11px', color: '#9ca3af', fontFamily: 'monospace' }}>
            {gateLogs.length} Entrants Recorded
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#9ca3af' }}>
                <th style={{ padding: '8px 10px' }}>TIMESTAMP</th>
                <th style={{ padding: '8px 10px' }}>NAME</th>
                <th style={{ padding: '8px 10px' }}>ROLE</th>
                <th style={{ padding: '8px 10px' }}>DEPARTMENT</th>
                <th style={{ padding: '8px 10px' }}>DECISION</th>
                <th style={{ padding: '8px 10px' }}>STATUS / WAYFINDING</th>
              </tr>
            </thead>
            <tbody>
              {(gateLogs.length > 0
                ? gateLogs
                : [
                    {
                      timestamp: '19:35:10',
                      emp_id: 'ELEC-1041',
                      name: 'Rajesh Sharma',
                      role: 'Senior High-Voltage Lineman',
                      department: 'Grid Transmission',
                      destination_department: 'Bay 3 Switchgear Enclosure',
                      is_executive: false,
                      access_status: 'ENTERED' as const,
                      turnstile_unlocked: true,
                      required_ppe: ['helmet', 'vest', 'goggles', 'gloves'],
                      worn_ppe: ['helmet', 'vest', 'goggles', 'gloves'],
                      missing_ppe: [],
                      contraband_detected: [],
                      decision_message: 'Verified 100% compliant',
                      active_guidance: 'Proceed to Bay 3 Switchgear Enclosure',
                      severity: 'Low',
                      gate_id: 'GATE-01',
                      shield_admin_block: true
                    },
                    {
                      timestamp: '19:32:45',
                      emp_id: 'ELEC-1082',
                      name: 'Amit Patel',
                      role: 'Substation Switchgear Electrician',
                      department: 'Substation Ops',
                      destination_department: 'Substation Bay Ops',
                      is_executive: false,
                      access_status: 'ACCESS_DENIED' as const,
                      turnstile_unlocked: false,
                      required_ppe: ['helmet', 'vest', 'goggles', 'gloves'],
                      worn_ppe: ['helmet', 'vest'],
                      missing_ppe: ['goggles', 'gloves'],
                      contraband_detected: [],
                      decision_message: 'Missing gloves & goggles',
                      active_guidance: 'Reroute to Dispenser Kiosk #2',
                      severity: 'High',
                      gate_id: 'GATE-01',
                      shield_admin_block: true
                    }
                  ]
              ).map((log, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: '#f3f4f6' }}>
                  <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: '#9ca3af' }}>{log.timestamp}</td>
                  <td style={{ padding: '8px 10px', fontWeight: 700 }}>{log.name}</td>
                  <td style={{ padding: '8px 10px', color: '#d1d5db' }}>{log.role}</td>
                  <td style={{ padding: '8px 10px', color: '#9ca3af' }}>{log.department}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 800,
                        backgroundColor:
                          log.access_status === 'ENTERED'
                            ? 'rgba(16, 185, 129, 0.2)'
                            : log.access_status === 'ACCESS_DENIED'
                            ? 'rgba(245, 158, 11, 0.2)'
                            : 'rgba(239, 68, 68, 0.2)',
                        color:
                          log.access_status === 'ENTERED'
                            ? '#34d399'
                            : log.access_status === 'ACCESS_DENIED'
                            ? '#fbbf24'
                            : '#f87171'
                      }}
                    >
                      {log.access_status}
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px', color: log.access_status === 'ENTERED' ? '#34d399' : '#f87171' }}>
                    {log.contraband_detected && log.contraband_detected.length > 0
                      ? `Contraband: ${log.contraband_detected.join(', ')}`
                      : log.missing_ppe && log.missing_ppe.length > 0
                      ? `Missing: ${log.missing_ppe.join(', ')}`
                      : log.destination_department
                      ? `Guided to: ${log.destination_department}`
                      : 'Full Compliance'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
