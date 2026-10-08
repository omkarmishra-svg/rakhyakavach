"""
Unified Pipeline Orchestrator for Raksha Kavach.
Coordinates video stream ingestion, dual detection engines (PPE + Fire/Smoke),
spatial attribution, temporal smoothing, alert triggers, and HUD rendering.
"""

import time
from typing import Dict, List, Any, Tuple, Optional
import cv2
import numpy as np

from src.detect_ppe import PPEDetector, PPEDetectionResult  # pyrefly: ignore [missing-import]
from src.detect_fire_smoke import FireSmokeDetector, HazardDetectionResult  # pyrefly: ignore [missing-import]
from src.attribution import SpatialAttributor, WorkerCompliance  # pyrefly: ignore [missing-import]
from src.temporal_filter import TemporalFilter  # pyrefly: ignore [missing-import]
from src.zones import ZoneManager, ZoneConfig  # pyrefly: ignore [missing-import]
from src.alert import AlertManager, IncidentRecord  # pyrefly: ignore [missing-import]


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

        t_start = time.perf_counter_ns()
        t_prep = time.perf_counter_ns()

        if is_sample_frame or not self._cached_summary:
            # 1. Run PPE Detection & Spatial Attribution
            t_infer_start = time.perf_counter_ns()
            ppe_dets = self.ppe_detector.detect(frame)
            hazard_dets = self.hazard_detector.detect(frame)
            t_infer_end = time.perf_counter_ns()

            t_attr_start = time.perf_counter_ns()
            worker_compliances = self.attributor.attribute(ppe_dets, zone.required_ppe)
            self._cached_workers = worker_compliances
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
            t_attr_end = time.perf_counter_ns()

            # 5. Trigger Rate-Limited Alerts on Confirmed Events with Role-Routing
            t_disp_start = time.perf_counter_ns()
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
            t_disp_end = time.perf_counter_ns()

            # Calculate compliance stats
            total_workers = len(worker_compliances)
            compliant_workers = sum(1 for w in worker_compliances if w.is_compliant)
            compliance_pct = round((compliant_workers / total_workers * 100), 1) if total_workers > 0 else 100.0

            # Build detailed 3-tier status for every detected worker
            worker_details = []
            for w in worker_compliances:
                req_count = len(w.required_ppe) if w.required_ppe else 1
                missing_count = len(w.missing_ppe)
                if missing_count == 0:
                    status = "COMPLIANT"
                    color = "#00e676"  # Green
                elif missing_count >= req_count or len(w.worn_ppe) == 0:
                    status = "MISSING ALL"
                    color = "#ff1744"  # Red
                else:
                    status = "PARTIAL"
                    color = "#ffb300"  # Yellow

                worker_details.append({
                    "worker_id": w.worker_id,
                    "status": status,
                    "color": color,
                    "worn_ppe": list(w.worn_ppe.keys()),
                    "missing_ppe": w.missing_ppe,
                    "box": w.box,
                })

            t_end = time.perf_counter_ns()

            # High-precision microsecond latency metrics
            ingest_ms = max(0.1, round((t_prep - t_start) / 1e6, 2))
            inference_ms = max(0.1, round((t_infer_end - t_infer_start) / 1e6, 2))
            attribution_ms = max(0.1, round((t_attr_end - t_attr_start) / 1e6, 2))
            dispatch_ms = max(0.1, round((t_disp_end - t_disp_start) / 1e6, 2))
            total_latency_ms = max(0.1, round((t_end - t_start) / 1e6, 2))

            self._cached_summary = {
                "zone_id": zone.zone_id,
                "zone_name": zone.name,
                "risk_level": zone.risk_level,
                "total_workers": total_workers,
                "compliant_workers": compliant_workers,
                "compliance_pct": compliance_pct,
                "hazards_detected": len(hazard_dets),
                "active_alerts": len(new_alerts),
                "active_alerts_detail": [a.to_dict() for a in new_alerts],
                "fps": self._last_fps if self._last_fps > 0 else round(1e9 / max(1, (t_end - t_start)), 1),
                "latency_ms": total_latency_ms,
                "latency_breakdown": {
                    "ingest_ms": ingest_ms,
                    "inference_ms": inference_ms,
                    "attribution_ms": attribution_ms,
                    "dispatch_ms": dispatch_ms,
                    "total_ms": total_latency_ms,
                },
                "workers": worker_details,
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
        banner_h = 36
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (w, banner_h), (15, 23, 42), -1)
        cv2.addWeighted(overlay, 0.85, frame, 0.15, 0, frame)

        # Title
        cv2.putText(
            frame, "RAKSHA KAVACH REAL-TIME SENTINEL", (12, 24),
            cv2.FONT_HERSHEY_DUPLEX, 0.55, (0, 242, 254), 1
        )

        # Compliance Badge
        comp_pct = summary.get("compliance_pct", 100.0)
        badge_color = (0, 210, 80) if comp_pct >= 90 else ((0, 180, 255) if comp_pct >= 60 else (40, 40, 240))
        comp_str = f"COMPLIANCE: {comp_pct}%"
        cv2.putText(
            frame, comp_str, (max(10, w - 280), 24),
            cv2.FONT_HERSHEY_SIMPLEX, 0.46, badge_color, 2
        )

        # Performance (Latency + FPS) counter
        lat_ms = float(summary.get("latency_ms", 22.0))
        fps_val = float(summary.get("fps", self._last_fps or 30.0))
        perf_str = f"{lat_ms:.1f}ms | {fps_val:.1f} FPS"
        cv2.putText(
            frame, perf_str, (max(10, w - 130), 24),
            cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 240, 255), 1
        )

        # 2. Worker Bounding Boxes & 3-Tier Attribution Tags (Green/Yellow/Red)
        for worker in workers:
            x1, y1, x2, y2 = worker.box
            req_count = len(worker.required_ppe) if worker.required_ppe else 1
            missing_count = len(worker.missing_ppe)

            if missing_count == 0:
                # GREEN: All required equipment worn
                box_color = (0, 210, 80)  # BGR Green
                status_text = f"Worker #{worker.worker_id} [ALL PPE OK]"
            elif missing_count >= req_count or len(worker.worn_ppe) == 0:
                # RED: All required equipment missing
                box_color = (40, 40, 240)  # BGR Red
                missing_str = ", ".join(worker.missing_ppe).upper()
                status_text = f"Worker #{worker.worker_id} [NO PPE: {missing_str}]"
            else:
                # YELLOW: Partial equipment missing
                box_color = (0, 215, 255)  # BGR Yellow
                missing_str = ", ".join(worker.missing_ppe).upper()
                status_text = f"Worker #{worker.worker_id} [MISSING: {missing_str}]"

            # Draw square worker bounding box
            cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 2)

            # Label banner
            (tw, th), _ = cv2.getTextSize(status_text, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
            cv2.rectangle(frame, (x1, max(0, y1 - 22)), (x1 + tw + 8, y1), box_color, -1)
            cv2.putText(
                frame, status_text, (x1 + 4, max(14, y1 - 6)),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0) if box_color == (0, 215, 255) else (255, 255, 255), 1
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
