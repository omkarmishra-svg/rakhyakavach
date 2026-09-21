import React from 'react';
import { ShieldAlert, ExternalLink, Download } from 'lucide-react';
import { Incident } from '../types';

interface IncidentLogTickerProps {
  incidents: Incident[];
  newestIncidentId: string | null;
  onSelectIncident: (incident: Incident) => void;
  onExportAuditCsv: () => void;
}

export const IncidentLogTicker: React.FC<IncidentLogTickerProps> = ({
  incidents,
  newestIncidentId,
  onSelectIncident,
  onExportAuditCsv
}) => {
  return (
    <footer className="ticker-panel">
      <div className="ticker-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={14} color="var(--safety-amber)" />
          <span>INCIDENT AUDIT LOG // REAL-TIME TELEMETRY STREAM</span>
          <span className="font-mono" style={{ color: 'var(--text-dim)', fontSize: '10px' }}>
            ({incidents.length} EVENTS LOGGED)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="control-btn"
            style={{ padding: '2px 8px', fontSize: '10px' }}
            onClick={onExportAuditCsv}
            title="Download CSV Audit Trail for EHS Compliance Records"
          >
            <Download size={11} />
            <span>EXPORT CSV</span>
          </button>
        </div>
      </div>

      <div className="ticker-table-container">
        <table className="ticker-table">
          <thead>
            <tr>
              <th style={{ width: '80px' }}>TIME</th>
              <th style={{ width: '90px' }}>INCIDENT</th>
              <th style={{ width: '90px' }}>SEVERITY</th>
              <th>VIOLATION / HAZARD TYPE</th>
              <th>ZONE</th>
              <th style={{ width: '80px' }}>CONF</th>
              <th style={{ width: '90px' }}>WORKER</th>
              <th style={{ width: '120px' }}>AUDIT STATUS</th>
              <th style={{ width: '70px', textAlign: 'right' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((inc) => {
              const isNew = inc.id === newestIncidentId;
              const isCritical = inc.severity === 'Critical';
              const isHigh = inc.severity === 'High';

              const severityClass = isCritical ? 'critical' : isHigh ? 'warn' : 'ok';

              return (
                <tr
                  key={inc.id}
                  className={`ticker-row ${isNew ? 'animate-flash' : ''}`}
                  onClick={() => onSelectIncident(inc)}
                >
                  <td className="font-mono" style={{ color: 'var(--text-dim)' }}>
                    {inc.timestamp}
                  </td>
                  <td className="font-mono" style={{ fontWeight: 600 }}>
                    {inc.id}
                  </td>
                  <td>
                    <span className={`status-pill ${severityClass}`} style={{ fontSize: '10px', padding: '1px 6px' }}>
                      {inc.severity.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: isCritical ? 'var(--safety-red)' : 'var(--text-primary)' }}>
                    {inc.violation_type}
                  </td>
                  <td style={{ color: 'var(--text-dim)' }}>{inc.zone_name}</td>
                  <td className="font-mono" style={{ color: 'var(--text-dim)' }}>
                    {(inc.confidence * 100).toFixed(0)}%
                  </td>
                  <td className="font-mono">
                    {inc.worker_id ? `#${inc.worker_id}` : <span style={{ color: 'var(--text-muted)' }}>N/A</span>}
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        fontFamily: 'var(--font-mono)',
                        color:
                          inc.status === 'Active'
                            ? 'var(--safety-red)'
                            : inc.status === 'Acknowledged'
                            ? 'var(--safety-amber)'
                            : 'var(--safety-green)'
                      }}
                    >
                      {inc.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="control-btn"
                      style={{ padding: '2px 6px', fontSize: '10px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectIncident(inc);
                      }}
                    >
                      <ExternalLink size={11} />
                      <span>INSPECT</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </footer>
  );
};
