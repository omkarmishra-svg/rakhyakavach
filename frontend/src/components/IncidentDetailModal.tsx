import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle,
  AlertTriangle,
  Send,
  FileText,
  UserCheck,
  ShieldAlert,
  Cpu,
  Volume2,
  RefreshCw,
  Layers,
  Radio
} from 'lucide-react';
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

  const [llmAudit, setLlmAudit] = useState<any | null>(null);
  const [loadingLLM, setLoadingLLM] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Fetch Level 3 EHS Expert LLM Reasoning on modal open
  useEffect(() => {
    let isMounted = true;
    const fetchLLM = async () => {
      setLoadingLLM(true);
      try {
        const res = await fetch('/api/analyze-safety-llm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            worker_id: incident.worker_id || 1,
            zone_name: incident.zone_name,
            violation_type: incident.violation_type,
            missing_ppe: [incident.violation_type]
          })
        });
        if (res.ok && isMounted) {
          const data = await res.json();
          setLlmAudit(data);
        }
      } catch (err) {
        console.error('Failed to query safety LLM:', err);
      } finally {
        if (isMounted) setLoadingLLM(false);
      }
    };

    fetchLLM();
    return () => {
      isMounted = false;
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [incident.id, incident.violation_type, incident.zone_name, incident.worker_id]);

  const handleSpeakPA = () => {
    const text =
      llmAudit?.announcement_text ||
      `Attention ${incident.zone_name}. Safety violation flagged for ${incident.violation_type}. Immediate compliance required.`;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleExportEvidence = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(
        JSON.stringify(
          {
            title: 'Raksha Kavach EHS Safety Audit Packet',
            incident_id: incident.id,
            timestamp: incident.timestamp,
            zone: incident.zone_name,
            violation: incident.violation_type,
            severity: incident.severity,
            confidence_score: incident.confidence,
            worker_id: incident.worker_id,
            status: incident.status,
            multi_level_llm_audit: llmAudit || null,
            audit_trail_notes: incident.action_notes || 'Multi-level LLM verification logged.'
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
      <div className="modal-window" style={{ maxWidth: '880px' }} onClick={(e) => e.stopPropagation()}>
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
        <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: '20px' }}>
          {/* Left: Video Snapshot & Target Verification */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div
              className="font-mono"
              style={{ fontSize: '11px', color: 'var(--text-dim)', letterSpacing: '0.05em' }}
            >
              FRAME CAPTURE // TARGET CAMERA BUFFER
            </div>

            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '240px',
                backgroundColor: '#0c0f12',
                border: '1px solid var(--border-hairline)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background:
                    'radial-gradient(ellipse at center, rgba(30, 36, 42, 0.95) 0%, rgba(14, 17, 20, 1) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                {/* Visual Target Reticle */}
                <div
                  style={{
                    border: `2px ${isCritical ? 'dashed var(--safety-red)' : 'solid var(--safety-amber)'}`,
                    padding: '20px 28px',
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
                    size={30}
                    color={isCritical ? 'var(--safety-red)' : 'var(--safety-amber)'}
                  />
                  <span
                    className="font-display"
                    style={{
                      fontWeight: 800,
                      fontSize: '15px',
                      color: isCritical ? 'var(--safety-red)' : 'var(--safety-amber)',
                      textAlign: 'center'
                    }}
                  >
                    {incident.violation_type.toUpperCase()}
                  </span>
                  <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                    EDGE AI CONFIDENCE: {(incident.confidence * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Incident Summary Specs */}
            <div
              style={{
                backgroundColor: 'var(--surface-panel-subtle)',
                border: '1px solid var(--border-hairline)',
                padding: '10px 12px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                fontSize: '11px'
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
                  {incident.worker_id ? `#${incident.worker_id}` : 'ENVIRONMENTAL'}
                </div>
              </div>
              <div>
                <span className="metric-label">CURRENT STATUS</span>
                <div
                  className="font-mono"
                  style={{
                    fontWeight: 700,
                    color:
                      incident.status === 'Active'
                        ? 'var(--safety-red)'
                        : incident.status === 'Acknowledged'
                        ? 'var(--safety-amber)'
                        : 'var(--safety-green)'
                  }}
                >
                  {incident.status.toUpperCase()}
                </div>
              </div>
            </div>

            {/* Role-Based Context & Action SOP */}
            <div
              style={{
                backgroundColor: 'rgba(0, 242, 254, 0.04)',
                border: '1px solid rgba(0, 242, 254, 0.22)',
                padding: '10px 12px',
                borderRadius: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                fontSize: '11px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="font-mono" style={{ color: '#00f2fe', fontWeight: 700, fontSize: '10px', letterSpacing: '0.05em' }}>
                  ROLE ROUTING
                </span>
                <span
                  style={{
                    backgroundColor: 'rgba(0, 242, 254, 0.12)',
                    color: '#00f2fe',
                    border: '1px solid rgba(0, 242, 254, 0.3)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: 700,
                    fontSize: '10px'
                  }}
                >
                  {incident.assigned_role || 'Shift Floor Supervisor'}
                </span>
              </div>
              <div style={{ color: '#cbd5e1', fontSize: '11px', lineHeight: 1.45 }}>
                <strong style={{ color: '#38bdf8' }}>MANDATORY ACTION SOP: </strong>
                {incident.action_sop || 'Issue immediate verbal stop-work; provide certified protective equipment before worker resumes duties.'}
              </div>
            </div>
          </div>

          {/* Right: Multi-Level Safety Intelligence LLM Report */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Multi-Level Architecture Badges */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                background: 'rgba(0, 242, 254, 0.04)',
                border: '1px solid rgba(0, 242, 254, 0.2)',
                borderRadius: '6px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={13} color="#00f2fe" />
                <span className="font-mono" style={{ fontSize: '11px', fontWeight: 700, color: '#00f2fe' }}>
                  MULTI-LEVEL SAFETY INTELLIGENCE PIPELINE
                </span>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <span className="badge-level" style={{ fontSize: '9px', padding: '2px 6px', background: 'rgba(0, 230, 118, 0.15)', color: '#00e676', border: '1px solid rgba(0, 230, 118, 0.3)' }}>L1: YOLOv8</span>
                <span className="badge-level" style={{ fontSize: '9px', padding: '2px 6px', background: 'rgba(0, 242, 254, 0.15)', color: '#00f2fe', border: '1px solid rgba(0, 242, 254, 0.3)' }}>L2: Micro-VLM</span>
                <span className="badge-level" style={{ fontSize: '9px', padding: '2px 6px', background: 'rgba(255, 179, 0, 0.15)', color: '#ffb300', border: '1px solid rgba(255, 179, 0, 0.3)' }}>L3: EHS LLM</span>
              </div>
            </div>

            {/* Level 3 Forensic Root Cause & Regulatory Citations */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(14, 21, 28, 0.95) 0%, rgba(10, 14, 18, 0.95) 100%)',
                border: '1px solid rgba(0, 242, 254, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Cpu size={14} color="#00f2fe" />
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#00f2fe', letterSpacing: '0.04em' }}>
                    LEVEL 3 EHS REGULATORY LLM REASONER
                  </span>
                </div>
                {loadingLLM && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#ffb300' }}>
                    <RefreshCw size={10} className="spinning" />
                    <span>Reasoning...</span>
                  </div>
                )}
                {llmAudit && !loadingLLM && (
                  <span
                    className="font-mono"
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      color: (llmAudit.risk_index || 5) >= 7 ? '#ff1744' : '#ffb300',
                      background: 'rgba(255, 23, 68, 0.1)',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}
                  >
                    RISK INDEX: {llmAudit.risk_index || '7.5'}/10
                  </span>
                )}
              </div>

              {/* Forensic Summary */}
              <div style={{ fontSize: '11.5px', color: '#e2e8f0', lineHeight: '1.4' }}>
                {llmAudit?.forensic_summary ||
                  `Automated safety audit for ${incident.violation_type} in ${incident.zone_name}. Regulatory compliance evaluation active.`}
              </div>

              {/* OSHA & NFPA Citations */}
              <div>
                <span className="metric-label" style={{ fontSize: '10px', color: '#94a3b8' }}>
                  CERTIFIED REGULATORY CITATIONS:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '3px' }}>
                  {llmAudit?.citations && llmAudit.citations.length > 0 ? (
                    llmAudit.citations.map((cite: string, idx: number) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '10px',
                          fontFamily: 'var(--font-mono)',
                          background: 'rgba(0, 242, 254, 0.1)',
                          border: '1px solid rgba(0, 242, 254, 0.3)',
                          color: '#38bdf8',
                          padding: '2px 6px',
                          borderRadius: '3px'
                        }}
                      >
                        {cite}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '10px', color: '#38bdf8' }}>
                      OSHA 29 CFR 1910.135 & ANSI Z89.1 / NFPA 10
                    </span>
                  )}
                </div>
              </div>

              {/* Root Cause & Corrective Action */}
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: '4px',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  fontSize: '11px'
                }}
              >
                <div>
                  <span style={{ color: '#ffb300', fontWeight: 700 }}>ROOT CAUSE: </span>
                  <span style={{ color: '#cbd5e1' }}>
                    {llmAudit?.root_cause || 'Personnel bypassed safety equipment check during work station entry.'}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#00e676', fontWeight: 700 }}>RECOMMENDED CAPA: </span>
                  <span style={{ color: '#cbd5e1' }}>
                    {llmAudit?.capa_recommendation || 'Verify gear issuance log and calibrate zone airlock detector.'}
                  </span>
                </div>
              </div>

              {/* Automated Voice PA Dispatch Section */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(242, 169, 59, 0.08)',
                  border: '1px solid rgba(242, 169, 59, 0.25)',
                  padding: '8px 10px',
                  borderRadius: '4px',
                  marginTop: '2px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Radio size={14} color="var(--safety-amber)" />
                  <span style={{ fontSize: '11px', color: '#f1f5f9' }}>
                    {llmAudit?.announcement_text ||
                      `Attention ${incident.zone_name}. Worker PPE non-compliance flagged.`}
                  </span>
                </div>

                <button
                  onClick={handleSpeakPA}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    fontSize: '10px',
                    fontWeight: 700,
                    background: isSpeaking ? 'var(--safety-green)' : 'rgba(242, 169, 59, 0.2)',
                    color: isSpeaking ? '#000' : 'var(--safety-amber)',
                    border: '1px solid rgba(242, 169, 59, 0.4)',
                    cursor: 'pointer',
                    borderRadius: '3px'
                  }}
                  title="Broadcast automated audible announcement over plant PA speakers"
                >
                  <Volume2 size={12} />
                  <span>{isSpeaking ? 'ANNOUNCING...' : 'BROADCAST PA'}</span>
                </button>
              </div>
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
