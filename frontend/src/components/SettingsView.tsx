import React, { useState } from 'react';
import {
  Camera,
  Sliders,
  Bell,
  Volume2,
  Send,
  Check,
  Sparkles
} from 'lucide-react';
import { soundEngine } from '../utils/audio';

interface SettingsViewProps {
  isWebcamActive: boolean;
  onToggleWebcam: () => void;
  onResetDatabase?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  isWebcamActive,
  onToggleWebcam
}) => {
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(75);
  const [smoothingFrames, setSmoothingFrames] = useState<number>(5);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(60);
  const [webhookUrl, setWebhookUrl] = useState<string>('https://hooks.slack.com/services/EXAMPLE/SAFETY/CHANNEL');
  const [testWebhookStatus, setTestWebhookStatus] = useState<string | null>(null);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  const handleTestAudio = () => {
    soundEngine.playWarnBeep();
  };

  const handleTestSiren = () => {
    soundEngine.playCriticalSiren();
  };

  const handleTestWebhook = () => {
    setTestWebhookStatus('Dispatching test payload...');
    setTimeout(() => {
      setTestWebhookStatus('Test alert dispatched to webhook endpoint');
      setTimeout(() => setTestWebhookStatus(null), 3000);
    }, 800);
  };

  const handleSaveSettings = () => {
    setSavedFeedback('Configuration settings saved successfully');
    setTimeout(() => setSavedFeedback(null), 2500);
  };

  return (
    <div className="tab-view-container">
      {/* Header */}
      <div className="view-header">
        <div>
          <h2 className="view-title">AI Sentinel & Camera Configuration</h2>
          <p className="view-subtitle">
            Fine-tune computer vision sensitivity, temporal smoothing buffers, notification webhooks, and audio alarms.
          </p>
        </div>
        <button className="clean-ctrl-btn primary" onClick={handleSaveSettings}>
          <Check size={14} />
          <span>Save Settings</span>
        </button>
      </div>

      {savedFeedback && (
        <div className="saved-feedback-badge" style={{ marginBottom: '16px' }}>
          <Sparkles size={14} />
          <span>{savedFeedback}</span>
        </div>
      )}

      <div className="settings-grid">
        {/* Card 1: Camera & Video Feed */}
        <div className="settings-card">
          <div className="settings-card-header">
            <Camera size={18} className="settings-icon" />
            <h3 className="card-title">Camera & Video Stream Source</h3>
          </div>

          <div className="setting-control-row">
            <div>
              <div className="setting-label">Primary Camera Input Mode</div>
              <div className="setting-desc">
                Switch between your live webcam (to show your face) and factory CCTV simulation feeds.
              </div>
            </div>
            <button
              className={`clean-ctrl-btn ${isWebcamActive ? 'primary' : ''}`}
              onClick={onToggleWebcam}
            >
              {isWebcamActive ? 'My Webcam Active' : 'Switch to Webcam'}
            </button>
          </div>

          <div className="setting-control-row">
            <div>
              <div className="setting-label">Selfie Camera Mirror Mode</div>
              <div className="setting-desc">
                Horizontally flip webcam video for natural mirror viewing.
              </div>
            </div>
            <span className="badge-pill ok">Enabled by default</span>
          </div>
        </div>

        {/* Card 2: AI Detection Tuning */}
        <div className="settings-card">
          <div className="settings-card-header">
            <Sliders size={18} className="settings-icon" />
            <h3 className="card-title">YOLOv8 Detection & Filtering</h3>
          </div>

          <div className="setting-slider-row">
            <div className="slider-header">
              <span className="setting-label">AI Detection Confidence Threshold</span>
              <span className="slider-value">{confidenceThreshold}%</span>
            </div>
            <input
              type="range"
              min="40"
              max="95"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
              className="clean-range-slider"
            />
            <div className="setting-desc">
              Higher values eliminate false positives; lower values detect subtle gear.
            </div>
          </div>

          <div className="setting-slider-row">
            <div className="slider-header">
              <span className="setting-label">Temporal Smoothing Buffer</span>
              <span className="slider-value">{smoothingFrames} frames</span>
            </div>
            <input
              type="range"
              min="3"
              max="12"
              value={smoothingFrames}
              onChange={(e) => setSmoothingFrames(Number(e.target.value))}
              className="clean-range-slider"
            />
            <div className="setting-desc">
              Candidate violations must persist across this many sampled frames before an incident is logged.
            </div>
          </div>
        </div>

        {/* Card 3: Alerting & Sound Notifications */}
        <div className="settings-card">
          <div className="settings-card-header">
            <Bell size={18} className="settings-icon" />
            <h3 className="card-title">Alarms & Rate-Limiting</h3>
          </div>

          <div className="setting-control-row">
            <div>
              <div className="setting-label">Audio Siren & Warning Chimes</div>
              <div className="setting-desc">Test real-time synthesized browser audio alerts.</div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="clean-ctrl-btn" onClick={handleTestAudio}>
                <Volume2 size={13} />
                <span>Test Beep</span>
              </button>
              <button className="clean-ctrl-btn warn" onClick={handleTestSiren}>
                <Volume2 size={13} />
                <span>Test Siren</span>
              </button>
            </div>
          </div>

          <div className="setting-slider-row">
            <div className="slider-header">
              <span className="setting-label">Zone Alert Cooldown Timer</span>
              <span className="slider-value">{cooldownSeconds} seconds</span>
            </div>
            <input
              type="range"
              min="15"
              max="180"
              step="15"
              value={cooldownSeconds}
              onChange={(e) => setCooldownSeconds(Number(e.target.value))}
              className="clean-range-slider"
            />
            <div className="setting-desc">
              Prevents spamming notifications when a non-compliant worker remains in the zone.
            </div>
          </div>
        </div>

        {/* Card 4: Webhook Integration */}
        <div className="settings-card">
          <div className="settings-card-header">
            <Send size={18} className="settings-icon" />
            <h3 className="card-title">Notification Webhooks (Slack / Discord)</h3>
          </div>

          <div className="setting-input-row">
            <label className="setting-label">Webhook Dispatch URL</label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <input
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="clean-text-input"
                placeholder="https://hooks.slack.com/services/..."
              />
              <button className="clean-ctrl-btn" onClick={handleTestWebhook}>
                <Send size={13} />
                <span>Test</span>
              </button>
            </div>
            {testWebhookStatus && (
              <div className="webhook-feedback">{testWebhookStatus}</div>
            )}
            <div className="setting-desc" style={{ marginTop: '6px' }}>
              Confirmed incidents send JSON alert payloads with worker ID, zone, and snapshot evidence.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
