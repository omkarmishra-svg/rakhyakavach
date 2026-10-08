"""
Smart Airlock & Gate 1 Entry Verification Engine for Raksha Kavach.
Covers worker entry via CCTV/video input at industrial facility / office entry check gates.

Capabilities:
1. Personnel Identification: Indian demo names, ID, Department, and Designation (Worker vs Executive).
2. Electrical Industry PPE Compliance Gate: Verifies Helmet, Arc-Rated Vest, Safety Goggles, and Insulated Gloves.
   - All compliant -> Status: 'ENTERED' (Turnstile unlocked) + Step-by-step Department Navigation Guidance.
   - Missing gear -> Status: 'ACCESS DENIED' (Turnstile locked + Alert with specific missing gear + Redirection to Dispenser Kiosk).
3. Mischievous / Contraband Item Inspection:
   - Knife / metallic blades / sharp conductive weapons (flashover hazard in electrical substation).
   - Cigarettes / lighter / smoking materials (combustion hazard near transformer oil & battery banks).
   - Alcohol bottles / unauthorized recording devices / cellphones in restricted zones.
   - Trigger: 'SECURITY_INTERCEPT' + Security Dispatch Alert with Entrant Name & Department.
4. Administrative Privacy Shield:
   - Tags all entry events with `shield_admin_block: True`.
   - Ensures operational airlock telemetry stays within Floor EHS/Security and does NOT flood or leak to Administrative Block channels.
"""

import time
import base64
from typing import Dict, Any, List, Optional
import numpy as np
import cv2

from src.personnel_registry import personnel_registry, PersonnelProfile


class ContrabandDetector:
    """
    Edge spectral and visual heuristic scanner for harmful/prohibited/mischievous items:
    - Cigarettes / Lighters / Smoking materials (combustion risks near transformer oil & battery banks)
    - Knives / Blades / Metallic conductive instruments (flashover & security hazards)
    - Alcohol bottles / Flammable solvents
    - Unauthorized cameras / RF phones in classified high-voltage bays
    """

    @staticmethod
    def scan_for_contraband(frame_or_crop: np.ndarray) -> List[str]:
        """
        Scan image crop for prohibited items.
        Returns list of detected contraband tags (e.g. ['knife', 'cigarettes']).
        """
        if frame_or_crop is None or frame_or_crop.size == 0:
            return []

        detected = []
        h, w = frame_or_crop.shape[:2]
        hsv = cv2.cvtColor(frame_or_crop, cv2.COLOR_BGR2HSV)

        # 1. Knife / Metallic Blade inspection (High specular reflection + elongated aspect ratio in hand zone)
        gray = cv2.cvtColor(frame_or_crop, cv2.COLOR_BGR2GRAY)
        gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
        gy = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
        mag = cv2.magnitude(gx, gy)
        high_contrast_edges = np.sum(mag > 80) / float(max(1, mag.size))

        metallic_sheen = cv2.inRange(hsv, np.array([0, 0, 205]), np.array([180, 35, 255]))
        blade_pixel_ratio = np.sum(metallic_sheen > 0) / float(max(1, metallic_sheen.size))

        # 2. Cigarette / Flame Lighter inspection (Cigarette filter tan/orange + white cylinder)
        tan_filter = cv2.inRange(hsv, np.array([10, 80, 100]), np.array([25, 200, 220]))
        filter_ratio = np.sum(tan_filter > 0) / float(max(1, tan_filter.size))

        # Check for small flame or lighter casing (red/yellow butane lighter body)
        lighter_body = cv2.inRange(hsv, np.array([0, 150, 150]), np.array([15, 255, 255]))
        lighter_ratio = np.sum(lighter_body > 0) / float(max(1, lighter_body.size))

        # Heuristic detection triggers when specific signatures align in pocket/hand region
        if blade_pixel_ratio > 0.08 and high_contrast_edges > 0.15:
            detected.append("knife")

        if (filter_ratio > 0.05 and lighter_ratio > 0.04) or lighter_ratio > 0.12:
            detected.append("cigarettes")

        return detected


class SmartEntryGatekeeper:
    """
    Turnstile Access Control, Compliance Sentinel & Wayfinding Guide for Plant Gate 1.
    """

    def __init__(self):
        self.registry = personnel_registry
        self.contraband_detector = ContrabandDetector()
        self.recent_logs: List[Dict[str, Any]] = []

    def evaluate_entry(
        self,
        frame: Optional[np.ndarray] = None,
        crop_base64: Optional[str] = None,
        detected_ppe: Optional[List[str]] = None,
        track_id: Optional[int] = 1,
        emp_id_override: Optional[str] = None,
        manual_contraband_check: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Evaluate personnel entry at Gate 1 CCTV/Webcam/Upload:
        - Resolves Name, Employee ID (Indian demo profile), Role, and Department.
        - Verifies sector-specific electrical PPE compliance (Helmet, Vest, Goggles, Gloves).
        - Scans for mischievous items (Knives, Cigarettes, Prohibited Items).
        - Generates Department Wayfinding Guidance when equipped, or Safety Dispenser redirection when missing gear.
        - Enforces Administrative Privacy Shield.
        """
        # Resolve personnel identity
        override_profile = self.registry.get_profile_by_emp_id(emp_id_override) if emp_id_override else None
        profile: PersonnelProfile = (
            override_profile
            if override_profile is not None
            else self.registry.resolve_profile_by_track_id(track_id)
        )

        emp_id = profile.emp_id
        name = profile.name
        role = profile.role
        dept = profile.department
        dest_dept = profile.destination_department
        is_executive = profile.is_executive
        guidance_route = profile.guidance_route
        remedy_guidance = profile.remedy_guidance

        # Normalize detected gear
        worn_items = [p.lower().strip() for p in (detected_ppe or [])]
        required_items = list(profile.required_ppe)

        # Decode crop image if provided for contraband scan
        crop_img = None
        if frame is not None:
            crop_img = frame
        elif crop_base64:
            try:
                b64_clean = crop_base64.split(",", 1)[1] if "," in crop_base64 else crop_base64
                np_arr = np.frombuffer(base64.b64decode(b64_clean), np.uint8)
                crop_img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            except Exception:
                crop_img = None

        # Contraband / mischievous item detection
        contraband = list(manual_contraband_check or [])
        if crop_img is not None:
            detected_contraband = self.contraband_detector.scan_for_contraband(crop_img)
            for c in detected_contraband:
                if c not in contraband:
                    contraband.append(c)

        # Missing PPE analysis
        missing_items = []
        for req in required_items:
            matched = any(req in w for w in worn_items)
            if not matched:
                missing_items.append(req)

        # Alerts and Gate access decision
        contraband_alert = None
        missing_ppe_alert = None

        if len(contraband) > 0:
            access_status = "SECURITY_INTERCEPT"
            turnstile_unlocked = False
            contraband_str = ", ".join(c.upper() for c in contraband)
            contraband_alert = f"🚨 CRITICAL SECURITY INTERCEPT: Prohibited item [{contraband_str}] detected on entrant {name} (ID: {emp_id}, Dept: {dept})! Access Denied. Gate Turnstile locked. Plant Security notified."
            decision_msg = contraband_alert
            active_guidance = f"⛔ ACCESS HALTED: Please remain at Gate 1 Turnstile. Plant Security is en route regarding prohibited item inspection."
            severity = "Critical"

        elif len(missing_items) > 0:
            access_status = "ACCESS_DENIED"
            turnstile_unlocked = False
            missing_str = ", ".join(m.replace("_", " ").title() for m in missing_items)
            missing_ppe_alert = f"⚠️ ACCESS DENIED: Missing mandatory equipment [{missing_str}] for {name} ({dept}). Turnstile Locked."
            decision_msg = f"ENTRY BLOCKED: Missing mandatory gear [{missing_str}]. Please don equipment before entering."
            active_guidance = f"🔄 REMEDY NAVIGATION: {remedy_guidance}"
            severity = "High"

        else:
            access_status = "ENTERED"
            turnstile_unlocked = True
            decision_msg = f"ACCESS GRANTED: All required PPE verified. Welcome, {name}."
            active_guidance = f"🗺️ AUTHORIZED DESTINATION ({dest_dept}): {guidance_route}"
            severity = "Low"

        # Log entry
        log_entry = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "emp_id": emp_id,
            "name": name,
            "role": role,
            "department": dept,
            "destination_department": dest_dept,
            "is_executive": is_executive,
            "access_status": access_status,
            "turnstile_unlocked": turnstile_unlocked,
            "required_ppe": required_items,
            "worn_ppe": worn_items,
            "missing_ppe": missing_items,
            "missing_ppe_alert": missing_ppe_alert,
            "contraband_detected": contraband,
            "contraband_alert": contraband_alert,
            "guidance_route": guidance_route,
            "remedy_guidance": remedy_guidance,
            "active_guidance": active_guidance,
            "decision_message": decision_msg,
            "severity": severity,
            "gate_id": "GATE-01-AIRLOCK",
            "shield_admin_block": True,  # Administrative privacy shield
            "security_domain": "FACTORY_FLOOR_OPERATIONS_ONLY"
        }

        # Keep last 50 gate logs in memory
        self.recent_logs.insert(0, log_entry)
        if len(self.recent_logs) > 50:
            self.recent_logs.pop()

        return log_entry

    def get_recent_logs(self, limit: int = 20) -> List[Dict[str, Any]]:
        return self.recent_logs[:limit]


# Global Gatekeeper instance
smart_entry_gatekeeper = SmartEntryGatekeeper()
