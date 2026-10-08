"""
Spatial Attribution Module for Raksha Kavach.
Binds detected safety equipment (helmets, vests, boots, gloves) to specific
individual workers using geometric anatomical region intersection (IoU/IoA).
"""

from typing import List, Dict, Set, Any, Optional
from src.detect_ppe import PPEDetectionResult  # pyrefly: ignore [missing-import]


class WorkerCompliance:
    """Represents compliance assessment for an individual worker."""

    def __init__(
        self,
        worker_id: int,
        box: List[int],
        required_ppe: Set[str],
        worn_ppe: Dict[str, PPEDetectionResult],
        missing_ppe: List[str],
        camera_angle: str = "FRONTAL_EYE_LEVEL",
    ):
        self.worker_id = worker_id
        self.box = box  # [x1, y1, x2, y2]
        self.required_ppe = required_ppe
        self.worn_ppe = worn_ppe  # {gear_name: PPEDetectionResult}
        self.missing_ppe = missing_ppe  # ['helmet', 'vest', etc.]
        self.is_compliant = len(missing_ppe) == 0
        self.camera_angle = camera_angle

    @property
    def violations(self) -> List[str]:
        return [f"missing_{gear}" for gear in self.missing_ppe]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "worker_id": self.worker_id,
            "box": self.box,
            "is_compliant": self.is_compliant,
            "camera_angle": self.camera_angle,
            "worn_ppe": list(self.worn_ppe.keys()),
            "missing_ppe": self.missing_ppe,
            "violations": self.violations,
        }


class SpatialAttributor:
    """Matches detected gear to corresponding human bounding boxes."""

    # Gear category normalizations
    HELMET_ALIASES = {"helmet", "hardhat", "hard_hat", "hard-hat", "hat", "cap"}
    VEST_ALIASES = {"vest", "safety_vest", "safety-vest", "safety vest", "reflective_jacket"}
    BOOTS_ALIASES = {"boots", "safety_boots", "shoes"}
    GLOVES_ALIASES = {"gloves", "safety_gloves"}
    GOGGLES_ALIASES = {"goggles", "safety_glasses", "mask"}

    # Explicit negative classes in trained dataset
    NEGATIVE_ALIASES = {
        "no_hardhat": "helmet",
        "no_helmet": "helmet",
        "without_helmet": "helmet",
        "no_safety_vest": "vest",
        "no_vest": "vest",
        "without_vest": "vest",
        "no_mask": "goggles",
    }

    def __init__(self, min_containment_threshold: float = 0.08):
        self.min_containment_threshold = min_containment_threshold

    @staticmethod
    def _compute_intersection_area(boxA: List[int], boxB: List[int]) -> float:
        """Compute area of overlap between two bounding boxes."""
        xA = max(boxA[0], boxB[0])
        yA = max(boxA[1], boxB[1])
        xB = min(boxA[2], boxB[2])
        yB = min(boxA[3], boxB[3])

        inter_w = max(0, xB - xA)
        inter_h = max(0, yB - yA)
        return float(inter_w * inter_h)

    @classmethod
    def _normalize_gear_name(cls, class_name: str) -> Optional[str]:
        """Map raw detection class names to canonical safety equipment names."""
        name = class_name.lower().strip().replace("-", "_").replace(" ", "_")
        if name in {"helmet", "hardhat", "hard_hat", "cap"}:
            return "helmet"
        if name in {"vest", "safety_vest", "reflective_jacket"}:
            return "vest"
        if name in {a.replace("-", "_").replace(" ", "_") for a in cls.BOOTS_ALIASES}:
            return "boots"
        if name in {a.replace("-", "_").replace(" ", "_") for a in cls.GLOVES_ALIASES}:
            return "gloves"
        if name in {a.replace("-", "_").replace(" ", "_") for a in cls.GOGGLES_ALIASES}:
            return "goggles"
        return None

    @classmethod
    def _extract_negative_violation(cls, class_name: str) -> Optional[str]:
        """Identify if a detection is an explicit negative label (e.g. NO-Hardhat)."""
        name = class_name.lower().strip().replace("-", "_").replace(" ", "_")
        return cls.NEGATIVE_ALIASES.get(name)

    def attribute(
        self,
        detections: List[PPEDetectionResult],
        required_ppe: Set[str],
    ) -> List[WorkerCompliance]:
        """
        Partition detections into workers and safety gear, then match gear to each worker.
        Supports steep camera angles, foreshortening, and explicit negative violations.
        """
        workers: List[PPEDetectionResult] = []
        gear_items: List[PPEDetectionResult] = []

        # Separate human bounding boxes from gear items
        for det in detections:
            if det.class_name == "person":
                workers.append(det)
            else:
                gear_items.append(det)

        compliance_results: List[WorkerCompliance] = []

        for idx, worker in enumerate(workers):
            worker_id = worker.track_id if worker.track_id is not None else (idx + 1)
            wx1, wy1, wx2, wy2 = worker.box
            w_width = max(1, wx2 - wx1)
            w_height = max(1, wy2 - wy1)
            aspect_ratio = w_height / float(w_width)

            # Camera Angle & Foreshortening Adaptation:
            # Steep ceiling-mount CCTV cameras (45-60 deg) compress height,
            # so the head zone expands downward and torso compresses.
            if aspect_ratio < 1.6:
                # Top-down / steep high-angle view
                camera_angle = "OVERHEAD_BIRD_EYE"
                head_zone = [wx1, wy1, wx2, wy1 + int(w_height * 0.45)]
                torso_zone = [wx1, wy1 + int(w_height * 0.20), wx2, wy1 + int(w_height * 0.90)]
                feet_zone = [wx1, wy1 + int(w_height * 0.60), wx2, wy2]
            elif aspect_ratio < 2.2:
                # Oblique lateral angle
                camera_angle = "LATERAL_SIDE"
                head_zone = [wx1, wy1, wx2, wy1 + int(w_height * 0.38)]
                torso_zone = [wx1, wy1 + int(w_height * 0.18), wx2, wy1 + int(w_height * 0.82)]
                feet_zone = [wx1, wy1 + int(w_height * 0.65), wx2, wy2]
            else:
                # Standard frontal eye-level perspective
                camera_angle = "FRONTAL_EYE_LEVEL"
                head_zone = [wx1, wy1, wx2, wy1 + int(w_height * 0.32)]
                torso_zone = [wx1, wy1 + int(w_height * 0.18), wx2, wy1 + int(w_height * 0.75)]
                feet_zone = [wx1, wy1 + int(w_height * 0.70), wx2, wy2]

            # First pass: map each gear item (and negative gear) to its best-matching worker
            gear_best_worker: Dict[int, int] = {}
            for g_idx, gear in enumerate(gear_items):
                canonical = self._normalize_gear_name(gear.class_name)
                neg_canonical = self._extract_negative_violation(gear.class_name)
                effective_gear = canonical or neg_canonical
                if effective_gear is None:
                    continue

                best_w_idx = None
                best_score = 0.0

                for w_idx, w_cand in enumerate(workers):
                    cx1, cy1, cx2, cy2 = w_cand.box
                    c_h = max(1, cy2 - cy1)
                    c_w = max(1, cx2 - cx1)
                    c_ar = c_h / float(c_w)
                    c_head_h = 0.45 if c_ar < 1.6 else (0.38 if c_ar < 2.2 else 0.32)

                    target_zone = w_cand.box
                    if effective_gear in {"helmet", "goggles"}:
                        target_zone = [cx1, cy1, cx2, cy1 + int(c_h * c_head_h)]
                    elif effective_gear == "vest":
                        target_zone = [cx1, cy1 + int(c_h * 0.16), cx2, cy1 + int(c_h * 0.82)]
                    elif effective_gear == "boots":
                        target_zone = [cx1, cy1 + int(c_h * 0.62), cx2, cy2]

                    inter_area = self._compute_intersection_area(gear.box, target_zone)
                    gear_area = max(1.0, float(gear.width * gear.height))
                    containment = inter_area / gear_area

                    if containment < self.min_containment_threshold:
                        full_inter = self._compute_intersection_area(gear.box, w_cand.box)
                        containment = full_inter / gear_area

                    if containment >= self.min_containment_threshold and containment > best_score:
                        best_score = containment
                        best_w_idx = w_idx

                if best_w_idx is not None:
                    gear_best_worker[g_idx] = best_w_idx

            # Second pass: assign worn gear and identify explicit negative violations
            worn_gear: Dict[str, PPEDetectionResult] = {}
            explicit_denials: Set[str] = set()

            for g_idx, gear in enumerate(gear_items):
                if gear_best_worker.get(g_idx) == idx:
                    canonical = self._normalize_gear_name(gear.class_name)
                    neg_canonical = self._extract_negative_violation(gear.class_name)

                    if canonical:
                        if canonical not in worn_gear or gear.confidence > worn_gear[canonical].confidence:
                            worn_gear[canonical] = gear
                    elif neg_canonical and gear.confidence >= 0.35:
                        # Direct model proof of missing gear (e.g. NO-Hardhat)
                        explicit_denials.add(neg_canonical)

            # Determine missing gear:
            # Missing if explicitly denied by model OR absent from worn gear
            missing_gear = []
            for req in required_ppe:
                req_canonical = self._normalize_gear_name(req) or req
                if req_canonical in explicit_denials:
                    missing_gear.append(req_canonical)
                    # Remove from worn_gear if low-confidence gear collided with explicit negative
                    worn_gear.pop(req_canonical, None)
                elif req_canonical not in worn_gear:
                    missing_gear.append(req_canonical)

            compliance_results.append(
                WorkerCompliance(
                    worker_id=worker_id,
                    box=worker.box,
                    required_ppe=required_ppe,
                    worn_ppe=worn_gear,
                    missing_ppe=sorted(list(set(missing_gear))),
                    camera_angle=camera_angle,
                )
            )

        return compliance_results
