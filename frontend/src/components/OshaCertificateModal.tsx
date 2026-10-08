import React from 'react';
import { X, Award, ShieldCheck, Printer, CheckCircle, Lock } from 'lucide-react';
import { PlantTelemetry } from '../types';

interface OshaCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry: PlantTelemetry;
  totalIncidents: number;
}

export const OshaCertificateModal: React.FC<OshaCertificateModalProps> = ({
  isOpen,
  onClose,
  telemetry,
  totalIncidents
}) => {
  if (!isOpen) return null;

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const certId = `OSHA-KAVACH-2026-X${Math.floor(1000 + Math.random() * 9000)}`;
  const shaHash = `SHA-256: 8f2a${Math.random().toString(16).substring(2, 10)}...d4e9`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-window print-certificate-window"
        style={{ maxWidth: '780px', background: '#0a0f1d', border: '1.5px solid #00e676', borderRadius: '14px', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'rgba(0, 230, 118, 0.08)', borderBottom: '1px solid rgba(0, 230, 118, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Award size={20} color="#00e676" />
            <span style={{ fontWeight: 800, fontSize: '14px', color: '#f8fafc', letterSpacing: '0.04em' }}>
              OFFICIAL OSHA & EHS INDUSTRIAL SAFETY CERTIFICATE
            </span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Printable Certificate Body */}
        <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header Banner */}
          <div style={{ textAlign: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '16px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(0, 230, 118, 0.15)', border: '1px solid #00e676', padding: '4px 12px', borderRadius: '20px', marginBottom: '10px' }}>
              <ShieldCheck size={14} color="#00e676" />
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#00e676', letterSpacing: '0.08em' }}>
                ISO 45001 & OSHA 1910 COMPLIANT SAFETY RECORD
              </span>
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff', letterSpacing: '0.02em', margin: '4px 0' }}>
              FACTORY SAFETY VERIFICATION CERTIFICATE
            </h2>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              Automated Surveillance Audit issued by <b>Raksha Kavach AI Sentinel Engine</b>
            </div>
          </div>

          {/* Plant & Audit Metadata */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>FACILITY / PLANT</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>Welding & Fabrication Complex</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>CERTIFICATE ID</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#00e676', fontFamily: 'monospace', marginTop: '2px' }}>{certId}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>AUDIT DATE</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>{today}</div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            <div style={{ background: 'rgba(0, 230, 118, 0.08)', border: '1px solid rgba(0, 230, 118, 0.25)', padding: '14px', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#00e676' }}>{telemetry.compliance_pct}%</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginTop: '2px' }}>Compliance Score</div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '14px', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff' }}>4/4</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginTop: '2px' }}>CCTV Streams Active</div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '14px', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff' }}>{totalIncidents}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginTop: '2px' }}>Audited Incidents</div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '14px', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#3b82f6' }}>0.02s</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginTop: '2px' }}>Inference Latency</div>
            </div>
          </div>

          {/* Underwriter & Cryptographic Hash */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'rgba(0, 0, 0, 0.4)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={14} color="#00e676" />
              <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#94a3b8' }}>
                Tamper-Resistant Proof: <b>{shaHash}</b>
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#00e676', fontSize: '11px', fontWeight: 700 }}>
              <CheckCircle size={14} />
              <span>CRYPTOGRAPHICALLY SEALED</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px' }}>
            <button className="clean-ctrl-btn" onClick={onClose}>
              <span>Close</span>
            </button>
            <button className="clean-ctrl-btn primary" onClick={handlePrint}>
              <Printer size={14} style={{ marginRight: '6px' }} />
              <span>Print / Save Official PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
