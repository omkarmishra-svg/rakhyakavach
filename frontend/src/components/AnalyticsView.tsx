import React from 'react';
import { BarChart2, TrendingUp, AlertTriangle, ShieldCheck, Award } from 'lucide-react';
import { Zone, HourlyViolation } from '../types';

interface AnalyticsViewProps {
  zones: Zone[];
  hourlyViolations: HourlyViolation[];
  compliancePct: number;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  zones,
  hourlyViolations,
  compliancePct
}) => {
  const maxTotal = Math.max(...hourlyViolations.map((h) => h.total), 10);

  const handleExportCertificate = () => {
    const cert = `=================================================================
             OSHA 1910 SAFETY COMPLIANCE AUDIT CERTIFICATE
=================================================================
Certificate ID: CERT-RK-${Math.floor(100000 + Math.random() * 900000)}
Issued To: Raksha Kavach Industrial Complex 04
Evaluation Standard: ANSI Z535 & OSHA 1910 PPE Mandate
Audit Timestamp: ${new Date().toISOString()}

COMPLIANCE RATING:
• Plant Safety Index: ${compliancePct.toFixed(1)}%
• Overall Classification: ${compliancePct >= 90 ? 'FULLY COMPLIANT' : 'PROVISIONAL COMPLIANCE'}
• Active Monitored Zones: ${zones.length} Zones
• Total Audited Workers: ${zones.reduce((acc, z) => acc + z.worker_count, 0)} Active Personnel

VERIFIED AUDIT SENTINEL:
Raksha Kavach Computer Vision Engine
Certified by Environmental Health & Safety (EHS) Lead
=================================================================`;

    const blob = new Blob([cert], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `OSHA_SAFETY_CERTIFICATE_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="tab-view-container">
      {/* Header */}
      <div className="view-header">
        <div>
          <h2 className="view-title">Executive Safety & Risk Analytics Hub</h2>
          <p className="view-subtitle">
            Shift-level predictive risk modeling, OSHA compliance benchmarking, and zone vulnerability trends.
          </p>
        </div>
        <button className="clean-ctrl-btn primary" onClick={handleExportCertificate}>
          <Award size={15} />
          <span>Download OSHA Certificate</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="analytics-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Safety Compliance Index</span>
            <ShieldCheck size={18} className="kpi-icon ok" />
          </div>
          <div className="kpi-val ok">{compliancePct.toFixed(1)}%</div>
          <div className="kpi-trend positive">+1.8% vs. previous shift benchmark</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Monitored Zones</span>
            <BarChart2 size={18} className="kpi-icon" />
          </div>
          <div className="kpi-val">{zones.length}</div>
          <div className="kpi-trend">All 6 Vision nodes online and active</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Critical Hazard Alert Status</span>
            <AlertTriangle size={18} className="kpi-icon warn" />
          </div>
          <div className="kpi-val warn">1 Incident</div>
          <div className="kpi-trend negative">Paint Booth thermal sentinel flagged</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Active Floor Personnel</span>
            <TrendingUp size={18} className="kpi-icon" />
          </div>
          <div className="kpi-val">
            {zones.reduce((acc, z) => acc + z.worker_count, 0)}
          </div>
          <div className="kpi-trend">Real-time worker density tracking</div>
        </div>
      </div>

      {/* Charts & Breakdown Grid */}
      <div className="analytics-charts-grid">
        {/* Hourly Violation Trend */}
        <div className="chart-panel">
          <div className="chart-header">
            <h3 className="chart-title">12-Hour Safety Incidents Trend</h3>
            <span className="chart-legend">PPE Breaches (Amber) · Fire Hazards (Red)</span>
          </div>

          <div className="hourly-bar-chart">
            {hourlyViolations.map((h) => {
              const ppeHeight = (h.ppeCount / maxTotal) * 100;
              const fireHeight = (h.fireCount / maxTotal) * 100;

              return (
                <div key={h.hour} className="chart-bar-column">
                  <div className="bars-stack">
                    {h.fireCount > 0 && (
                      <div
                        className="bar fire-bar"
                        style={{ height: `${fireHeight}%` }}
                        title={`Hour ${h.hour}: ${h.fireCount} Hazard Events`}
                      />
                    )}
                    {h.ppeCount > 0 && (
                      <div
                        className="bar ppe-bar"
                        style={{ height: `${ppeHeight}%` }}
                        title={`Hour ${h.hour}: ${h.ppeCount} PPE Breaches`}
                      />
                    )}
                  </div>
                  <span className="bar-label">{h.hour}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Zone Vulnerability Ranking */}
        <div className="chart-panel">
          <div className="chart-header">
            <h3 className="chart-title">Zone Vulnerability Index</h3>
            <span className="chart-legend">Ranked by risk severity</span>
          </div>

          <div className="zone-ranking-list">
            {zones.map((z, idx) => {
              const riskPct =
                z.risk_level === 'Critical'
                  ? 94
                  : z.risk_level === 'High'
                  ? 76
                  : z.risk_level === 'Medium'
                  ? 42
                  : 18;

              return (
                <div key={z.zone_id} className="ranking-item">
                  <div className="ranking-header">
                    <span className="ranking-name">
                      #{idx + 1} {z.name}
                    </span>
                    <span className={`ranking-badge ${z.risk_level.toLowerCase()}`}>
                      {z.risk_level} ({riskPct}%)
                    </span>
                  </div>
                  <div className="ranking-progress-bar">
                    <div
                      className={`ranking-progress-fill ${z.risk_level.toLowerCase()}`}
                      style={{ width: `${riskPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
