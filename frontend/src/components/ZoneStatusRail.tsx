import React, { useState } from 'react';
import { Layers, Info } from 'lucide-react';
import { Zone, HourlyViolation } from '../types';

interface ZoneStatusRailProps {
  zones: Zone[];
  activeZoneId: string;
  hourlyViolations: HourlyViolation[];
  onSelectZone: (zone: Zone) => void;
  onOpenZoneDeepDive: (zone: Zone) => void;
}

export const ZoneStatusRail: React.FC<ZoneStatusRailProps> = ({
  zones,
  activeZoneId,
  hourlyViolations,
  onSelectZone,
  onOpenZoneDeepDive
}) => {
  const [hoveredBar, setHoveredBar] = useState<HourlyViolation | null>(null);

  // Find maximum count for proportional bar heights
  const maxTotal = Math.max(...hourlyViolations.map((h) => h.total), 10);

  return (
    <aside className="zone-status-rail">
      {/* Top Header */}
      <div className="rail-section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Layers size={14} color="var(--text-dim)" />
          <span>SAFETY ZONES</span>
        </div>
      </div>

      {/* Zone Status Rows */}
      <div className="zone-list">
        {zones.map((zone) => {
          const isActive = zone.zone_id === activeZoneId;
          const statusClass = zone.status.toLowerCase();

          return (
            <div
              key={zone.zone_id}
              className={`zone-row ${statusClass} ${isActive ? 'active' : ''}`}
              onClick={() => onSelectZone(zone)}
            >
              <div className="zone-row-left">
                <span className={`status-dot ${statusClass}`} />
                <div>
                  <div className="zone-title">{zone.name}</div>
                  <div className="zone-meta">
                    {zone.worker_count} Workers · Risk: {zone.risk_level}
                  </div>
                </div>
              </div>

              <div className="zone-row-right">
                <span className={`status-pill ${statusClass}`}>
                  {zone.status === 'OK' ? 'OK' : zone.status === 'WARN' ? 'WARN' : 'FIRE'}
                </span>

                <button
                  className="control-btn"
                  style={{ padding: '3px 6px', fontSize: '10px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenZoneDeepDive(zone);
                  }}
                  title="View Zone Diagnostics & PPE Rules"
                >
                  <Info size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 12-Hour Violations Trend Section */}
      <div className="rail-trend-container">
        <div className="trend-header">
          <div
            className="font-display"
            style={{
              fontWeight: 700,
              fontSize: '12px',
              letterSpacing: '0.06em',
              color: 'var(--text-dim)',
              textTransform: 'uppercase'
            }}
          >
            VIOLATIONS TREND — 12H LOG
          </div>
          <div className="font-mono" style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
            {hoveredBar ? `${hoveredBar.hour}: ${hoveredBar.total} INCIDENTS` : 'PEAK: 15:00'}
          </div>
        </div>

        {/* Stacked Bars */}
        <div className="trend-bars-wrapper">
          {hourlyViolations.map((item) => {
            const ppeHeight = (item.ppeCount / maxTotal) * 100;
            const fireHeight = (item.fireCount / maxTotal) * 100;

            return (
              <div
                key={item.hour}
                className="trend-col"
                onMouseEnter={() => setHoveredBar(item)}
                onMouseLeave={() => setHoveredBar(null)}
              >
                {/* Fire segment */}
                {item.fireCount > 0 && (
                  <div
                    className="trend-bar-segment fire"
                    style={{ height: `${fireHeight}%` }}
                    title={`${item.hour}: ${item.fireCount} Fire/Hazards`}
                  />
                )}
                {/* PPE violation segment */}
                {item.ppeCount > 0 && (
                  <div
                    className="trend-bar-segment ppe"
                    style={{ height: `${ppeHeight}%` }}
                    title={`${item.hour}: ${item.ppeCount} PPE Breaches`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Axis Labels */}
        <div className="trend-axis-labels">
          <span>07:00</span>
          <span>12:00</span>
          <span>18:00</span>
        </div>

        {/* Chart Legend */}
        <div className="trend-legend">
          <div className="legend-item">
            <span className="legend-swatch" style={{ backgroundColor: 'var(--safety-amber)' }} />
            <span>PPE BREACH</span>
          </div>
          <div className="legend-item">
            <span className="legend-swatch" style={{ backgroundColor: 'var(--safety-red)' }} />
            <span>FIRE / CRITICAL</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
