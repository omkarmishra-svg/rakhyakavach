import React from 'react';
import { Flame, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

export interface WorkerAlertItem {
  worker_id: number | string;
  cam_id?: string | number;
  status: 'COMPLIANT' | 'PARTIAL' | 'MISSING ALL';
  color?: string;
  missing_ppe: string[];
  worn_ppe?: string[];
  camera_name?: string;
}

interface SquareAlertGridProps {
  workers: WorkerAlertItem[];
  hasHazard?: boolean;
  hazardInfo?: string;
}

export const SquareAlertGrid: React.FC<SquareAlertGridProps> = ({
  workers,
  hasHazard,
  hazardInfo
}) => {
  return (
    <div className="square-alert-section">
      <div className="alert-header">
        <h4 className="alert-title">Live Equipment Compliance & Alerts</h4>
        <span className="alert-subtitle">Color-coded square badges: Green (OK), Yellow (Partial), Red (Missing All)</span>
      </div>

      {/* Hazard Warning Banner */}
      {hasHazard && (
        <div className="square-hazard-banner">
          <Flame size={24} className="hazard-flame-icon" />
          <div>
            <div className="hazard-title">CRITICAL HAZARD DETECTED!</div>
            <div className="hazard-desc">{hazardInfo || 'Fire or thermal anomaly spotted on surveillance.'}</div>
          </div>
        </div>
      )}

      {/* Grid of Square Badges */}
      {workers.length === 0 ? (
        <div className="empty-alert-card">
          <CheckCircle size={32} color="#00e676" style={{ marginBottom: '8px' }} />
          <div style={{ fontWeight: 700, color: '#f0fdf4' }}>All Monitored Workers Compliant</div>
          <div style={{ color: '#6ee7b7', fontSize: '0.78rem', marginTop: '4px' }}>
            No missing safety equipment detected across active camera streams.
          </div>
        </div>
      ) : (
        <div className="square-badges-grid">
          {workers.map((w, idx) => {
            const isCompliant = w.status === 'COMPLIANT';
            const isMissingAll = w.status === 'MISSING ALL';

            const badgeClass = isCompliant
              ? 'badge-green'
              : isMissingAll
              ? 'badge-red'
              : 'badge-yellow';

            const statusText = isCompliant
              ? 'COMPLIANT'
              : isMissingAll
              ? 'DANGER'
              : 'PARTIAL';

            return (
              <div key={`${w.worker_id}-${idx}`} className={`worker-alert-square ${badgeClass}`}>
                <div className="badge-top-row">
                  <span className="worker-id-badge">Worker #{w.worker_id}</span>
                  {w.cam_id && <span className="cam-tag">CAM 0{w.cam_id}</span>}
                </div>

                <div className="status-tag-pill">
                  {isCompliant ? (
                    <CheckCircle size={12} />
                  ) : isMissingAll ? (
                    <XCircle size={12} />
                  ) : (
                    <AlertTriangle size={12} />
                  )}
                  <span>{statusText}</span>
                </div>

                <div className="missing-list-box">
                  {isCompliant ? (
                    <div className="gear-ok-text">
                      All PPE Equipped
                      <span className="gear-sub">{w.worn_ppe?.join(', ') || 'Helmet, Vest'}</span>
                    </div>
                  ) : isMissingAll ? (
                    <div className="gear-missing-all">
                      NO PPE DETECTED
                      <span className="gear-sub">Lacks all protective gear</span>
                    </div>
                  ) : (
                    <div className="gear-missing-partial">
                      <b>Missing:</b>
                      <span className="missing-items-text">
                        {w.missing_ppe.map((m) => m.toUpperCase()).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
