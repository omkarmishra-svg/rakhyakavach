import React, { useState, useEffect, useCallback } from 'react';
import { NavBar, NavTab } from './components/NavBar';
import { HeroLiveFeed } from './components/HeroLiveFeed';
import { IncidentLogTicker } from './components/IncidentLogTicker';
import { IncidentDetailModal } from './components/IncidentDetailModal';
import { VideoSourceModal } from './components/VideoSourceModal';
import { SquareAlertGrid, WorkerAlertItem } from './components/SquareAlertGrid';
import { IncidentsView } from './components/IncidentsView';
import { AnalyticsView } from './components/AnalyticsView';

import {
  INITIAL_ZONES,
  INITIAL_TELEMETRY,
  CAMERA_DETECTIONS
} from './data/mockData';
import { Zone, Incident, IncidentStatus, DetectionItem, PlantTelemetry, HourlyViolation } from './types';
import { soundEngine } from './utils/audio';
import { Video, Camera, Radio } from 'lucide-react';

/* ----------------------------------------------------------------
   Camera Config: 4 available cameras. Only ONE streams at a time.
   Other cameras appear on the side rail; clicking any switches stream.
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
    name: 'Main Fabrication Bay',
    zoneName: 'Welding & Assembly Bay',
    type: 'cctv',
    videoSrc: '/data/demo_factory.mp4',
    zoneId: 'zone_1'
  },
  {
    id: 2,
    camCode: 'CAM 02',
    name: 'Operator Sentinel',
    zoneName: 'Live Hardware Camera',
    type: 'webcam',
    videoSrc: '',
    zoneId: 'zone_4'
  },
  {
    id: 3,
    camCode: 'CAM 03',
    name: 'Logistics & Loading Dock',
    zoneName: 'Loading Dock B',
    type: 'cctv',
    videoSrc: '/data/demo_factory.mp4',
    zoneId: 'zone_2'
  },
  {
    id: 4,
    camCode: 'CAM 04',
    name: 'Packaging & Warehouse',
    zoneName: 'Warehouse East',
    type: 'cctv',
    videoSrc: '/data/demo_factory.mp4',
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

  // Active single camera stream
  const [activeCamId, setActiveCamId] = useState<number>(1);
  const activeCam = CAMERAS.find((c) => c.id === activeCamId) || CAMERAS[0];

  // Video / webcam states
  const [isWebcamActive, setIsWebcamActive] = useState<boolean>(false);
  const [activeVideoSrc, setActiveVideoSrc] = useState<string>('/data/demo_factory.mp4');
  const [activeVideoName, setActiveVideoName] = useState<string>('Standard CCTV');

  // Real-time worker alert items (3-tier: Green, Yellow, Red)
  const [latestWorkers, setLatestWorkers] = useState<WorkerAlertItem[]>([
    {
      worker_id: 1,
      cam_id: 1,
      camera_name: 'CAM 01',
      status: 'COMPLIANT',
      color: '#00e676',
      worn_ppe: ['Helmet', 'High-Vis Vest', 'Boots'],
      missing_ppe: []
    },
    {
      worker_id: 2,
      cam_id: 1,
      camera_name: 'CAM 01',
      status: 'PARTIAL',
      color: '#ffb300',
      worn_ppe: ['Hard Hat', 'Boots'],
      missing_ppe: ['Safety Vest']
    },
    {
      worker_id: 3,
      cam_id: 1,
      camera_name: 'CAM 01',
      status: 'MISSING ALL',
      color: '#ff1744',
      worn_ppe: [],
      missing_ppe: ['Hard Hat', 'Safety Vest', 'Boots']
    }
  ]);
  const [hasHazard, setHasHazard] = useState<boolean>(false);

  const activeZone = zones.find((z) => z.zone_id === activeCam.zoneId) || zones[0];
  const activeDetections = CAMERA_DETECTIONS[activeZone.camera_id] || [];

  // 1. Fetch real incidents directly from SQLite database (incidents.db)
  const loadDatabaseIncidents = useCallback(async () => {
    try {
      const res = await fetch('/api/incidents?limit=100');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
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

  // Switch the single streamed camera
  const handleSwitchCamera = (camId: number) => {
    const cam = CAMERAS.find((c) => c.id === camId);
    if (!cam) return;
    setActiveCamId(camId);

    if (cam.type === 'webcam') {
      setIsWebcamActive(true);
      setActiveVideoName('Live Webcam Feed');
    } else {
      setIsWebcamActive(false);
      setActiveVideoSrc(cam.videoSrc || '/data/demo_factory.mp4');
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
      handleSwitchCamera(2);
    } else {
      handleSwitchCamera(1);
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
    } catch {}
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
      setHasHazard(false);
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
      />

      {/* 2. LIVE VISION TAB: Side Camera Selector + Single Streamed Hero Feed + Real-Time Square Alerts */}
      {currentTab === 'vision' && (
        <>
          <main className="vision-layout">
            {/* Left Rail: Camera Selector (Click to switch stream) */}
            <aside className="camera-thumbnail-rail">
              <div className="rail-header">
                <div className="rail-title-row">
                  <Radio size={14} className="rail-icon" />
                  <span className="rail-title">CAMERA FEEDS</span>
                </div>
                <span className="rail-badge">1 STREAMING</span>
              </div>

              <div className="camera-cards-list">
                {CAMERAS.map((cam) => {
                  const isActive = cam.id === activeCamId;
                  return (
                    <button
                      key={cam.id}
                      className={`cam-select-card ${isActive ? 'active' : ''}`}
                      onClick={() => handleSwitchCamera(cam.id)}
                      title={`Click to switch stream to ${cam.name}`}
                    >
                      <div className="cam-card-top">
                        <span className="cam-code-tag">{cam.camCode}</span>
                        <span className={`cam-stream-status ${isActive ? 'live' : 'standby'}`}>
                          {isActive ? '● STREAMING' : 'CLICK TO VIEW'}
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
                              <Video size={11} style={{ marginRight: '3px' }} /> CCTV
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

            {/* Center Area: Single Active Streamed Camera */}
            <div className="hero-feed-area">
              <HeroLiveFeed
                currentZone={activeZone}
                allZones={zones}
                detections={activeDetections}
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
                onSelectLiveCamera={() => handleSwitchCamera(2)}
                onSelectCCTV={() => handleSwitchCamera(1)}
                onInferenceWorkers={handleInferenceWorkers}
              />
            </div>

            {/* Right Sidebar: Real-time Square Alert Grid */}
            <aside className="alerts-sidebar">
              <SquareAlertGrid
                workers={latestWorkers}
                hasHazard={hasHazard}
                hazardInfo={`Surveillance anomaly on ${activeCam.camCode}`}
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

      {/* 3. AUDIT LOGS TAB (Restored) */}
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

      {/* 4. ANALYSIS / ANALYTICS TAB (Restored) */}
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
        onSelectWebcam={() => handleSwitchCamera(2)}
      />

      <IncidentDetailModal
        incident={selectedIncident}
        onClose={() => setSelectedIncident(null)}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
};
