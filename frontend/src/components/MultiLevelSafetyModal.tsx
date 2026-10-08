import React, { useState, useEffect } from 'react';
import {
  X,
  Layers,
  Cpu,
  Volume2,
  RefreshCw,
  Zap,
  Radio
} from 'lucide-react';

interface MultiLevelSafetyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MultiLevelSafetyModal: React.FC<MultiLevelSafetyModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const [archData, setArchData] = useState<any | null>(null);
  const [selectedZone, setSelectedZone] = useState<string>('Fabrication Bay 1 - Welding & Heavy Press');
  const [selectedMissing, setSelectedMissing] = useState<string[]>(['helmet', 'vest']);
  const [selectedHazards, setSelectedHazards] = useState<string[]>([]);
  const [llmResult, setLlmResult] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Fetch system architecture on open
  useEffect(() => {
    fetch('/api/safety-llm-levels')
      .then((res) => res.json())
      .then((data) => setArchData(data))
      .catch(() => {});
  }, []);

  const handleTogglePPE = (item: string) => {
    setSelectedMissing((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleToggleHazard = (hazard: string) => {
    setSelectedHazards((prev) =>
      prev.includes(hazard) ? prev.filter((h) => h !== hazard) : [...prev, hazard]
    );
  };

  const handleRunAnalysis = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/analyze-safety-llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          worker_id: 104,
          zone_name: selectedZone,
          missing_ppe: selectedMissing,
          hazards: selectedHazards
        })
      });
      if (res.ok) {
        const data = await res.json();
        setLlmResult(data);
      }
    } catch (err) {
      console.error('LLM analysis error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeakPA = () => {
    const text =
      llmResult?.announcement_text ||
      `Attention ${selectedZone}. Safety alert triggered. Compliance verification required.`;
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

  // Run initial test on open if not yet run
  useEffect(() => {
    handleRunAnalysis();
  }, []);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-window"
        style={{ maxWidth: '960px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers size={20} color="#00f2fe" />
            <div>
              <span className="modal-title" style={{ color: '#00f2fe' }}>
                MULTI-LEVEL SAFETY INTELLIGENCE SYSTEM
              </span>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                Hierarchical AI Pipeline: Edge YOLOv8 &bull; Spectral Micro-VLM &bull; In-House EHS Expert LLM Reasoner
              </div>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Level 1, 2, 3 Architecture Strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '12px'
            }}
          >
            {/* Level 1 Card */}
            <div
              style={{
                backgroundColor: 'rgba(0, 230, 118, 0.05)',
                border: '1px solid rgba(0, 230, 118, 0.3)',
                borderRadius: '8px',
                padding: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#00e676' }}>LEVEL 1: EDGE VISION</span>
                <span className="font-mono" style={{ fontSize: '10px', color: '#00e676' }}>~12ms</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#f1f5f9', marginBottom: '4px' }}>
                YOLOv8 Edge Detector
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.4' }}>
                High-speed microsecond bounding box localization of workers, helmets, vests, and fire/smoke signatures.
              </div>
              <div style={{ marginTop: '8px', fontSize: '10px', color: '#00e676', fontWeight: 600 }}>
                &bull; STATUS: ACTIVE (ON-DEVICE)
              </div>
            </div>

            {/* Level 2 Card */}
            <div
              style={{
                backgroundColor: 'rgba(0, 242, 254, 0.05)',
                border: '1px solid rgba(0, 242, 254, 0.3)',
                borderRadius: '8px',
                padding: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#00f2fe' }}>LEVEL 2: SPECTRAL VLM</span>
                <span className="font-mono" style={{ fontSize: '10px', color: '#00f2fe' }}>~5ms</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#f1f5f9', marginBottom: '4px' }}>
                Spectral Micro-VLM
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.4' }}>
                Inspects ANSI/ISEA 107 retroreflective tape fluorescence, hardhat luminance ratios, and colorimetry.
              </div>
              <div style={{ marginTop: '8px', fontSize: '10px', color: '#00f2fe', fontWeight: 600 }}>
                &bull; STATUS: ACTIVE (ON-DEVICE)
              </div>
            </div>

            {/* Level 3 Card */}
            <div
              style={{
                backgroundColor: 'rgba(255, 179, 0, 0.05)',
                border: '1px solid rgba(255, 179, 0, 0.3)',
                borderRadius: '8px',
                padding: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#ffb300' }}>LEVEL 3: EXPERT REASONER</span>
                <span className="font-mono" style={{ fontSize: '10px', color: '#ffb300' }}>~25ms</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#f1f5f9', marginBottom: '4px' }}>
                In-House EHS LLM Reasoner
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.4' }}>
                OSHA 1910 / NFPA citations, dynamic risk severity (1-10), forensic root-cause analysis, and voice PA dispatch.
              </div>
              <div style={{ marginTop: '8px', fontSize: '10px', color: '#ffb300', fontWeight: 600 }}>
                &bull; {archData?.cloud_vlm_connected ? 'CLOUD VLM READY' : 'SELF-HOSTED ENGINE'}
              </div>
            </div>
          </div>

          {/* Interactive Tester Section */}
          <div
            style={{
              backgroundColor: 'var(--surface-panel-subtle)',
              border: '1px solid var(--border-hairline)',
              borderRadius: '8px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={14} color="#00f2fe" />
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#f1f5f9' }}>
                  INTERACTIVE SAFETY REASONING SIMULATOR
                </span>
              </div>
              <button
                className="clean-ctrl-btn primary"
                onClick={handleRunAnalysis}
                disabled={isLoading}
                style={{
                  padding: '5px 12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={12} className={isLoading ? 'spinning' : ''} />
                <span>{isLoading ? 'REASONING...' : 'RUN LLM AUDIT'}</span>
              </button>
            </div>

            {/* Selectors */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '12px', fontSize: '11px' }}>
              <div>
                <label className="metric-label" style={{ marginBottom: '4px', display: 'block' }}>
                  TARGET INDUSTRIAL ZONE
                </label>
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--surface-main)',
                    color: '#f1f5f9',
                    border: '1px solid var(--border-hairline)',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    fontSize: '11px'
                  }}
                >
                  <option value="Fabrication Bay 1 - Welding & Heavy Press">Fabrication Bay 1 (Welding & Press)</option>
                  <option value="Robotic Assembly Line 2">Robotic Assembly Line 2 (Automated Cell)</option>
                  <option value="Chemical & Solvent Staging Zone">Chemical & Solvent Staging Zone</option>
                  <option value="Logistics Loading Dock 4">Logistics Loading Dock 4 (Forklift Corridor)</option>
                </select>
              </div>

              <div>
                <label className="metric-label" style={{ marginBottom: '4px', display: 'block' }}>
                  SIMULATED SAFETY VIOLATIONS & HAZARDS (CLICK TO TOGGLE)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {[
                    { id: 'helmet', label: 'Missing Hardhat' },
                    { id: 'vest', label: 'Missing High-Vis Vest' },
                    { id: 'glasses', label: 'Missing Safety Glasses' },
                    { id: 'boots', label: 'Missing Steel-Toe Boots' },
                    { id: 'fire', label: 'Thermal Fire Plume', hazard: true },
                    { id: 'smoke', label: 'Toxic Smoke Plume', hazard: true },
                    { id: 'trespass', label: 'Robotic Cell Trespass', hazard: true }
                  ].map((item) => {
                    const isSelected = item.hazard
                      ? selectedHazards.includes(item.id)
                      : selectedMissing.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() =>
                          item.hazard ? handleToggleHazard(item.id) : handleTogglePPE(item.id)
                        }
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          backgroundColor: isSelected
                            ? item.hazard
                              ? 'rgba(255, 23, 68, 0.25)'
                              : 'rgba(255, 179, 0, 0.25)'
                            : 'rgba(255, 255, 255, 0.05)',
                          border: `1px solid ${
                            isSelected
                              ? item.hazard
                                ? '#ff1744'
                                : '#ffb300'
                              : 'var(--border-hairline)'
                          }`,
                          color: isSelected
                            ? item.hazard
                              ? '#ff1744'
                              : '#ffb300'
                            : '#94a3b8'
                        }}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* LLM Reasoning Output */}
            {llmResult && (
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(14, 21, 28, 0.95) 0%, rgba(10, 14, 18, 0.95) 100%)',
                  border: '1px solid rgba(0, 242, 254, 0.3)',
                  borderRadius: '6px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  marginTop: '4px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Cpu size={14} color="#00f2fe" />
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#00f2fe', letterSpacing: '0.04em' }}>
                      LEVEL 3 MULTI-LEVEL FORENSIC REPORT
                    </span>
                  </div>
                  <span
                    className="font-mono"
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: (llmResult.risk_index || 5) >= 7 ? '#ff1744' : '#ffb300',
                      background: 'rgba(255, 23, 68, 0.12)',
                      padding: '2px 8px',
                      borderRadius: '4px'
                    }}
                  >
                    CALCULATED RISK SEVERITY: {llmResult.risk_index}/10
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: '#f1f5f9', lineHeight: '1.4' }}>
                  {llmResult.forensic_summary}
                </div>

                {/* Citations */}
                <div>
                  <span className="metric-label" style={{ fontSize: '10px' }}>
                    OFFICIAL OSHA / NFPA REGULATORY CITATIONS:
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '3px' }}>
                    {llmResult.citations?.map((c: string, idx: number) => (
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
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Root Cause & CAPA */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', marginTop: '2px' }}>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 8px', borderRadius: '4px' }}>
                    <span style={{ color: '#ffb300', fontWeight: 700 }}>ROOT CAUSE: </span>
                    <span style={{ color: '#cbd5e1' }}>{llmResult.root_cause}</span>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 8px', borderRadius: '4px' }}>
                    <span style={{ color: '#00e676', fontWeight: 700 }}>CAPA ACTION: </span>
                    <span style={{ color: '#cbd5e1' }}>{llmResult.capa_recommendation}</span>
                  </div>
                </div>

                {/* Voice Dispatch */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(242, 169, 59, 0.08)',
                    border: '1px solid rgba(242, 169, 59, 0.25)',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    marginTop: '2px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#f1f5f9' }}>
                    <Radio size={13} color="var(--safety-amber)" />
                    <span>{llmResult.announcement_text}</span>
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
                  >
                    <Volume2 size={12} />
                    <span>{isSpeaking ? 'BROADCASTING...' : 'BROADCAST VOICE PA'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            ENGINE: Raksha Kavach Multi-Level Safety Intelligence v2.5
          </div>
          <button className="control-btn" onClick={onClose}>
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
