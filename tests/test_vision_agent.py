# pyrefly: ignore [missing-import]
import pytest
import numpy as np
from src.vision_agent import MultiLevelSafetyAgent  # pyrefly: ignore [missing-import]


class TestMultiLevelSafetyAgent:
    @pytest.fixture
    def agent(self):
        return MultiLevelSafetyAgent()

    def test_architecture_metadata(self, agent):
        arch = agent.get_system_architecture()
        assert arch["system_name"] == "Raksha Kavach Multi-Level Safety Intelligence Engine"
        assert len(arch["levels"]) == 3
        assert arch["levels"][0]["level"] == 1
        assert arch["levels"][1]["level"] == 2
        assert arch["levels"][2]["level"] == 3

    def test_compliant_worker_reasoning(self, agent):
        res = agent.analyze_safety_compliance(
            worker_id=1,
            zone_name="Assembly Line 1",
            missing_ppe=[],
            hazards=[]
        )
        assert res["ok"] is True
        assert res["is_compliant"] is True
        assert res["risk_index"] == 1.0
        assert "FULLY COMPLIANT" in res["regulatory_status"]

    def test_ppe_violation_reasoning(self, agent):
        res = agent.analyze_safety_compliance(
            worker_id=42,
            zone_name="Welding Bay 3",
            missing_ppe=["helmet", "vest"]
        )
        assert res["ok"] is True
        assert res["is_compliant"] is False
        assert res["risk_index"] >= 5.0
        assert any("1910.135" in cite for cite in res["citations"])
        assert any("107" in cite or "1910.132" in cite for cite in res["citations"])
        assert "42" in res["announcement_text"]
        assert len(res["capa_recommendation"]) > 0

    def test_thermal_hazard_reasoning(self, agent):
        res = agent.analyze_safety_compliance(
            worker_id=None,
            zone_name="Solvent Storage",
            hazards=["fire"],
            violation_type="Active Thermal Flare"
        )
        assert res["ok"] is True
        assert res["is_compliant"] is False
        assert res["risk_index"] >= 7.0
        assert any("NFPA 10" in cite for cite in res["citations"])
        assert "EVACUATION" in res["dispatch_action"]

    def test_spectral_inspector_fallback(self, agent):
        # Blank black crop
        black_crop = np.zeros((100, 100, 3), dtype=np.uint8)
        spec = agent.inspect_spectral_features(black_crop)
        assert spec["has_vest"] is False
        assert spec["has_helmet"] is False

        # Neon yellow fluorescent crop (simulating high-vis vest)
        neon_crop = np.full((100, 100, 3), (30, 240, 240), dtype=np.uint8)
        spec_neon = agent.inspect_spectral_features(neon_crop)
        assert spec_neon["vest_score"] > 0

    def test_crop_verification_fallback(self, agent):
        # Base64 encoded test crop (50x50 green crop)
        sample_img = np.full((50, 50, 3), (50, 200, 50), dtype=np.uint8)
        import cv2, base64
        _, buf = cv2.imencode(".jpg", sample_img)
        b64_str = base64.b64encode(buf).decode("utf-8")

        res = agent.verify_crop(b64_str, worker_id=7, flagged_missing=["vest"])
        assert res["ok"] is True
        assert res["verified"] is True
        assert "engine" in res
        assert "raw_reasoning" in res

    def test_vlm_parser_structure(self, agent):
        sample_vlm_text = (
            "VEST: PRESENT\n"
            "HELMET: MISSING\n"
            "VERDICT: VIOLATION\n"
            "REASON: Worker is wearing a neon vest with reflective tape, but bare head is visible."
        )
        parsed = agent._parse_vlm_text(sample_vlm_text, worker_id=3)
        assert parsed["is_vest_present"] is True
        assert parsed["is_helmet_present"] is False
        assert parsed["is_compliant"] is False
        assert "bare head" in parsed["raw_reasoning"]
