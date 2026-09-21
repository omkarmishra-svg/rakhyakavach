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
from typing import Dict, List, Any, Optional
import cv2
import numpy as np
import requests


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
            "snapshot_path": self.snapshot_path,
            "status": self.status,
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
                    status TEXT DEFAULT 'Active'
                );
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_incidents_time ON incidents(timestamp);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_incidents_zone ON incidents(zone_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_incidents_type ON incidents(violation_type);")
            conn.commit()

    def insert_incident(self, record: IncidentRecord):
        """Insert new incident row into SQLite."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO incidents (
                    id, timestamp, zone_id, zone_name, violation_type,
                    severity, confidence, worker_id, snapshot_path, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    ) -> Optional[IncidentRecord]:
        """
        Processes an alert: checks cooldown, saves snapshot evidence,
        logs to SQLite, and sends webhook alert.
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

        # 2. Create Incident Record
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
        )

        # 3. Store in SQLite DB
        self.db.insert_incident(record)

        # 4. Dispatch Webhook Notification
        if self.webhook_url and self.webhook_url.startswith("http"):
            self._dispatch_webhook(record)

        print(f"[AlertManager] Alert Dispatched: {record.incident_id} | {record.zone_name} | {record.violation_type} ({severity})")
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
                        f"• *Timestamp:* {record.timestamp}",
            }
            # Fire and forget (timeout 2s)
            requests.post(self.webhook_url, json=payload, timeout=2.0)
        except Exception as e:
            print(f"[AlertManager] Webhook dispatch warning: {e}")
