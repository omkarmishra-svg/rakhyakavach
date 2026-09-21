import React from 'react';
import { X, BarChart2, Download } from 'lucide-react';
import { HourlyViolation, Zone } from '../types';

interface ComplianceAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  zones: Zone[];
  hourlyViolations: HourlyViolation[];
  compliancePct: number;
}

export const ComplianceAnalyticsModal: React.FC<ComplianceAnalyticsModalProps> = ({
  isOpen,
  onClose,
  zones,
  hourlyViolations,
  compliancePct
}) => {
  if (!isOpen) return null;

  const handleExportFullReport = () => {
    const reportText = `===============================================================
RAKSHA KAVACH // SENTRY FLOOR EHS COMPLIANCE SHIFT REPORT
===============================================================
Date: ${new Date().toISOString().split('T')[0]}
Shift: Morning / Afternoon Operations
Plant: Complex 04 - North Bay Fabrication
Overall Safety Compliance Index: ${compliancePct.toFixed(1)}%

ZONE BREAKDOWN:
${zones
  .map(
    (z) =>
      `• [${z.camera_id}] ${z.name}: Status=${z.status} | Occupancy=${z.worker_count} | Risk=${z.risk_level}`
  )
  .join('\n')}

HOURLY INCIDENT LOG:
${hourlyViolations
  .map((h) => `• Hour ${h.hour}: PPE Breaches=${h.ppeCount}, Critical Hazards=${h.fireCount}`)
  .join('\n')}

AUDIT CERTIFICATION:
All incidents verified by Raksha Kavach Edge AI Pipeline v2.4.
Exported under ANSI Z535 & OSHA 1910 Documentation Standards.
===============================================================`;

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SENTRY_FLOOR_AUDIT_REPORT_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-window" style={{ width: '920px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 size={18} color="var(--safety-green)" />
            <span className="modal-title">
              COMPLIANCE ANALYTICS & AUDIT EVIDENCE REPORT
            </span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Top KPI row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr 1fr',
              gap: '12px'
            }}
          >
            <div
              style={{
                backgroundColor: 'var(--surface-panel-subtle)',
                border: '1px solid var(--border-hairline)',
                padding: '14px'
              }}
            >
              <span className="metric-label">SHIFT COMPLIANCE</span>
              <div
                className="font-display"
                style={{ fontSize: '28px', fontWeight: 800, color: 'var(--safety-green)' }}
              >
                {compliancePct.toFixed(1)}%
              </div>
              <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                TARGET: &gt; 90.0%
              </span>
            </div>

            <div
              style={{
                backgroundColor: 'var(--surface-panel-subtle)',
                border: '1px solid var(--border-hairline)',
                padding: '14px'
              }}
            >
              <span className="metric-label">TOTAL WORKERS MONITORED</span>
              <div
                className="font-display"
                style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)' }}
              >
                39
              </div>
              <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                ACROSS 6 ACTIVE ZONES
              </span>
            </div>

            <div
              style={{
                backgroundColor: 'var(--surface-panel-subtle)',
                border: '1px solid var(--border-hairline)',
                padding: '14px'
              }}
            >
              <span className="metric-label">PPE VIOLATIONS RESOLVED</span>
              <div
                className="font-display"
                style={{ fontSize: '28px', fontWeight: 800, color: 'var(--safety-amber)' }}
              >
                14 / 16
              </div>
              <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                87.5% RESOLUTION RATE
              </span>
            </div>

            <div
              style={{
                backgroundColor: 'var(--surface-panel-subtle)',
                border: '1px solid var(--border-hairline)',
                padding: '14px'
              }}
            >
              <span className="metric-label">CRITICAL FIRE INCIDENTS</span>
              <div
                className="font-display"
                style={{ fontSize: '28px', fontWeight: 800, color: 'var(--safety-red)' }}
              >
                1
              </div>
              <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                AUTOPROTECT ENGAGED
              </span>
            </div>
          </div>

          {/* Category Breakdown */}
          <div>
            <span className="metric-label">VIOLATIONS BY PPE & HAZARD CATEGORY</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
              {[
                { label: 'Missing Hard Hat (ANSI Z89.1)', count: 6, pct: 37.5, color: 'var(--safety-amber)' },
                { label: 'Missing High-Vis Vest (ANSI 107)', count: 5, pct: 31.2, color: 'var(--safety-amber)' },
                { label: 'Missing Face Shield / Eye Protection', count: 3, pct: 18.7, color: 'var(--safety-amber)' },
                { label: 'Chemical Respirator Breaches', count: 1, pct: 6.3, color: 'var(--safety-amber)' },
                { label: 'Flame / Smoke Thermal Flare', count: 1, pct: 6.3, color: 'var(--safety-red)' }
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    backgroundColor: 'var(--surface-panel-subtle)',
                    border: '1px solid var(--border-hairline)',
                    padding: '8px 12px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600 }}>{item.label}</span>
                    <span className="font-mono">
                      {item.count} EVENTS ({item.pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '5px', backgroundColor: 'var(--bg-app)' }}>
                    <div
                      style={{
                        width: `${item.pct}%`,
                        height: '100%',
                        backgroundColor: item.color
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
            EHS AUDIT COMPLIANCE STANDARDS: OSHA 1910.132 / ANSI Z535.1
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="control-btn" onClick={handleExportFullReport}>
              <Download size={14} />
              <span>DOWNLOAD AUDIT REPORT</span>
            </button>
            <button className="btn-primary" onClick={onClose}>
              CLOSE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
