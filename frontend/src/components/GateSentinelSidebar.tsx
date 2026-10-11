import React from 'react';
import {
  Unlock,
  Lock,
  CheckCircle,
  XCircle,
  MapPin,
  Navigation,
  RefreshCw,
  Award
} from 'lucide-react';
import { EntrantProfile } from './GateSentinelFeed';

interface GateSentinelSidebarProps {
  entrant: EntrantProfile;
  onToggleGear: (gearKey: string) => void;
  onToggleContraband?: (itemKey: string) => void;
  onRandomizePersona: () => void;
  onProceedToMonitoring: (targetCamId: number) => void;
}

export const GateSentinelSidebar: React.FC<GateSentinelSidebarProps> = ({
  entrant,
  onToggleGear,
  onRandomizePersona,
  onProceedToMonitoring
}) => {
  const isEntered = entrant.access_status === 'ENTERED';
  const isReroute = entrant.access_status === 'PARTIAL_REROUTE';
  const isBlocked = entrant.access_status === 'ACCESS_DENIED';

  const statusColor = isEntered
    ? '#00e676'
    : isReroute
    ? '#38bdf8'
    : isBlocked
    ? '#fbbf24'
    : '#ff1744';

  const isConstruction = entrant.sector === 'Construction' || (entrant.required_ppe && (entrant.required_ppe.includes('safety_harness') || entrant.required_ppe.includes('welding_shield')));

  const gearItems = isConstruction
    ? [
        { key: 'helmet', name: 'Construction Hardhat', standard: 'IS 2925 / EN 397 (Impact)' },
        { key: 'vest', name: 'High-Vis Safety Vest', standard: 'EN ISO 20471 Class 2' },
        { key: 'boots', name: 'Steel-Toe Work Boots', standard: 'IS 15298 / EN 20345' },
        { key: 'gloves', name: 'Heavy Rigging Gloves', standard: 'EN 388 (Cut/Puncture)' },
        { key: 'safety_harness', name: 'Fall Arrest Harness', standard: 'ANSI Z359 Class III' },
        { key: 'welding_shield', name: 'Welding Face Shield', standard: 'EN 175 / ANSI Z87' },
        { key: 'goggles', name: 'Impact Safety Goggles', standard: 'ANSI Z87.1 (Dust/Debris)' }
      ]
    : [
        { key: 'helmet', name: 'Dielectric Hardhat', standard: 'Class E 20kV / IS 2925' },
        { key: 'vest', name: 'Arc-Rated Safety Vest', standard: 'NFPA 70E / EN ISO 20471' },
        { key: 'gloves', name: '1000V Insulated Gloves', standard: 'ASTM D120 Class 0' },
        { key: 'goggles', name: 'Arc Flash Eye Shield', standard: 'ANSI Z87.1 / NFPA 70E' },
        { key: 'boots', name: 'Dielectric EH Work Boots', standard: 'ASTM F2413 Electrical' }
      ];

  const totalRequired = entrant.required_ppe.length || (isConstruction ? 5 : 4);
  const compliantCount = entrant.worn_ppe.filter((p) => entrant.required_ppe.includes(p)).length;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--surface-panel)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--card-radius)',
        overflow: 'hidden',
        color: '#f8fafc'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 14px',
          borderBottom: '1px solid var(--border-hairline)',
          backgroundColor: 'var(--surface-panel-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div>
          <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#00f2fe' }}>
            GATE 01 SENTINEL INSPECTOR
          </div>
          <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
            {isConstruction ? 'Construction Sector Airlock' : 'High-Voltage Electrical Airlock'}
          </div>
        </div>

        <button
          onClick={onRandomizePersona}
          style={{
            padding: '3px 7px',
            fontSize: '10px',
            fontWeight: 700,
            borderRadius: '4px',
            background: 'rgba(0, 242, 254, 0.12)',
            color: '#00f2fe',
            border: '1px solid rgba(0, 242, 254, 0.3)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          title="Simulate Next Worker Persona"
        >
          <RefreshCw size={10} />
          <span>Next</span>
        </button>
      </div>

      {/* Scrollable Body */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        {/* 1. Entrant Identity Card */}
        <div
          style={{
            padding: '10px 12px',
            borderRadius: '8px',
            backgroundColor: 'rgba(30, 41, 59, 0.65)',
            border: `1px solid ${statusColor}44`,
            boxShadow: `0 0 10px ${statusColor}15`
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: isConstruction
                    ? 'linear-gradient(135deg, #ea580c, #f59e0b)'
                    : 'linear-gradient(135deg, #0284c7, #00f2fe)',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {entrant.name.charAt(0)}
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#ffffff' }}>
                  {entrant.name}{' '}
                  <span
                    style={{
                      fontSize: '9px',
                      padding: '1px 5px',
                      borderRadius: '3px',
                      backgroundColor: isConstruction ? 'rgba(234, 88, 12, 0.25)' : 'rgba(2, 132, 199, 0.25)',
                      color: isConstruction ? '#fb923c' : '#38bdf8',
                      fontWeight: 700,
                      marginLeft: '4px'
                    }}
                  >
                    {isConstruction ? 'CONST' : 'ELEC'}
                  </span>
                </div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                  {entrant.emp_id} · {entrant.role}
                </div>
              </div>
            </div>

            <div
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '9px',
                fontWeight: 800,
                backgroundColor: entrant.turnstile_unlocked ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 23, 68, 0.15)',
                color: entrant.turnstile_unlocked ? '#00e676' : '#ff1744',
                border: `1px solid ${entrant.turnstile_unlocked ? '#00e676' : '#ff1744'}44`,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {entrant.turnstile_unlocked ? <Unlock size={10} /> : <Lock size={10} />}
              <span>{entrant.turnstile_unlocked ? 'PERMITTED' : 'BLOCKED'}</span>
            </div>
          </div>

          <div style={{ fontSize: '10px', color: '#cbd5e1', lineHeight: '1.4' }}>
            <span style={{ color: '#94a3b8' }}>Dept:</span> {entrant.department}
          </div>
        </div>

        {/* 2. Real-Time PPE Verification Checklist */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.06em', color: '#94a3b8' }}>
              PPE COMPLIANCE AUDIT ({compliantCount}/{totalRequired})
            </span>
            <span style={{ fontSize: '9px', color: '#64748b' }}>Click item to toggle</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {gearItems.map((g) => {
              const isRequired = entrant.required_ppe.includes(g.key);
              const isWorn = entrant.worn_ppe.includes(g.key);
              return (
                <div
                  key={g.key}
                  onClick={() => onToggleGear(g.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    backgroundColor: isWorn
                      ? 'rgba(0, 230, 118, 0.08)'
                      : isRequired
                      ? 'rgba(255, 23, 68, 0.08)'
                      : 'rgba(30, 41, 59, 0.4)',
                    border: `1px solid ${
                      isWorn
                        ? 'rgba(0, 230, 118, 0.3)'
                        : isRequired
                        ? 'rgba(255, 23, 68, 0.3)'
                        : 'rgba(255, 255, 255, 0.08)'
                    }`,
                    cursor: 'pointer',
                    transition: 'all 0.12s ease'
                  }}
                  title={`Click to toggle ${g.name} (${isRequired ? 'Mandatory for Dept' : 'Optional'})`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isWorn ? (
                      <CheckCircle size={12} color="#00e676" />
                    ) : isRequired ? (
                      <XCircle size={12} color="#ff1744" />
                    ) : (
                      <div
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          border: '1px solid #64748b'
                        }}
                      />
                    )}                      <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: isWorn ? '#f0fdf4' : isRequired ? '#fecaca' : '#94a3b8' }}>
                        {g.name}
                        {isRequired && (
                          <span style={{ fontSize: '8px', color: '#f59e0b', marginLeft: '4px' }}>MANDATORY</span>
                        )}
                      </div>
                      <div style={{ fontSize: '9px', color: '#64748b' }}>{g.standard}</div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 800,
                      color: isWorn ? '#00e676' : isRequired ? '#ff1744' : '#64748b'
                    }}
                  >
                    {isWorn ? 'EQUIPPED' : isRequired ? 'MISSING' : 'NOT WORN'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Adaptive Department Wayfinding */}
        <div
          style={{
            padding: '10px 12px',
            borderRadius: '8px',
            backgroundColor: 'rgba(30, 41, 59, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <MapPin size={13} color={statusColor} />
            <span style={{ fontSize: '10px', fontWeight: 800, color: statusColor }}>
              {isEntered
                ? 'AUTHORIZED FACTORY ROUTE'
                : isReroute
                ? 'DYNAMIC ADAPTIVE REROUTE'
                : isBlocked
                ? 'PPE DISPENSER REDIRECTION'
                : 'AIRLOCK ACCESS HOLD'}
            </span>
          </div>

          <div style={{ fontSize: '11px', fontWeight: 700, color: '#ffffff' }}>
            {isEntered
              ? entrant.destination_department || 'Main Fabrication Bay (Zone 1)'
              : isReroute
              ? entrant.suggested_department || 'Warehouse Logistics Dock B (Zone 2 - Low Hazard)'
              : isBlocked
              ? 'Station 1A: PPE Dispenser Bay'
              : 'Airlock Inspection Station'}
          </div>

          <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px', lineHeight: '1.3' }}>
            {isEntered
              ? 'Worker fully equipped with required PPE. Access turnstile released.'
              : isReroute
              ? 'Lacks eye/hand protection for high-hazard bay. Dynamically reassigned to low-hazard logistics cell.'
              : isBlocked
              ? 'Access locked. Worker must equip safety helmet & vest at dispenser before entering.'
              : 'Airlock turnstile held. Worker protective equipment verification required.'}
          </div>
        </div>

        {/* 5. Life-Safety Egress Guarantee */}
        <div
          style={{
            padding: '8px 10px',
            borderRadius: '6px',
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Award size={16} color="#00e676" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '9px', color: '#a7f3d0', lineHeight: '1.3' }}>
            <strong>NFPA 101 / UL 294 Guarantee:</strong> Fail-open turnstiles automatically de-energize open during fire evacuation or power loss.
          </div>
        </div>
      </div>

      {/* Bottom Action Footer */}
      {(isEntered || isReroute) && (
        <div
          style={{
            padding: '10px 12px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'var(--surface-panel-subtle)'
          }}
        >
          <button
            onClick={() => onProceedToMonitoring(2)}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '6px',
              backgroundColor: '#0284c7',
              border: '1px solid rgba(56, 189, 248, 0.7)',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 0 14px rgba(2, 132, 199, 0.45)'
            }}
            title="Pass worker through turnstile: Monitor worker inside Plant via CCTV 02 (Logistics Bay & Active Fire Guard)"
          >
            <span>ENTER FACTORY -&gt; MONITOR ON CCTV 02</span>
            <Navigation size={13} />
          </button>
        </div>
      )}
    </div>
  );
};
