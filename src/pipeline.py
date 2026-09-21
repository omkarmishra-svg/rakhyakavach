"""
Unified Pipeline Orchestrator for Raksha Kavach.
Coordinates video stream ingestion, dual detection engines (PPE + Fire/Smoke),
spatial attribution, temporal smoothing, alert triggers, and HUD rendering.
"""

import time
from typing import Dict, List, Any, Tuple, Optional
import cv2
import numpy as np

from src.detect_ppe import PPEDetector, PPEDetectionResult
from src.detect_fire_smoke import FireSmokeDetector, HazardDetectionResult
from src.attribution import SpatialAttributor, WorkerCompliance
from src.temporal_filter import TemporalFilter
from src.zones import ZoneManager, ZoneConfig
from src.alert import AlertManager, IncidentRecord


class SafetyPipeline:
    """
    Real-time end-to-end factory safety pipeline.
    Connects Camera Ingestion -> Detection -> Attribution -> Filtering -> Alerting -> UI Annotation.
    """

    def __init__(
        self,
        ppe_detector: Optional[PPEDetector] = None,
        hazard_detector: Optional[FireSmokeDetector] = None,
        zone_manager: Optional[ZoneManager] = None,
        alert_manager: Optional[AlertManager] = None,
        sample_rate: int = 3,
        ppe_conf_threshold: float = 0.40,
        fire_conf_threshold: float = 0.45,
    ):
        self.sample_rate = max(1, sample_rate)
        self.ppe_detector = ppe_detector or PPEDetector(confidence_threshold=ppe_conf_threshold)
        self.hazard_detector = hazard_detector or FireSmokeDetector(confidence_threshold=fire_conf_threshold)
        self.zone_manager = zone_manager or ZoneManager()
        self.alert_manager = alert_manager or AlertManager()
        self.attributor = SpatialAttributor()
        self.temporal_filter = TemporalFilter()

        self._frame_count = 0
        self._last_fps = 0.0
        self._fps_timer = time.time()
        self._cached_summary: Dict[str, Any] = {}
        self._cached_workers: List[WorkerCompliance] = []
        self._cached_hazards: List[HazardDetectionResult] = []

    def process_frame(
        self,
        frame: np.ndarray,
        camera_id: str = "cam_01",
        draw_overlay: bool = True,
    ) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Process a single video frame through the safety pipeline.
        Returns:
            annotated_frame (np.ndarray): Frame with HUD and bounding box overlays
            summary (Dict[str, Any]): Structured safety telemetry
        """
        if frame is None or frame.size == 0:
            return frame, {}

        self._frame_count += 1
        now = time.time()

        # Compute FPS
        dt = now - self._fps_timer
        if dt > 0.5:
            self._last_fps = round(self._frame_count / dt, 1) if dt > 0 else 0.0
            self._frame_count = 0
            self._fps_timer = now

        zone = self.zone_manager.get_zone_by_camera(camera_id)
        is_sample_frame = (self._frame_count % self.sample_rate == 0)

        if is_sample_frame or not self._cached_summary:
            # 1. Run PPE Detection & Spatial Attribution
            ppe_dets = self.ppe_detector.detect(frame)
            worker_compliances = self.attributor.attribute(ppe_dets, zone.required_ppe)
            self._cached_workers = worker_compliances

            # 2. Run Fire & Smoke Hazard Detection
            hazard_dets = self.hazard_detector.detect(frame)
            self._cached_hazards = hazard_dets

            # 3. Format raw violation candidates for temporal filter
            raw_worker_violations = []
            for w in worker_compliances:
                if not w.is_compliant:
                    for missing in w.missing_ppe:
                        raw_worker_violations.append({
                            "worker_id": w.worker_id,
                            "violation": f"missing_{missing}",
                            "box": w.box,
                            "confidence": 0.85,
                        })

            raw_hazard_events = [
                {
                    "hazard_type": h.hazard_type,
                    "box": h.box,
                    "confidence": h.confidence,
                    "severity": h.severity,
                }
                for h in hazard_dets
            ]

            # 4. Apply Temporal Filter (suppress false flickers)
            confirmed_ppe = self.temporal_filter.update_worker_violations(raw_worker_violations, zone.zone_id)
            confirmed_hazards = self.temporal_filter.update_hazard_events(raw_hazard_events, zone.zone_id)

            # 5. Trigger Rate-Limited Alerts on Confirmed Events
            new_alerts: List[IncidentRecord] = []
            for item in confirmed_ppe:
                alert_rec = self.alert_manager.trigger_alert(
                    frame=frame,
                    zone_id=zone.zone_id,
                    zone_name=zone.name,
                    violation_type=item["violation"],
                    severity="High" if zone.risk_level in ["High", "Critical"] else "Medium",
                    confidence=item.get("confidence", 0.85),
                    worker_id=item.get("worker_id"),
                    bbox=item.get("box"),
                )
                if alert_rec:
                    new_alerts.append(alert_rec)

            for item in confirmed_hazards:
                alert_rec = self.alert_manager.trigger_alert(
                    frame=frame,
                    zone_id=zone.zone_id,
                    zone_name=zone.name,
                    violation_type=item["hazard_type"],
                    severity=item.get("severity", "Critical"),
                    confidence=item.get("confidence", 0.90),
                    bbox=item.get("box"),
                )
                if alert_rec:
                    new_alerts.append(alert_rec)

            # Calculate compliance stats
            total_workers = len(worker_compliances)
            compliant_workers = sum(1 for w in worker_compliances if w.is_compliant)
            compliance_pct = round((compliant_workers / total_workers * 100), 1) if total_workers > 0 else 100.0

            self._cached_summary = {
                "zone_id": zone.zone_id,
                "zone_name": zone.name,
                "risk_level": zone.risk_level,
                "total_workers": total_workers,
                "compliant_workers": compliant_workers,
                "compliance_pct": compliance_pct,
                "hazards_detected": len(hazard_dets),
                "active_alerts": len(new_alerts),
                "fps": self._last_fps,
                "violations_in_frame": [
                    {"worker_id": w.worker_id, "missing": w.missing_ppe}
                    for w in worker_compliances if not w.is_compliant
                ],
            }

        # Annotate visual frame with industrial Head-Up Display (HUD)
        annotated_frame = frame.copy()
        if draw_overlay:
            self._render_hud(annotated_frame, self._cached_summary, self._cached_workers, self._cached_hazards)

        return annotated_frame, self._cached_summary

    def _render_hud(
        self,
        frame: np.ndarray,
        summary: Dict[str, Any],
        workers: List[WorkerCompliance],
        hazards: List[HazardDetectionResult],
    ):
        """Render high-contrast industrial safety HUD and worker bounding boxes."""
        h, w = frame.shape[:2]

        # 1. Top HUD Header Bar
        banner_h = 44
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (w, banner_h), (20, 24, 33), -1)
        cv2.addWeighted(overlay, 0.85, frame, 0.15, 0, frame)

        # Title & Zone
        cv2.putText(
            frame, "RAKSHA KAVACH", (15, 28),
            cv2.FONT_HERSHEY_DUPLEX, 0.7, (0, 220, 255), 2
        )
        zone_str = f"Zone: {summary.get('zone_name', 'Default')} [{summary.get('risk_level', 'Normal')}]"
        cv2.putText(
            frame, zone_str, (210, 28),
            cv2.FONT_HERSHEY_SIMPLEX, 0.55, (230, 230, 230), 1
        )

        # Compliance Badge
        comp_pct = summary.get("compliance_pct", 100.0)
        badge_color = (0, 210, 80) if comp_pct >= 90 else ((0, 165, 255) if comp_pct >= 60 else (40, 40, 240))
        comp_str = f"Compliance: {comp_pct}%"
        cv2.putText(
            frame, comp_str, (w - 280, 28),
            cv2.FONT_HERSHEY_SIMPLEX, 0.6, badge_color, 2
        )

        # FPS counter
        fps_str = f"{summary.get('fps', 0.0):.1f} FPS"
        cv2.putText(
            frame, fps_str, (w - 95, 28),
            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (160, 160, 160), 1
        )

        # 2. Worker Bounding Boxes & Attribution Tags
        for worker in workers:
            x1, y1, x2, y2 = worker.box
            if worker.is_compliant:
                box_color = (0, 210, 80)  # Green
                status_text = f"Worker #{worker.worker_id} [COMPLIANT]"
            else:
                box_color = (40, 40, 230)  # Red
                missing_str = ", ".join(worker.missing_ppe).upper()
                status_text = f"Worker #{worker.worker_id} [NO {missing_str}]"

            # Draw worker bounding box
            cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 2)

            # Label banner
            (tw, th), _ = cv2.getTextSize(status_text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)
            cv2.rectangle(frame, (x1, max(0, y1 - 24)), (x1 + tw + 10, y1), box_color, -1)
            cv2.putText(
                frame, status_text, (x1 + 5, max(14, y1 - 7)),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2
            )

        # 3. Fire and Smoke Hazard Highlights
        for hazard in hazards:
            hx1, hy1, hx2, hy2 = hazard.box
            hazard_color = (0, 0, 255) if hazard.hazard_type == "fire" else (180, 180, 180)
            cv2.rectangle(frame, (hx1, hy1), (hx2, hy2), hazard_color, 3)

            hazard_label = f"HAZARD: {hazard.hazard_type.upper()} ({int(hazard.confidence * 100)}%)"
            (htw, hth), _ = cv2.getTextSize(hazard_label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
            cv2.rectangle(frame, (hx1, max(0, hy1 - 26)), (hx1 + htw + 12, hy1), hazard_color, -1)
            cv2.putText(
                frame, hazard_label, (hx1 + 6, max(16, hy1 - 8)),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2
            )
