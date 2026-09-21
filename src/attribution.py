"""
Spatial Attribution Module for Raksha Kavach.
Binds detected safety equipment (helmets, vests, boots, gloves) to specific
individual workers using geometric anatomical region intersection (IoU/IoA).
"""

from typing import List, Dict, Set, Any, Optional
from src.detect_ppe import PPEDetectionResult


class WorkerCompliance:
    """Represents compliance assessment for an individual worker."""

    def __init__(
        self,
        worker_id: int,
        box: List[int],
        required_ppe: Set[str],
        worn_ppe: Dict[str, PPEDetectionResult],
        missing_ppe: List[str],
    ):
        self.worker_id = worker_id
        self.box = box  # [x1, y1, x2, y2]
        self.required_ppe = required_ppe
        self.worn_ppe = worn_ppe  # {gear_name: PPEDetectionResult}
        self.missing_ppe = missing_ppe  # ['helmet', 'vest', etc.]
        self.is_compliant = len(missing_ppe) == 0

    @property
    def violations(self) -> List[str]:
        return [f"missing_{gear}" for gear in self.missing_ppe]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "worker_id": self.worker_id,
            "box": self.box,
            "is_compliant": self.is_compliant,
            "worn_ppe": list(self.worn_ppe.keys()),
            "missing_ppe": self.missing_ppe,
            "violations": self.violations,
        }


class SpatialAttributor:
    """Matches detected gear to corresponding human bounding boxes."""

    # Gear category normalizations
    HELMET_ALIASES = {"helmet", "hard_hat", "hard-hat", "hat", "cap"}
    VEST_ALIASES = {"vest", "safety_vest", "safety-vest", "reflective_jacket"}
    BOOTS_ALIASES = {"boots", "safety_boots", "shoes"}
    GLOVES_ALIASES = {"gloves", "safety_gloves"}
    GOGGLES_ALIASES = {"goggles", "safety_glasses"}

    def __init__(self, min_containment_threshold: float = 0.25):
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
        name = class_name.lower().strip()
        if name in cls.HELMET_ALIASES:
            return "helmet"
        if name in cls.VEST_ALIASES:
            return "vest"
        if name in cls.BOOTS_ALIASES:
            return "boots"
        if name in cls.GLOVES_ALIASES:
            return "gloves"
        if name in cls.GOGGLES_ALIASES:
            return "goggles"
        return None

    def attribute(
        self,
        detections: List[PPEDetectionResult],
        required_ppe: Set[str],
    ) -> List[WorkerCompliance]:
        """
        Partition detections into workers and safety gear, then match gear to each worker.
        """
        workers: List[PPEDetectionResult] = []
        gear_items: List[PPEDetectionResult] = []
        explicit_violations: Dict[int, List[str]] = {}

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
            w_height = max(1, wy2 - wy1)

            # Define expected anatomical zones within worker bounding box
            head_zone = [wx1, wy1, wx2, wy1 + int(w_height * 0.32)]
            torso_zone = [wx1, wy1 + int(w_height * 0.18), wx2, wy1 + int(w_height * 0.75)]
            feet_zone = [wx1, wy1 + int(w_height * 0.70), wx2, wy2]

            worn_gear: Dict[str, PPEDetectionResult] = {}

            # Match detected gear to this worker
            for gear in gear_items:
                canonical = self._normalize_gear_name(gear.class_name)
                if canonical is None:
                    continue

                # Check spatial overlap with the corresponding body segment
                target_zone = worker.box  # fallback full person box
                if canonical == "helmet" or canonical == "goggles":
                    target_zone = head_zone
                elif canonical == "vest":
                    target_zone = torso_zone
                elif canonical == "boots":
                    target_zone = feet_zone

                inter_area = self._compute_intersection_area(gear.box, target_zone)
                gear_area = max(1.0, float(gear.width * gear.height))
                containment = inter_area / gear_area

                # If gear overlaps target region with sufficient confidence
                if containment >= self.min_containment_threshold:
                    if canonical not in worn_gear or gear.confidence > worn_gear[canonical].confidence:
                        worn_gear[canonical] = gear

            # Determine missing gear based on zone requirements
            missing_gear = []
            for req in required_ppe:
                req_canonical = self._normalize_gear_name(req) or req
                if req_canonical not in worn_gear:
                    missing_gear.append(req_canonical)

            compliance_results.append(
                WorkerCompliance(
                    worker_id=worker_id,
                    box=worker.box,
                    required_ppe=required_ppe,
                    worn_ppe=worn_gear,
                    missing_ppe=sorted(missing_gear),
                )
            )

        return compliance_results
