import React from 'react';
import {
  Camera,
  FileText,
  BarChart2,
  Volume2,
  VolumeX,
  Maximize2,
  Award,
  LogOut,
  UserCheck
} from 'lucide-react';
import { PlantTelemetry, Supervisor } from '../types';
import { soundEngine } from '../utils/audio';

export type NavTab = 'vision' | 'incidents' | 'analytics';

interface NavBarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  telemetry: PlantTelemetry;
  supervisor?: Supervisor | null;
  onLogout?: () => void;
  onOpenOshaModal?: () => void;
  onOpenMultiLevelLLM?: () => void;
}

export const NavBar: React.FC<NavBarProps> = ({
  currentTab,
  onSelectTab,
  telemetry,
  supervisor,
  onLogout,
  onOpenOshaModal
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

  return (
    <nav className="modern-navbar">
      {/* Brand & Live Indicator */}
      <div className="navbar-brand-section">
        <div className="navbar-logo-badge" title="Raksha Kavach: AI Industrial Safety Sentinel">
          <img
            src="/logo.png"
            alt="Raksha Kavach Logo"
            className="navbar-brand-logo-img"
          />
          <div className="brand-text-container">
            <span className="brand-title">RAKSHA KAVACH</span>
            <span className="brand-subtitle">AI SAFETY SENTINEL</span>
          </div>
        </div>

        <div className="live-status-chip" title="Live plant telemetry stream connected">
          <span className="live-pulse-dot" />
          <span className="live-label">LIVE</span>
          <span className="live-time">{timeStr}</span>
        </div>
      </div>

      {/* Center Navigation Tabs: Live Vision, Audit Logs, Analytics */}
      <div className="navbar-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={currentTab === 'vision'}
          className={`nav-tab-btn ${currentTab === 'vision' ? 'active' : ''}`}
          onClick={() => onSelectTab('vision')}
          title="Live Camera Feeds & AI Hazard Monitoring"
        >
          <Camera size={15} />
          <span>Live Vision</span>
        </button>

        <button
          role="tab"
          aria-selected={currentTab === 'incidents'}
          className={`nav-tab-btn ${currentTab === 'incidents' ? 'active' : ''}`}
          onClick={() => onSelectTab('incidents')}
          title="Violation History & Audit Incident Records"
        >
          <FileText size={15} />
          <span>Audit Logs</span>
          {telemetry.active_warnings > 0 && (
            <span
              className="tab-pill-badge warn"
              title={`${telemetry.active_warnings} Active Violations`}
            >
              {telemetry.active_warnings}
            </span>
          )}
        </button>

        <button
          role="tab"
          aria-selected={currentTab === 'analytics'}
          className={`nav-tab-btn ${currentTab === 'analytics' ? 'active' : ''}`}
          onClick={() => onSelectTab('analytics')}
          title="OSHA Compliance Metrics, Hazard Heatmaps & Trends"
        >
          <BarChart2 size={15} />
          <span>Analytics</span>
        </button>
      </div>

      {/* Right Quick Actions & Metrics */}
      <div className="navbar-actions">
        {/* 1-Click Official OSHA Certificate */}
        {onOpenOshaModal && (
          <button
            className="navbar-cert-btn"
            onClick={onOpenOshaModal}
            title="Generate Official ISO 45001 / OSHA 1910 Plant Audit Certificate"
          >
            <Award size={15} />
            <span>OSHA Certificate</span>
          </button>
        )}

        {/* Supervisor Session Status Badge & Logout */}
        {supervisor && (
          <div className="navbar-supervisor-badge" title={`Shift Supervisor: ${supervisor.name} | EmpID: ${supervisor.emp_id} | ${supervisor.email}`}>
            <div className="supervisor-badge-icon">
              <UserCheck size={14} />
            </div>
            <div className="supervisor-badge-info">
              <span className="supervisor-badge-name">{supervisor.name}</span>
              <span className="supervisor-badge-id">{supervisor.emp_id}</span>
            </div>
            {onLogout && (
              <button
                className="supervisor-logout-btn"
                onClick={onLogout}
                title="Log Out Supervisor Session"
                aria-label="Log out"
              >
                <LogOut size={13} />
                <span>EXIT</span>
              </button>
            )}
          </div>
        )}

        {/* Quick Tools Group: Siren Mute & Fullscreen */}
        <div className="navbar-quick-tools">
          <button
            className={`icon-action-btn ${isMuted ? 'muted' : 'active'}`}
            onClick={handleToggleAudio}
            title={isMuted ? 'Unmute Audio Alarm Siren' : 'Audio Alarm Siren Active (Click to Mute)'}
            aria-label="Toggle Audio Siren"
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          <button
            className="icon-action-btn"
            onClick={handleToggleFullscreen}
            title="Toggle Fullscreen Mode"
            aria-label="Toggle Fullscreen"
          >
            <Maximize2 size={15} />
          </button>
        </div>
      </div>
    </nav>
  );
};
