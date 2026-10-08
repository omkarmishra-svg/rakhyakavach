"""
Personnel Registry & Role-Based Electrical Industry Profile Management.
Maps worker detections to names, designations, employee IDs, and sector-specific PPE requirements.
Specialized for Electrical Substations, High-Voltage Transmission, and Utility Operations.
Includes Department Wayfinding Navigation and Safety Remedy Directives.
"""

from typing import Dict, Any, List, Optional


class PersonnelProfile:
    """Represents an employee profile in the plant registry."""

    def __init__(
        self,
        emp_id: str,
        name: str,
        role: str,
        department: str,
        is_executive: bool,
        required_ppe: List[str],
        access_clearance: str = "Level 2 - High Voltage Floor",
        avatar_color: str = "#3b82f6",
        destination_department: str = "",
        guidance_route: str = "",
        remedy_guidance: str = ""
    ):
        self.emp_id = emp_id
        self.name = name
        self.role = role
        self.department = department
        self.is_executive = is_executive
        self.required_ppe = [p.lower() for p in required_ppe]
        self.access_clearance = access_clearance
        self.avatar_color = avatar_color
        self.destination_department = destination_department or department
        self.guidance_route = guidance_route or "Proceed through Turnstile 1 -> Follow Main Walkway to Department"
        self.remedy_guidance = remedy_guidance or "Proceed to PPE Safety Dispenser Kiosk #2 opposite Turnstile 1 to equip missing gear."

    def to_dict(self) -> Dict[str, Any]:
        return {
            "emp_id": self.emp_id,
            "name": self.name,
            "role": self.role,
            "department": self.department,
            "destination_department": self.destination_department,
            "is_executive": self.is_executive,
            "required_ppe": self.required_ppe,
            "access_clearance": self.access_clearance,
            "avatar_color": self.avatar_color,
            "guidance_route": self.guidance_route,
            "remedy_guidance": self.remedy_guidance
        }


class PersonnelRegistry:
    """
    Central plant personnel registry with electrical industry role assignments,
    Indian demo profiles, department wayfinding, and administrative privilege boundaries.
    """

    DEFAULT_REGISTRY: Dict[str, PersonnelProfile] = {
        # Field Linemen & Substation Technicians (Indian demo profiles)
        "ELEC-1041": PersonnelProfile(
            emp_id="ELEC-1041",
            name="Rajesh Sharma",
            role="Senior High-Voltage Lineman",
            department="Grid Transmission & 66kV Substations",
            is_executive=False,
            required_ppe=["helmet", "vest", "goggles", "gloves"],
            access_clearance="Level 3 - Live Busbar & Switchgear Certified",
            avatar_color="#10b981",
            destination_department="Bay 3 Switchgear Enclosure (Zone A)",
            guidance_route="Proceed through Turnstile 1 -> Follow Yellow Safety Walkway 100m -> Turn Right into Bay 3 High-Voltage Enclosure.",
            remedy_guidance="Reroute to Dispenser Kiosk #2 (15m East of Gate 1) to collect missing PPE before entering Bay 3."
        ),
        "ELEC-1082": PersonnelProfile(
            emp_id="ELEC-1082",
            name="Amit Patel",
            role="Substation Switchgear Electrician",
            department="Substation Bay Ops",
            is_executive=False,
            required_ppe=["helmet", "vest", "goggles", "gloves"],
            access_clearance="Level 3 - Live Busbar & Switchgear Certified",
            avatar_color="#06b6d4",
            destination_department="Substation Bay Ops (Room 102)",
            guidance_route="Proceed through Turnstile 1 -> Follow Blue Safety Corridor -> Enter Substation Bay Ops Room 102.",
            remedy_guidance="Reroute to Safety Equipment Dispenser Kiosk #2 opposite Turnstile 1 to collect missing Safety Goggles & Insulated Gloves."
        ),
        "ELEC-1109": PersonnelProfile(
            emp_id="ELEC-1109",
            name="Vikram Singh",
            role="Transformer Maintenance Specialist",
            department="High-Voltage Asset Reliability",
            is_executive=False,
            required_ppe=["helmet", "vest", "goggles", "gloves"],
            access_clearance="Level 2 - High Voltage Floor",
            avatar_color="#f59e0b",
            destination_department="Power Transformer Enclosure Pad 2",
            guidance_route="Proceed through Turnstile 1 -> Route North along Perimeter Walkway to Transformer Enclosure Pad 2.",
            remedy_guidance="Reroute to Dispenser Kiosk #2 for missing PPE before commencing transformer oil or core service."
        ),
        "ELEC-1145": PersonnelProfile(
            emp_id="ELEC-1145",
            name="Sunil Kumar",
            role="Underground Cable Jointer",
            department="Distribution Network Operations",
            is_executive=False,
            required_ppe=["helmet", "vest", "goggles", "gloves"],
            access_clearance="Level 2 - High Voltage Floor",
            avatar_color="#8b5cf6",
            destination_department="Underground Cable Tunnel Vault 4",
            guidance_route="Proceed through Turnstile 1 -> Descend Tunnel Stairwell B to Cable Gallery Vault 4.",
            remedy_guidance="Collect required dielectric insulated gear at Kiosk #2 before descending."
        ),
        "ELEC-1205": PersonnelProfile(
            emp_id="ELEC-1205",
            name="Sunita Rao",
            role="Substation Automation & SCADA Engineer",
            department="Grid Control & SCADA Automation",
            is_executive=False,
            required_ppe=["helmet", "vest"],
            access_clearance="Level 2 - SCADA & Control Room Cleared",
            avatar_color="#14b8a6",
            destination_department="Central SCADA Automation Control Room (Room 201)",
            guidance_route="Proceed through Turnstile 1 -> Follow Green Corridor to 2nd Floor SCADA Automation Control Center.",
            remedy_guidance="Collect safety vest and ESD gear at Kiosk #2 before entering server panels."
        ),
        "ELEC-1234": PersonnelProfile(
            emp_id="ELEC-1234",
            name="Manoj Kumar",
            role="Switchyard Protection & Relay Tech",
            department="Protection & Control Bay",
            is_executive=False,
            required_ppe=["helmet", "vest", "goggles", "gloves"],
            access_clearance="Level 3 - Protection Relay Certified",
            avatar_color="#eab308",
            destination_department="Relay Calibration & Testing Lab (Bay 4)",
            guidance_route="Proceed through Turnstile 1 -> Walk through Corridor 3 to Relay Testing Lab.",
            remedy_guidance="Collect arc-rated goggles and insulated gloves at Dispenser Kiosk #2."
        ),
        # Executive Leadership & Plant Directors
        "EXEC-0012": PersonnelProfile(
            emp_id="EXEC-0012",
            name="Dr. Priya Verma",
            role="Executive Vice President - Plant Operations",
            department="Corporate Engineering & EHS Council",
            is_executive=True,
            required_ppe=["helmet", "vest"],  # Visitor/Executive standard
            access_clearance="Executive - All Sectors with Safety Escort",
            avatar_color="#ec4899",
            destination_department="Executive Observation Deck & Floor Walkthrough",
            guidance_route="Proceed through Turnstile 1 -> Take Elevator 1 to 3rd Floor Observation Deck & Safety Overlook.",
            remedy_guidance="Collect executive visitor hardhat and high-vis vest at Gate 1 Reception Desk."
        ),
        "EXEC-0045": PersonnelProfile(
            emp_id="EXEC-0045",
            name="Siddharth Malhotra",
            role="Chief EHS Director",
            department="Executive Safety & Audit",
            is_executive=True,
            required_ppe=["helmet", "vest"],
            access_clearance="Executive - Global Safety Audit Clearance",
            avatar_color="#6366f1",
            destination_department="Central Safety Audit Command Suite",
            guidance_route="Proceed through Turnstile 1 -> Proceed to Central Safety Audit Command Suite (Building A).",
            remedy_guidance="Collect audit inspection gear at Gate 1 Reception Desk."
        )
    }

    # Track ID to Employee ID deterministic binding for edge vision continuity
    TRACK_MAPPING: Dict[int, str] = {
        1: "ELEC-1041",
        2: "ELEC-1082",
        3: "ELEC-1109",
        4: "ELEC-1145",
        5: "EXEC-0012",
        6: "EXEC-0045",
        7: "ELEC-1205",
        8: "ELEC-1234",
        101: "ELEC-1041",
        102: "ELEC-1082",
        103: "EXEC-0012"
    }

    def __init__(self):
        self.registry = dict(self.DEFAULT_REGISTRY)

    def get_profile_by_emp_id(self, emp_id: str) -> Optional[PersonnelProfile]:
        return self.registry.get(emp_id)

    def resolve_profile_by_track_id(self, track_id: Optional[int]) -> PersonnelProfile:
        """Resolve a vision bounding box track ID to an electrical personnel profile."""
        if track_id is not None and track_id in self.TRACK_MAPPING:
            emp_id = self.TRACK_MAPPING[track_id]
            return self.registry[emp_id]

        # Deterministic fallback by modulo of track ID
        keys = list(self.registry.keys())
        idx = (abs(track_id or 1) - 1) % len(keys)
        return self.registry[keys[idx]]

    def list_all_profiles(self) -> List[Dict[str, Any]]:
        return [p.to_dict() for p in self.registry.values()]


# Global registry singleton
personnel_registry = PersonnelRegistry()
