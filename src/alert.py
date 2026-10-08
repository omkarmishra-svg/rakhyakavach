"""
Alerting, Snapshot Storage, and Incident Logging Module for Raksha Kavach.
Manages SQLite database logging, evidence snapshot capture, rate-limiting,
and real-time webhook dispatching (Slack, Discord, Microsoft Teams).
"""

import os
import sqlite3
import time
import datetime
import uuid
from typing import Dict, List, Any, Optional, Tuple
import cv2
import numpy as np
# pyrefly: ignore [untyped-import]
import requests


class PersonnelRole:
    """Standardized industrial safety roles for targeted alert dispatch."""
    EVACUATION_MARSHAL = "Evacuation Marshal & Plant Chief"
    FLOOR_SUPERVISOR = "Shift Floor Supervisor"
    EHS_DIRECTOR = "EHS Safety Director"
    MAINTENANCE_LEAD = "Maintenance & Facilities Lead"


def resolve_role_and_sop(violation_type: str, severity: str = "High") -> Tuple[str, str]:
    """
    Deterministically map violation type and severity to an actionable personnel role
    and industrial Standard Operating Procedure (SOP).
    """
    vt = (violation_type or "").lower()
    sev = (severity or "High").capitalize()

    if "fire" in vt or "flame" in vt or sev == "Critical":
        return (
            PersonnelRole.EVACUATION_MARSHAL,
            "CRITICAL HAZARD SOP: Sound zone evacuation klaxon. Isolate main fuel/gas supply valves immediately. Account for all personnel at Emergency Assembly Point B."
        )
    elif "smoke" in vt:
        return (
            PersonnelRole.EVACUATION_MARSHAL,
            "ATMOSPHERIC HAZARD SOP: Deploy thermal imaging scout. Verify active combustion source and initiate localized zone ventilation protocols."
        )
    elif "helmet" in vt or "hardhat" in vt:
        return (
            PersonnelRole.FLOOR_SUPERVISOR,
            "PPE ENFORCEMENT SOP: Issue immediate verbal stop-work instruction. Retrieve compliant Type I Class E/G hardhat from Zone Locker 02 before worker resumes duty."
        )
    elif "vest" in vt:
        return (
            PersonnelRole.FLOOR_SUPERVISOR,
            "PPE ENFORCEMENT SOP: Issue Class 2/3 high-visibility vest. Prohibit worker from active forklift transit corridors until donned."
        )
    elif "boot" in vt:
        return (
            PersonnelRole.FLOOR_SUPERVISOR,
            "PPE ENFORCEMENT SOP: Verify ASTM F2413 protective steel-toe footwear before allowing worker onto heavy fabrication floor."
        )
    elif "glove" in vt:
        return (
            PersonnelRole.FLOOR_SUPERVISOR,
            "PPE ENFORCEMENT SOP: Verify ANSI cut/thermal level 4 protective gloves before material handling."
        )
    elif "spark" in vt or "heat" in vt:
        return (
            PersonnelRole.MAINTENANCE_LEAD,
            "EQUIPMENT SOP: Verify thermal shielding and deploy secondary Class B fire extinguisher to bay."
        )
    else:
        return (
            PersonnelRole.EHS_DIRECTOR,
            f"SAFETY COMPLIANCE SOP: Verify safety compliance with OSHA 1910 standards for {violation_type.replace('_', ' ').title()}."
        )


def resolve_target_department(violation_type: str, severity: str = "High", zone_id: str = "") -> str:
    """Determine the responsible plant department for targeted alert dispatch."""
    vt = (violation_type or "").lower()
    z = (zone_id or "").lower()
    if "fire" in vt or "flame" in vt or "smoke" in vt:
        return "Emergency Command & Fire Rescue Bureau"
    elif "contraband" in vt or "knife" in vt or "cigarette" in vt or "breach" in vt or "trespass" in vt:
        return "Plant Security & Physical Protection Force"
    elif "gate" in z or "airlock" in z:
        return "Access Control & Turnstile Security"
    elif "glove" in vt or "goggle" in vt or "voltage" in vt or "arc" in vt:
        return "High-Voltage Electrical Operations & EHS"
    elif "spark" in vt or "heat" in vt or "robot" in vt:
        return "Plant Mechanical & Reliability Engineering"
    else:
        return "Operations EHS & Floor Safety Directorate"


class IncidentRecord:
    """Represents a logged safety incident."""

    def __init__(
        self,
        incident_id: str,
        timestamp: str,
        zone_id: str,
        zone_name: str,
        violation_type: str,
        severity: str,
        confidence: float,
        worker_id: Optional[int],
        snapshot_path: str,
        status: str = "Active",
        assigned_role: Optional[str] = None,
        action_sop: Optional[str] = None,
        worker_name: Optional[str] = None,
        worker_role: Optional[str] = None,
        is_executive: Optional[bool] = None,
        shield_admin_block: Optional[bool] = None,
        target_dept: Optional[str] = None,
    ):
        self.incident_id = incident_id
        self.timestamp = timestamp
        self.zone_id = zone_id
        self.zone_name = zone_name
        self.violation_type = violation_type
        self.severity = severity
        self.confidence = float(confidence)
        self.worker_id = worker_id
        self.snapshot_path = snapshot_path
        self.status = status

        # Role-based context routing
        resolved_role, resolved_sop = resolve_role_and_sop(violation_type, severity)
        self.assigned_role = assigned_role or resolved_role
        self.action_sop = action_sop or resolved_sop
        self.target_dept = target_dept or resolve_target_department(violation_type, severity, zone_id)

        # Electrical Industry personnel identity resolution
        from src.personnel_registry import personnel_registry
        profile = personnel_registry.resolve_profile_by_track_id(worker_id)
        self.worker_name = worker_name or profile.name
        self.worker_role = worker_role or profile.role
        self.is_executive = is_executive if is_executive is not None else profile.is_executive
        self.shield_admin_block = shield_admin_block if shield_admin_block is not None else (
            "gate" in self.zone_id.lower() or "airlock" in self.zone_name.lower()
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.incident_id,
            "timestamp": self.timestamp,
            "zone_id": self.zone_id,
            "zone_name": self.zone_name,
            "violation_type": self.violation_type,
            "severity": self.severity,
            "confidence": self.confidence,
            "worker_id": self.worker_id,
            "worker_name": self.worker_name,
            "worker_role": self.worker_role,
            "is_executive": self.is_executive,
            "target_dept": self.target_dept,
            "shield_admin_block": self.shield_admin_block,
            "snapshot_path": self.snapshot_path,
            "status": self.status,
            "assigned_role": self.assigned_role,
            "action_sop": self.action_sop,
        }


class IncidentDatabase:
    """Handles SQLite persistence for safety incidents and compliance audit logs."""

    def __init__(self, db_path: str = "data/incidents.db"):
        self.db_path = db_path
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        return sqlite3.connect(self.db_path)

    def _init_db(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS incidents (
                    id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    zone_id TEXT NOT NULL,
                    zone_name TEXT NOT NULL,
                    violation_type TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    worker_id INTEGER,
                    snapshot_path TEXT,
                    status TEXT DEFAULT 'Active',
                    assigned_role TEXT,
                    action_sop TEXT,
                    worker_name TEXT,
                    worker_role TEXT,
                    is_executive INTEGER DEFAULT 0,
                    shield_admin_block INTEGER DEFAULT 0
                );
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_incidents_time ON incidents(timestamp);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_incidents_zone ON incidents(zone_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_incidents_type ON incidents(violation_type);")

            # Backward-compatible column migration for pre-existing databases
            cursor.execute("PRAGMA table_info(incidents);")
            cols = {row[1] for row in cursor.fetchall()}
            if "assigned_role" not in cols:
                cursor.execute("ALTER TABLE incidents ADD COLUMN assigned_role TEXT;")
            if "action_sop" not in cols:
                cursor.execute("ALTER TABLE incidents ADD COLUMN action_sop TEXT;")
            if "worker_name" not in cols:
                cursor.execute("ALTER TABLE incidents ADD COLUMN worker_name TEXT;")
            if "worker_role" not in cols:
                cursor.execute("ALTER TABLE incidents ADD COLUMN worker_role TEXT;")
            if "is_executive" not in cols:
                cursor.execute("ALTER TABLE incidents ADD COLUMN is_executive INTEGER DEFAULT 0;")
            if "shield_admin_block" not in cols:
                cursor.execute("ALTER TABLE incidents ADD COLUMN shield_admin_block INTEGER DEFAULT 0;")
            conn.commit()

    def insert_incident(self, record: IncidentRecord):
        """Insert new incident row into SQLite."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO incidents (
                    id, timestamp, zone_id, zone_name, violation_type,
                    severity, confidence, worker_id, snapshot_path, status,
                    assigned_role, action_sop, worker_name, worker_role,
                    is_executive, shield_admin_block
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                record.incident_id,
                record.timestamp,
                record.zone_id,
                record.zone_name,
                record.violation_type,
                record.severity,
                record.confidence,
                record.worker_id,
                record.snapshot_path,
                record.status,
                record.assigned_role,
                record.action_sop,
                record.worker_name,
                record.worker_role,
                1 if record.is_executive else 0,
                1 if record.shield_admin_block else 0,
            ))
            conn.commit()

    def get_recent_incidents(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Fetch the most recent incidents ordered by timestamp descending."""
        with self._get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM incidents ORDER BY timestamp DESC LIMIT ?
            """, (limit,))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def get_zone_incident_counts(self) -> List[Dict[str, Any]]:
        """Fetch aggregate violation count grouped by zone for predictive risk analysis."""
        with self._get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("""
                SELECT zone_id, zone_name, COUNT(*) as count,
                       SUM(CASE WHEN severity = 'Critical' THEN 1 ELSE 0 END) as critical_count
                FROM incidents
                GROUP BY zone_id, zone_name
                ORDER BY count DESC
            """)
            return [dict(row) for row in cursor.fetchall()]

    def get_violation_breakdown(self) -> List[Dict[str, Any]]:
        """Fetch count by violation type."""
        with self._get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("""
                SELECT violation_type, COUNT(*) as count
                FROM incidents
                GROUP BY violation_type
                ORDER BY count DESC
            """)
            return [dict(row) for row in cursor.fetchall()]


class AlertManager:
    """Manages rate-limiting cooldowns, snapshot saving, and webhook dispatches."""

    def __init__(
        self,
        db: Optional[IncidentDatabase] = None,
        snapshots_dir: str = "data/snapshots",
        webhook_url: Optional[str] = None,
        cooldown_seconds: float = 60.0,
    ):
        self.db = db or IncidentDatabase()
        self.snapshots_dir = snapshots_dir
        self.webhook_url = webhook_url or os.environ.get("SLACK_WEBHOOK_URL", "")
        self.cooldown_seconds = cooldown_seconds

        os.makedirs(self.snapshots_dir, exist_ok=True)

        # Tracks last alert timestamp for (zone_id, violation_type, worker_id)
        self._last_alert_time: Dict[str, float] = {}

    def should_alert(self, zone_id: str, violation_type: str, worker_id: Optional[int] = None) -> bool:
        """Rate-limiting check to prevent alert floods."""
        key = f"{zone_id}:{violation_type}:{worker_id or 'all'}"
        last_time = self._last_alert_time.get(key, 0.0)
        return (time.time() - last_time) >= self.cooldown_seconds

    def trigger_alert(
        self,
        frame: np.ndarray,
        zone_id: str,
        zone_name: str,
        violation_type: str,
        severity: str = "High",
        confidence: float = 0.85,
        worker_id: Optional[int] = None,
        bbox: Optional[List[int]] = None,
        assigned_role: Optional[str] = None,
        action_sop: Optional[str] = None,
    ) -> Optional[IncidentRecord]:
        """
        Processes an alert: checks cooldown, saves snapshot evidence,
        logs to SQLite, and sends webhook alert with role and SOP.
        """
        if not self.should_alert(zone_id, violation_type, worker_id):
            return None

        # Record cooldown
        key = f"{zone_id}:{violation_type}:{worker_id or 'all'}"
        self._last_alert_time[key] = time.time()

        now_dt = datetime.datetime.now()
        iso_time = now_dt.isoformat(timespec="seconds")
        short_id = uuid.uuid4().hex[:8]

        # 1. Save snapshot evidence
        snapshot_filename = f"snapshot_{now_dt.strftime('%Y%m%d_%H%M%S')}_{short_id}.jpg"
        snapshot_path = os.path.join(self.snapshots_dir, snapshot_filename)

        evidence_frame = frame.copy() if frame is not None else None
        if evidence_frame is not None:
            # Draw highlight on snapshot if bbox is provided
            if bbox:
                x1, y1, x2, y2 = bbox
                color = (0, 0, 255) if severity in ["Critical", "High"] else (0, 165, 255)
                cv2.rectangle(evidence_frame, (x1, y1), (x2, y2), color, 3)
                label = f"VIOLATION: {violation_type.upper()}"
                cv2.putText(
                    evidence_frame, label, (x1, max(25, y1 - 10)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2
                )
            # Watermark with timestamp and zone
            watermark = f"Raksha Kavach | {zone_name} | {iso_time}"
            cv2.putText(
                evidence_frame, watermark, (15, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2
            )
            cv2.imwrite(snapshot_path, evidence_frame)
        else:
            snapshot_path = ""

        # 2. Create Incident Record with Role Routing
        record = IncidentRecord(
            incident_id=f"INC-{short_id.upper()}",
            timestamp=iso_time,
            zone_id=zone_id,
            zone_name=zone_name,
            violation_type=violation_type,
            severity=severity,
            confidence=confidence,
            worker_id=worker_id,
            snapshot_path=snapshot_path,
            status="Active",
            assigned_role=assigned_role,
            action_sop=action_sop,
        )

        # 3. Store in SQLite DB
        self.db.insert_incident(record)

        # 4. Dispatch Webhook Notification
        if self.webhook_url and self.webhook_url.startswith("http"):
            self._dispatch_webhook(record)

        print(f"[AlertManager] Alert Dispatched: {record.incident_id} | {record.zone_name} | {record.violation_type} ({severity}) -> {record.assigned_role}")
        return record

    def _dispatch_webhook(self, record: IncidentRecord):
        """Send formatted alert payload to Slack/Discord/Teams webhook."""
        try:
            payload = {
                "text": f"*SAFETY ALERT - Raksha Kavach*\n"
                        f"• *Incident ID:* `{record.incident_id}`\n"
                        f"• *Zone:* {record.zone_name}\n"
                        f"• *Violation:* {record.violation_type.replace('_', ' ').title()}\n"
                        f"• *Severity:* {record.severity}\n"
                        f"• *Confidence:* {int(record.confidence * 100)}%\n"
                        f"• *Assigned Role:* {record.assigned_role}\n"
                        f"• *Action SOP:* {record.action_sop}\n"
                        f"• *Timestamp:* {record.timestamp}",
            }
            # Fire and forget (timeout 2s)
            requests.post(self.webhook_url, json=payload, timeout=2.0)
        except Exception as e:
            print(f"[AlertManager] Webhook dispatch warning: {e}")
