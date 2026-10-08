import React from 'react';
import {
  Camera,
  Shield,
  FileText,
  BarChart2,
  Volume2,
  VolumeX,
  Maximize2,
  Award,
  Megaphone,
  Layers,
  UserCheck
} from 'lucide-react';
import { PlantTelemetry } from '../types';
import { soundEngine } from '../utils/audio';

export type NavTab = 'vision' | 'gatekeeper' | 'incidents' | 'analytics';

interface NavBarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  telemetry: PlantTelemetry;
  onOpenOshaModal?: () => void;
  onOpenMultiLevelLLM?: () => void;
}

export const NavBar: React.FC<NavBarProps> = ({
  currentTab,
  onSelectTab,
  telemetry,
  onOpenOshaModal,
  onOpenMultiLevelLLM
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
        </button>

        <button
          className={`nav-tab-btn ${currentTab === 'gatekeeper' ? 'active' : ''}`}
          onClick={() => onSelectTab('gatekeeper')}
        >
          <UserCheck size={16} />
          <span>Smart Airlock Gate</span>
        </button>

        <button
          className={`nav-tab-btn ${currentTab === 'incidents' ? 'active' : ''}`}
          onClick={() => onSelectTab('incidents')}
        >
          <FileText size={16} />
          <span>Audit Logs</span>
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
      </div>

      {/* Right Quick Actions & Metrics */}
      <div className="navbar-actions">
        {/* 1-Click Official OSHA Certificate */}
        {onOpenOshaModal && (
          <button
            className="clean-ctrl-btn primary"
            onClick={onOpenOshaModal}
            title="Generate Official ISO 45001 / OSHA 1910 Plant Audit Certificate"
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, rgba(0, 230, 118, 0.2), rgba(0, 242, 254, 0.15))',
              borderColor: 'rgba(0, 230, 118, 0.4)',
              color: '#00e676',
              boxShadow: '0 0 12px rgba(0, 230, 118, 0.15)'
            }}
          >
            <Award size={14} />
            <span>OSHA Certificate</span>
          </button>
        )}

        {/* Multi-Level AI Safety Intelligence Pipeline */}
        {onOpenMultiLevelLLM && (
          <button
            className="clean-ctrl-btn"
            onClick={onOpenMultiLevelLLM}
            title="Open Multi-Level Safety Intelligence Architecture & Interactive Reasoner"
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.18), rgba(124, 58, 237, 0.15))',
              borderColor: 'rgba(0, 242, 254, 0.4)',
              color: '#00f2fe',
              boxShadow: '0 0 12px rgba(0, 242, 254, 0.15)'
            }}
          >
            <Layers size={14} />
            <span>Multi-Level AI</span>
          </button>
        )}

        {/* Voice PA Announcer Indicator / Test */}
        <button
          className="clean-ctrl-btn"
          onClick={() => {
            soundEngine.announceViolation('Fabrication Complex', ['Safety Hardhat', 'Reflective Vest']);
          }}
          title="Factory Voice PA Dispatcher Active. Click to test PA announcement chime."
          style={{
            padding: '5px 10px',
            fontSize: '11px',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            background: 'rgba(255, 179, 0, 0.12)',
            borderColor: 'rgba(255, 179, 0, 0.3)',
            color: '#ffb300'
          }}
        >
          <Megaphone size={12} />
          <span>VOICE PA ACTIVE</span>
        </button>

        {/* Compliance Gauge Pill */}
        <div className={`metric-pill ${complianceClass}`} title="Plant-wide PPE & Hazard Compliance">
          <span className="metric-pill-label">COMPLIANCE</span>
          <span className="metric-pill-value">{telemetry.compliance_pct.toFixed(1)}%</span>
        </div>

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
