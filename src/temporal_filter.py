"""
Temporal Smoothing and False-Positive Suppression Module for Raksha Kavach.
Ensures violations and fire hazards persist across multiple consecutive frames
before elevating from Candidate to Confirmed Incident.
"""

from typing import Dict, List, Any, Optional, Set, Tuple
import time


class TemporalFilter:
    """
    Maintains detection history over a sliding window of frames.
    Suppresses transient sensor noise, occlusions, and single-frame model false alarms.
    """

    def __init__(
        self,
        ppe_consecutive_threshold: int = 3,
        hazard_consecutive_threshold: int = 2,
        history_ttl_seconds: float = 8.0,
    ):
        self.ppe_threshold = ppe_consecutive_threshold
        self.hazard_threshold = hazard_consecutive_threshold
        self.ttl = history_ttl_seconds

        # Maps track_key -> {"count": int, "first_seen": float, "last_seen": float, "confirmed": bool, "details": dict}
        self._ppe_candidates: Dict[str, Dict[str, Any]] = {}
        self._hazard_candidates: Dict[str, Dict[str, Any]] = {}

    def update_worker_violations(
        self,
        worker_violations: List[Dict[str, Any]],
        zone_id: str,
    ) -> List[Dict[str, Any]]:
        """
        Process current frame worker violations.
        Returns only violations that meet the temporal persistence criteria.
        """
        now = time.time()
        active_keys: Set[str] = set()
        confirmed_violations: List[Dict[str, Any]] = []

        for item in worker_violations:
            worker_id = item.get("worker_id", "anon")
            violation_type = item.get("violation", "unknown")
            key = f"{zone_id}:{worker_id}:{violation_type}"
            active_keys.add(key)

            if key not in self._ppe_candidates:
                self._ppe_candidates[key] = {
                    "count": 1,
                    "first_seen": now,
                    "last_seen": now,
                    "confirmed": False,
                    "details": item,
                }
            else:
                entry = self._ppe_candidates[key]
                entry["count"] += 1
                entry["last_seen"] = now
                entry["details"] = item

                # Check if threshold reached
                if entry["count"] >= self.ppe_threshold:
                    entry["confirmed"] = True
                    confirmed_item = dict(item)
                    confirmed_item["persistent_frames"] = entry["count"]
                    confirmed_item["duration_seconds"] = round(now - entry["first_seen"], 1)
                    confirmed_violations.append(confirmed_item)

        # Decay or purge inactive tracks
        stale_keys = []
        for key, entry in self._ppe_candidates.items():
            if key not in active_keys:
                # If missing from this frame, decrement or expire
                if (now - entry["last_seen"]) > self.ttl:
                    stale_keys.append(key)
                else:
                    entry["count"] = max(0, entry["count"] - 1)
                    if entry["count"] == 0:
                        stale_keys.append(key)

        for key in stale_keys:
            del self._ppe_candidates[key]

        return confirmed_violations

    def update_hazard_events(
        self,
        hazards: List[Dict[str, Any]],
        zone_id: str,
    ) -> List[Dict[str, Any]]:
        """
        Process detected fire/smoke events.
        Requires persistence across multiple sampled frames to avoid reflection false alarms.
        """
        now = time.time()
        active_keys: Set[str] = set()
        confirmed_hazards: List[Dict[str, Any]] = []

        for hazard in hazards:
            htype = hazard.get("hazard_type", "fire")
            key = f"{zone_id}:{htype}"
            active_keys.add(key)

            if key not in self._hazard_candidates:
                self._hazard_candidates[key] = {
                    "count": 1,
                    "first_seen": now,
                    "last_seen": now,
                    "confirmed": False,
                    "details": hazard,
                }
            else:
                entry = self._hazard_candidates[key]
                entry["count"] += 1
                entry["last_seen"] = now
                entry["details"] = hazard

                if entry["count"] >= self.hazard_threshold:
                    entry["confirmed"] = True
                    confirmed_item = dict(hazard)
                    confirmed_item["persistent_frames"] = entry["count"]
                    confirmed_item["duration_seconds"] = round(now - entry["first_seen"], 1)
                    confirmed_hazards.append(confirmed_item)

        # Clean stale hazard events
        stale_keys = []
        for key, entry in self._hazard_candidates.items():
            if key not in active_keys:
                if (now - entry["last_seen"]) > 3.0:  # Hazard cooldown
                    stale_keys.append(key)

        for key in stale_keys:
            del self._hazard_candidates[key]

        return confirmed_hazards
