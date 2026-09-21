import React from 'react';
import {
  Camera,
  Video,
  Shield,
  Layers,
  FileText,
  BarChart2,
  Settings,
  Volume2,
  VolumeX,
  Maximize2,
  AlertTriangle
} from 'lucide-react';
import { PlantTelemetry } from '../types';
import { soundEngine } from '../utils/audio';

export type NavTab = 'vision' | 'zones' | 'incidents' | 'analytics' | 'settings';

interface NavBarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  telemetry: PlantTelemetry;
  isWebcamActive: boolean;
  onToggleWebcam: () => void;
  onTriggerAlert: () => void;
  activeZoneName?: string;
}

export const NavBar: React.FC<NavBarProps> = ({
  currentTab,
  onSelectTab,
  telemetry,
  isWebcamActive,
  onToggleWebcam,
  onTriggerAlert
}) => {
  const [isMuted, setIsMuted] = React.useState<boolean>(false);
  const [timeStr, setTimeStr] = React.useState<string>('');

  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-US', { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleAudio = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const complianceClass =
    telemetry.compliance_pct >= 90 ? 'ok' : telemetry.compliance_pct >= 75 ? 'warn' : 'critical';

  return (
    <nav className="modern-navbar">
      {/* Brand & Live Indicator */}
      <div className="navbar-brand-section">
        <div className="navbar-logo-badge">
          <Shield size={20} className="brand-icon" />
          <div className="brand-text-container">
            <span className="brand-title">RAKSHA KAVACH</span>
            <span className="brand-subtitle">AI SAFETY SENTINEL</span>
          </div>
        </div>

        <div className="live-status-chip">
          <span className="live-pulse-dot" />
          <span className="live-label">LIVE</span>
          <span className="live-time">{timeStr}</span>
        </div>
      </div>

      {/* Center Navigation Tabs */}
      <div className="navbar-tabs">
        <button
          className={`nav-tab-btn ${currentTab === 'vision' ? 'active' : ''}`}
          onClick={() => onSelectTab('vision')}
        >
          <Camera size={16} />
          <span>Live Vision</span>
          {isWebcamActive && <span className="tab-pill-badge">Face Cam</span>}
        </button>

        <button
          className={`nav-tab-btn ${currentTab === 'zones' ? 'active' : ''}`}
          onClick={() => onSelectTab('zones')}
        >
          <Layers size={16} />
          <span>Safety Zones</span>
        </button>

        <button
          className={`nav-tab-btn ${currentTab === 'incidents' ? 'active' : ''}`}
          onClick={() => onSelectTab('incidents')}
        >
          <FileText size={16} />
          <span>Incident Logs</span>
          {telemetry.active_warnings > 0 && (
            <span className="tab-pill-badge warn">{telemetry.active_warnings}</span>
          )}
        </button>

        <button
          className={`nav-tab-btn ${currentTab === 'analytics' ? 'active' : ''}`}
          onClick={() => onSelectTab('analytics')}
        >
          <BarChart2 size={16} />
          <span>Analytics</span>
        </button>

        <button
          className={`nav-tab-btn ${currentTab === 'settings' ? 'active' : ''}`}
          onClick={() => onSelectTab('settings')}
        >
          <Settings size={16} />
          <span>AI Settings</span>
        </button>
      </div>

      {/* Right Quick Actions & Metrics */}
      <div className="navbar-actions">
        {/* Compliance Gauge Pill */}
        <div className={`metric-pill ${complianceClass}`} title="Plant-wide PPE & Hazard Compliance">
          <span className="metric-pill-label">COMPLIANCE</span>
          <span className="metric-pill-value">{telemetry.compliance_pct.toFixed(1)}%</span>
        </div>

        {/* Camera Source Switcher Button (Live Camera vs CCTV) */}
        <button
          className={`action-btn cam-toggle-btn ${isWebcamActive ? 'active-webcam' : ''}`}
          onClick={onToggleWebcam}
          title={isWebcamActive ? 'Switch to CCTV feed' : 'Switch to Live Camera'}
        >
          {isWebcamActive ? <Camera size={15} /> : <Video size={15} />}
          <span>{isWebcamActive ? 'Switch to CCTV' : 'Live Camera'}</span>
        </button>

        {/* Test Hazard Trigger */}
        <button
          className="action-btn alert-trigger-btn"
          onClick={onTriggerAlert}
          title="Simulate a safety hazard or PPE violation"
        >
          <AlertTriangle size={15} />
          <span>Test Hazard</span>
        </button>

        {/* Audio Mute/Unmute */}
        <button
          className={`icon-action-btn ${isMuted ? 'muted' : 'active'}`}
          onClick={handleToggleAudio}
          title={isMuted ? 'Unmute Audio Siren' : 'Siren Active (Click to Mute)'}
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>

        {/* Fullscreen */}
        <button
          className="icon-action-btn"
          onClick={handleToggleFullscreen}
          title="Toggle Fullscreen"
        >
          <Maximize2 size={16} />
        </button>
      </div>
    </nav>
  );
};
