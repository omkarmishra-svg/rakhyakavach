"""
Sentry Floor — FastAPI Backend Bridge & AI Inference Server
Connects the React frontend to the Raksha Kavach Python pipeline:
- Video file uploads (CCTV / MP4 / AVI)
- Real-time frame-by-frame YOLOv8 PPE & hazard detection
- RTSP / CCTV stream connector
- SQLite incident audit database & zone telemetry
"""

import os
import sys
import json
import time
import base64
import shutil
import datetime
import sqlite3
from typing import Dict, List, Any, Optional

import cv2
import numpy as np

# Add project root to path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__)))
sys.path.insert(0, PROJECT_ROOT)

try:
    from fastapi import FastAPI, HTTPException, UploadFile, File, Form
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import JSONResponse, FileResponse
    from pydantic import BaseModel
except ImportError:
    print("FastAPI not installed. Install with: pip install fastapi uvicorn python-multipart")
    sys.exit(1)

from src.zones import ZoneManager, DEFAULT_ZONES
from src.pipeline import SafetyPipeline

app = FastAPI(title="Sentry Floor AI Video & PPE Detection API", version="2.0.0")

# CORS for Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directories
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
UPLOADS_DIR = os.path.join(DATA_DIR, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

if os.path.isdir(DATA_DIR):
    app.mount("/data", StaticFiles(directory=DATA_DIR), name="data")

DB_PATH = os.path.join(DATA_DIR, "incidents.db")
zone_manager = ZoneManager()

# Initialize AI pipeline
pipeline = SafetyPipeline(sample_rate=1, ppe_conf_threshold=0.35)


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# Zone status simulation
ZONE_STATUS_OVERRIDES: Dict[str, str] = {
    "zone_3": "OK",
    "zone_2": "WARN",
    "zone_4": "FIRE",
    "zone_5": "OK",
    "zone_1": "WARN",
    "zone_6": "OK",
}

ZONE_WORKER_COUNTS: Dict[str, int] = {
    "zone_1": 5,
    "zone_2": 6,
    "zone_3": 14,
    "zone_4": 4,
    "zone_5": 8,
    "zone_6": 2,
}

ZONE_CAMERA_MAP: Dict[str, str] = {
    "zone_1": "CAM-02",
    "zone_2": "CAM-04",
    "zone_3": "CAM-03",
    "zone_4": "CAM-01",
    "zone_5": "CAM-05",
    "zone_6": "CAM-06",
}


@app.get("/api/telemetry")
def get_telemetry():
    """Return plant-wide telemetry and zone list for the frontend."""
    zones_data = []
    for zone_id, zone_cfg in DEFAULT_ZONES.items():
        zones_data.append({
            "zone_id": zone_id,
            "name": zone_cfg.name,
            "risk_level": zone_cfg.risk_level,
            "required_ppe": sorted(list(zone_cfg.required_ppe)),
            "worker_count": ZONE_WORKER_COUNTS.get(zone_id, 4),
            "status": ZONE_STATUS_OVERRIDES.get(zone_id, "OK"),
            "camera_id": ZONE_CAMERA_MAP.get(zone_id, f"CAM-{zone_id[-1:]}"),
            "description": zone_cfg.description,
        })

    total_workers = sum(ZONE_WORKER_COUNTS.values())
    compliant = int(total_workers * 0.942)

    return {
        "telemetry": {
            "compliance_pct": round(compliant / total_workers * 100, 1) if total_workers else 100,
            "active_warnings": sum(1 for s in ZONE_STATUS_OVERRIDES.values() if s == "WARN"),
            "critical_hazards": sum(1 for s in ZONE_STATUS_OVERRIDES.values() if s == "FIRE"),
            "cameras_online": len(ZONE_CAMERA_MAP),
            "total_cameras": len(ZONE_CAMERA_MAP),
            "active_workers": total_workers,
            "latency_ms": 24,
            "fps": 29.8,
        },
        "zones": zones_data,
    }


@app.get("/api/zones")
def get_zones():
    """Return all zone definitions."""
    all_zones = zone_manager.get_all_zones()
    return [z.to_dict() for z in all_zones]


@app.get("/api/incidents")
def get_incidents(limit: int = 50):
    """Return recent incidents from SQLite database."""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM incidents ORDER BY timestamp DESC LIMIT ?",
            (limit,)
        )
        rows = cursor.fetchall()
        conn.close()

        return [
            {
                "id": row["id"],
                "timestamp": row["timestamp"],
                "zone_id": row["zone_id"],
                "zone_name": row["zone_name"],
                "violation_type": row["violation_type"],
                "severity": row["severity"],
                "confidence": row["confidence"],
                "worker_id": row["worker_id"],
                "snapshot_path": row["snapshot_path"],
                "status": row["status"],
            }
            for row in rows
        ]
    except Exception as e:
        return []


class StatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None


@app.post("/api/incidents/{incident_id}/status")
def update_incident_status(incident_id: str, update: StatusUpdate):
    """Update incident status (Acknowledge, Escalate, Resolve)."""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE incidents SET status = ? WHERE id = ?",
            (update.status, incident_id)
        )
        conn.commit()
        conn.close()
        return {"ok": True, "incident_id": incident_id, "new_status": update.status}
    except Exception as e:
        return {"ok": False, "error": str(e)}


# ---------------- Video Upload & Footage Ingestion ----------------
@app.post("/api/upload-video")
async def upload_video(file: UploadFile = File(...)):
    """
    Allow any factory to upload their CCTV footage or recorded video.
    Saves to data/uploads/ and returns streamable URL.
    """
    try:
        clean_name = f"factory_{int(time.time())}_{file.filename}"
        save_path = os.path.join(UPLOADS_DIR, clean_name)

        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Also set as latest uploaded footage
        latest_path = os.path.join(DATA_DIR, "uploaded_factory_video.mp4")
        shutil.copy(save_path, latest_path)

        file_url = f"/data/uploads/{clean_name}"
        return {
            "ok": True,
            "filename": file.filename,
            "url": file_url,
            "latest_url": "/data/uploaded_factory_video.mp4",
            "message": f"Footage '{file.filename}' uploaded successfully."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------- Real-time Frame Analysis (YOLOv8 PPE + Spatial Attribution) ----------------
class FrameAnalysisRequest(BaseModel):
    image: str  # Base64 data URL
    camera_id: Optional[str] = "cam_01"
    required_ppe: Optional[List[str]] = None


@app.post("/api/analyze-frame")
def analyze_frame(req: FrameAnalysisRequest):
    """
    Analyze a video frame sent from any source (webcam, uploaded video, CCTV).
    Returns real YOLOv8 worker detections, gear compliance, and missing gear.
    """
    try:
        # Extract base64 payload
        img_data = req.image
        if "," in img_data:
            img_data = img_data.split(",", 1)[1]

        raw_bytes = base64.b64decode(img_data)
        np_arr = np.frombuffer(raw_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if frame is None:
            return {"ok": False, "error": "Invalid frame data"}

        h, w, _ = frame.shape

        # Run detection and spatial attribution
        annotated, summary = pipeline.process_frame(frame, camera_id=req.camera_id)

        # Format worker detections with normalized percentage bounding boxes [0..100]
        detected_workers = []
        for worker in pipeline._cached_workers:
            x1, y1, x2, y2 = worker.box
            # Normalize to 0-100 percentage for SVG canvas overlay
            norm_box = [
                round((x1 / w) * 100, 2),
                round((y1 / h) * 100, 2),
                round((x2 / w) * 100, 2),
                round((y2 / h) * 100, 2),
            ]

            detected_workers.append({
                "worker_id": worker.worker_id,
                "box": norm_box,
                "is_compliant": worker.is_compliant,
                "worn_ppe": list(worker.worn_ppe.keys()),
                "missing_ppe": worker.missing_ppe,
                "violations": worker.violations,
            })

        # Format hazards
        detected_hazards = []
        for hazard in pipeline._cached_hazards:
            hx1, hy1, hx2, hy2 = hazard.box
            norm_box = [
                round((hx1 / w) * 100, 2),
                round((hy1 / h) * 100, 2),
                round((hx2 / w) * 100, 2),
                round((hy2 / h) * 100, 2),
            ]
            detected_hazards.append({
                "hazard_type": hazard.hazard_type,
                "box": norm_box,
                "confidence": round(hazard.confidence, 2),
                "severity": hazard.severity,
            })

        return {
            "ok": True,
            "workers": detected_workers,
            "hazards": detected_hazards,
            "summary": summary,
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}


# ---------------- Connect CCTV / RTSP Stream ----------------
class CCTVStreamRequest(BaseModel):
    url: str
    camera_name: Optional[str] = "Factory CCTV"


@app.post("/api/connect-cctv")
def connect_cctv(req: CCTVStreamRequest):
    """Validate and connect to any factory RTSP or HTTP CCTV camera feed."""
    url = req.url.strip()
    if not (url.startswith("rtsp://") or url.startswith("http://") or url.startswith("https://")):
        return {"ok": False, "error": "Invalid camera URL. Must start with rtsp:// or http://"}

    # Test stream connectivity briefly
    try:
        cap = cv2.VideoCapture(url)
        is_opened = cap.isOpened()
        cap.release()
        return {
            "ok": True,
            "url": url,
            "connected": is_opened,
            "message": f"CCTV feed connected: {req.camera_name}" if is_opened else "Stream URL registered (Waiting for camera response)."
        }
    except Exception as e:
        return {"ok": True, "url": url, "connected": False, "message": f"Registered: {str(e)}"}


@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "service": "sentry-floor-api",
        "timestamp": datetime.datetime.utcnow().isoformat(),
    }


if __name__ == "__main__":
    import uvicorn
    print("=" * 60)
    print("  RAKSHA KAVACH // Factory Safety AI Server v2.0")
    print("  Serving on http://localhost:8000")
    print("=" * 60)
    uvicorn.run(app, host="0.0.0.0", port=8000)
