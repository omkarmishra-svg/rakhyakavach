import React, { useState, useEffect, useCallback } from 'react';
import { NavBar, NavTab } from './components/NavBar';
import { HeroLiveFeed } from './components/HeroLiveFeed';
import { IncidentLogTicker } from './components/IncidentLogTicker';
import { IncidentDetailModal } from './components/IncidentDetailModal';
import { VideoSourceModal } from './components/VideoSourceModal';
import { SquareAlertGrid, WorkerAlertItem } from './components/SquareAlertGrid';
import { IncidentsView } from './components/IncidentsView';
import { AnalyticsView } from './components/AnalyticsView';
import { OshaCertificateModal } from './components/OshaCertificateModal';
import { MultiCameraFeed } from './components/MultiCameraFeed';
import { MultiLevelSafetyModal } from './components/MultiLevelSafetyModal';
import { SmartGatekeeperView } from './components/SmartGatekeeperView';

import {
  INITIAL_ZONES,
  INITIAL_TELEMETRY
} from './data/mockData';
import { Zone, Incident, IncidentStatus, DetectionItem, PlantTelemetry, HourlyViolation } from './types';
import { soundEngine } from './utils/audio';
import { Video, Camera, Radio } from 'lucide-react';

/* ----------------------------------------------------------------
   Surveillance Feed Matrix:
   CAM 01: Dedicated Live Hardware Webcam for on-stage judge demonstrations.
   CCTV 01 - 03: Industrial factory CCTV streams with real AI detection.
   GATE 01: Smart Airlock & Turnstile Access Control Sentinel.
   ---------------------------------------------------------------- */
interface CameraItem {
  id: number;
  camCode: string;
  name: string;
  zoneName: string;
  type: 'cctv' | 'webcam' | 'video';
  videoSrc: string;
  zoneId: string;
}

const CAMERAS: CameraItem[] = [
  {
    id: 1,
    camCode: 'CAM 01',
    name: 'Operator Live Sentinel',
    zoneName: 'Hardware Webcam Stream',
    type: 'webcam',
    videoSrc: '',
    zoneId: 'zone_4'
  },
  {
    id: 2,
    camCode: 'CCTV 01',
    name: 'Main Fabrication Bay',
    zoneName: 'Welding & Heavy Machinery',
    type: 'cctv',
    videoSrc: '/data/cctv_bay1.mp4',
    zoneId: 'zone_1'
  },
  {
    id: 3,
    camCode: 'CCTV 02',
    name: 'Logistics & Loading Dock',
    zoneName: 'Dock B & Freight Staging',
    type: 'cctv',
    videoSrc: '/data/cctv_bay2.mp4',
    zoneId: 'zone_2'
  },
  {
    id: 4,
    camCode: 'CCTV 03',
    name: 'Warehouse & Robotics',
    zoneName: 'High-Bay Staging Depot',
    type: 'cctv',
    videoSrc: '/data/cctv_bay3.mp4',
    zoneId: 'zone_5'
  }
];

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('vision');
  const [zones] = useState<Zone[]>(INITIAL_ZONES);
  const [telemetry, setTelemetry] = useState<PlantTelemetry>(INITIAL_TELEMETRY);
  const [hourlyViolations, setHourlyViolations] = useState<HourlyViolation[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [newestIncidentId, setNewestIncidentId] = useState<string | null>(null);

  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState<boolean>(false);
  const [isOshaModalOpen, setIsOshaModalOpen] = useState<boolean>(false);
  const [isMultiLevelModalOpen, setIsMultiLevelModalOpen] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'focus' | 'matrix'>('focus');

  // Active single camera stream (defaults to CCTV 01 for instant live demo)
  const [activeCamId, setActiveCamId] = useState<number>(2);
  const activeCam = CAMERAS.find((c) => c.id === activeCamId) || CAMERAS[1];

  // Video / webcam states
  const [isWebcamActive, setIsWebcamActive] = useState<boolean>(false);
  const [activeVideoSrc, setActiveVideoSrc] = useState<string>('/data/cctv_bay1.mp4');
  const [activeVideoName, setActiveVideoName] = useState<string>('Main Fabrication Bay');

  // Real-time worker alert items (filled directly by AI detections, NO fake initial items)
  const [latestWorkers, setLatestWorkers] = useState<WorkerAlertItem[]>([]);
  const [hasHazard, setHasHazard] = useState<boolean>(false);
  const [hazardInfo, setHazardInfo] = useState<string>('');

  const activeZone = zones.find((z) => z.zone_id === activeCam.zoneId) || zones[0];

  // 1. Fetch real incidents directly from SQLite database (incidents.db)
  const loadDatabaseIncidents = useCallback(async () => {
    try {
      const res = await fetch('/api/incidents?limit=100');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setIncidents(data);
        }
      }
    } catch (err) {
      console.error('Error fetching database incidents', err);
    }
  }, []);

  // 2. Fetch real analytics & hourly distribution from database
  const loadDatabaseAnalytics = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics');
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.hourly_violations && data.hourly_violations.length > 0) {
          setHourlyViolations(data.hourly_violations);
        }
      }
    } catch {}
  }, []);

  // 3. Poll backend database telemetry & incidents
  useEffect(() => {
    loadDatabaseIncidents();
    loadDatabaseAnalytics();

    const fetchBackendData = async () => {
      try {
        const res = await fetch('/api/telemetry');
        if (res.ok) {
          const data = await res.json();
          if (data.telemetry) setTelemetry(data.telemetry);
        }
      } catch {}
    };

    fetchBackendData();
    const interval = setInterval(fetchBackendData, 4000);
    return () => clearInterval(interval);
  }, [loadDatabaseIncidents, loadDatabaseAnalytics]);

  // Switch camera: seamless toggle between Webcam and CCTV
  const handleSwitchCamera = (camId: number) => {
    const cam = CAMERAS.find((c) => c.id === camId);
    if (!cam) return;
    setActiveCamId(camId);

    if (cam.type === 'webcam') {
      setIsWebcamActive(true);
      setActiveVideoName('Live Webcam Feed');
    } else {
      setIsWebcamActive(false);
      setActiveVideoSrc(cam.videoSrc || '/data/cctv_bay1.mp4');
      setActiveVideoName(cam.name);
    }
  };

  // Video source modal handlers
  const handleSelectVideoUrl = (url: string, name: string) => {
    setIsWebcamActive(false);
    setActiveVideoSrc(url);
    setActiveVideoName(name);
  };

  const handleToggleWebcam = () => {
    if (!isWebcamActive) {
      handleSwitchCamera(1);
    } else {
      handleSwitchCamera(2);
    }
  };

  // Click detection to view details
  const handleSelectDetection = (detection: DetectionItem) => {
    const dynamicInc: Incident = {
      id: `DET-${Math.floor(10000 + Math.random() * 90000)}`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      zone_id: activeZone.zone_id,
      zone_name: activeZone.name,
      violation_type: detection.label,
      severity: detection.status === 'hazard' ? 'Critical' : 'High',
      confidence: detection.confidence,
      worker_id: detection.worker_id || null,
      snapshot_path: '/data/snapshots/sample_live.jpg',
      status: 'Active',
      action_notes: detection.sublabel || 'Camera verification triggered.'
    };
    setSelectedIncident(dynamicInc);
  };

  // New incident detection handler
  const handleNewIncidentDetected = (info: any) => {
    const missingStr = (info.missing_ppe || []).join(', ').toUpperCase();
    if (!missingStr) return;

    const now = Date.now();
    const lastTime = (window as any).__last_incident_time || 0;
    if (now - lastTime < 10000) return;
    (window as any).__last_incident_time = now;

    const newId = `AI-${Math.floor(30000 + Math.random() * 70000)}`;
    const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false });

    const newInc: Incident = {
      id: newId,
      timestamp: nowTime,
      zone_id: activeZone.zone_id,
      zone_name: activeZone.name,
      violation_type: `Missing PPE: ${missingStr}`,
      severity: 'High',
      confidence: 0.92,
      worker_id: info.worker_id || null,
      snapshot_path: '',
      status: 'Active',
      action_notes: `AI Vision flagged missing: ${missingStr}`
    };

    setIncidents((prev) => [newInc, ...prev]);
    setNewestIncidentId(newId);

    try {
      soundEngine.playAlert();
      // Voice PA Dispatcher announcement (Web Speech API + Radio chime)
      soundEngine.announceViolation(activeZone.name, info.missing_ppe || []);
    } catch {}
  };

  // Handle fire/smoke hazard detection
  const handleHazardDetected = (hazard: any) => {
    setHasHazard(true);
    const typeStr = hazard.hazard_type === 'fire' ? 'FIRE' : 'SMOKE';
    const confPct = Math.round((hazard.confidence || 0.9) * 100);
    const msg = `CRITICAL ${typeStr} HAZARD DETECTED on ${activeCam.camCode} (${confPct}% Confidence)`;
    setHazardInfo(msg);

    // Voice PA Hazard Announcer
    try {
      soundEngine.announceHazard(typeStr, activeZone.name);
    } catch {}

    const now = Date.now();
    const lastHazardTime = (window as any).__last_hazard_log_time || 0;
    if (now - lastHazardTime > 12000) {
      (window as any).__last_hazard_log_time = now;
      const hazId = `HAZ-${Math.floor(50000 + Math.random() * 50000)}`;
      const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false });
      const hazardInc: Incident = {
        id: hazId,
        timestamp: nowTime,
        zone_id: activeZone.zone_id,
        zone_name: activeZone.name,
        violation_type: `${typeStr} HAZARD`,
        severity: 'Critical',
        confidence: hazard.confidence || 0.94,
        worker_id: null,
        snapshot_path: '',
        status: 'Active',
        action_notes: `AI Sentinel flagged high-priority ${typeStr.toLowerCase()} signature.`
      };
      setIncidents((prev) => [hazardInc, ...prev]);
      setNewestIncidentId(hazId);
    }
  };

  // Update worker alert grid from HeroLiveFeed AI inference results
  const handleInferenceWorkers = useCallback(
    (workers: any[]) => {
      const mapped: WorkerAlertItem[] = workers.map((w: any) => ({
        worker_id: w.worker_id,
        cam_id: activeCamId,
        camera_name: activeCam.camCode,
        status: w.status || (w.is_compliant ? 'COMPLIANT' : 'PARTIAL'),
        color: w.color || '#ffb300',
        missing_ppe: w.missing_ppe || [],
        worn_ppe: w.worn_ppe || []
      }));
      setLatestWorkers(mapped);
    },
    [activeCamId, activeCam.camCode]
  );

  // Update incident status
  const handleUpdateStatus = async (id: string, newStatus: IncidentStatus) => {
    setIncidents((prev) =>
      prev.map((inc) => (inc.id === id ? { ...inc, status: newStatus } : inc))
    );
    try {
      await fetch(`/api/incidents/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
    } catch {}
  };

  // Export audit logs CSV
  const handleExportAuditCsv = () => {
    const headers = [
      'ID',
      'Timestamp',
      'Zone',
      'Violation',
      'Severity',
      'Confidence',
      'Worker',
      'Status',
      'Notes'
    ];
    const rows = incidents.map((inc) => [
      inc.id,
      inc.timestamp,
      `"${inc.zone_name}"`,
      `"${inc.violation_type}"`,
      inc.severity,
      inc.confidence,
      inc.worker_id || 'N/A',
      inc.status,
      `"${inc.action_notes || ''}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `RAKSHA_KAVACH_AUDIT_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="instrument-wall">
      {/* 1. Top Navigation Bar with Live Vision / Audit Logs / Analysis */}
      <NavBar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        telemetry={telemetry}
        onOpenOshaModal={() => setIsOshaModalOpen(true)}
        onOpenMultiLevelLLM={() => setIsMultiLevelModalOpen(true)}
      />

      {/* 2. LIVE VISION TAB: Side Camera Selector + Single Streamed Hero Feed + Real-Time Square Alerts */}
      {currentTab === 'vision' && (
        <>
          <main className="vision-layout">
            {/* Left Rail: Surveillance Camera Selector */}
            <aside className="camera-thumbnail-rail">
              <div className="rail-header">
                <div className="rail-title-row">
                  <Radio size={14} className="rail-icon" />
                  <span className="rail-title">SURVEILLANCE CAMERAS</span>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    className={`rail-badge ${viewMode === 'focus' ? 'active' : ''}`}
                    onClick={() => setViewMode('focus')}
                    title="Single Focused Stream View"
                    style={{
                      cursor: 'pointer',
                      border: viewMode === 'focus' ? '1px solid #00f2fe' : '1px solid rgba(255,255,255,0.1)',
                      color: viewMode === 'focus' ? '#00f2fe' : '#94a3b8',
                      background: viewMode === 'focus' ? 'rgba(0, 242, 254, 0.12)' : 'transparent'
                    }}
                  >
                    FOCUS
                  </button>
                  <button
                    className={`rail-badge ${viewMode === 'matrix' ? 'active' : ''}`}
                    onClick={() => setViewMode('matrix')}
                    title="2x2 Security Wall Matrix"
                    style={{
                      cursor: 'pointer',
                      border: viewMode === 'matrix' ? '1px solid #00f2fe' : '1px solid rgba(255,255,255,0.1)',
                      color: viewMode === 'matrix' ? '#00f2fe' : '#94a3b8',
                      background: viewMode === 'matrix' ? 'rgba(0, 242, 254, 0.12)' : 'transparent'
                    }}
                  >
                    2x2 WALL
                  </button>
                </div>
              </div>

              <div className="camera-cards-list">
                {CAMERAS.map((cam) => {
                  const isActive = cam.id === activeCamId;
                  return (
                    <button
                      key={cam.id}
                      className={`cam-select-card ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        handleSwitchCamera(cam.id);
                        setViewMode('focus');
                      }}
                      title={`Click to view stream: ${cam.name}`}
                    >
                      <div className="cam-card-top">
                        <span className="cam-code-tag">{cam.camCode}</span>
                        <span className={`cam-stream-status ${isActive ? 'live' : 'standby'}`}>
                          {isActive ? '● STREAMING' : 'STANDBY'}
                        </span>
                      </div>

                      <div className="cam-card-body">
                        <div className="cam-card-name">{cam.name}</div>
                        <div className="cam-card-zone">{cam.zoneName}</div>
                      </div>

                      <div className="cam-card-footer">
                        <span className="cam-type-badge">
                          {cam.type === 'webcam' ? (
                            <>
                              <Camera size={11} style={{ marginRight: '3px' }} /> WEBCAM
                            </>
                          ) : (
                            <>
                              <Video size={11} style={{ marginRight: '3px' }} /> CCTV RTSP
                            </>
                          )}
                        </span>
                        <span className="cam-action-hint">
                          {isActive ? 'Active Stream' : 'Switch Feed →'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Center Area: Single Active Streamed Camera OR 2x2 Matrix Wall */}
            <div className="hero-feed-area">
              {viewMode === 'matrix' ? (
                <MultiCameraFeed
                  fullscreenCamId={null}
                  onToggleFullscreen={(camId) => {
                    if (camId) {
                      handleSwitchCamera(camId);
                      setViewMode('focus');
                    }
                  }}
                  onOpenSourceModalForCam={(camId) => {
                    handleSwitchCamera(camId);
                    setIsSourceModalOpen(true);
                  }}
                  onWorkersDetected={(workers, hasHaz, hazInfo) => {
                    setLatestWorkers(workers);
                    if (hasHaz) {
                      setHasHazard(true);
                      setHazardInfo(hazInfo);
                    }
                  }}
                  configs={[
                    { id: 1, name: 'CAM 01: Operator Live Sentinel', type: 'webcam', source: '' },
                    { id: 2, name: 'CCTV 01: Fabrication Bay', type: 'cctv', source: '/data/cctv_bay1.mp4' },
                    { id: 3, name: 'CCTV 02: Logistics & Freight Dock', type: 'cctv', source: '/data/cctv_bay2.mp4' },
                    { id: 4, name: 'CCTV 03: High-Bay Robotics Depot', type: 'cctv', source: '/data/cctv_bay3.mp4' }
                  ]}
                />
              ) : (
                <HeroLiveFeed
                  currentZone={activeZone}
                  allZones={zones}
                  detections={[]}
                  isWebcamActive={isWebcamActive}
                  activeVideoSrc={activeVideoSrc}
                  activeVideoName={activeVideoName}
                  onToggleWebcam={handleToggleWebcam}
                  onSelectCamera={(camId) => {
                    const match = CAMERAS.find((c) => c.camCode.includes(camId));
                    if (match) handleSwitchCamera(match.id);
                  }}
                  onSelectDetection={handleSelectDetection}
                  onOpenSourceModal={() => setIsSourceModalOpen(true)}
                  onNewIncidentDetected={handleNewIncidentDetected}
                  onSelectLiveCamera={() => handleSwitchCamera(1)}
                  onSelectCCTV={() => handleSwitchCamera(2)}
                  onInferenceWorkers={handleInferenceWorkers}
                  onHazardDetected={handleHazardDetected}
                />
              )}
            </div>

            {/* Right Sidebar: Real-time Square Alert Grid */}
            <aside className="alerts-sidebar">
              <SquareAlertGrid
                workers={latestWorkers}
                hasHazard={hasHazard}
                hazardInfo={hazardInfo || `Surveillance anomaly on ${activeCam.camCode}`}
              />
            </aside>
          </main>

          {/* Bottom Incident Log Ticker */}
          <IncidentLogTicker
            incidents={incidents}
            newestIncidentId={newestIncidentId}
            onSelectIncident={(inc) => setSelectedIncident(inc)}
            onExportAuditCsv={handleExportAuditCsv}
          />
        </>
      )}

      {/* 2. SMART AIRLOCK & GATE 1 ACCESS TAB */}
      {currentTab === 'gatekeeper' && (
        <div className="tab-stage">
          <SmartGatekeeperView />
        </div>
      )}

      {/* 3. AUDIT LOGS TAB */}
      {currentTab === 'incidents' && (
        <div className="tab-stage">
          <IncidentsView
            incidents={incidents}
            onSelectIncident={(inc) => setSelectedIncident(inc)}
            onUpdateStatus={handleUpdateStatus}
            onExportAuditCsv={handleExportAuditCsv}
          />
        </div>
      )}

      {/* 4. ANALYSIS / ANALYTICS TAB */}
      {currentTab === 'analytics' && (
        <div className="tab-stage">
          <AnalyticsView
            zones={zones}
            hourlyViolations={hourlyViolations}
            compliancePct={telemetry.compliance_pct}
          />
        </div>
      )}

      {/* Modals */}
      <VideoSourceModal
        isOpen={isSourceModalOpen}
        onClose={() => setIsSourceModalOpen(false)}
        onSelectVideoUrl={handleSelectVideoUrl}
        onSelectWebcam={() => handleSwitchCamera(1)}
      />

      <IncidentDetailModal
        incident={selectedIncident}
        onClose={() => setSelectedIncident(null)}
        onUpdateStatus={handleUpdateStatus}
      />

      <OshaCertificateModal
        isOpen={isOshaModalOpen}
        onClose={() => setIsOshaModalOpen(false)}
        telemetry={telemetry}
        totalIncidents={incidents.length}
      />

      <MultiLevelSafetyModal
        isOpen={isMultiLevelModalOpen}
        onClose={() => setIsMultiLevelModalOpen(false)}
      />
    </div>
  );
};
