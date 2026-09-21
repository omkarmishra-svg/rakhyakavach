import React, { useState, useEffect } from 'react';
import { NavBar, NavTab } from './components/NavBar';
import { HeroLiveFeed } from './components/HeroLiveFeed';
import { ZoneStatusRail } from './components/ZoneStatusRail';
import { IncidentLogTicker } from './components/IncidentLogTicker';
import { IncidentDetailModal } from './components/IncidentDetailModal';
import { ZoneDeepDiveModal } from './components/ZoneDeepDiveModal';
import { ComplianceAnalyticsModal } from './components/ComplianceAnalyticsModal';
import { VideoSourceModal } from './components/VideoSourceModal';

import { ZonesView } from './components/ZonesView';
import { IncidentsView } from './components/IncidentsView';
import { AnalyticsView } from './components/AnalyticsView';
import { SettingsView } from './components/SettingsView';

import {
  INITIAL_ZONES,
  INITIAL_TELEMETRY,
  INITIAL_HOURLY_VIOLATIONS,
  INITIAL_INCIDENTS,
  CAMERA_DETECTIONS
} from './data/mockData';
import { Zone, Incident, IncidentStatus, DetectionItem, PlantTelemetry } from './types';
import { soundEngine } from './utils/audio';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('vision');
  const [zones, setZones] = useState<Zone[]>(INITIAL_ZONES);
  const [activeZoneId, setActiveZoneId] = useState<string>('zone_4'); // Paint Booth (Hero)
  const [isWebcamActive, setIsWebcamActive] = useState<boolean>(false);
  const [activeVideoSrc, setActiveVideoSrc] = useState<string>('/data/demo_factory.mp4');
  const [activeVideoName, setActiveVideoName] = useState<string>('Standard CCTV');
  const [isSourceModalOpen, setIsSourceModalOpen] = useState<boolean>(false);

  const [telemetry, setTelemetry] = useState<PlantTelemetry>(INITIAL_TELEMETRY);
  const [hourlyViolations] = useState(INITIAL_HOURLY_VIOLATIONS);
  const [incidents, setIncidents] = useState<Incident[]>(INITIAL_INCIDENTS);
  const [newestIncidentId, setNewestIncidentId] = useState<string | null>(null);

  // Modals state
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [selectedZoneDeepDive, setSelectedZoneDeepDive] = useState<Zone | null>(null);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState<boolean>(false);

  // Active Zone lookup
  const activeZone = zones.find((z) => z.zone_id === activeZoneId) || zones[0];
  const activeDetections = CAMERA_DETECTIONS[activeZone.camera_id] || [];

  // Poll FastAPI backend
  useEffect(() => {
    const fetchBackendData = async () => {
      try {
        const res = await fetch('/api/telemetry');
        if (res.ok) {
          const data = await res.json();
          if (data.telemetry) setTelemetry(data.telemetry);
          if (data.zones) setZones(data.zones);
        }
      } catch {
        // Fallback simulation
      }
    };
    fetchBackendData();
    const interval = setInterval(fetchBackendData, 4000);
    return () => clearInterval(interval);
  }, []);

  // Switch camera feed
  const handleSelectCamera = (cameraId: string) => {
    const zone = zones.find((z) => z.camera_id === cameraId);
    if (zone) {
      setActiveZoneId(zone.zone_id);
    }
  };

  // Toggle user webcam vs video
  const handleToggleWebcam = () => {
    setIsWebcamActive((prev) => !prev);
    setCurrentTab('vision');
  };

  // Switch to single Live Camera
  const handleSelectLiveCamera = () => {
    setIsWebcamActive(true);
    setCurrentTab('vision');
  };

  // Switch to CCTV stream
  const handleSelectCCTV = () => {
    setIsWebcamActive(false);
    setActiveVideoSrc('/data/demo_factory.mp4');
    setActiveVideoName('Standard CCTV');
    setCurrentTab('vision');
  };

  // Switch to uploaded video file or RTSP stream
  const handleSelectVideoUrl = (url: string, name: string) => {
    setIsWebcamActive(false);
    setActiveVideoSrc(url);
    setActiveVideoName(name);
    setCurrentTab('vision');
  };

  // When user clicks a detection box in live feed
  const handleSelectDetection = (detection: DetectionItem) => {
    const matchingIncident = incidents.find(
      (inc) =>
        inc.zone_name === activeZone.name &&
        (detection.worker_id ? inc.worker_id === detection.worker_id : true)
    );

    if (matchingIncident) {
      setSelectedIncident(matchingIncident);
    } else {
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
        action_notes: detection.sublabel || 'Edge visual detection verified.'
      };
      setSelectedIncident(dynamicInc);
    }
  };

  // Handle new live incident detected from video frame inference
  const handleNewIncidentDetected = (incidentInfo: any) => {
    // Only log if not duplicate recently
    const missingStr = (incidentInfo.missing_ppe || []).join(', ').toUpperCase();
    if (!missingStr) return;

    // Rate-limit automated additions (keep max 1 every 10 seconds)
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
      zone_name: activeVideoName !== 'Standard CCTV' ? activeVideoName : activeZone.name,
      violation_type: `MISSING REQUIRED GEAR: ${missingStr}`,
      severity: 'High',
      confidence: 0.91,
      worker_id: incidentInfo.worker_id || 102,
      snapshot_path: '/data/snapshots/sample_ppe.jpg',
      status: 'Active',
      action_notes: `YOLOv8 detected worker #${incidentInfo.worker_id || 102} without ${missingStr} in monitored area.`
    };

    soundEngine.playWarnBeep();
    setIncidents((prev) => [newInc, ...prev.slice(0, 49)]);
    setNewestIncidentId(newId);
    setTimeout(() => setNewestIncidentId(null), 2500);
  };

  // Capture snapshot from webcam or CCTV
  const handleCaptureSnapshot = (snapshotDataUrl: string) => {
    const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false });
    const newId = `SNAP-${Math.floor(20000 + Math.random() * 80000)}`;

    const newSnapshotIncident: Incident = {
      id: newId,
      timestamp: nowTime,
      zone_id: isWebcamActive ? 'zone_webcam' : activeZone.zone_id,
      zone_name: isWebcamActive ? 'Operator Station (Webcam)' : activeZone.name,
      violation_type: isWebcamActive ? 'OPERATOR COMPLIANCE SNAPSHOT' : 'MANUAL AUDIT SNAPSHOT',
      severity: 'Low',
      confidence: 0.98,
      worker_id: isWebcamActive ? 999 : 101,
      snapshot_path: snapshotDataUrl,
      status: 'Acknowledged',
      action_notes: 'Manual snapshot captured from live video stream by operator.'
    };

    setIncidents((prev) => [newSnapshotIncident, ...prev]);
    setNewestIncidentId(newId);
    setTimeout(() => setNewestIncidentId(null), 2500);
  };

  // Update incident status
  const handleUpdateStatus = (
    incidentId: string,
    newStatus: IncidentStatus,
    notes?: string
  ) => {
    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id === incidentId) {
          return {
            ...inc,
            status: newStatus,
            acknowledged_by:
              newStatus === 'Acknowledged'
                ? 'Console Operator'
                : inc.acknowledged_by,
            action_notes: notes || inc.action_notes
          };
        }
        return inc;
      })
    );

    if (selectedIncident && selectedIncident.id === incidentId) {
      setSelectedIncident((prev) =>
        prev
          ? {
              ...prev,
              status: newStatus,
              action_notes: notes || prev.action_notes
            }
          : null
      );
    }

    fetch(`/api/incidents/${incidentId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, notes })
    }).catch(() => {});
  };

  // Simulated live alert test
  const handleTriggerSimulatedAlert = () => {
    const isFire = Math.random() > 0.5;
    const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false });
    const newId = `INC-${Math.floor(85000 + Math.random() * 999)}`;

    const newAlert: Incident = isFire
      ? {
          id: newId,
          timestamp: nowTime,
          zone_id: 'zone_4',
          zone_name: 'Paint Booth',
          violation_type: 'THERMAL RUNAWAY / SMOKE HAZARD',
          severity: 'Critical',
          confidence: 0.96,
          worker_id: null,
          snapshot_path: '/data/snapshots/sample_fire.jpg',
          status: 'Active',
          action_notes: 'Thermal camera registered high heat. Halon suppression alerted.'
        }
      : {
          id: newId,
          timestamp: nowTime,
          zone_id: 'zone_1',
          zone_name: 'Welding Bay 1',
          violation_type: 'HARDHAT OMISSION IN FALL ENVELOPE',
          severity: 'High',
          confidence: 0.93,
          worker_id: 112,
          snapshot_path: '/data/snapshots/sample_ppe.jpg',
          status: 'Active',
          action_notes: 'Worker in welding bay unequipped with mandatory hardhat.'
        };

    if (isFire) {
      soundEngine.playCriticalSiren();
    } else {
      soundEngine.playWarnBeep();
    }

    setIncidents((prev) => [newAlert, ...prev]);
    setNewestIncidentId(newId);

    setTelemetry((prev) => ({
      ...prev,
      active_warnings: isFire ? prev.active_warnings : prev.active_warnings + 1,
      critical_hazards: isFire ? prev.critical_hazards + 1 : prev.critical_hazards,
      compliance_pct: Math.max(78, prev.compliance_pct - 1.2)
    }));

    setTimeout(() => {
      setNewestIncidentId(null), 2200;
    });
  };

  // Export CSV
  const handleExportAuditCsv = () => {
    const headers = [
      'IncidentID',
      'Timestamp',
      'Zone',
      'Violation',
      'Severity',
      'Confidence',
      'WorkerID',
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
    link.download = `RAKSHA_KAVACH_SAFETY_AUDIT_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Update PPE rules for a zone
  const handleUpdateZonePPE = (zoneId: string, ppeList: string[]) => {
    setZones((prev) =>
      prev.map((z) => (z.zone_id === zoneId ? { ...z, required_ppe: ppeList } : z))
    );
  };

  // Update risk level for a zone
  const handleUpdateZoneRisk = (
    zoneId: string,
    riskLevel: 'Low' | 'Medium' | 'High' | 'Critical'
  ) => {
    setZones((prev) =>
      prev.map((z) => (z.zone_id === zoneId ? { ...z, risk_level: riskLevel } : z))
    );
  };

  return (
    <div className="instrument-wall">
      {/* 1. Modern Clean Navigation Bar */}
      <NavBar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        telemetry={telemetry}
        isWebcamActive={isWebcamActive}
        onToggleWebcam={handleToggleWebcam}
        onTriggerAlert={handleTriggerSimulatedAlert}
        activeZoneName={activeVideoName !== 'Standard CCTV' ? activeVideoName : activeZone.name}
      />

      {/* 2. Dynamic Content Area based on Selected Nav Tab */}
      {currentTab === 'vision' && (
        <>
          <main className="main-stage">
            <HeroLiveFeed
              currentZone={activeZone}
              allZones={zones}
              detections={activeDetections}
              isWebcamActive={isWebcamActive}
              activeVideoSrc={activeVideoSrc}
              activeVideoName={activeVideoName}
              onToggleWebcam={handleToggleWebcam}
              onSelectCamera={(camId) => {
                setActiveVideoName('Standard CCTV');
                handleSelectCamera(camId);
              }}
              onSelectDetection={handleSelectDetection}
              onCaptureSnapshot={handleCaptureSnapshot}
              onOpenSourceModal={() => setIsSourceModalOpen(true)}
              onNewIncidentDetected={handleNewIncidentDetected}
              onSelectLiveCamera={handleSelectLiveCamera}
              onSelectCCTV={handleSelectCCTV}
            />

            <ZoneStatusRail
              zones={zones}
              activeZoneId={activeZoneId}
              hourlyViolations={hourlyViolations}
              onSelectZone={(z) => {
                setActiveVideoName('Standard CCTV');
                setActiveZoneId(z.zone_id);
              }}
              onOpenZoneDeepDive={(z) => setSelectedZoneDeepDive(z)}
            />
          </main>

          <IncidentLogTicker
            incidents={incidents}
            newestIncidentId={newestIncidentId}
            onSelectIncident={(inc) => setSelectedIncident(inc)}
            onExportAuditCsv={handleExportAuditCsv}
          />
        </>
      )}

      {currentTab === 'zones' && (
        <div className="tab-stage">
          <ZonesView
            zones={zones}
            onUpdateZonePPE={handleUpdateZonePPE}
            onUpdateZoneRisk={handleUpdateZoneRisk}
            onSwitchCamera={(camId) => {
              handleSelectCamera(camId);
              setIsWebcamActive(false);
              setCurrentTab('vision');
            }}
          />
        </div>
      )}

      {currentTab === 'incidents' && (
        <div className="tab-stage">
          <IncidentsView
            incidents={incidents}
            onSelectIncident={(inc) => setSelectedIncident(inc)}
            onUpdateStatus={(id, status) => handleUpdateStatus(id, status)}
            onExportAuditCsv={handleExportAuditCsv}
          />
        </div>
      )}

      {currentTab === 'analytics' && (
        <div className="tab-stage">
          <AnalyticsView
            zones={zones}
            hourlyViolations={hourlyViolations}
            compliancePct={telemetry.compliance_pct}
          />
        </div>
      )}

      {currentTab === 'settings' && (
        <div className="tab-stage">
          <SettingsView
            isWebcamActive={isWebcamActive}
            onToggleWebcam={handleToggleWebcam}
          />
        </div>
      )}

      {/* Video Source Picker Modal (Upload factory video / CCTV stream / Webcam) */}
      <VideoSourceModal
        isOpen={isSourceModalOpen}
        onClose={() => setIsSourceModalOpen(false)}
        onSelectVideoUrl={handleSelectVideoUrl}
        onSelectWebcam={() => {
          setIsWebcamActive(true);
          setCurrentTab('vision');
        }}
      />

      {/* Detail Modals */}
      <IncidentDetailModal
        incident={selectedIncident}
        onClose={() => setSelectedIncident(null)}
        onUpdateStatus={handleUpdateStatus}
      />

      <ZoneDeepDiveModal
        zone={selectedZoneDeepDive}
        onClose={() => setSelectedZoneDeepDive(null)}
        onSwitchCamera={(camId) => {
          handleSelectCamera(camId);
          setIsWebcamActive(false);
          setCurrentTab('vision');
        }}
      />

      <ComplianceAnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        zones={zones}
        hourlyViolations={hourlyViolations}
        compliancePct={telemetry.compliance_pct}
      />
    </div>
  );
};
