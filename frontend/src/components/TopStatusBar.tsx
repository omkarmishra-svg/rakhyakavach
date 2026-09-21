import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, BarChart2, Maximize2, Shield, Radio } from 'lucide-react';
import { PlantTelemetry } from '../types';
import { soundEngine } from '../utils/audio';

interface TopStatusBarProps {
  telemetry: PlantTelemetry;
  onOpenAnalytics: () => void;
}

export const TopStatusBar: React.FC<TopStatusBarProps> = ({
  telemetry,
  onOpenAnalytics
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [isMuted, setIsMuted] = useState<boolean>(false);

  useEffect(() => {
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
    <header className="top-status-bar">
      <div className="top-status-left">
        <div className="plant-identity">
          <div className="plant-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} color="var(--safety-green)" />
            <span>RAKSHA KAVACH</span>
            <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>·</span>
            <span style={{ color: 'var(--text-dim)' }}>SAFETY COMMAND</span>
          </div>
        </div>

        <div className="telemetry-divider" />

        <div className="top-metrics-group">
          {/* Live Compliance */}
          <div className="top-metric">
            <span className="metric-label">COMPLIANCE</span>
            <span className={`metric-val ${complianceClass}`}>
              {telemetry.compliance_pct.toFixed(1)}%
            </span>
          </div>

          {/* Active Warnings */}
          <div className="top-metric">
            <span className="metric-label">ACTIVE WARNINGS</span>
            <span className={`metric-val ${telemetry.active_warnings > 0 ? 'warn' : 'ok'}`}>
              {telemetry.active_warnings} WARN
            </span>
          </div>

          {/* Critical Fire / Hazards */}
          <div className="top-metric">
            <span className="metric-label">HAZARDS</span>
            <span className={`metric-val ${telemetry.critical_hazards > 0 ? 'critical' : 'ok'}`}>
              {telemetry.critical_hazards > 0 ? 'DETECTED' : 'CLEAR'}
            </span>
          </div>

          {/* Sentinel Status */}
          <div className="top-metric">
            <span className="metric-label">AI SENTINEL</span>
            <span className="metric-val" style={{ color: 'var(--safety-green)' }}>
              ACTIVE
            </span>
          </div>
        </div>
      </div>

      <div className="top-status-right">
        {/* Live Broadcast Indicator */}
        <div className="status-pill ok" style={{ fontSize: '11px', padding: '3px 8px' }}>
          <Radio size={13} className="animate-pulse" />
          <span>LIVE FEED</span>
        </div>

        {/* Digital Shift Clock */}
        <div
          className="font-mono"
          style={{
            fontSize: '13px',
            fontWeight: 600,
            padding: '4px 10px',
            backgroundColor: 'var(--surface-panel-subtle)',
            border: '1px solid var(--border-hairline)',
            color: 'var(--text-primary)',
            letterSpacing: '0.05em'
          }}
        >
          {timeStr || '18:42:00'} UTC
        </div>

        {/* Analytics Modal Toggle */}
        <button
          className="control-btn"
          onClick={onOpenAnalytics}
          title="Open Compliance Analytics & Trend Report"
        >
          <BarChart2 size={14} />
          <span>ANALYTICS</span>
        </button>

        {/* Audio Siren Toggle */}
        <button
          className={`control-btn ${isMuted ? '' : 'alerting'}`}
          onClick={handleToggleAudio}
          title={isMuted ? 'Unmute Industrial Siren' : 'Industrial Siren Active (Click to Mute)'}
        >
          {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          <span>{isMuted ? 'MUTED' : 'AUDIO ON'}</span>
        </button>

        {/* Fullscreen Instrument Wall Toggle */}
        <button
          className="control-btn"
          onClick={handleToggleFullscreen}
          title="Toggle Fullscreen Instrument Wall"
        >
          <Maximize2 size={14} />
        </button>
      </div>
    </header>
  );
};
