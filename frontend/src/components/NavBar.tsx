import React from 'react';
import { Shield, LayoutGrid, Maximize2, Minimize2, Volume2, VolumeX } from 'lucide-react';
import { soundEngine } from '../utils/audio';

interface NavBarProps {
  isFullscreenActive: boolean;
  onToggleFullscreenMode: () => void;
  onSetGridMode: () => void;
  activeCamName?: string;
}

export const NavBar: React.FC<NavBarProps> = ({
  isFullscreenActive,
  onToggleFullscreenMode,
  onSetGridMode,
  activeCamName
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

  const handleToggleBrowserFullscreen = () => {
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
        <div className="navbar-logo-badge">
          <Shield size={20} className="brand-icon" />
          <div className="brand-text-container">
            <span className="brand-title">RAKSHA KAVACH</span>
            <span className="brand-subtitle">Real-Time Multi-Camera AI Sentinel</span>
          </div>
        </div>

        <div className="live-status-chip">
          <span className="live-pulse-dot" />
          <span className="live-label">LIVE EDGE AI</span>
          <span className="live-time">{timeStr}</span>
        </div>
      </div>

      {/* Center View Controls: 4-Camera Grid vs Full-Screen View */}
      <div className="navbar-tabs">
        <button
          className={`nav-tab-btn ${!isFullscreenActive ? 'active' : ''}`}
          onClick={onSetGridMode}
          title="Switch to 4-Camera Grid View"
        >
          <LayoutGrid size={16} />
          <span>4-Camera Grid</span>
        </button>

        <button
          className={`nav-tab-btn ${isFullscreenActive ? 'active' : ''}`}
          onClick={onToggleFullscreenMode}
          title="Expand Camera to Full-Screen Hazard Focus"
        >
          {isFullscreenActive ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          <span>{isFullscreenActive ? `Focus: ${activeCamName || 'Camera'}` : 'Full-Screen Focus'}</span>
        </button>
      </div>

      {/* Right Quick Actions */}
      <div className="navbar-actions">
        {/* Siren Audio Mute/Unmute */}
        <button
          className={`icon-action-btn ${isMuted ? 'muted' : 'active'}`}
          onClick={handleToggleAudio}
          title={isMuted ? 'Unmute Siren Audio' : 'Siren Audio Active (Click to Mute)'}
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>

        {/* Browser Fullscreen */}
        <button
          className="icon-action-btn"
          onClick={handleToggleBrowserFullscreen}
          title="Toggle Browser Fullscreen"
        >
          <Maximize2 size={16} />
        </button>
      </div>
    </nav>
  );
};
