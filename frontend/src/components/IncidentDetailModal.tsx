import React from 'react';
import { X, CheckCircle, AlertTriangle, Send, FileText, UserCheck, ShieldAlert } from 'lucide-react';
import { Incident, IncidentStatus } from '../types';

interface IncidentDetailModalProps {
  incident: Incident | null;
  onClose: () => void;
  onUpdateStatus: (incidentId: string, newStatus: IncidentStatus, notes?: string) => void;
}

export const IncidentDetailModal: React.FC<IncidentDetailModalProps> = ({
  incident,
  onClose,
  onUpdateStatus
}) => {
  if (!incident) return null;

  const isCritical = incident.severity === 'Critical';
  const isHigh = incident.severity === 'High';
  const severityClass = isCritical ? 'critical' : isHigh ? 'warn' : 'ok';

  const handleExportEvidence = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(
        JSON.stringify(
          {
            title: 'EHS Safety Audit Packet',
            incident_id: incident.id,
            timestamp: incident.timestamp,
            zone: incident.zone_name,
            violation: incident.violation_type,
            severity: incident.severity,
            confidence_score: incident.confidence,
            worker_id: incident.worker_id,
            status: incident.status,
            audit_trail_notes: incident.action_notes || 'Automated verification logged.'
          },
          null,
          2
        )
      );
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `AUDIT_PACKET_${incident.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-window" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert size={18} color={isCritical ? 'var(--safety-red)' : 'var(--safety-amber)'} />
            <span className="modal-title">
              INCIDENT EVIDENCE AUDIT // {incident.id}
            </span>
            <span className={`status-pill ${severityClass}`}>
              {incident.severity.toUpperCase()} PRIORITY
            </span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
          {/* Left: Video Snapshot with Target Reticle */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              className="font-mono"
              style={{ fontSize: '11px', color: 'var(--text-dim)', letterSpacing: '0.05em' }}
            >
              FRAME CAPTURE // CAMERA BUFFER SNAPSHOT
            </div>

            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '280px',
                backgroundColor: '#0c0f12',
                border: '1px solid var(--border-hairline)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}
            >
              {/* Snapshot Frame Simulation */}
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background:
                    'radial-gradient(ellipse at center, rgba(30, 36, 42, 0.9) 0%, rgba(14, 17, 20, 1) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                {/* Simulated Visual Target */}
                <div
                  style={{
                    border: `2px ${isCritical ? 'dashed var(--safety-red)' : 'solid var(--safety-amber)'}`,
                    padding: '24px 36px',
                    backgroundColor: isCritical
                      ? 'rgba(225, 75, 61, 0.12)'
                      : 'rgba(242, 169, 59, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <AlertTriangle
                    size={32}
                    color={isCritical ? 'var(--safety-red)' : 'var(--safety-amber)'}
                  />
                  <span
                    className="font-display"
                    style={{
                      fontWeight: 800,
                      fontSize: '16px',
                      color: isCritical ? 'var(--safety-red)' : 'var(--safety-amber)'
                    }}
                  >
                    {incident.violation_type.toUpperCase()}
                  </span>
                  <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                    CONFIDENCE: {(incident.confidence * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Incident Audit Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              className="font-mono"
              style={{ fontSize: '11px', color: 'var(--text-dim)', letterSpacing: '0.05em' }}
            >
              INCIDENT AUDIT LOG & DETAILS
            </div>

            <div
              style={{
                backgroundColor: 'var(--surface-panel-subtle)',
                border: '1px solid var(--border-hairline)',
                padding: '12px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                fontSize: '12px'
              }}
            >
              <div>
                <span className="metric-label">ZONE</span>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{incident.zone_name}</div>
              </div>

              <div>
                <span className="metric-label">TIMESTAMP</span>
                <div className="font-mono" style={{ color: 'var(--text-primary)' }}>{incident.timestamp}</div>
              </div>

              <div>
                <span className="metric-label">WORKER ID</span>
                <div className="font-mono" style={{ color: 'var(--text-primary)' }}>
                  {incident.worker_id ? `#${incident.worker_id}` : 'N/A'}
                </div>
              </div>

              <div>
                <span className="metric-label">AI CONFIDENCE</span>
                <div
                  className="font-mono"
                  style={{
                    fontWeight: 700,
                    color: incident.confidence > 0.9 ? 'var(--safety-green)' : 'var(--safety-amber)'
                  }}
                >
                  {(incident.confidence * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Current Status Badge */}
            <div
              style={{
                backgroundColor: 'var(--surface-panel-subtle)',
                border: '1px solid var(--border-hairline)',
                padding: '10px 12px'
              }}
            >
              <span className="metric-label">CURRENT AUDIT STATE</span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '4px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  fontSize: '13px',
                  color:
                    incident.status === 'Active'
                      ? 'var(--safety-red)'
                      : incident.status === 'Acknowledged'
                      ? 'var(--safety-amber)'
                      : 'var(--safety-green)'
                }}
              >
                <span>STATUS: {incident.status.toUpperCase()}</span>
                {incident.acknowledged_by && (
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 400 }}>
                    ({incident.acknowledged_by})
                  </span>
                )}
              </div>
            </div>

            {/* Action Notes */}
            <div>
              <span className="metric-label">DISPATCH NOTES / LOGGED ACTION</span>
              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--text-dim)',
                  backgroundColor: 'var(--surface-panel-subtle)',
                  padding: '8px 10px',
                  border: '1px solid var(--border-hairline)',
                  marginTop: '4px'
                }}
              >
                {incident.action_notes || 'No dispatch notes recorded yet.'}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer: Actionable Buttons */}
        <div className="modal-footer">
          <button className="control-btn" onClick={handleExportEvidence}>
            <FileText size={14} />
            <span>EXPORT AUDIT EVIDENCE (JSON)</span>
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            {incident.status === 'Active' && (
              <>
                <button
                  className="btn-amber"
                  onClick={() =>
                    onUpdateStatus(incident.id, 'Acknowledged', 'Acknowledged by Shift Officer on duty.')
                  }
                >
                  <UserCheck size={14} />
                  <span>ACKNOWLEDGE INCIDENT</span>
                </button>

                <button
                  className="btn-danger"
                  onClick={() =>
                    onUpdateStatus(incident.id, 'Escalated', 'Floor supervisor dispatched to zone immediately.')
                  }
                >
                  <Send size={14} />
                  <span>DISPATCH SUPERVISOR</span>
                </button>
              </>
            )}

            {incident.status !== 'Resolved' && (
              <button
                className="btn-green"
                onClick={() =>
                  onUpdateStatus(incident.id, 'Resolved', 'Corrective PPE issued and verified compliant.')
                }
              >
                <CheckCircle size={14} />
                <span>MARK RESOLVED</span>
              </button>
            )}

            <button className="control-btn" onClick={onClose}>
              CLOSE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
