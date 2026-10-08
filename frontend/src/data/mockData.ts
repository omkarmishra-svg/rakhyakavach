import { Zone, PlantTelemetry } from '../types';

export const INITIAL_ZONES: Zone[] = [
  {
    zone_id: 'zone_1',
    name: 'Fabrication Bay 1',
    risk_level: 'High',
    required_ppe: ['helmet', 'vest', 'boots'],
    worker_count: 1,
    status: 'WARN',
    camera_id: 'CCTV 01',
    description: 'Active overhead cranes, robotic weld cells, and stamping presses.'
  },
  {
    zone_id: 'zone_2',
    name: 'Logistics Loading Dock',
    risk_level: 'Medium',
    required_ppe: ['helmet', 'vest'],
    worker_count: 0,
    status: 'OK',
    camera_id: 'CCTV 02',
    description: 'Freight staging bays, automated forklifts, and container docks.'
  },
  {
    zone_id: 'zone_3',
    name: 'Robotics & Assembly Cell',
    risk_level: 'Low',
    required_ppe: ['vest'],
    worker_count: 1,
    status: 'OK',
    camera_id: 'CCTV 03',
    description: 'High-bay robotic pick-and-place automation depot.'
  },
  {
    zone_id: 'zone_4',
    name: 'Operator Safety Checkpoint',
    risk_level: 'Critical',
    required_ppe: ['helmet', 'vest'],
    worker_count: 1,
    status: 'OK',
    camera_id: 'CAM 01',
    description: 'Live hardware operator vision sentry checkpoint.'
  },
  {
    zone_id: 'zone_gate',
    name: 'Gate 1 Smart Entry Airlock',
    risk_level: 'High',
    required_ppe: ['helmet', 'vest', 'goggles', 'gloves'],
    worker_count: 1,
    status: 'OK',
    camera_id: 'GATE 01',
    description: 'Electrical utility personnel turnstile entry with automated compliance and contraband radar.'
  }
];

export const INITIAL_TELEMETRY: PlantTelemetry = {
  compliance_pct: 100.0,
  active_warnings: 0,
  critical_hazards: 0,
  cameras_online: 4,
  total_cameras: 4,
  active_workers: 0,
  latency_ms: 18,
  fps: 30.0
};
