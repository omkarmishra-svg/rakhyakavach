"""
Unit and Integration Test Suite for Raksha Kavach.
Validates Spatial Attribution, Temporal Smoothing, Alert Rate-Limiting, and SQLite Logging.
"""

import os
import sys
import unittest
import numpy as np

# Ensure project root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.detect_ppe import PPEDetectionResult
from src.attribution import SpatialAttributor
from src.temporal_filter import TemporalFilter
from src.zones import ZoneManager, ZoneConfig
from src.alert import IncidentDatabase, AlertManager, IncidentRecord


class TestRakshaKavachPipeline(unittest.TestCase):

    def setUp(self):
        self.attributor = SpatialAttributor(min_containment_threshold=0.20)
        self.temporal_filter = TemporalFilter(ppe_consecutive_threshold=3, hazard_consecutive_threshold=2)
        self.zone_mgr = ZoneManager()
        self.test_db_path = "data/test_incidents.db"
        if os.path.exists(self.test_db_path):
            os.remove(self.test_db_path)
        self.db = IncidentDatabase(db_path=self.test_db_path)

    def tearDown(self):
        if os.path.exists(self.test_db_path):
            try:
                os.remove(self.test_db_path)
            except Exception:
                pass

    def test_spatial_attribution_compliant_worker(self):
        """Worker wearing helmet and vest in a zone requiring helmet and vest should be compliant."""
        worker_box = [100, 100, 200, 300]  # height = 200, width = 100
        # Helmet on head (top 25%)
        helmet_box = [110, 100, 190, 150]
        # Vest on torso (middle 50%)
        vest_box = [105, 140, 195, 240]

        detections = [
            PPEDetectionResult(worker_box, "person", 0.90, track_id=1),
            PPEDetectionResult(helmet_box, "helmet", 0.88),
            PPEDetectionResult(vest_box, "vest", 0.85),
        ]

        required_ppe = {"helmet", "vest"}
        results = self.attributor.attribute(detections, required_ppe)

        self.assertEqual(len(results), 1)
        worker = results[0]
        self.assertTrue(worker.is_compliant)
        self.assertEqual(len(worker.missing_ppe), 0)
        self.assertIn("helmet", worker.worn_ppe)
        self.assertIn("vest", worker.worn_ppe)

    def test_spatial_attribution_non_compliant_worker(self):
        """Worker missing helmet should be identified as non-compliant."""
        worker_box = [300, 100, 400, 300]
        vest_box = [305, 140, 395, 240]

        detections = [
            PPEDetectionResult(worker_box, "person", 0.92, track_id=2),
            PPEDetectionResult(vest_box, "vest", 0.87),
        ]

        required_ppe = {"helmet", "vest"}
        results = self.attributor.attribute(detections, required_ppe)

        self.assertEqual(len(results), 1)
        worker = results[0]
        self.assertFalse(worker.is_compliant)
        self.assertIn("helmet", worker.missing_ppe)
        self.assertEqual(worker.violations, ["missing_helmet"])

    def test_temporal_filter_smoothing(self):
        """Single-frame violation should NOT confirm; 3 consecutive frames SHOULD confirm."""
        zone_id = "zone_1"
        violation_frame = [{
            "worker_id": 10,
            "violation": "missing_helmet",
            "box": [100, 100, 200, 300],
        }]

        # Frame 1: Candidate (not confirmed)
        res1 = self.temporal_filter.update_worker_violations(violation_frame, zone_id)
        self.assertEqual(len(res1), 0)

        # Frame 2: Still candidate
        res2 = self.temporal_filter.update_worker_violations(violation_frame, zone_id)
        self.assertEqual(len(res2), 0)

        # Frame 3: Reached threshold of 3 -> Confirmed!
        res3 = self.temporal_filter.update_worker_violations(violation_frame, zone_id)
        self.assertEqual(len(res3), 1)
        self.assertEqual(res3[0]["violation"], "missing_helmet")
        self.assertEqual(res3[0]["persistent_frames"], 3)

    def test_alert_rate_limiting_and_db(self):
        """AlertManager should record into SQLite and throttle duplicate alerts during cooldown."""
        alert_mgr = AlertManager(
            db=self.db,
            snapshots_dir="data/test_snapshots",
            cooldown_seconds=30.0
        )

        test_frame = np.zeros((200, 200, 3), dtype=np.uint8)

        # First alert should trigger
        rec1 = alert_mgr.trigger_alert(
            frame=test_frame,
            zone_id="zone_1",
            zone_name="Heavy Machinery",
            violation_type="missing_helmet",
            severity="High",
            confidence=0.91,
            worker_id=5,
        )
        self.assertIsNotNone(rec1)

        # Immediate repeat should be suppressed by cooldown
        rec2 = alert_mgr.trigger_alert(
            frame=test_frame,
            zone_id="zone_1",
            zone_name="Heavy Machinery",
            violation_type="missing_helmet",
            severity="High",
            confidence=0.91,
            worker_id=5,
        )
        self.assertIsNone(rec2)

        # Verify incident was persisted into SQLite
        rows = self.db.get_recent_incidents()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["violation_type"], "missing_helmet")
        self.assertEqual(rows[0]["zone_name"], "Heavy Machinery")


if __name__ == "__main__":
    unittest.main()
