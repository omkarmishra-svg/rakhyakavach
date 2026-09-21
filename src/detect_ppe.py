"""
PPE Detection Module for Raksha Kavach.
Detects workers and PPE items (helmet, safety vest, boots, gloves, goggles)
using YOLOv8 with graceful fallback to pretrained models and visual heuristics.
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


class PPEDetectionResult:
    """Standardized representation of a detected PPE or Person entity."""

    def __init__(
        self,
        box: List[int],
        class_name: str,
        confidence: float,
        track_id: Optional[int] = None,
    ):
        self.box = [int(coord) for coord in box]  # [x1, y1, x2, y2]
        self.class_name = class_name.lower().strip()
        self.confidence = float(confidence)
        self.track_id = track_id

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
    def width(self) -> int:
        return max(0, self.x2 - self.x1)

    @property
    def height(self) -> int:
        return max(0, self.y2 - self.y1)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "box": self.box,
            "class_name": self.class_name,
            "confidence": round(self.confidence, 3),
            "track_id": self.track_id,
        }


class PPEDetector:
    """YOLOv8-based PPE Detector capable of detecting workers and their protective gear."""

    PPE_CLASSES = {
        "helmet", "hard_hat", "hard-hat", "hat", "cap",
        "vest", "safety_vest", "safety-vest", "reflective_jacket",
        "gloves", "safety_gloves",
        "boots", "safety_boots", "shoes",
        "goggles", "safety_glasses", "mask"
    }

    NEGATIVE_CLASSES = {
        "no_helmet", "no-helmet", "without_helmet",
        "no_vest", "no-vest", "without_vest",
        "no_gloves", "no_boots"
    }

    def __init__(
        self,
        model_path: str = "models/ppe_best.pt",
        confidence_threshold: float = 0.40,
        device: str = "cpu"
    ):
        self.model_path = model_path
        self.confidence_threshold = confidence_threshold
        self.device = device
        self.model = None
        self.is_custom_model = False

        self._initialize_model()

    def _initialize_model(self):
        """Load fine-tuned model if available, otherwise initialize pretrained YOLOv8n."""
        if not ULTRALYTICS_AVAILABLE:
            print("[PPEDetector] Warning: Ultralytics is not available. Running in stub mode.")
            return

        if os.path.exists(self.model_path):
            try:
                print(f"[PPEDetector] Loading fine-tuned PPE model from: {self.model_path}")
                self.model = YOLO(self.model_path)
                self.is_custom_model = True
                return
            except Exception as e:
                print(f"[PPEDetector] Error loading custom model {self.model_path}: {e}")

        # Fallback to standard yolov8n for person detection + visual heuristic PPE validation
        print("[PPEDetector] Custom weights not found at models/ppe_best.pt. Using pretrained yolov8n.pt baseline.")
        try:
            self.model = YOLO("yolov8n.pt")
            self.is_custom_model = False
        except Exception as e:
            print(f"[PPEDetector] Could not download/load yolov8n: {e}")
            self.model = None

    def detect(self, frame: np.ndarray) -> List[PPEDetectionResult]:
        """
        Run detection on a single frame (BGR numpy array).
        Returns a list of PPEDetectionResult objects.
        """
        if self.model is None or frame is None or frame.size == 0:
            return []

        results = []
        try:
            # Run inference
            preds = self.model(frame, conf=self.confidence_threshold, device=self.device, verbose=False)
            if not preds or len(preds) == 0:
                return []

            boxes = preds[0].boxes
            if boxes is None:
                return []

            names = self.model.names  # mapping of class_id to string name

            for box in boxes:
                coords = box.xyxy[0].cpu().numpy().astype(int).tolist()
                conf = float(box.conf[0].cpu().numpy())
                cls_id = int(box.cls[0].cpu().numpy())
                cls_name = str(names.get(cls_id, f"class_{cls_id}")).lower()

                track_id = None
                if box.id is not None:
                    track_id = int(box.id[0].cpu().numpy())

                # If running custom PPE model, preserve fine-tuned class names
                if self.is_custom_model:
                    results.append(PPEDetectionResult(coords, cls_name, conf, track_id))
                else:
                    # COCO pretrained fallback: detect person and estimate PPE presence
                    if cls_name == "person":
                        results.append(PPEDetectionResult(coords, "person", conf, track_id))
                        # Inspect head & torso crops to estimate helmet / high-vis vest in demo mode
                        heuristics = self._estimate_ppe_heuristics(frame, coords)
                        results.extend(heuristics)

            # Fallback for synthetic/animated demo feeds when standard COCO model finds 0 persons
            if not self.is_custom_model and len(results) == 0:
                synth_workers = self._detect_synthetic_workers(frame)
                results.extend(synth_workers)

        except Exception as e:
            print(f"[PPEDetector] Inference error: {e}")

        return results

    def _detect_synthetic_workers(self, frame: np.ndarray) -> List[PPEDetectionResult]:
        """Detect stylized workers in demo/synthetic test feeds."""
        h_frame, w_frame = frame.shape[:2]
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        # Neon vest mask (H: 38-85 separates green vest from yellow hard hat)
        neon = cv2.inRange(hsv, np.array([38, 80, 80]), np.array([85, 255, 255]))
        cnts, _ = cv2.findContours(neon, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        rects = []
        for c in cnts:
            if cv2.contourArea(c) > 30:
                bx, by, bw, bh = cv2.boundingRect(c)
                # Filter out signage or full-screen banners
                if bw < w_frame * 0.3 and by > 100:
                    rects.append((bx, by, bx + bw, by + bh))
        if not rects:
            return []

        # Merge vertically/horizontally adjacent vest components belonging to same worker
        rects.sort(key=lambda r: r[0])
        clusters = []
        curr = list(rects[0])
        for r in rects[1:]:
            if r[0] <= curr[2] + 25:
                curr[0] = min(curr[0], r[0])
                curr[1] = min(curr[1], r[1])
                curr[2] = max(curr[2], r[2])
                curr[3] = max(curr[3], r[3])
            else:
                clusters.append(curr)
                curr = list(r)
        clusters.append(curr)

        results = []
        for idx, (vx1, vy1, vx2, vy2) in enumerate(clusters):
            vw = vx2 - vx1
            if 15 <= vw <= 120:
                # Approximate human bounding box: head extends above vest, legs extend below
                px1 = max(0, vx1 - 8)
                px2 = min(w_frame, vx2 + 8)
                py1 = max(0, vy1 - 38)
                py2 = min(h_frame, vy2 + 65)
                worker_box = [px1, py1, px2, py2]
                results.append(PPEDetectionResult(worker_box, "person", 0.90, track_id=101 + idx))
                heuristics = self._estimate_ppe_heuristics(frame, worker_box)
                results.extend(heuristics)

        return results

    def _estimate_ppe_heuristics(self, frame: np.ndarray, person_box: List[int]) -> List[PPEDetectionResult]:
        """
        Heuristic color-and-contrast analyzer when fine-tuned PPE weights are still training.
        Analyzes head and torso regions for high-visibility vest and safety helmet signatures.
        """
        h_frame, w_frame = frame.shape[:2]
        x1, y1, x2, y2 = person_box
        pw = max(1, x2 - x1)
        ph = max(1, y2 - y1)

        heuristics = []

        # 1. Head crop (top 20% of person)
        hy1 = max(0, y1)
        hy2 = min(h_frame, y1 + int(ph * 0.22))
        hx1 = max(0, x1 + int(pw * 0.15))
        hx2 = min(w_frame, x2 - int(pw * 0.15))

        if hy2 > hy1 and hx2 > hx1:
            head_crop = frame[hy1:hy2, hx1:hx2]
            hsv = cv2.cvtColor(head_crop, cv2.COLOR_BGR2HSV)
            
            # Real-world Hard Hat colors: Yellow, White, Orange, Blue, Red
            yellow_mask = cv2.inRange(hsv, np.array([15, 80, 80]), np.array([36, 255, 255]))
            white_mask = cv2.inRange(hsv, np.array([0, 0, 175]), np.array([180, 45, 255]))
            orange_mask = cv2.inRange(hsv, np.array([8, 120, 120]), np.array([22, 255, 255]))
            blue_mask = cv2.inRange(hsv, np.array([95, 90, 80]), np.array([130, 255, 255]))
            red_mask1 = cv2.inRange(hsv, np.array([0, 120, 100]), np.array([10, 255, 255]))
            red_mask2 = cv2.inRange(hsv, np.array([170, 120, 100]), np.array([180, 255, 255]))
            
            combined_helmet = cv2.bitwise_or(yellow_mask, white_mask)
            combined_helmet = cv2.bitwise_or(combined_helmet, orange_mask)
            combined_helmet = cv2.bitwise_or(combined_helmet, blue_mask)
            combined_helmet = cv2.bitwise_or(combined_helmet, red_mask1)
            combined_helmet = cv2.bitwise_or(combined_helmet, red_mask2)
            
            helmet_ratio = np.sum(combined_helmet > 0) / float(combined_helmet.size)

            if helmet_ratio > 0.12:
                heuristics.append(
                    PPEDetectionResult([hx1, hy1, hx2, hy2], "helmet", min(0.96, 0.70 + helmet_ratio * 0.25))
                )

        # 2. Torso crop (20% to 65% of person)
        ty1 = min(h_frame, y1 + int(ph * 0.20))
        ty2 = min(h_frame, y1 + int(ph * 0.65))
        tx1 = max(0, x1 + int(pw * 0.08))
        tx2 = min(w_frame, x2 - int(pw * 0.08))

        if ty2 > ty1 and tx2 > tx1:
            torso_crop = frame[ty1:ty2, tx1:tx2]
            hsv_torso = cv2.cvtColor(torso_crop, cv2.COLOR_BGR2HSV)
            # High-visibility neon yellow/green or safety fluorescent orange
            neon_green = cv2.inRange(hsv_torso, np.array([25, 75, 75]), np.array([85, 255, 255]))
            safety_orange = cv2.inRange(hsv_torso, np.array([5, 110, 110]), np.array([24, 255, 255]))
            vest_mask = cv2.bitwise_or(neon_green, safety_orange)
            vest_ratio = np.sum(vest_mask > 0) / float(vest_mask.size)

            if vest_ratio > 0.14:
                heuristics.append(
                    PPEDetectionResult([tx1, ty1, tx2, ty2], "vest", min(0.96, 0.72 + vest_ratio * 0.24))
                )

        return heuristics
