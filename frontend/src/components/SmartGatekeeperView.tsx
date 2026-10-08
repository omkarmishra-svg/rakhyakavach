

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  Flame,
  Radio,
  Zap,
  Briefcase,
  HardHat,
  Play,
  Pause,
  Camera,
  Video,
  Scan,
  Upload,
  Navigation,
  MapPin,
  AlertOctagon,
  UserCheck
} from 'lucide-react';
import { GateLogEntry } from '../types';
import { soundEngine } from '../utils/audio';

interface EntrantProfile {
  emp_id: string;
  name: string;
  role: string;
  department: string;
  destination_department?: string;
  is_executive: boolean;
  required_ppe: string[];
  worn_ppe: string[];
  missing_ppe: string[];
  missing_ppe_alert?: string;
  contraband: string[];
  contraband_alert?: string;
  access_status: 'ENTERED' | 'ACCESS_DENIED' | 'SECURITY_INTERCEPT';
  turnstile_unlocked: boolean;
  guidance_route?: string;
  remedy_guidance?: string;
  active_guidance?: string;
  decision_message: string;
}

const PRESET_SCENARIOS: EntrantProfile[] = [
  {
    emp_id: 'ELEC-1041',
    name: 'Rajesh Sharma',
    role: 'Senior High-Voltage Lineman',
    department: 'Grid Transmission & 66kV Substations',
    destination_department: 'Bay 3 Switchgear Enclosure (Zone A)',
    is_executive: false,
    required_ppe: ['helmet', 'vest', 'goggles', 'gloves'],
    worn_ppe: ['helmet', 'vest', 'goggles', 'gloves'],
    missing_ppe: [],
    contraband: [],
    access_status: 'ENTERED',
    turnstile_unlocked: true,
    guidance_route: 'Proceed through Turnstile 1 -> Follow Yellow Safety Walkway 100m -> Turn Right into Bay 3 High-Voltage Enclosure.',
    remedy_guidance: 'Reroute to Dispenser Kiosk #2 (15m East of Gate 1) to collect missing PPE.',
    active_guidance: '🗺️ AUTHORIZED DESTINATION (Bay 3 Switchgear Enclosure): Proceed through Turnstile 1 -> Follow Yellow Safety Walkway 100m -> Turn Right into Bay 3 High-Voltage Enclosure.',
    decision_message: 'ACCESS GRANTED: All electrical PPE verified. Welcome, Rajesh Sharma.'
  },
  {
    emp_id: 'ELEC-1082',
    name: 'Amit Patel',
    role: 'Substation Switchgear Electrician',
    department: 'Substation Bay Ops',
    destination_department: 'Substation Bay Ops (Room 102)',
    is_executive: false,
    required_ppe: ['helmet', 'vest', 'goggles', 'gloves'],
    worn_ppe: ['helmet', 'vest'],
    missing_ppe: ['goggles', 'gloves'],
    missing_ppe_alert: '⚠️ ACCESS DENIED: Missing mandatory equipment [Safety Goggles, Insulated Electrical Gloves] for Amit Patel (Substation Bay Ops). Turnstile Locked.',
    contraband: [],
    access_status: 'ACCESS_DENIED',
    turnstile_unlocked: false,
    guidance_route: 'Proceed through Turnstile 1 -> Follow Blue Safety Corridor -> Enter Substation Bay Ops Room 102.',
    remedy_guidance: 'Reroute to Safety Equipment Dispenser Kiosk #2 opposite Turnstile 1 to collect Safety Goggles & Insulated Gloves.',
    active_guidance: '🔄 REMEDY NAVIGATION: Reroute to Safety Equipment Dispenser Kiosk #2 opposite Turnstile 1 to collect missing Safety Goggles & Insulated Gloves before entering Substation Bay Ops.',
    decision_message: 'ENTRY BLOCKED: Missing mandatory gear [Safety Goggles, Insulated Gloves]. Don equipment before entering.'
  },
  {
    emp_id: 'ELEC-1109',
    name: 'Vikram Singh',
    role: 'Transformer Maintenance Specialist',
    department: 'High-Voltage Asset Reliability',
    destination_department: 'Power Transformer Enclosure Pad 2',
    is_executive: false,
    required_ppe: ['helmet', 'vest', 'goggles', 'gloves'],
    worn_ppe: ['helmet', 'vest', 'goggles', 'gloves'],
    missing_ppe: [],
    contraband: ['knife', 'cigarettes'],
    contraband_alert: '🚨 CRITICAL SECURITY INTERCEPT: Prohibited item [KNIFE, CIGARETTES] detected on entrant Vikram Singh (ID: ELEC-1109, Dept: High-Voltage Asset Reliability)! Access Denied. Turnstile Locked. Plant Security notified.',
    access_status: 'SECURITY_INTERCEPT',
    turnstile_unlocked: false,
    guidance_route: 'Proceed through Turnstile 1 -> Route North along Perimeter Walkway to Transformer Enclosure Pad 2.',
    remedy_guidance: 'Reroute to Dispenser Kiosk #2 for missing PPE.',
    active_guidance: '⛔ ACCESS HALTED: Please remain at Gate 1 Turnstile. Plant Security is en route regarding prohibited item inspection.',
    decision_message: 'SECURITY ALERT: Prohibited items detected (KNIFE, CIGARETTES). Entry locked. Security notified.'
  },
  {
    emp_id: 'ELEC-1205',
    name: 'Sunita Rao',
    role: 'Substation Automation & SCADA Engineer',
    department: 'Grid Control & SCADA Automation',
    destination_department: 'Central SCADA Automation Control Room (Room 201)',
    is_executive: false,
    required_ppe: ['helmet', 'vest'],
    worn_ppe: ['helmet', 'vest'],
    missing_ppe: [],
    contraband: [],
    access_status: 'ENTERED',
    turnstile_unlocked: true,
    guidance_route: 'Proceed through Turnstile 1 -> Follow Green Corridor to 2nd Floor SCADA Automation Control Center.',
    remedy_guidance: 'Collect safety vest and ESD gear at Kiosk #2 before entering server panels.',
    active_guidance: '🗺️ AUTHORIZED DESTINATION (SCADA Control Room 201): Proceed through Turnstile 1 -> Follow Green Corridor to 2nd Floor SCADA Automation Control Center.',
    decision_message: 'ACCESS GRANTED: SCADA Control Room clearance verified. Welcome, Sunita Rao.'
  },
  {
    emp_id: 'ELEC-1234',
    name: 'Manoj Kumar',
    role: 'Switchyard Protection & Relay Tech',
    department: 'Protection & Control Bay',
    destination_department: 'Relay Calibration & Testing Lab (Bay 4)',
    is_executive: false,
    required_ppe: ['helmet', 'vest', 'goggles', 'gloves'],
    worn_ppe: ['vest', 'gloves'],
    missing_ppe: ['helmet', 'goggles'],
    missing_ppe_alert: '⚠️ ACCESS DENIED: Missing mandatory equipment [Dielectric Hardhat, Safety Goggles] for Manoj Kumar. Turnstile Locked.',
    contraband: [],
    access_status: 'ACCESS_DENIED',
    turnstile_unlocked: false,
    guidance_route: 'Proceed through Turnstile 1 -> Walk through Corridor 3 to Relay Testing Lab.',
    remedy_guidance: 'Collect arc-rated dielectric hardhat and goggles at Dispenser Kiosk #2.',
    active_guidance: '🔄 REMEDY NAVIGATION: Detour to Dispenser Kiosk #2 opposite Turnstile 1 to equip Hardhat and Goggles before entering Protection Bay.',
    decision_message: 'ENTRY BLOCKED: Missing mandatory gear [Dielectric Hardhat, Safety Goggles]. Please equip before entry.'
  },
  {
    emp_id: 'EXEC-0012',
    name: 'Dr. Priya Verma',
    role: 'Executive Vice President - Plant Operations',
    department: 'Corporate Engineering & EHS Council',
    destination_department: 'Executive Observation Deck & Floor Walkthrough',
    is_executive: true,
    required_ppe: ['helmet', 'vest'],
    worn_ppe: ['helmet', 'vest'],
    missing_ppe: [],
    contraband: [],
    access_status: 'ENTERED',
    turnstile_unlocked: true,
    guidance_route: 'Proceed through Turnstile 1 -> Take Elevator 1 to 3rd Floor Observation Deck & Safety Overlook.',
    remedy_guidance: 'Collect executive visitor hardhat and high-vis vest at Gate 1 Reception Desk.',
    active_guidance: '🗺️ AUTHORIZED DESTINATION (Executive Observation Deck): Proceed through Turnstile 1 -> Take Elevator 1 to 3rd Floor Observation Deck & Safety Overlook.',
    decision_message: 'ACCESS GRANTED: Executive escort clearance active. Welcome, Dr. Priya Verma.'
  }
];

export const SmartGatekeeperView: React.FC = () => {
  const [currentEntrant, setCurrentEntrant] = useState<EntrantProfile>(PRESET_SCENARIOS[0]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [gateLogs, setGateLogs] = useState<GateLogEntry[]>([]);
  const [scanTimestamp, setScanTimestamp] = useState<string>(new Date().toLocaleTimeString());

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

  // Fetch initial logs
  useEffect(() => {
    fetchLogs();
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
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
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
    if (streamSource === 'video') {
      startWebcam();
    } else {
      stopWebcam();
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
  const handleLiveFrameScan = async () => {
    setIsScanning(true);

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
          emp_id_override: currentEntrant.emp_id,
          manual_contraband: currentEntrant.contraband
        })
      });

      if (res.ok) {
        const scanRes = await res.json();
        setCurrentEntrant((prev) => {
          const updated: EntrantProfile = {
            ...prev,
            emp_id: scanRes.emp_id || prev.emp_id,
            name: scanRes.name || prev.name,
            role: scanRes.role || prev.role,
            department: scanRes.department || prev.department,
            destination_department: scanRes.destination_department || prev.destination_department,
            access_status: scanRes.access_status || prev.access_status,
            decision_message: scanRes.decision_message || prev.decision_message,
            turnstile_unlocked: scanRes.turnstile_unlocked ?? prev.turnstile_unlocked,
            worn_ppe: scanRes.worn_ppe || prev.worn_ppe,
            missing_ppe: scanRes.missing_ppe || prev.missing_ppe,
            missing_ppe_alert: scanRes.missing_ppe_alert || prev.missing_ppe_alert,
            contraband: scanRes.contraband_detected || prev.contraband,
            contraband_alert: scanRes.contraband_alert || prev.contraband_alert,
            guidance_route: scanRes.guidance_route || prev.guidance_route,
            remedy_guidance: scanRes.remedy_guidance || prev.remedy_guidance,
            active_guidance: scanRes.active_guidance || prev.active_guidance
          };

          if (updated.access_status === 'ENTERED') {
            soundEngine.playChime();
          } else if (updated.access_status === 'SECURITY_INTERCEPT') {
            soundEngine.playCriticalSiren();
          } else {
            soundEngine.playWarnBeep();
          }

          return updated;
        });
      }
    } catch (e) {
      console.warn('Live scan error:', e);
    } finally {
      setTimeout(() => {
        setIsScanning(false);
      }, 400);
    }
  };

  const isEntered = currentEntrant.access_status === 'ENTERED';
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
              NFPA 70E / OSHA Electrical PPE Verification, Contraband Intercept & Department Navigation Guidance
            </p>
          </div>
        </div>

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
              ADMIN PRIVACY SHIELD ACTIVE
            </div>
            <div style={{ fontSize: '10px', color: '#9ca3af' }}>
              Airlock Telemetry Isolated from Admin Block
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
                  onClick={() => {
                    if (webcamStreamRef.current) stopWebcam();
                    setStreamSource('video');
                    if (videoRef.current) {
                      videoRef.current.play().catch(() => {});
                      setIsPlaying(true);
                    }
                  }}
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
                  <span>CCTV</span>
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
                  title="Switch between recorded Gate CCTV and Live Laptop Webcam"
                >
                  <Camera size={12} />
                  <span>{streamSource === 'webcam' ? 'STOP WEBCAM' : 'WEBCAM'}</span>
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
                autoPlay
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

              {/* Live AI Overlay Reticle */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none'
                }}
              >
                {/* Dynamic AI Detection Box */}
                <div
                  style={{
                    width: '220px',
                    height: '290px',
                    border: `2px ${isEntered ? 'solid #10b981' : isBlocked ? 'dashed #f59e0b' : 'solid #ef4444'}`,
                    backgroundColor: isEntered
                      ? 'rgba(16, 185, 129, 0.12)'
                      : isBlocked
                      ? 'rgba(245, 158, 11, 0.12)'
                      : 'rgba(239, 68, 68, 0.16)',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '10px',
                    boxShadow: isEntered
                      ? '0 0 25px rgba(16, 185, 129, 0.35)'
                      : isBlocked
                      ? '0 0 25px rgba(245, 158, 11, 0.35)'
                      : '0 0 30px rgba(239, 68, 68, 0.45)',
                    backdropFilter: 'blur(1px)'
                  }}
                >
                  {/* Top Reticle Label */}
                  <div
                    style={{
                      alignSelf: 'flex-start',
                      backgroundColor: isEntered ? '#10b981' : isBlocked ? '#f59e0b' : '#ef4444',
                      color: '#000',
                      fontSize: '10px',
                      fontWeight: 900,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      letterSpacing: '0.04em'
                    }}
                  >
                    {currentEntrant.is_executive ? 'EXECUTIVE VISITOR' : 'INDIAN UTILITY OPERATOR'}
                  </div>

                  {/* Center Crosshair Target */}
                  <div style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        fontSize: '15px',
                        fontWeight: 800,
                        color: '#fff',
                        textShadow: '0 2px 4px rgba(0,0,0,0.9)'
                      }}
                    >
                      {currentEntrant.name}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#e5e7eb',
                        fontFamily: 'monospace',
                        textShadow: '0 1px 3px rgba(0,0,0,0.9)'
                      }}
                    >
                      {currentEntrant.emp_id} // {currentEntrant.department.slice(0, 24)}
                    </div>
                  </div>

                  {/* Status Pill in Reticle */}
                  <div
                    style={{
                      alignSelf: 'center',
                      padding: '4px 10px',
                      borderRadius: '16px',
                      fontSize: '11px',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      backgroundColor: isEntered
                        ? 'rgba(16, 185, 129, 0.85)'
                        : isBlocked
                        ? 'rgba(245, 158, 11, 0.85)'
                        : 'rgba(239, 68, 68, 0.85)',
                      color: '#000'
                    }}
                  >
                    {isEntered ? <Unlock size={12} /> : <Lock size={12} />}
                    <span>{currentEntrant.access_status}</span>
                  </div>
                </div>
              </div>

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
                LIVE AIRLOCK // {scanTimestamp} // FPS: 30.0 // AI LATENCY: 14ms
              </div>
            </div>

            {/* Turnstile Barrier Live Status Banner */}
            <div
              style={{
                padding: '12px 18px',
                backgroundColor: isEntered
                  ? 'rgba(16, 185, 129, 0.15)'
                  : isBlocked
                  ? 'rgba(245, 158, 11, 0.15)'
                  : 'rgba(239, 68, 68, 0.2)',
                borderTop: `1px solid ${
                  isEntered
                    ? 'rgba(16, 185, 129, 0.4)'
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
                      color: isEntered ? '#10b981' : isBlocked ? '#f59e0b' : '#ef4444',
                      letterSpacing: '0.04em'
                    }}
                  >
                    {isEntered
                      ? 'TURNSTILE UNLOCKED // ENTERED'
                      : isBlocked
                      ? 'TURNSTILE LOCKED // ACCESS DENIED'
                      : 'SECURITY INTERCEPT // EMERGENCY GATE LOCKDOWN'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#d1d5db', marginTop: '2px' }}>
                    {currentEntrant.decision_message}
                  </div>
                </div>
              </div>

              {/* Turnstile Mechanical Indicator */}
              <div
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  backgroundColor: isEntered ? '#10b981' : '#374151',
                  color: isEntered ? '#064e3b' : '#9ca3af',
                  fontSize: '11px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isEntered ? <Unlock size={14} /> : <Lock size={14} />}
                <span>{isEntered ? 'GATE OPEN' : 'BARRIER DOWN'}</span>
              </div>
            </div>
          </div>

          {/* Entrant Profile Badge Card + Live Scan Trigger */}
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

            {/* AI Vision Auto-Detect Button */}
            <button
              onClick={handleLiveFrameScan}
              disabled={isScanning}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                border: '1px solid rgba(59, 130, 246, 0.6)',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 0 15px rgba(59, 130, 246, 0.4)'
              }}
              title="Capture current video frame and run AI person detection & PPE compliance"
            >
              <Scan size={15} />
              <span>{isScanning ? 'AI ANALYZING...' : 'AI VISION SCAN'}</span>
            </button>
          </div>

          {/* Department Wayfinding & Navigation Directive Card */}
          <div
            style={{
              backgroundColor: isEntered
                ? 'rgba(16, 185, 129, 0.08)'
                : isBlocked
                ? 'rgba(245, 158, 11, 0.08)'
                : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${
                isEntered
                  ? 'rgba(16, 185, 129, 0.35)'
                  : isBlocked
                  ? 'rgba(245, 158, 11, 0.35)'
                  : 'rgba(239, 68, 68, 0.35)'
              }`,
              borderRadius: '12px',
              padding: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Navigation size={18} color={isEntered ? '#10b981' : isBlocked ? '#f59e0b' : '#ef4444'} />
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 800,
                  color: isEntered ? '#34d399' : isBlocked ? '#fbbf24' : '#f87171',
                  letterSpacing: '0.04em'
                }}
              >
                {isEntered
                  ? 'AUTHORIZED DEPARTMENT WAYFINDING DIRECTIVE'
                  : isBlocked
                  ? 'SAFETY REMEDY REDIRECTION DIRECTIVE'
                  : 'SECURITY INTERCEPT PROTOCOL'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <MapPin size={20} color={isEntered ? '#10b981' : isBlocked ? '#f59e0b' : '#ef4444'} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#f3f4f6' }}>
                  {isEntered
                    ? `Destination: ${currentEntrant.destination_department || currentEntrant.department}`
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

          {/* Electrical Industry Mandatory PPE Checklist */}
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
                <ShieldCheck size={18} color="#3b82f6" />
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#f3f4f6', letterSpacing: '0.04em' }}>
                  MANDATORY PPE COMPLIANCE VERIFICATION
                </span>
              </div>
              <span style={{ fontSize: '10px', color: '#9ca3af', fontFamily: 'monospace' }}>
                NFPA 70E / OSHA 1910.269
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { key: 'helmet', label: 'Dielectric Hardhat', desc: 'Class E 20kV Rated' },
                { key: 'vest', label: 'Arc-Rated Safety Vest', desc: 'NFPA 70E High-Vis' },
                { key: 'goggles', label: 'Arc Shield / Goggles', desc: 'ANSI Z87.1 Dielectric' },
                { key: 'gloves', label: 'Insulated Electrical Gloves', desc: 'ASTM D120 Class 0/2' }
              ].map((gear) => {
                const isRequired = currentEntrant.required_ppe.includes(gear.key);
                const isWorn = currentEntrant.worn_ppe.includes(gear.key);
                const isMissing = isRequired && !isWorn;

                return (
                  <div
                    key={gear.key}
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
                      justifyContent: 'space-between'
                    }}
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
                      <div style={{ fontSize: '10px', color: '#6b7280' }}>{gear.desc}</div>
                    </div>
                    {isMissing ? (
                      <XCircle size={18} color="#ef4444" />
                    ) : isWorn ? (
                      <CheckCircle size={18} color="#10b981" />
                    ) : (
                      <span style={{ fontSize: '10px', color: '#6b7280' }}>OPTIONAL</span>
                    )}
                  </div>
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
                <Flame size={18} color={currentEntrant.contraband.length > 0 ? '#ef4444' : '#f59e0b'} />
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#f3f4f6', letterSpacing: '0.04em' }}>
                  MISCHIEVOUS & PROHIBITED ITEM RADAR
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
                <strong>🚨 DISPATCH ALERT:</strong> Prohibited item detected on entrant{' '}
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
                <div
                  key={item.key}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: item.detected ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.08)',
                    border: `1px solid ${item.detected ? '#ef4444' : 'rgba(16, 185, 129, 0.3)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: item.detected ? '#f87171' : '#f3f4f6' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '10px', color: '#9ca3af' }}>{item.hazard}</div>
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
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Indian Demo Personnel Selection */}
          <div
            style={{
              backgroundColor: '#111827',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '14px 16px'
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#9ca3af',
                letterSpacing: '0.05em',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <UserCheck size={14} color="#3b82f6" />
              <span>INDIAN DEMO PERSONNEL PROFILES (SELECT TO TEST AIRLOCK SENTINEL)</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {PRESET_SCENARIOS.map((scen, idx) => (
                <button
                  key={scen.emp_id}
                  onClick={() => handleSelectScenario(scen)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor:
                      currentEntrant.emp_id === scen.emp_id ? 'rgba(59, 130, 246, 0.25)' : 'rgba(31, 41, 55, 0.6)',
                    border: `1px solid ${
                      currentEntrant.emp_id === scen.emp_id ? '#3b82f6' : 'rgba(255, 255, 255, 0.08)'
                    }`,
                    color: '#f9fafb',
                    fontSize: '11px',
                    fontWeight: 700,
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>
                      {idx + 1}. {scen.name}
                    </span>
                    <span
                      style={{
                        fontSize: '9px',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        backgroundColor:
                          scen.access_status === 'ENTERED'
                            ? 'rgba(16, 185, 129, 0.3)'
                            : scen.access_status === 'ACCESS_DENIED'
                            ? 'rgba(245, 158, 11, 0.3)'
                            : 'rgba(239, 68, 68, 0.3)',
                        color:
                          scen.access_status === 'ENTERED'
                            ? '#34d399'
                            : scen.access_status === 'ACCESS_DENIED'
                            ? '#fbbf24'
                            : '#f87171'
                      }}
                    >
                      {scen.access_status}
                    </span>
                  </div>
                  <span style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 400 }}>{scen.role}</span>
                </button>
              ))}
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
