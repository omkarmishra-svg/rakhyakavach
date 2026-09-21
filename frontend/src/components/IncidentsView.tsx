import React, { useState } from 'react';
import {
  Search,
  Download,
  CheckCircle,
  FileCheck,
  Eye
} from 'lucide-react';
import { Incident, IncidentStatus } from '../types';

interface IncidentsViewProps {
  incidents: Incident[];
  onSelectIncident: (incident: Incident) => void;
  onUpdateStatus: (incidentId: string, newStatus: IncidentStatus) => void;
  onExportAuditCsv: () => void;
}

export const IncidentsView: React.FC<IncidentsViewProps> = ({
  incidents,
  onSelectIncident,
  onUpdateStatus,
  onExportAuditCsv
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const filtered = incidents.filter((inc) => {
    // Search
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const match =
        inc.id.toLowerCase().includes(q) ||
        inc.violation_type.toLowerCase().includes(q) ||
        inc.zone_name.toLowerCase().includes(q) ||
        (inc.worker_id && inc.worker_id.toString().includes(q));
      if (!match) return false;
    }

    // Severity
    if (severityFilter !== 'All' && inc.severity !== severityFilter) {
      return false;
    }

    // Status
    if (statusFilter !== 'All' && inc.status !== statusFilter) {
      return false;
    }

    return true;
  });

  return (
    <div className="tab-view-container">
      {/* Header */}
      <div className="view-header">
        <div>
          <h2 className="view-title">Incident Audit & Compliance Log</h2>
          <p className="view-subtitle">
            Cryptographic timestamped safety incidents, PPE non-compliance logs, and thermal hazard detections.
          </p>
        </div>
        <button className="clean-ctrl-btn primary" onClick={onExportAuditCsv}>
          <Download size={14} />
          <span>Export Audit CSV</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="incidents-filter-bar">
        {/* Search */}
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Search by ID, Zone, Worker, or Violation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Severity Filter Pills */}
        <div className="filter-pill-group">
          <span className="filter-group-label">Severity:</span>
          {['All', 'Critical', 'High', 'Medium', 'Low'].map((sev) => (
            <button
              key={sev}
              className={`filter-pill-btn ${severityFilter === sev ? 'active' : ''}`}
              onClick={() => setSeverityFilter(sev)}
            >
              {sev}
            </button>
          ))}
        </div>

        {/* Status Filter Pills */}
        <div className="filter-pill-group">
          <span className="filter-group-label">Status:</span>
          {['All', 'Active', 'Acknowledged', 'Resolved'].map((st) => (
            <button
              key={st}
              className={`filter-pill-btn ${statusFilter === st ? 'active' : ''}`}
              onClick={() => setStatusFilter(st)}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Incidents Table */}
      <div className="incidents-table-wrapper">
        <table className="clean-incidents-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Incident ID</th>
              <th>Severity</th>
              <th>Violation / Hazard</th>
              <th>Zone</th>
              <th>Confidence</th>
              <th>Worker ID</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-dim)' }}>
                  No matching incidents found.
                </td>
              </tr>
            ) : (
              filtered.map((inc) => {
                const isCrit = inc.severity === 'Critical';
                const isHigh = inc.severity === 'High';
                const sevClass = isCrit ? 'critical' : isHigh ? 'warn' : 'ok';

                return (
                  <tr key={inc.id} onClick={() => onSelectIncident(inc)}>
                    <td className="time-cell">{inc.timestamp}</td>
                    <td className="id-cell">{inc.id}</td>
                    <td>
                      <span className={`status-pill ${sevClass}`}>{inc.severity}</span>
                    </td>
                    <td className="violation-cell">{inc.violation_type}</td>
                    <td className="zone-cell">{inc.zone_name}</td>
                    <td className="conf-cell">{(inc.confidence * 100).toFixed(0)}%</td>
                    <td className="worker-cell">
                      {inc.worker_id ? `#${inc.worker_id}` : 'N/A'}
                    </td>
                    <td>
                      <span className={`status-badge ${inc.status.toLowerCase()}`}>
                        {inc.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div
                        className="table-action-group"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {inc.status === 'Active' && (
                          <button
                            className="mini-action-btn warn"
                            onClick={() => onUpdateStatus(inc.id, 'Acknowledged')}
                            title="Acknowledge Incident"
                          >
                            <CheckCircle size={12} />
                            <span>Ack</span>
                          </button>
                        )}
                        {inc.status !== 'Resolved' && (
                          <button
                            className="mini-action-btn ok"
                            onClick={() => onUpdateStatus(inc.id, 'Resolved')}
                            title="Mark Resolved"
                          >
                            <FileCheck size={12} />
                            <span>Resolve</span>
                          </button>
                        )}
                        <button
                          className="mini-action-btn"
                          onClick={() => onSelectIncident(inc)}
                          title="View Full Evidence"
                        >
                          <Eye size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
