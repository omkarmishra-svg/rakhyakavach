export type ZoneStatus = 'OK' | 'WARN' | 'FIRE';

export interface Zone {
  zone_id: string;
  name: string;
  risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
  required_ppe: string[];
  worker_count: number;
  status: ZoneStatus;
  camera_id: string;
  description: string;
}

export interface DetectionItem {
  id: string;
  type: 'worker' | 'hazard';
  worker_id?: number;
  box: [number, number, number, number]; // [x1, y1, x2, y2]
  status: 'compliant' | 'violation' | 'hazard';
  label: string;
  sublabel?: string;
  confidence: number;
  missing_ppe?: string[];
  hazard_type?: 'fire' | 'smoke';
}

export type IncidentStatus = 'Active' | 'Acknowledged' | 'Escalated' | 'Resolved';

export interface Incident {
  id: string;
  timestamp: string;
  zone_id: string;
  zone_name: string;
  violation_type: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  confidence: number;
  worker_id?: number | null;
  snapshot_path: string;
  status: IncidentStatus;
  acknowledged_by?: string;
  action_notes?: string;
}

export interface HourlyViolation {
  hour: string;
  ppeCount: number;
  fireCount: number;
  total: number;
}

export interface PlantTelemetry {
  compliance_pct: number;
  active_warnings: number;
  critical_hazards: number;
  cameras_online: number;
  total_cameras: number;
  active_workers: number;
  latency_ms: number;
  fps: number;
}
