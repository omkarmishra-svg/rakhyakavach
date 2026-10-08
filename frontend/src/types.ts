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
  worker_name?: string;
  worker_role?: string;
  is_executive?: boolean;
  shield_admin_block?: boolean;
  contraband_detected?: string[];
  access_status?: 'ENTERED' | 'ACCESS_DENIED' | 'SECURITY_INTERCEPT';
  snapshot_path: string;
  status: IncidentStatus;
  acknowledged_by?: string;
  action_notes?: string;
  assigned_role?: string;
  action_sop?: string;
}

export interface GateLogEntry {
  timestamp: string;
  emp_id: string;
  name: string;
  role: string;
  department: string;
  destination_department?: string;
  is_executive: boolean;
  access_status: 'ENTERED' | 'ACCESS_DENIED' | 'SECURITY_INTERCEPT';
  turnstile_unlocked: boolean;
  required_ppe: string[];
  worn_ppe: string[];
  missing_ppe: string[];
  missing_ppe_alert?: string;
  contraband_detected: string[];
  contraband_alert?: string;
  guidance_route?: string;
  remedy_guidance?: string;
  active_guidance?: string;
  decision_message: string;
  severity: string;
  gate_id: string;
  shield_admin_block: boolean;
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
  latency_breakdown?: {
    ingest_ms: number;
    inference_ms: number;
    attribution_ms: number;
    dispatch_ms: number;
    total_ms: number;
  };
}
