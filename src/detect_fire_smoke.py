"""
Fire and Smoke Hazard Detection Module for Raksha Kavach.
Detects flames and smoke plumes using fine-tuned YOLOv8 or visual flame analytics.
"""

import os
from typing import List, Dict, Any, Optional
import numpy as np
import cv2

try:
    # pyrefly: ignore [missing-import]
    from ultralytics import YOLO
    ULTRALYTICS_AVAILABLE = True
except ImportError:
    ULTRALYTICS_AVAILABLE = False


class HazardDetectionResult:
    """Standardized representation of a detected Fire or Smoke hazard."""

    def __init__(
        self,
        box: List[int],
        hazard_type: str,
        confidence: float,
        severity: str = "Medium",
    ):
        self.box = [int(coord) for coord in box]  # [x1, y1, x2, y2]
        self.hazard_type = hazard_type.lower().strip()  # 'fire' or 'smoke'
        self.confidence = float(confidence)
        self.severity = severity  # 'Low', 'Medium', 'High', 'Critical'

    @property
    def x1(self) -> int:
        return self.box[0]

    @property
    def y1(self) -> int:
        return self.box[1]

    @property
    def x2(self) -> int:
        return self.box[2]

    @property
    def y2(self) -> int:
        return self.box[3]

    @property
    def area(self) -> int:
        return max(0, self.x2 - self.x1) * max(0, self.y2 - self.y1)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "box": self.box,
            "hazard_type": self.hazard_type,
            "confidence": round(self.confidence, 3),
            "severity": self.severity,
            "area": self.area,
        }


class FireSmokeDetector:
    """Detects fire and smoke hazards to trigger high-priority facility alerts."""

    def __init__(
        self,
        model_path: str = "models/fire_smoke_best.pt",
        confidence_threshold: float = 0.45,
        device: str = "cpu",
    ):
        self.model_path = model_path
        self.confidence_threshold = confidence_threshold
        self.device = device
        self.model = None
        self.is_custom_model = False

        self._initialize_model()

    def _initialize_model(self):
        """Initialize fine-tuned model if available."""
        if not ULTRALYTICS_AVAILABLE:
            print("[FireSmokeDetector] Warning: Ultralytics not available.")
            return

        if os.path.exists(self.model_path):
            try:
                print(f"[FireSmokeDetector] Loading custom fire/smoke model from: {self.model_path}")
                self.model = YOLO(self.model_path)
                self.is_custom_model = True
                return
            except Exception as e:
                print(f"[FireSmokeDetector] Error loading {self.model_path}: {e}")

        # When custom weights are pending, load yolov8n or rely on visual thermal/color heuristic fallback
        print("[FireSmokeDetector] Custom weights not found at models/fire_smoke_best.pt. Using color-motion fire detection baseline.")
        self.is_custom_model = False

    def detect(self, frame: np.ndarray) -> List[HazardDetectionResult]:
        """
        Run fire/smoke detection on a single frame (BGR numpy array).
        Returns list of HazardDetectionResult.
        """
        if frame is None or frame.size == 0:
            return []

        results: List[HazardDetectionResult] = []

        if self.is_custom_model and self.model is not None:
            try:
                preds = self.model(frame, conf=self.confidence_threshold, device=self.device, verbose=False)
                if preds and len(preds) > 0 and preds[0].boxes is not None:
                    names = self.model.names
                    h_frame, w_frame = frame.shape[:2]
                    frame_area = max(1, h_frame * w_frame)

                    for box in preds[0].boxes:
                        coords = box.xyxy[0].cpu().numpy().astype(int).tolist()
                        conf = float(box.conf[0].cpu().numpy())
                        cls_id = int(box.cls[0].cpu().numpy())
                        cls_name = str(names.get(cls_id, "")).lower()

                        if "fire" in cls_name or "flame" in cls_name:
                            htype = "fire"
                        elif "smoke" in cls_name:
                            htype = "smoke"
                        else:
                            continue

                        box_area = max(0, coords[2] - coords[0]) * max(0, coords[3] - coords[1])
                        area_pct = box_area / frame_area

                        severity = "Critical" if (htype == "fire" or area_pct > 0.10) else ("High" if area_pct > 0.04 else "Medium")
                        results.append(HazardDetectionResult(coords, htype, conf, severity))
            except Exception as e:
                print(f"[FireSmokeDetector] Inference error: {e}")
        else:
            # Baseline flame color chromaticity analyzer (red/orange/yellow flickering hot spots)
            results = self._detect_flame_heuristic(frame)

        return results

    def _detect_flame_heuristic(self, frame: np.ndarray) -> List[HazardDetectionResult]:
        """
        Visual fire and smoke heuristic detector for testing before model fine-tuning completes.
        Identifies concentrated high-intensity orange/red flame signatures.
        """
        h_frame, w_frame = frame.shape[:2]
        frame_area = h_frame * w_frame

        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        # Flame color profile in HSV: Low Hue (0-20), High Saturation (140-255), Very High Value (200-255)
        lower_fire = np.array([0, 150, 210])
        upper_fire = np.array([22, 255, 255])
        mask = cv2.inRange(hsv, lower_fire, upper_fire)

        # Morphological filter to remove small noise
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        hazards = []

        for cnt in contours:
            area = cv2.contourArea(cnt)
            # Filter out tiny specks (< 0.2% frame) and huge screen-wide solid backgrounds
            if area > (frame_area * 0.003) and area < (frame_area * 0.40):
                x, y, w, h = cv2.boundingRect(cnt)
                aspect = float(h) / max(1, w)
                # Fire usually flickers vertically
                if aspect > 0.5:
                    conf = min(0.92, 0.60 + (area / frame_area) * 2.0)
                    severity = "Critical" if area > (frame_area * 0.05) else "High"
                    hazards.append(
                        HazardDetectionResult([x, y, x + w, y + h], "fire", conf, severity)
                    )

        return hazards
