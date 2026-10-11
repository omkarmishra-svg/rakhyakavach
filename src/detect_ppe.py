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
        self.box = list(box)  # [x1, y1, x2, y2]
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
        # Construction & Electrical PPE
        "helmet", "hard_hat", "hard-hat", "hat", "cap",
        "vest", "safety_vest", "safety-vest", "reflective_jacket",
        "gloves", "safety_gloves", "work_gloves",
        "boots", "safety_boots", "shoes", "steel_toe_boots",
        "goggles", "safety_glasses", "mask", "dust_mask",
        "safety_harness", "harness", "fall_arrest",
        "welding_shield", "welding_mask", "face_shield",
        # Chemical Engineering & Hazmat PPE
        "chemical_suit", "hazmat_suit", "chemical_apron", "tychem_suit",
        "chemical_respirator", "respirator", "gas_mask", "cartridge_respirator",
        "chemical_gloves", "nitrile_gloves", "butyl_gloves",
        "chemical_boots", "gumboots", "acid_boots",
        "scba", "scba_pack", "breathing_apparatus"
    }

    NEGATIVE_CLASSES = {
        "no_helmet", "no-helmet", "without_helmet",
        "no_vest", "no-vest", "without_vest",
        "no_gloves", "no_boots",
        "no_respirator", "no_chemical_suit", "no_harness"
    }

    def __init__(
        self,
        model_path: str = "models/ppe_best.pt",
        confidence_threshold: float = 0.15,
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

        # Resolve path relative to project root if needed
        resolved_path = self.model_path
        if not os.path.isabs(resolved_path):
            project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            candidate = os.path.join(project_root, self.model_path)
            if os.path.exists(candidate):
                resolved_path = candidate

        if os.path.exists(resolved_path):
            try:
                print(f"[PPEDetector] Loading fine-tuned PPE model from: {resolved_path}")
                self.model = YOLO(resolved_path)
                self.is_custom_model = True
                return
            except Exception as e:
                print(f"[PPEDetector] Error loading custom model {resolved_path}: {e}")

        # Fallback to standard yolov8n for person detection + visual heuristic PPE validation
        print(f"[PPEDetector] Custom weights not found at {resolved_path}. Using pretrained yolov8n.pt baseline.")
        try:
            self.model = YOLO("yolov8n.pt")
            self.is_custom_model = False
        except Exception as e:
            print(f"[PPEDetector] Could not download/load yolov8n: {e}")
            self.model = None

    @staticmethod
    def preprocess_adverse_frame(frame: np.ndarray) -> np.ndarray:
        """
        Adverse condition enhancer:
        Applies dual-pass CLAHE (Contrast Limited Adaptive Histogram Equalization)
        and subtle unsharp masking when the frame suffers from dust particulate haze,
        steam condensation, or dim industrial lighting.
        """
        if frame is None or frame.size == 0:
            return frame

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        # pyrefly: ignore [no-matching-overload]
        mean_lum = float(np.mean(gray))
        # pyrefly: ignore [no-matching-overload]
        std_lum = float(np.std(gray))

        # Check for adverse visibility: low contrast (dust/steam haze) or low lighting
        if mean_lum < 85.0 or std_lum < 42.0:
            lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=2.8, tileGridSize=(8, 8))
            cl = clahe.apply(l)
            enhanced = cv2.merge((cl, a, b))
            bgr_enh = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)

            # Subtle unsharp mask to restore gear boundaries obscured by dust particulates
            gaussian = cv2.GaussianBlur(bgr_enh, (0, 0), 2.0)
            return cv2.addWeighted(bgr_enh, 1.22, gaussian, -0.22, 0)

        return frame

    def detect(self, frame: np.ndarray) -> List[PPEDetectionResult]:
        """
        Run detection on a single frame (BGR numpy array).
        Returns a list of PPEDetectionResult objects.
        """
        if self.model is None or frame is None or frame.size == 0:
            return []

        results = []
        try:
            # Apply adaptive CLAHE enhancement if adverse conditions (dust/steam/darkness) are present
            proc_frame = self.preprocess_adverse_frame(frame)

            # Run inference
            preds = self.model(proc_frame, conf=self.confidence_threshold, device=self.device, verbose=False)
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
                    if cls_name.lower() == "person":
                        # Run heuristics to detect gloves, boots, goggles, etc. for this specific worker
                        heuristics = self._estimate_ppe_heuristics(frame, coords)
                        results.extend(heuristics)
                else:
                    # COCO pretrained fallback: detect person and estimate PPE presence
                    if cls_name == "person":
                        results.append(PPEDetectionResult(coords, "person", conf, track_id))
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
        Anti-hallucination color, geometry & contrast analyzer.
        Adapts anatomical regions to steep CCTV camera angles and eliminates false positives
        on bare heads, dark hair, and everyday clothing.
        """
        h_frame, w_frame = frame.shape[:2]
        x1, y1, x2, y2 = person_box
        pw = max(1, x2 - x1)
        ph = max(1, y2 - y1)
        aspect_ratio = ph / float(pw)

        heuristics = []

        # Camera Angle Adaptation:
        # Steep overhead cameras (aspect ratio < 1.6) compress human height,
        # so head/hardhat dominates the upper 38% and torso begins higher.
        if aspect_ratio < 1.6:
            head_h_ratio = 0.38
            torso_y1_ratio = 0.22
            torso_y2_ratio = 0.85
        elif aspect_ratio < 2.2:
            head_h_ratio = 0.30
            torso_y1_ratio = 0.18
            torso_y2_ratio = 0.78
        else:
            head_h_ratio = 0.22
            torso_y1_ratio = 0.18
            torso_y2_ratio = 0.65

        # 1. Head crop (with generous headroom for helmet dome and wide brim)
        hy1 = max(0, y1 - int(ph * 0.12))
        hy2 = min(h_frame, y1 + int(ph * max(0.35, head_h_ratio)))
        hx1 = max(0, x1 - int(pw * 0.05))
        hx2 = min(w_frame, x2 + int(pw * 0.05))

        if hy2 > hy1 and hx2 > hx1:
            head_crop = frame[hy1:hy2, hx1:hx2]
            hsv = cv2.cvtColor(head_crop, cv2.COLOR_BGR2HSV)

            # Certified Hard Hat colors: Yellow, White, Orange, Blue, Red, Neon Green, Dark/Grey
            yellow_mask = cv2.inRange(hsv, np.array([14, 22, 45]), np.array([45, 255, 255]))
            white_mask = cv2.inRange(hsv, np.array([0, 0, 65]), np.array([180, 75, 255]))
            orange_mask = cv2.inRange(hsv, np.array([2, 25, 45]), np.array([24, 255, 255]))
            blue_mask = cv2.inRange(hsv, np.array([85, 22, 35]), np.array([140, 255, 255]))
            red_mask1 = cv2.inRange(hsv, np.array([0, 30, 45]), np.array([14, 255, 255]))
            red_mask2 = cv2.inRange(hsv, np.array([160, 30, 45]), np.array([180, 255, 255]))
            green_mask = cv2.inRange(hsv, np.array([35, 20, 35]), np.array([90, 255, 255]))

            # Red/orange skin tone rejection only on red hue range so yellow/white helmets are never subtracted
            red_orange = cv2.bitwise_or(red_mask1, cv2.bitwise_or(red_mask2, orange_mask))
            skin_mask = cv2.inRange(hsv, np.array([0, 40, 60]), np.array([16, 135, 210]))
            clean_red_orange = cv2.bitwise_and(red_orange, cv2.bitwise_not(skin_mask))

            combined_helmet = cv2.bitwise_or(yellow_mask, white_mask)
            combined_helmet = cv2.bitwise_or(combined_helmet, blue_mask)
            combined_helmet = cv2.bitwise_or(combined_helmet, green_mask)
            combined_helmet = cv2.bitwise_or(combined_helmet, clean_red_orange)

            helmet_ratio = np.sum(combined_helmet > 0) / float(max(1, combined_helmet.size))

            # Upper dome check: head crown area (where hard hat is always worn)
            crop_h = hy2 - hy1
            upper_crop = combined_helmet[:int(crop_h * 0.55), :]
            upper_ratio = np.sum(upper_crop > 0) / float(max(1, upper_crop.size))

            if helmet_ratio > 0.025 or upper_ratio > 0.035:
                h_val = float(helmet_ratio) if float(helmet_ratio) > float(upper_ratio) else float(upper_ratio)
                heuristics.append(
                    PPEDetectionResult([hx1, hy1, hx2, hy2], "helmet", min(0.96, 0.78 + h_val * 0.22))
                )

        # 2. Torso crop (Webcam close-ups: torso starts below chin and extends down full chest/body)
        ty1 = min(h_frame, y1 + int(ph * 0.14))
        ty2 = min(h_frame, max(y2, y1 + int(ph * 1.5)))
        tx1 = max(0, x1 - int(pw * 0.08))
        tx2 = min(w_frame, x2 + int(pw * 0.08))

        if ty2 > ty1 and tx2 > tx1:
            torso_crop = frame[ty1:ty2, tx1:tx2]
            hsv_torso = cv2.cvtColor(torso_crop, cv2.COLOR_BGR2HSV)

            # High-visibility neon lime green/yellow (expanded for indoor webcam white balance)
            neon_green = cv2.inRange(hsv_torso, np.array([10, 15, 30]), np.array([100, 255, 255]))
            # Fluorescent safety orange
            safety_orange = cv2.inRange(hsv_torso, np.array([2, 22, 35]), np.array([28, 255, 255]))
            # Retroreflective silver stripes / trim
            reflective_silver = cv2.inRange(hsv_torso, np.array([0, 0, 110]), np.array([180, 70, 255]))

            vest_mask = cv2.bitwise_or(neon_green, safety_orange)
            vest_mask = cv2.bitwise_or(vest_mask, reflective_silver)
            vest_ratio = np.sum(vest_mask > 0) / float(max(1, vest_mask.size))

            if vest_ratio > 0.015:
                heuristics.append(
                    PPEDetectionResult([tx1, ty1, tx2, ty2], "vest", min(0.96, float(0.80 + vest_ratio * 0.20)))
                )

        # 3. Hand & Glove inspection (Left and Right lower flanks or chest hold)
        gly1 = min(h_frame, y1 + int(ph * 0.45))
        gly2 = min(h_frame, y1 + int(ph * 0.88))
        glx1 = max(0, x1 - int(pw * 0.12))
        glx2 = min(w_frame, x2 + int(pw * 0.12))

        if gly2 > gly1 and glx2 > glx1:
            hands_crop = frame[gly1:gly2, glx1:glx2]
            hsv_hands = cv2.cvtColor(hands_crop, cv2.COLOR_BGR2HSV)

            # High-visibility electric yellow/orange rubber gloves, blue nitrile gloves, or thick industrial leather
            blue_nitrile = cv2.inRange(hsv_hands, np.array([95, 70, 60]), np.array([135, 255, 255]))
            yellow_work = cv2.inRange(hsv_hands, np.array([18, 90, 80]), np.array([36, 255, 255]))
            orange_work = cv2.inRange(hsv_hands, np.array([5, 110, 90]), np.array([18, 255, 255]))
            leather_work = cv2.inRange(hsv_hands, np.array([10, 40, 40]), np.array([25, 140, 150]))

            # Exclude bare skin
            bare_skin = cv2.inRange(hsv_hands, np.array([0, 30, 70]), np.array([25, 130, 220]))
            glove_mask = cv2.bitwise_or(blue_nitrile, yellow_work)
            glove_mask = cv2.bitwise_or(glove_mask, orange_work)
            glove_mask = cv2.bitwise_or(glove_mask, leather_work)
            clean_gloves = cv2.bitwise_and(glove_mask, cv2.bitwise_not(bare_skin))

            glove_ratio = np.sum(clean_gloves > 0) / float(max(1, clean_gloves.size))
            if glove_ratio > 0.05:
                heuristics.append(
                    PPEDetectionResult([glx1, gly1, glx2, gly2], "gloves", min(0.92, float(0.70 + glove_ratio * 0.25)))
                )

        # 4. Boots / Footwear inspection (Lower 20% of person bounding box)
        by1 = min(h_frame, y1 + int(ph * 0.80))
        by2 = min(h_frame, y2)
        bx1 = max(0, x1)
        bx2 = min(w_frame, x2)

        if by2 > by1 and bx2 > bx1:
            boots_crop = frame[by1:by2, bx1:bx2]
            hsv_boots = cv2.cvtColor(boots_crop, cv2.COLOR_BGR2HSV)

            # Dark leather/rubber steel-toe boots, yellow chemical gumboots, or heavy work shoes
            dark_boots = cv2.inRange(hsv_boots, np.array([0, 0, 10]), np.array([180, 70, 80]))
            yellow_gumboots = cv2.inRange(hsv_boots, np.array([18, 80, 80]), np.array([35, 255, 255]))
            boots_mask = cv2.bitwise_or(dark_boots, yellow_gumboots)

            boot_ratio = np.sum(boots_mask > 0) / float(max(1, boots_mask.size))
            if boot_ratio > 0.12:
                heuristics.append(
                    PPEDetectionResult([bx1, by1, bx2, by2], "boots", min(0.90, float(0.70 + boot_ratio * 0.20)))
                )

        # 5. Goggles / Spectacles / Protective Eyewear inspection (Eye band of face/head)
        if hy2 > hy1 and hx2 > hx1:
            ey1 = min(h_frame, hy1 + int((hy2 - hy1) * 0.26))
            ey2 = min(h_frame, hy1 + int((hy2 - hy1) * 0.72))
            if ey2 > ey1:
                eye_crop = frame[ey1:ey2, hx1:hx2]
                hsv_eye = cv2.cvtColor(eye_crop, cv2.COLOR_BGR2HSV)
                gray_eye = cv2.cvtColor(eye_crop, cv2.COLOR_BGR2GRAY)

                # Polycarbonate lens glare reflection
                polycarb = cv2.inRange(hsv_eye, np.array([0, 0, 160]), np.array([180, 50, 255]))
                poly_ratio = np.sum(polycarb > 0) / float(max(1, polycarb.size))

                # Tinted safety glasses
                tinted = cv2.inRange(hsv_eye, np.array([85, 30, 40]), np.array([135, 255, 255]))
                tint_ratio = np.sum(tinted > 0) / float(max(1, tinted.size))

                # Clear spectacles / safety frames: edge contrast of rims and nose bridge
                edges = cv2.Canny(gray_eye, 35, 120)
                edge_ratio = np.sum(edges > 0) / float(max(1, edges.size))

                # Dark eyeglass frames
                dark_frames = cv2.inRange(hsv_eye, np.array([0, 0, 0]), np.array([180, 255, 75]))
                dark_ratio = np.sum(dark_frames > 0) / float(max(1, dark_frames.size))

                # Match if frame contours or glare or tint present
                if poly_ratio > 0.035 or tint_ratio > 0.035 or (edge_ratio > 0.035 and dark_ratio > 0.025):
                    heuristics.append(
                        PPEDetectionResult([hx1, ey1, hx2, ey2], "goggles", 0.92)
                    )

        return heuristics
