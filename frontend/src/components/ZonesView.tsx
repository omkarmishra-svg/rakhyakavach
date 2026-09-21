import React, { useState } from 'react';
import { Shield, Camera, Check, Sparkles } from 'lucide-react';
import { Zone } from '../types';

interface ZonesViewProps {
  zones: Zone[];
  onUpdateZonePPE: (zoneId: string, ppeList: string[]) => void;
  onUpdateZoneRisk: (zoneId: string, riskLevel: 'Low' | 'Medium' | 'High' | 'Critical') => void;
  onSwitchCamera: (cameraId: string) => void;
}

const ALL_PPE_OPTIONS = [
  { id: 'helmet', label: 'Hardhat / Helmet' },
  { id: 'vest', label: 'Hi-Vis Safety Vest' },
  { id: 'boots', label: 'Steel-Toe Boots' },
  { id: 'gloves', label: 'Safety Gloves' },
  { id: 'goggles', label: 'Eye Protection / Goggles' },
  { id: 'mask', label: 'Respirator Mask' }
];

export const ZonesView: React.FC<ZonesViewProps> = ({
  zones,
  onUpdateZonePPE,
  onUpdateZoneRisk,
  onSwitchCamera
}) => {
  const [selectedZoneId, setSelectedZoneId] = useState<string>(zones[0]?.zone_id || 'zone_4');
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  const selectedZone = zones.find((z) => z.zone_id === selectedZoneId) || zones[0];

  const handleTogglePPE = (ppeId: string) => {
    if (!selectedZone) return;
    const currentList = selectedZone.required_ppe;
    let updated: string[];
    if (currentList.includes(ppeId)) {
      updated = currentList.filter((item) => item !== ppeId);
    } else {
      updated = [...currentList, ppeId];
    }
    onUpdateZonePPE(selectedZone.zone_id, updated);
    setSavedFeedback(`PPE rules updated for ${selectedZone.name}`);
    setTimeout(() => setSavedFeedback(null), 2500);
  };

  const handleRiskChange = (newRisk: 'Low' | 'Medium' | 'High' | 'Critical') => {
    if (!selectedZone) return;
    onUpdateZoneRisk(selectedZone.zone_id, newRisk);
    setSavedFeedback(`Risk level set to ${newRisk}`);
    setTimeout(() => setSavedFeedback(null), 2500);
  };

  return (
    <div className="tab-view-container">
      <div className="view-header">
        <div>
          <h2 className="view-title">Factory Zone Safety Rules & Mandates</h2>
          <p className="view-subtitle">
            Configure dynamic PPE requirements, risk classifications, and occupancy thresholds per zone.
          </p>
        </div>
        {savedFeedback && (
          <div className="saved-feedback-badge">
            <Sparkles size={14} />
            <span>{savedFeedback}</span>
          </div>
        )}
      </div>

      <div className="zones-management-grid">
        {/* Left Side: Zone Card List */}
        <div className="zone-cards-column">
          {zones.map((zone) => {
            const isSelected = zone.zone_id === selectedZoneId;
            const statusClass = zone.status.toLowerCase();

            return (
              <div
                key={zone.zone_id}
                className={`zone-manage-card ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedZoneId(zone.zone_id)}
              >
                <div className="zone-manage-header">
                  <div className="zone-info">
                    <span className={`status-dot ${statusClass}`} />
                    <span className="zone-name">{zone.name}</span>
                  </div>
                  <span className={`risk-badge ${zone.risk_level.toLowerCase()}`}>
                    {zone.risk_level} Risk
                  </span>
                </div>

                <div className="zone-manage-details">
                  <span className="detail-item">
                    {zone.worker_count} Workers Monitored
                  </span>
                  <span className="detail-item">
                    {zone.required_ppe.length} Required Gear
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Side: Selected Zone Rule Editor */}
        {selectedZone && (
          <div className="zone-editor-panel">
            <div className="editor-header">
              <div>
                <h3 className="editor-zone-title">{selectedZone.name}</h3>
                <span className="editor-zone-subtitle">
                  Active Monitored Safety Zone
                </span>
              </div>
              <button
                className="clean-ctrl-btn"
                onClick={() => onSwitchCamera(selectedZone.camera_id)}
              >
                <Camera size={14} />
                <span>View in Live Feed</span>
              </button>
            </div>

            <div className="editor-section">
              <label className="editor-label">Description & Hazard Context</label>
              <p className="editor-text">{selectedZone.description}</p>
            </div>

            {/* Risk Level Selector */}
            <div className="editor-section">
              <label className="editor-label">Zone Safety Risk Level</label>
              <div className="risk-level-selector">
                {(['Low', 'Medium', 'High', 'Critical'] as const).map((r) => (
                  <button
                    key={r}
                    className={`risk-btn ${r.toLowerCase()} ${
                      selectedZone.risk_level === r ? 'active' : ''
                    }`}
                    onClick={() => handleRiskChange(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Required PPE Toggles */}
            <div className="editor-section">
              <label className="editor-label">Enforced PPE Mandates for this Zone</label>
              <div className="ppe-toggles-grid">
                {ALL_PPE_OPTIONS.map((opt) => {
                  const isChecked = selectedZone.required_ppe.includes(opt.id);
                  return (
                    <div
                      key={opt.id}
                      className={`ppe-toggle-card ${isChecked ? 'active' : ''}`}
                      onClick={() => handleTogglePPE(opt.id)}
                    >
                      <div className="checkbox-icon">
                        {isChecked ? <Check size={14} /> : null}
                      </div>
                      <span className="ppe-name">{opt.label}</span>
                      <span className="ppe-status">{isChecked ? 'Required' : 'Optional'}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Enforcement Preview */}
            <div className="editor-enforcement-preview">
              <Shield size={18} className="shield-icon" />
              <div>
                <div className="preview-title">Real-Time AI Sentinel Enforcement</div>
                <div className="preview-desc">
                  Workers entering {selectedZone.name} must wear {selectedZone.required_ppe.join(', ').toUpperCase() || 'standard factory uniform'}. Any omission detected for 3+ consecutive frames triggers a confirmed violation log and siren alert.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
