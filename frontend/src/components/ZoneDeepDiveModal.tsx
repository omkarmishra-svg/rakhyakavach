import React from 'react';
import { X, Shield, Camera, CheckSquare } from 'lucide-react';
import { Zone } from '../types';

interface ZoneDeepDiveModalProps {
  zone: Zone | null;
  onClose: () => void;
  onSwitchCamera: (cameraId: string) => void;
}

export const ZoneDeepDiveModal: React.FC<ZoneDeepDiveModalProps> = ({
  zone,
  onClose,
  onSwitchCamera
}) => {
  if (!zone) return null;

  const statusClass = zone.status.toLowerCase();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-window" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={16} color="var(--text-primary)" />
            <span className="modal-title">
              ZONE SPECIFICATION // {zone.name.toUpperCase()}
            </span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Header Row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--surface-panel-subtle)',
              padding: '12px',
              border: '1px solid var(--border-hairline)'
            }}
          >
            <div>
              <div className="font-display" style={{ fontSize: '20px', fontWeight: 800 }}>
                {zone.name}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span className={`status-pill ${statusClass}`}>
                {zone.status === 'OK' ? 'OK' : zone.status === 'WARN' ? 'PPE WARN' : 'FIRE CRITICAL'}
              </span>
            </div>
          </div>

          {/* Zone Description */}
          <div>
            <span className="metric-label">ZONE PROFILE & HAZARD PROFILE</span>
            <p
              style={{
                fontSize: '13px',
                color: 'var(--text-primary)',
                marginTop: '4px',
                lineHeight: 1.5
              }}
            >
              {zone.description}
            </p>
          </div>

          {/* Required PPE Mandates */}
          <div>
            <span className="metric-label">ENFORCED SAFETY GEAR MANDATES</span>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                marginTop: '6px'
              }}
            >
              {zone.required_ppe.map((ppe) => (
                <div
                  key={ppe}
                  style={{
                    backgroundColor: 'var(--surface-panel-subtle)',
                    border: '1px solid var(--border-hairline)',
                    padding: '8px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    fontWeight: 600
                  }}
                >
                  <CheckSquare size={14} color="var(--safety-green)" />
                  <span>{ppe.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Occupancy and Telemetry */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '10px',
              backgroundColor: 'var(--surface-panel-subtle)',
              border: '1px solid var(--border-hairline)',
              padding: '12px'
            }}
          >
            <div>
              <span className="metric-label">ACTIVE OCCUPANCY</span>
              <div
                className="font-display"
                style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}
              >
                {zone.worker_count} WORKERS
              </div>
            </div>

            <div>
              <span className="metric-label">RISK CLASSIFICATION</span>
              <div
                className="font-display"
                style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  color:
                    zone.risk_level === 'Critical'
                      ? 'var(--safety-red)'
                      : zone.risk_level === 'High'
                      ? 'var(--safety-amber)'
                      : 'var(--text-primary)'
                }}
              >
                {zone.risk_level.toUpperCase()}
              </div>
            </div>

            <div>
              <span className="metric-label">FEED STATUS</span>
              <div
                className="font-display"
                style={{ fontSize: '22px', fontWeight: 800, color: 'var(--safety-green)' }}
              >
                ACTIVE
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="control-btn" onClick={onClose}>
            CLOSE
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              onSwitchCamera(zone.camera_id);
              onClose();
            }}
          >
            <Camera size={14} />
            <span>SWITCH VIEW TO THIS ZONE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
