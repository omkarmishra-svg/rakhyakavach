import React, { useState } from 'react';
import { NavBar } from './components/NavBar';
import { MultiCameraFeed, CameraConfig } from './components/MultiCameraFeed';
import { SquareAlertGrid, WorkerAlertItem } from './components/SquareAlertGrid';
import { VideoSourceModal } from './components/VideoSourceModal';

const DEFAULT_CAMERA_CONFIGS: CameraConfig[] = [
  {
    id: 1,
    name: 'CAM 01 — Main Bay',
    type: 'video',
    source: '/data/demo_factory.mp4'
  },
  {
    id: 2,
    name: 'CAM 02 — Fabrication Area',
    type: 'webcam',
    source: 0
  },
  {
    id: 3,
    name: 'CAM 03 — Loading Dock',
    type: 'video',
    source: '/data/demo_factory.mp4'
  },
  {
    id: 4,
    name: 'CAM 04 — Assembly Station',
    type: 'video',
    source: '/data/demo_factory.mp4'
  }
];

export const App: React.FC = () => {
  const [cameraConfigs, setCameraConfigs] = useState<CameraConfig[]>(DEFAULT_CAMERA_CONFIGS);
  const [fullscreenCamId, setFullscreenCamId] = useState<number | null>(null);

  // Active detected workers across all feeds
  const [workersMap, setWorkersMap] = useState<{ [camId: number]: WorkerAlertItem[] }>({});
  const [hazardState, setHazardState] = useState<{ hasHazard: boolean; hazardInfo: string }>({
    hasHazard: false,
    hazardInfo: ''
  });

  // Source picker modal
  const [activeModalCamId, setActiveModalCamId] = useState<number | null>(null);

  const activeCam = cameraConfigs.find((c) => c.id === fullscreenCamId);

  const handleWorkersDetected = (
    camWorkers: WorkerAlertItem[],
    hasHazard: boolean,
    hazardInfo: string
  ) => {
    if (camWorkers.length > 0) {
      const camId = Number(camWorkers[0].cam_id) || 1;
      setWorkersMap((prev) => ({
        ...prev,
        [camId]: camWorkers
      }));
    }
    if (hasHazard) {
      setHazardState({ hasHazard: true, hazardInfo });
    }
  };

  // Flatten active workers from active feeds
  const allWorkers: WorkerAlertItem[] =
    fullscreenCamId !== null
      ? workersMap[fullscreenCamId] || []
      : Object.values(workersMap).flat();

  // Handle changing camera source
  const handleSelectVideoUrl = (url: string, name: string) => {
    if (activeModalCamId === null) return;
    setCameraConfigs((prev) =>
      prev.map((c) =>
        c.id === activeModalCamId
          ? {
              ...c,
              type: url.startsWith('rtsp') || url.startsWith('http') ? 'cctv' : 'video',
              source: url,
              name: `CAM 0${c.id} — ${name.replace('.mp4', '').replace('.avi', '')}`
            }
          : c
      )
    );
  };

  const handleSelectWebcam = () => {
    if (activeModalCamId === null) return;
    setCameraConfigs((prev) =>
      prev.map((c) =>
        c.id === activeModalCamId
          ? {
              ...c,
              type: 'webcam',
              source: 0,
              name: `CAM 0${c.id} — Live Camera`
            }
          : c
      )
    );
  };

  return (
    <div className="instrument-wall" style={{ gridTemplateRows: 'var(--navbar-height) 1fr' }}>
      {/* 1. Modern Navigation Bar */}
      <NavBar
        isFullscreenActive={fullscreenCamId !== null}
        onToggleFullscreenMode={() => {
          setFullscreenCamId((prev) => (prev === null ? 1 : null));
        }}
        onSetGridMode={() => setFullscreenCamId(null)}
        activeCamName={activeCam?.name}
      />

      {/* 2. Main Surveillance Stage: 4-Feed Video Stage (Left) + Square Alert Badges (Right) */}
      <main className="multi-cam-layout">
        <MultiCameraFeed
          fullscreenCamId={fullscreenCamId}
          onToggleFullscreen={(camId) => setFullscreenCamId(camId)}
          onOpenSourceModalForCam={(camId) => setActiveModalCamId(camId)}
          onWorkersDetected={handleWorkersDetected}
          configs={cameraConfigs}
        />

        <SquareAlertGrid
          workers={allWorkers}
          hasHazard={hazardState.hasHazard}
          hazardInfo={hazardState.hazardInfo}
        />
      </main>

      {/* Video Source Picker Modal */}
      <VideoSourceModal
        isOpen={activeModalCamId !== null}
        onClose={() => setActiveModalCamId(null)}
        onSelectVideoUrl={handleSelectVideoUrl}
        onSelectWebcam={handleSelectWebcam}
      />
    </div>
  );
};
