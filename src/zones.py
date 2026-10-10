"""
Zone Management and PPE Requirements Module for Raksha Kavach.
Defines industrial zones, camera mappings, and localized safety mandates.
"""

from typing import Dict, List, Set, Optional


class ZoneConfig:
    """Represents configuration rules for a specific factory zone."""

    def __init__(
        self,
        zone_id: str,
        name: str,
        required_ppe: List[str],
        risk_level: str = "Medium",
        description: str = "",
    ):
        self.zone_id = zone_id
        self.name = name
        self.required_ppe = set(p.lower() for p in required_ppe)
        self.risk_level = risk_level  # Low, Medium, High, Critical
        self.description = description

    def to_dict(self) -> dict:
        return {
            "zone_id": self.zone_id,
            "name": self.name,
            "required_ppe": sorted(list(self.required_ppe)),
            "risk_level": self.risk_level,
            "description": self.description,
        }


# Default pre-configured factory zones
DEFAULT_ZONES: Dict[str, ZoneConfig] = {
    "zone_1": ZoneConfig(
        zone_id="zone_1",
        name="Heavy Machinery & Fabrication",
        required_ppe=["helmet", "vest", "boots"],
        risk_level="High",
        description="Active overhead cranes, robotic weld cells, and stamping presses.",
    ),
    "zone_2": ZoneConfig(
        zone_id="zone_2",
        name="Loading Dock & Logistics",
        required_ppe=["helmet", "vest"],
        risk_level="Medium",
        description="Forklift thoroughfare and truck loading bays.",
    ),
    "zone_3": ZoneConfig(
        zone_id="zone_3",
        name="Electronics Assembly Line",
        required_ppe=["vest"],
        risk_level="Low",
        description="Manual component assembly, soldering stations.",
    ),
    "zone_4": ZoneConfig(
        zone_id="zone_4",
        name="Furnace & Chemical Storage",
        required_ppe=["helmet", "vest", "gloves", "boots"],
        risk_level="Critical",
        description="High heat and hazardous chemical storage. Strict PPE enforcement.",
    ),
    "zone_chem": ZoneConfig(
        zone_id="zone_chem",
        name="Petrochemical Reactor & Acid Wash Bay",
        required_ppe=["chemical_suit", "chemical_respirator", "chemical_gloves", "chemical_boots"],
        risk_level="Critical",
        description="Exothermic synthesis, volatile organic vapors, and corrosive acid wash. Full hazmat kit mandatory.",
    ),
    "zone_const": ZoneConfig(
        zone_id="zone_const",
        name="High-Rise Scaffolding & Rigging Bay",
        required_ppe=["helmet", "vest", "boots", "safety_harness", "gloves"],
        risk_level="Critical",
        description="Work at elevation exceeding 12m, suspended scaffolding, and overhead girder hoist paths.",
    ),
    "zone_weld": ZoneConfig(
        zone_id="zone_weld",
        name="Heavy Fabrication & Arc-Welding Bay",
        required_ppe=["helmet", "welding_shield", "gloves", "vest", "boots"],
        risk_level="High",
        description="High-amperage TIG/MIG welding, oxy-acetylene torches, molten spatter, and intense UV arc flash.",
    ),
    "zone_gate": ZoneConfig(
        zone_id="zone_gate",
        name="Smart Airlock & Gate 1 Entry",
        required_ppe=["helmet", "vest", "goggles", "gloves"],
        risk_level="High",
        description="Electrical & chemical personnel entry turnstile with automated multi-domain compliance screening.",
    ),
}

# Default Camera ID to Zone ID mapping
DEFAULT_CAMERA_MAP: Dict[str, str] = {
    "cam_01": "zone_1",
    "cam_02": "zone_2",
    "cam_03": "zone_3",
    "cam_04": "zone_4",
    "cam_chem": "zone_chem",
    "cam_const": "zone_const",
    "cam_weld": "zone_weld",
    "cam_gate": "zone_gate",
    "gate_01": "zone_gate",
    "gate": "zone_gate",
    "webcam": "zone_1",
    "demo_video": "zone_1",
}


class ZoneManager:
    """Manages zone definitions, camera assignments, and compliance rule lookups."""

    def __init__(self):
        self._zones: Dict[str, ZoneConfig] = dict(DEFAULT_ZONES)
        self._camera_map: Dict[str, str] = dict(DEFAULT_CAMERA_MAP)

    def get_zone_by_camera(self, camera_id: str) -> ZoneConfig:
        """Resolve a camera identifier to its assigned zone configuration."""
        cid = (camera_id or "").lower().strip()
        # Direct zone match
        if cid in self._zones:
            return self._zones[cid]
        # Exact camera map lookup
        zone_id = self._camera_map.get(cid)
        if zone_id and zone_id in self._zones:
            return self._zones[zone_id]
        # Flexible match for CCTV / Cam labels
        if "gate" in cid or "cam_04" in cid or "cctv 04" in cid or "cam 4" in cid or "gate_01" in cid:
            return self._zones.get("zone_gate", self._zones.get("zone_4", self._zones["zone_1"]))
        if "2" in cid or "bay2" in cid or "dock" in cid or "logistics" in cid:
            return self._zones.get("zone_2", self._zones["zone_1"])
        if "3" in cid or "bay3" in cid or "robot" in cid or "depot" in cid:
            return self._zones.get("zone_3", self._zones["zone_1"])
        if "1" in cid or "bay1" in cid or "fab" in cid:
            return self._zones.get("zone_1", self._zones["zone_1"])
        return self._zones["zone_1"]

    def get_zone(self, zone_id: str) -> Optional[ZoneConfig]:
        """Get zone config by zone_id."""
        return self._zones.get(zone_id)

    def get_all_zones(self) -> List[ZoneConfig]:
        """Return list of all configured zones."""
        return list(self._zones.values())

    def list_all_zones(self) -> List[ZoneConfig]:
        """Alias for get_all_zones."""
        return self.get_all_zones()

    @property
    def camera_to_zone(self) -> Dict[str, str]:
        """Expose camera-to-zone map dictionary."""
        return self._camera_map

    def update_zone_ppe(self, zone_id: str, required_ppe: List[str]):
        """Update required PPE items for a specific zone at runtime."""
        if zone_id in self._zones:
            self._zones[zone_id].required_ppe = set(p.lower() for p in required_ppe)

    def set_camera_zone(self, camera_id: str, zone_id: str):
        """Map camera to a different zone."""
        if zone_id in self._zones:
            self._camera_map[camera_id] = zone_id
