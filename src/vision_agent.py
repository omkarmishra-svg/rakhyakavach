"""
Vision AI Agent Module for Raksha Kavach.
Integrates Multi-Modal Vision API (Gemini / OpenAI) to perform secondary
verification on cropped worker images, overriding false negative missing-PPE alerts.
"""

import os
import base64
from typing import Dict, Any, List, Optional

# Check available vision SDKs
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False


class VisionAIAgent:
    """
    Multi-Modal Vision AI Verification Agent.
    Inspects worker crops with LLM/VLM reasoning to confirm vest & helmet presence.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY")
        self.enabled = bool(self.api_key and GEMINI_AVAILABLE)

        if self.enabled and GEMINI_AVAILABLE:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel("gemini-1.5-flash")
        else:
            self.model = None

    def verify_crop(self, image_base64: str, worker_id: int, flagged_missing: List[str]) -> Dict[str, Any]:
        """
        Send worker crop to Gemini 1.5 Flash / Vision API for zero-false-alarm verification.
        """
        if not self.enabled or not self.model:
            return {
                "verified": False,
                "reason": "Vision API Key not configured. Using local multi-spectral verification.",
                "api_active": False
            }

        try:
            # Format image payload
            if "," in image_base64:
                image_base64 = image_base64.split(",", 1)[1]

            image_bytes = base64.b64decode(image_base64)

            prompt = (
                f"You are a certified industrial safety inspector. Examine this cropped image of Worker #{worker_id}.\n"
                f"The automated system flagged the following potential missing PPE: {', '.join(flagged_missing)}.\n"
                f"Inspect carefully: Is the person wearing a safety vest (high-vis jacket, reflective vest, green/yellow/orange vest)? "
                f"Is the person wearing a hardhat/helmet?\n"
                f"Note: Account for female/male body shapes, fitted vest cuts, reflective stripes, and shadows.\n"
                f"Reply in format:\n"
                f"VEST: [PRESENT / MISSING]\n"
                f"HELMET: [PRESENT / MISSING]\n"
                f"VERDICT: [COMPLIANT / VIOLATION]\n"
                f"REASON: [Short sentence]"
            )

            response = self.model.generate_content([
                prompt,
                {"mime_type": "image/jpeg", "data": image_bytes}
            ])

            text = response.text.strip()
            is_vest_present = "VEST: PRESENT" in text.upper()
            is_helmet_present = "HELMET: PRESENT" in text.upper()
            is_compliant = "VERDICT: COMPLIANT" in text.upper() or (is_vest_present and is_helmet_present)

            return {
                "verified": True,
                "is_compliant": is_compliant,
                "is_vest_present": is_vest_present,
                "is_helmet_present": is_helmet_present,
                "raw_reasoning": text,
                "api_active": True
            }

        except Exception as e:
            return {
                "verified": False,
                "reason": f"API Error: {str(e)}",
                "api_active": False
            }
