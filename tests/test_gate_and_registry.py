# pyrefly: ignore [missing-import]
import pytest
import numpy as np
from src.personnel_registry import personnel_registry  # pyrefly: ignore [missing-import]
from src.entry_gate import smart_entry_gatekeeper  # pyrefly: ignore [missing-import]


class TestPersonnelAndGatekeeper:
    def test_personnel_registry_lookups(self):
        worker = personnel_registry.get_profile_by_emp_id("ELEC-1041")
        assert worker is not None
        assert worker.name == "Rajesh Sharma"
        assert worker.role == "Senior High-Voltage Lineman"
        assert worker.is_executive is False
        assert "gloves" in worker.required_ppe
        assert "goggles" in worker.required_ppe

        exec_profile = personnel_registry.get_profile_by_emp_id("EXEC-0012")
        assert exec_profile is not None
        assert exec_profile.is_executive is True
        assert "Priya" in exec_profile.name

    def test_gatekeeper_compliant_entry(self):
        # Worker with all required electrical gear
        res = smart_entry_gatekeeper.evaluate_entry(
            track_id=1,  # Rajesh Sharma
            detected_ppe=["helmet", "vest", "goggles", "gloves"],
            manual_contraband_check=[]
        )
        assert res["access_status"] == "ENTERED"
        assert res["turnstile_unlocked"] is True
        assert len(res["missing_ppe"]) == 0
        assert res["shield_admin_block"] is True
        assert res["name"] == "Rajesh Sharma"

    def test_gatekeeper_missing_ppe_entry_blocked(self):
        # Worker missing insulated gloves and goggles
        res = smart_entry_gatekeeper.evaluate_entry(
            track_id=1,  # Rajesh Sharma
            detected_ppe=["helmet", "vest"],  # missing goggles, gloves
            manual_contraband_check=[]
        )
        assert res["access_status"] == "ACCESS_DENIED"
        assert res["turnstile_unlocked"] is False
        assert "gloves" in res["missing_ppe"]
        assert "goggles" in res["missing_ppe"]
        assert "ENTRY BLOCKED" in res["decision_message"]

    def test_gatekeeper_contraband_intercept(self):
        # Worker carrying knife / cigarette
        res = smart_entry_gatekeeper.evaluate_entry(
            track_id=1,
            detected_ppe=["helmet", "vest", "goggles", "gloves"],
            manual_contraband_check=["knife"]
        )
        assert res["access_status"] == "SECURITY_INTERCEPT"
        assert res["turnstile_unlocked"] is False
        assert "knife" in res["contraband_detected"]
        assert res["severity"] == "Critical"

    def test_executive_entry_policy(self):
        # Executive visitor walkthrough
        res = smart_entry_gatekeeper.evaluate_entry(
            track_id=5,  # Dr. Priya Verma
            detected_ppe=["helmet", "vest"],
            manual_contraband_check=[]
        )
        assert res["is_executive"] is True
        assert res["access_status"] == "ENTERED"
        assert res["turnstile_unlocked"] is True
