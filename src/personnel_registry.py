"""
Personnel Registry & Role-Based Electrical Industry Profile Management.
Maps worker detections to names, designations, employee IDs, and sector-specific PPE requirements.
Specialized for Electrical Substations, High-Voltage Transmission, and Utility Operations.
Includes Department Wayfinding Navigation and Safety Remedy Directives.
"""

from typing import Dict, Any, List, Optional
import random


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
        remedy_guidance: str = "",
        sector: str = "Electrical"
    ):
        self.emp_id = emp_id
        self.name = name
        self.role = role
        self.department = department
        if emp_id.startswith("CONST"):
            self.sector = "Construction"
        elif emp_id.startswith("CHEM"):
            self.sector = "Chemical"
        elif emp_id.startswith("EXEC"):
            self.sector = "Executive"
        else:
            self.sector = sector or "Electrical"
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
            "sector": self.sector,
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
        "ELEC-1288": PersonnelProfile(
            emp_id="ELEC-1288",
            name="Suresh Verma",
            role="Circuit Breaker Overhaul Specialist",
            department="Switchgear Maintenance & Reliability",
            is_executive=False,
            required_ppe=["helmet", "vest", "goggles", "gloves"],
            access_clearance="Level 3 - Live Busbar Certified",
            avatar_color="#38bdf8",
            destination_department="Circuit Breaker Testing Yard (Zone C)",
            guidance_route="Proceed through Turnstile 1 -> Walk down West Safety Aisle to Breaker Yard C.",
            remedy_guidance="Equip arc-flash shield goggles and insulated gloves at Kiosk #2."
        ),
        "ELEC-1310": PersonnelProfile(
            emp_id="ELEC-1310",
            name="Pooja Nair",
            role="Substation Operations & Safety Officer",
            department="Grid Safety & Incident Prevention",
            is_executive=False,
            required_ppe=["helmet", "vest"],
            access_clearance="Level 2 - Operational Safety Officer",
            avatar_color="#f43f5e",
            destination_department="Floor Safety Coordination Center (Bay 1)",
            guidance_route="Proceed through Turnstile 1 -> Follow Red Safety Pathway to Coordination Office.",
            remedy_guidance="Collect high-vis vest and helmet at Gate 1 Reception."
        ),
        "ELEC-1342": PersonnelProfile(
            emp_id="ELEC-1342",
            name="Deepak Joshi",
            role="Overhead Transmission Line Tech",
            department="Transmission Tower Lines",
            is_executive=False,
            required_ppe=["helmet", "vest", "goggles", "gloves"],
            access_clearance="Level 3 - Tower Rigging & Climbing Certified",
            avatar_color="#10b981",
            destination_department="Tower Rigging Equipment Bay (Sector 4)",
            guidance_route="Proceed through Turnstile 1 -> Follow Perimeter Road 200m to Sector 4 Rigging Staging Area.",
            remedy_guidance="Collect climbing dielectric gloves and helmet at Kiosk #2."
        ),
        "ELEC-1375": PersonnelProfile(
            emp_id="ELEC-1375",
            name="Ananya Sen",
            role="Transformer Oil Diagnostics Chemist",
            department="Substation Chemical & Dielectric Lab",
            is_executive=False,
            required_ppe=["helmet", "vest", "goggles", "gloves"],
            access_clearance="Level 2 - Chemical Diagnostics Lab Cleared",
            avatar_color="#a855f7",
            destination_department="Dielectric Oil Analysis Laboratory",
            guidance_route="Proceed through Turnstile 1 -> Turn Left into Laboratory Annex (Room L-02).",
            remedy_guidance="Equip chemical dielectric goggles and gloves at Dispenser Kiosk #2."
        ),
        "ELEC-1401": PersonnelProfile(
            emp_id="ELEC-1401",
            name="Rahul Deshmukh",
            role="Medium-Voltage Distribution Cable Tech",
            department="Distribution Network Operations",
            is_executive=False,
            required_ppe=["helmet", "vest", "goggles", "gloves"],
            access_clearance="Level 2 - Distribution Bay",
            avatar_color="#f97316",
            destination_department="Medium-Voltage Feeders Vault (Bay 2)",
            guidance_route="Proceed through Turnstile 1 -> Follow Orange Guide Markings to Bay 2 Vault.",
            remedy_guidance="Collect gloves and goggles at Kiosk #2 before entry."
        ),
        "ELEC-1430": PersonnelProfile(
            emp_id="ELEC-1430",
            name="Sanjay Gupta",
            role="Busbar Protection & Metering Tech",
            department="Protection & Control Bay",
            is_executive=False,
            required_ppe=["helmet", "vest", "goggles", "gloves"],
            access_clearance="Level 3 - Live Busbar Certified",
            avatar_color="#0ea5e9",
            destination_department="Busbar Marshalling Kiosk Enclosure",
            guidance_route="Proceed through Turnstile 1 -> Proceed straight 80m to Busbar Enclosure.",
            remedy_guidance="Collect dielectric gear at Kiosk #2."
        ),
        # Chemical Engineering & Hazmat Operations
        "CHEM-2045": PersonnelProfile(
            emp_id="CHEM-2045",
            name="Dr. Priya Sengupta",
            role="Senior Chemical Process Engineer",
            department="Petrochemical Reactor & Olefin Unit",
            is_executive=False,
            required_ppe=["chemical_suit", "chemical_respirator", "chemical_gloves", "chemical_boots"],
            access_clearance="Level 4 - Toxic & Corrosive Chemical Certified",
            avatar_color="#059669",
            destination_department="Reactor Unit R-402 (Hazard Zone C)",
            guidance_route="Proceed through Air-Lock Gate 2 -> Enter Chemical Decontamination Corridor -> Access Reactor Unit R-402.",
            remedy_guidance="Equip Tychem Chemical Splash Suit, Full-Face Gas Mask, Nitrile Gauntlets, and Acid Gumboots at Hazmat Kiosk #4."
        ),
        "CHEM-2088": PersonnelProfile(
            emp_id="CHEM-2088",
            name="Arun Nair",
            role="Hazmat Acid Wash & Neutralization Tech",
            department="Acid Transfer & Scrubber Operations",
            is_executive=False,
            required_ppe=["chemical_suit", "chemical_respirator", "chemical_gloves", "chemical_boots"],
            access_clearance="Level 3 - Corrosive Acid Bay Certified",
            avatar_color="#10b981",
            destination_department="Acid Neutralization Bay 1 (Corrosive Zone)",
            guidance_route="Proceed through Air-Lock Gate 2 -> Follow Yellow Chemical Trench to Acid Scrubber Bay 1.",
            remedy_guidance="Collect acid-resistant Tychem suit, cartridge respirator, and butyl gloves at Hazmat Safety Dispenser #4."
        ),
        # Construction & Structural Engineering Operations
        "CONST-3081": PersonnelProfile(
            emp_id="CONST-3081",
            name="Arjun Deshmukh",
            role="High-Rise Scaffolding & Rigging Lead",
            department="Civil Structural & Scaffolding Division",
            is_executive=False,
            required_ppe=["helmet", "vest", "boots", "gloves", "safety_harness"],
            access_clearance="Level 3 - Work-at-Height & Scaffolding Certified",
            avatar_color="#e11d48",
            destination_department="Tower Crane & Scaffolding Sector 7",
            guidance_route="Proceed through Turnstile 1 -> Follow Orange Perimeter Pathway to Tower Scaffolding Sector 7.",
            remedy_guidance="Collect Class III Full-Body Fall Arrest Harness, Hardhat, and High-Traction Boots at Rigging Kiosk #3."
        ),
        "CONST-3120": PersonnelProfile(
            emp_id="CONST-3120",
            name="Kavita Reddy",
            role="Structural Steel & Heavy Fabrication Welder",
            department="Heavy Fabrication & Arc-Welding Bay",
            sector="Construction",
            is_executive=False,
            required_ppe=["helmet", "vest", "boots", "gloves", "welding_shield"],
            access_clearance="Level 3 - Hot Work & Arc Radiation Certified",
            avatar_color="#d97706",
            destination_department="Fabrication Bay 5 (Hot Work Zone)",
            guidance_route="Proceed through Turnstile 1 -> Walk down East Fabrication Aisle to Welding Bay 5.",
            remedy_guidance="Collect auto-darkening welding shield, leather welding gauntlets, and steel-toe boots at Kiosk #3."
        ),
        "CONST-3155": PersonnelProfile(
            emp_id="CONST-3155",
            name="Ramesh Yadav",
            role="Civil Foundation & Structural Concrete Foreman",
            department="Civil Structural & Site Concrete Works",
            sector="Construction",
            is_executive=False,
            required_ppe=["helmet", "vest", "boots", "gloves"],
            access_clearance="Level 2 - Heavy Civil Construction Floor",
            avatar_color="#ea580c",
            destination_department="Foundation Poured Bay Sector 4",
            guidance_route="Proceed through Turnstile 1 -> Follow North Construction Road to Foundation Poured Bay Sector 4.",
            remedy_guidance="Equip heavy-duty construction hardhat, high-vis vest, and steel-toe work boots at Kiosk #3."
        ),
        "CONST-3190": PersonnelProfile(
            emp_id="CONST-3190",
            name="Vikram Solanki",
            role="Tower Crane & Work-at-Height Specialist",
            department="Heavy Lifting & Crane Rigging Sector",
            sector="Construction",
            is_executive=False,
            required_ppe=["helmet", "vest", "boots", "gloves", "safety_harness"],
            access_clearance="Level 3 - Tower Crane & Work-at-Height Certified",
            avatar_color="#c026d3",
            destination_department="Tower Crane TC-02 Base Station",
            guidance_route="Proceed through Turnstile 1 -> Route along Orange Safety Striping to Tower Crane TC-02.",
            remedy_guidance="Collect ANSI-compliant Class III Full-Body Fall Arrest Harness at Rigging Kiosk #3."
        ),
        "CONST-3240": PersonnelProfile(
            emp_id="CONST-3240",
            name="Anil Chaudhary",
            role="Heavy Earthmoving & Demolition Operator",
            department="Civil Earthwork & Excavation Division",
            sector="Construction",
            is_executive=False,
            required_ppe=["helmet", "vest", "boots", "goggles", "gloves"],
            access_clearance="Level 2 - Heavy Equipment Operations",
            avatar_color="#ca8a04",
            destination_department="Excavation & Trenching Sector 2",
            guidance_route="Proceed through Turnstile 1 -> Proceed to Heavy Equipment Marshalling Yard Sector 2.",
            remedy_guidance="Equip impact goggles, heavy leather gloves, and steel-toe boots at Kiosk #3."
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
        3: "CHEM-2045",
        4: "CONST-3081",
        5: "EXEC-0012",
        6: "EXEC-0045",
        7: "CHEM-2088",
        8: "CONST-3120",
        9: "ELEC-1288",
        10: "ELEC-1310",
        11: "ELEC-1109",
        12: "ELEC-1145",
        101: "ELEC-1041",
        102: "CHEM-2045",
        103: "CONST-3081",
        104: "EXEC-0012"
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

    def get_random_profile(self, exclude_emp_id: Optional[str] = None) -> PersonnelProfile:
        """Randomly select an Indian worker profile from the plant registry."""
        worker_keys = [k for k in self.registry.keys() if not self.registry[k].is_executive]
        if not worker_keys:
            worker_keys = list(self.registry.keys())

        if exclude_emp_id and len(worker_keys) > 1 and exclude_emp_id in worker_keys:
            candidates = [k for k in worker_keys if k != exclude_emp_id]
        else:
            candidates = worker_keys

        chosen_key = random.choice(candidates)
        return self.registry[chosen_key]

    def list_all_profiles(self) -> List[Dict[str, Any]]:
        return [p.to_dict() for p in self.registry.values()]


# Global registry singleton
personnel_registry = PersonnelRegistry()
