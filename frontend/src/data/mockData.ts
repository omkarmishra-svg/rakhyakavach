import { Zone, Incident, HourlyViolation, DetectionItem, PlantTelemetry } from '../types';

export const INITIAL_ZONES: Zone[] = [
  {
    zone_id: 'zone_4',
    name: 'Paint Booth',
    risk_level: 'Critical',
    required_ppe: ['Respirator Mask', 'Chemical Coverall', 'Gloves', 'Goggles'],
    worker_count: 4,
    status: 'FIRE',
    camera_id: 'CCTV',
    description: 'Solvent vapor zone, automated electro-sprayers, drying oven line.'
  },
  {
    zone_id: 'zone_1',
    name: 'Welding Bay 1',
    risk_level: 'High',
    required_ppe: ['Welding Face Shield', 'Leather Apron', 'Heat Gloves', 'Boots'],
    worker_count: 5,
    status: 'WARN',
    camera_id: 'CCTV',
    description: 'TIG/MIG structural steel framing cells, high-temp spark hazard area.'
  },
  {
    zone_id: 'zone_3',
    name: 'Assembly Line 2',
    risk_level: 'Low',
    required_ppe: ['Vest', 'Anti-static wristband'],
    worker_count: 14,
    status: 'OK',
    camera_id: 'CCTV',
    description: 'Precision robotic electronics assembly and soldering stations.'
  },
  {
    zone_id: 'zone_2',
    name: 'Loading Dock B',
    risk_level: 'Medium',
    required_ppe: ['Hard Hat', 'High-Vis Vest', 'Steel-toe Boots'],
    worker_count: 6,
    status: 'WARN',
    camera_id: 'CCTV',
    description: 'Heavy logistics throughput, automated pallet jacks, and flatbed unloading.'
  },
  {
    zone_id: 'zone_5',
    name: 'Warehouse East',
    risk_level: 'Low',
    required_ppe: ['High-Vis Vest', 'Safety Boots'],
    worker_count: 8,
    status: 'OK',
    camera_id: 'CCTV',
    description: 'High-bay racking, autonomous inventory rovers, staging depot.'
  },
  {
    zone_id: 'zone_6',
    name: 'Main Entrance & Turnstiles',
    risk_level: 'Low',
    required_ppe: ['Hard Hat', 'Safety Badge'],
    worker_count: 2,
    status: 'OK',
    camera_id: 'CCTV',
    description: 'Access control gate, safety checkpoint, visitor induction vestibule.'
  }
];

export const INITIAL_TELEMETRY: PlantTelemetry = {
  compliance_pct: 94.2,
  active_warnings: 2,
  critical_hazards: 1,
  cameras_online: 1,
  total_cameras: 1,
  active_workers: 39,
  latency_ms: 24,
  fps: 29.8
};

export const INITIAL_HOURLY_VIOLATIONS: HourlyViolation[] = [
  { hour: '07:00', ppeCount: 4, fireCount: 0, total: 4 },
  { hour: '08:00', ppeCount: 7, fireCount: 0, total: 7 },
  { hour: '09:00', ppeCount: 5, fireCount: 0, total: 5 },
  { hour: '10:00', ppeCount: 8, fireCount: 0, total: 8 },
  { hour: '11:00', ppeCount: 3, fireCount: 0, total: 3 },
  { hour: '12:00', ppeCount: 2, fireCount: 0, total: 2 },
  { hour: '13:00', ppeCount: 6, fireCount: 0, total: 6 },
  { hour: '14:00', ppeCount: 4, fireCount: 1, total: 5 },
  { hour: '15:00', ppeCount: 9, fireCount: 0, total: 9 },
  { hour: '16:00', ppeCount: 3, fireCount: 0, total: 3 },
  { hour: '17:00', ppeCount: 5, fireCount: 0, total: 5 },
  { hour: '18:00', ppeCount: 2, fireCount: 0, total: 2 }
];

export const INITIAL_INCIDENTS: Incident[] = [
  {
    id: 'INC-84920',
    timestamp: '18:41:02',
    zone_id: 'zone_4',
    zone_name: 'Paint Booth',
    violation_type: 'SMOKE / FLASH FLAME',
    severity: 'Critical',
    confidence: 0.94,
    worker_id: null,
    snapshot_path: '/data/snapshots/sample_fire.jpg',
    status: 'Active',
    action_notes: 'Automated halon system pre-alarm triggered. Floor supervisor alerted via SMS.'
  },
  {
    id: 'INC-84918',
    timestamp: '18:38:14',
    zone_id: 'zone_1',
    zone_name: 'Welding Bay 1',
    violation_type: 'NO FACE SHIELD',
    severity: 'High',
    confidence: 0.91,
    worker_id: 104,
    snapshot_path: '/data/snapshots/sample_ppe1.jpg',
    status: 'Active',
    action_notes: 'Worker #104 detected grinding without protective visor in weld zone.'
  },
  {
    id: 'INC-84914',
    timestamp: '18:32:49',
    zone_id: 'zone_2',
    zone_name: 'Loading Dock B',
    violation_type: 'NO HIGH-VIS VEST',
    severity: 'Medium',
    confidence: 0.88,
    worker_id: 219,
    snapshot_path: '/data/snapshots/sample_ppe2.jpg',
    status: 'Acknowledged',
    acknowledged_by: 'Shift Officer J. Vance',
    action_notes: 'Contractor loader informed; vest issued at Bay 2 rack.'
  },
  {
    id: 'INC-84909',
    timestamp: '18:24:05',
    zone_id: 'zone_2',
    zone_name: 'Loading Dock B',
    violation_type: 'MISSING HARD HAT',
    severity: 'Medium',
    confidence: 0.93,
    worker_id: 205,
    snapshot_path: '/data/snapshots/sample_ppe3.jpg',
    status: 'Resolved',
    acknowledged_by: 'Shift Officer J. Vance',
    action_notes: 'Hard hat retrieved from forklift cab. Compliant verified.'
  },
  {
    id: 'INC-84897',
    timestamp: '18:11:32',
    zone_id: 'zone_3',
    zone_name: 'Assembly Line 2',
    violation_type: 'MISSING WRISTBAND',
    severity: 'Low',
    confidence: 0.86,
    worker_id: 312,
    snapshot_path: '/data/snapshots/sample_ppe4.jpg',
    status: 'Resolved',
    acknowledged_by: 'Lead Tech M. Patel',
    action_notes: 'ESD ground line reconnected to bench terminal.'
  },
  {
    id: 'INC-84881',
    timestamp: '17:55:18',
    zone_id: 'zone_5',
    zone_name: 'Warehouse East',
    violation_type: 'UNAUTHORIZED AISLE ACCESS',
    severity: 'Medium',
    confidence: 0.90,
    worker_id: 508,
    snapshot_path: '/data/snapshots/sample_ppe5.jpg',
    status: 'Resolved',
    acknowledged_by: 'Shift Officer J. Vance',
    action_notes: 'Perimeter warning beacon activated. Floor cleared.'
  }
];

// Dynamic bounding boxes mapped by Camera ID for the live canvas engine
export const CAMERA_DETECTIONS: Record<string, DetectionItem[]> = {
  CCTV: [
    {
      id: 'cam1-haz1',
      type: 'hazard',
      box: [52, 28, 74, 58], // percentage [x1, y1, x2, y2]
      status: 'hazard',
      label: 'CRITICAL HAZARD: FLASH FLAME',
      sublabel: 'Oven Exhaust Stack #3',
      confidence: 0.94,
      hazard_type: 'fire'
    },
    {
      id: 'cam1-w1',
      type: 'worker',
      worker_id: 402,
      box: [18, 42, 34, 88],
      status: 'compliant',
      label: 'Worker #402 [COMPLIANT]',
      sublabel: 'Respirator OK · Suit OK',
      confidence: 0.92
    },
    {
      id: 'cam1-w2',
      type: 'worker',
      worker_id: 407,
      box: [38, 45, 50, 84],
      status: 'violation',
      label: 'Worker #407 [NO RESPIRATOR]',
      sublabel: 'Missing: Solvent Mask',
      confidence: 0.89,
      missing_ppe: ['respirator']
    }
  ],
  'CAM-02': [
    {
      id: 'cam2-w1',
      type: 'worker',
      worker_id: 104,
      box: [32, 35, 52, 85],
      status: 'violation',
      label: 'Worker #104 [NO FACE SHIELD]',
      sublabel: 'Missing: Weld Visor · Spark Hazard',
      confidence: 0.91,
      missing_ppe: ['shield']
    },
    {
      id: 'cam2-w2',
      type: 'worker',
      worker_id: 109,
      box: [64, 38, 80, 86],
      status: 'compliant',
      label: 'Worker #109 [COMPLIANT]',
      sublabel: 'Helmet OK · Vest OK · Shield OK',
      confidence: 0.95
    }
  ],
  'CAM-03': [
    {
      id: 'cam3-w1',
      type: 'worker',
      worker_id: 301,
      box: [22, 36, 38, 82],
      status: 'compliant',
      label: 'Worker #301 [COMPLIANT]',
      sublabel: 'Vest OK · Wristband OK',
      confidence: 0.96
    },
    {
      id: 'cam3-w2',
      type: 'worker',
      worker_id: 304,
      box: [54, 34, 70, 80],
      status: 'compliant',
      label: 'Worker #304 [COMPLIANT]',
      sublabel: 'Vest OK · Wristband OK',
      confidence: 0.97
    }
  ],
  'CAM-04': [
    {
      id: 'cam4-w1',
      type: 'worker',
      worker_id: 219,
      box: [40, 32, 56, 82],
      status: 'violation',
      label: 'Worker #219 [NO HIGH-VIS VEST]',
      sublabel: 'Forklift Thoroughfare Hazard',
      confidence: 0.88,
      missing_ppe: ['vest']
    },
    {
      id: 'cam4-w2',
      type: 'worker',
      worker_id: 221,
      box: [68, 38, 84, 86],
      status: 'compliant',
      label: 'Worker #221 [COMPLIANT]',
      sublabel: 'Hard Hat OK · Vest OK · Boots OK',
      confidence: 0.94
    }
  ],
  'CAM-05': [
    {
      id: 'cam5-w1',
      type: 'worker',
      worker_id: 502,
      box: [30, 40, 44, 85],
      status: 'compliant',
      label: 'Worker #502 [COMPLIANT]',
      sublabel: 'Vest OK · Boots OK',
      confidence: 0.93
    },
    {
      id: 'cam5-w2',
      type: 'worker',
      worker_id: 506,
      box: [62, 42, 76, 86],
      status: 'compliant',
      label: 'Worker #506 [COMPLIANT]',
      sublabel: 'Vest OK · Boots OK',
      confidence: 0.95
    }
  ],
  'CAM-06': [
    {
      id: 'cam6-w1',
      type: 'worker',
      worker_id: 601,
      box: [44, 35, 60, 84],
      status: 'compliant',
      label: 'Worker #601 [COMPLIANT]',
      sublabel: 'Badge Verified · Hard Hat OK',
      confidence: 0.98
    }
  ]
};
