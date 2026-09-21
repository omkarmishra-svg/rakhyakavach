"""
Raksha Kavach — Factory Safety AI Sentinel
Real-Time Multi-Camera Surveillance • 4-Feed Edge AI • Worker Equipment Attribution
"""

import os
import sys
import time
from typing import Dict, List, Any, Optional
import cv2
import numpy as np
import streamlit as st
from PIL import Image

# Ensure project root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from src.pipeline import SafetyPipeline
from src.zones import ZoneManager

# ---------------------------------------------------------
# Page Configuration
# ---------------------------------------------------------
st.set_page_config(
    page_title="Raksha Kavach — Multi-Camera AI Sentinel",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# ---------------------------------------------------------
# High-Tech Cyber Industrial Dark Theme
# ---------------------------------------------------------
st.markdown(
    """
<style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap');

    html, body, [class*="css"] {
        font-family: 'Outfit', sans-serif;
    }

    .stApp {
        background: radial-gradient(circle at 10% 20%, #0a0f18 0%, #04070c 90%);
        color: #e2e8f0;
    }

    /* Top Navigation Bar */
    .navbar-container {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 18px;
        background: rgba(15, 23, 42, 0.75);
        border: 1px solid rgba(0, 242, 254, 0.2);
        border-radius: 12px;
        margin-bottom: 18px;
        backdrop-filter: blur(12px);
    }

    .brand-title {
        font-size: 1.8rem;
        font-weight: 900;
        letter-spacing: -0.02em;
        background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin: 0;
        padding: 0;
    }

    .brand-sub {
        font-size: 0.75rem;
        color: #94a3b8;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
    }

    .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: rgba(0, 230, 118, 0.12);
        border: 1px solid rgba(0, 230, 118, 0.4);
        padding: 5px 14px;
        border-radius: 20px;
        font-size: 0.78rem;
        font-weight: 700;
        color: #00e676;
    }

    .pulse-dot {
        width: 8px;
        height: 8px;
        background-color: #00e676;
        border-radius: 50%;
        display: inline-block;
        box-shadow: 0 0 8px #00e676;
    }

    /* Camera Feed Card Container */
    .cam-box {
        background: rgba(15, 23, 42, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 10px;
        margin-bottom: 14px;
        transition: border 0.2s ease;
    }
    .cam-box:hover {
        border-color: rgba(0, 242, 254, 0.4);
    }

    .cam-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        padding: 0 4px;
    }

    .cam-title {
        font-size: 0.88rem;
        font-weight: 800;
        color: #00f2fe;
        letter-spacing: 0.03em;
    }

    .cam-badge {
        font-size: 0.7rem;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 6px;
        background: rgba(0, 242, 254, 0.15);
        color: #38bdf8;
        border: 1px solid rgba(56, 189, 248, 0.3);
    }

    /* Square Worker Alert Badges */
    .alert-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
        gap: 12px;
        margin-top: 10px;
    }

    .worker-square {
        aspect-ratio: 1 / 1;
        border-radius: 14px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        padding: 10px;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    }
    .worker-square:hover {
        transform: scale(1.03);
    }

    /* Green: All Required Equipment Present */
    .square-green {
        background: linear-gradient(145deg, rgba(0, 230, 118, 0.22) 0%, rgba(16, 185, 129, 0.38) 100%);
        border: 2px solid #00e676;
        color: #f0fdf4;
    }

    /* Yellow: Partial Equipment Missing */
    .square-yellow {
        background: linear-gradient(145deg, rgba(255, 179, 0, 0.22) 0%, rgba(245, 158, 11, 0.38) 100%);
        border: 2px solid #ffb300;
        color: #fffbeb;
    }

    /* Red: All Required Equipment Missing */
    .square-red {
        background: linear-gradient(145deg, rgba(255, 23, 68, 0.25) 0%, rgba(239, 68, 68, 0.42) 100%);
        border: 2px solid #ff1744;
        color: #fef2f2;
    }

    .square-id {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.92rem;
        font-weight: 800;
        margin-bottom: 4px;
    }

    .square-status {
        font-size: 0.68rem;
        font-weight: 900;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        padding: 2px 6px;
        border-radius: 4px;
        margin-bottom: 6px;
    }
    .square-green .square-status {
        background: rgba(0, 230, 118, 0.3);
        color: #00e676;
    }
    .square-yellow .square-status {
        background: rgba(255, 179, 0, 0.3);
        color: #ffb300;
    }
    .square-red .square-status {
        background: rgba(255, 23, 68, 0.3);
        color: #ff1744;
    }

    .square-info {
        font-size: 0.72rem;
        font-weight: 600;
        line-height: 1.25;
        max-height: 48px;
        overflow-y: auto;
    }

    /* Hazard Alert Banner */
    .hazard-banner {
        background: linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(185, 28, 28, 0.5) 100%);
        border: 2px solid #ef4444;
        border-radius: 10px;
        padding: 12px 16px;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 12px;
        animation: pulseHazard 1.5s infinite alternate;
    }
    @keyframes pulseHazard {
        from { box-shadow: 0 0 10px rgba(239, 68, 68, 0.3); }
        to { box-shadow: 0 0 25px rgba(239, 68, 68, 0.8); }
    }
</style>
""",
    unsafe_allow_html=True,
)

# ---------------------------------------------------------
# Session State Initialization
# ---------------------------------------------------------
if "pipelines" not in st.session_state:
    st.session_state.pipelines = {
        f"cam_{i}": SafetyPipeline(sample_rate=2) for i in range(1, 5)
    }

if "is_streaming" not in st.session_state:
    st.session_state.is_streaming = False

if "fullscreen_cam" not in st.session_state:
    st.session_state.fullscreen_cam = None  # None = 4-camera grid; 1, 2, 3, or 4 = Fullscreen mode

# Default video sources
default_demo = (
    os.path.join("data", "uploaded_factory_video.mp4")
    if os.path.exists(os.path.join("data", "uploaded_factory_video.mp4"))
    else (
        os.path.join("data", "demo_factory.mp4")
        if os.path.exists(os.path.join("data", "demo_factory.mp4"))
        else None
    )
)

if "cam_configs" not in st.session_state:
    st.session_state.cam_configs = {
        1: {"name": "CAM 01 — Main Bay", "type": "video", "source": default_demo},
        2: {"name": "CAM 02 — Fabrication Area", "type": "webcam", "source": 0},
        3: {"name": "CAM 03 — Loading Dock", "type": "cctv", "source": ""},
        4: {"name": "CAM 04 — Assembly Station", "type": "video", "source": default_demo},
    }

# ---------------------------------------------------------
# Clean Top Navigation Bar
# ---------------------------------------------------------
nav_col1, nav_col2, nav_col3 = st.columns([4, 3, 3])

with nav_col1:
    st.markdown(
        """
        <div style="display: flex; align-items: center; gap: 12px; margin-top: 4px;">
            <div>
                <h1 class="brand-title">RAKSHA KAVACH</h1>
                <div class="brand-sub">Real-Time Multi-Camera AI Sentinel • Worker Equipment Verification</div>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

with nav_col2:
    mode_label = "4-Camera Grid" if st.session_state.fullscreen_cam is None else f"Full-Screen: CAM 0{st.session_state.fullscreen_cam}"
    st.markdown(
        f"""
        <div style="display: flex; align-items: center; gap: 10px; margin-top: 12px;">
            <div class="status-pill">
                <span class="pulse-dot"></span> REAL-TIME AI ACTIVE
            </div>
            <div style="color: #94a3b8; font-size: 0.8rem; font-weight: 700;">
                VIEW: <span style="color: #00f2fe;">{mode_label}</span>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

with nav_col3:
    c_btn1, c_btn2, c_btn3 = st.columns([1.2, 1.2, 1.4])
    with c_btn1:
        if st.button("▶️ Start", type="primary", use_container_width=True):
            st.session_state.is_streaming = True
            st.rerun()
    with c_btn2:
        if st.button("⏹️ Pause", use_container_width=True):
            st.session_state.is_streaming = False
            st.rerun()
    with c_btn3:
        if st.session_state.fullscreen_cam is not None:
            if st.button("⮌ 4-Cam Grid", use_container_width=True):
                st.session_state.fullscreen_cam = None
                st.rerun()
        else:
            if st.button("⛶ Full Screen", use_container_width=True, help="Expand selected camera to full-screen hazard view"):
                st.session_state.fullscreen_cam = 1
                st.rerun()

st.markdown("<hr style='border: 0; border-top: 1px solid rgba(255, 255, 255, 0.08); margin: 6px 0 16px 0;'>", unsafe_allow_html=True)

# ---------------------------------------------------------
# Sidebar: Streamlined Camera Feed Configuration
# ---------------------------------------------------------
with st.sidebar:
    st.markdown("### **Camera Feeds Setup**")
    st.caption("Configure video inputs for all 4 surveillance channels.")

    for cam_id in range(1, 5):
        cfg = st.session_state.cam_configs[cam_id]
        with st.expander(f"📷 {cfg['name']}", expanded=(cam_id == 1)):
            cam_name = st.text_input(f"Feed Name #{cam_id}", value=cfg["name"], key=f"name_{cam_id}")
            st.session_state.cam_configs[cam_id]["name"] = cam_name

            input_mode = st.selectbox(
                f"Input Mode #{cam_id}",
                ["Upload Video", "CCTV Stream (RTSP / URL)", "Live Web Camera"],
                index=0 if cfg["type"] == "video" else (1 if cfg["type"] == "cctv" else 2),
                key=f"mode_{cam_id}",
            )

            if input_mode == "Upload Video":
                cfg["type"] = "video"
                up_file = st.file_uploader(
                    f"Upload Video Clip",
                    type=["mp4", "avi", "mov", "mkv", "webm"],
                    key=f"up_{cam_id}",
                )
                if up_file is not None:
                    save_path = os.path.join("data", f"cam_{cam_id}_feed.mp4")
                    os.makedirs("data", exist_ok=True)
                    with open(save_path, "wb") as f:
                        f.write(up_file.getbuffer())
                    cfg["source"] = save_path
                    st.success("Uploaded successfully!")
                elif not cfg["source"] and default_demo:
                    cfg["source"] = default_demo

            elif input_mode == "CCTV Stream (RTSP / URL)":
                cfg["type"] = "cctv"
                url = st.text_input(
                    f"RTSP / Stream URL",
                    value=cfg["source"] if isinstance(cfg["source"], str) and cfg["source"].startswith("rtsp") else "",
                    placeholder="rtsp://admin:pass@192.168.1.100:554/stream",
                    key=f"rtsp_{cam_id}",
                )
                cfg["source"] = url if url else None

            elif input_mode == "Live Web Camera":
                cfg["type"] = "webcam"
                cam_idx = st.number_input(
                    f"Camera Device Index",
                    min_value=0,
                    max_value=4,
                    value=int(cfg["source"]) if isinstance(cfg["source"], int) else 0,
                    step=1,
                    key=f"cam_idx_{cam_id}",
                )
                cfg["source"] = int(cam_idx)

    st.markdown("---")
    st.markdown("### **Quick Full-Screen Focus**")
    fs_choice = st.radio(
        "Select Camera to Expand",
        [1, 2, 3, 4],
        format_func=lambda c: f"CAM 0{c}: {st.session_state.cam_configs[c]['name']}",
        index=0 if st.session_state.fullscreen_cam is None else (st.session_state.fullscreen_cam - 1),
    )
    if st.button("Expand Camera to Full Screen", use_container_width=True):
        st.session_state.fullscreen_cam = fs_choice
        st.rerun()

# ---------------------------------------------------------
# Main Workspace: Feeds (Left) + Square Alert Badges (Right)
# ---------------------------------------------------------
main_left, main_right = st.columns([8, 4])

# Active camera list
if st.session_state.fullscreen_cam is not None:
    active_cams = [st.session_state.fullscreen_cam]
else:
    active_cams = [1, 2, 3, 4]

# Viewport containers for camera feeds
cam_viewports = {}
with main_left:
    if len(active_cams) == 1:
        # Fullscreen view
        cid = active_cams[0]
        cfg = st.session_state.cam_configs[cid]
        st.markdown(
            f"""
            <div class="cam-header">
                <span class="cam-title" style="font-size: 1.1rem;">⛶ FULL-SCREEN HAZARD FOCUS — {cfg['name']}</span>
                <span class="cam-badge">HIGH RESOLUTION SENTINEL</span>
            </div>
            """,
            unsafe_allow_html=True,
        )
        cam_viewports[cid] = st.empty()
    else:
        # 4-Camera Grid: 2 rows of 2 columns
        grid_r1_c1, grid_r1_c2 = st.columns(2)
        grid_r2_c1, grid_r2_c2 = st.columns(2)

        grid_cols = [grid_r1_c1, grid_r1_c2, grid_r2_c1, grid_r2_c2]

        for i, cid in enumerate(active_cams):
            cfg = st.session_state.cam_configs[cid]
            with grid_cols[i]:
                st.markdown(
                    f"""
                    <div class="cam-header">
                        <span class="cam-title">{cfg['name']}</span>
                        <span class="cam-badge">{cfg['type'].upper()}</span>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )
                cam_viewports[cid] = st.empty()
                if st.button(f"⛶ Full Screen CAM 0{cid}", key=f"fs_btn_{cid}", use_container_width=True):
                    st.session_state.fullscreen_cam = cid
                    st.rerun()

with main_right:
    st.markdown("#### **Equipment Compliance & Alerts**")
    st.caption("Live worker PPE square alert badges. Green = Compliant, Yellow = Partial, Red = Missing All.")
    hazard_alert_box = st.empty()
    alerts_placeholder = st.empty()

# ---------------------------------------------------------
# Helper to Open Video Stream
# ---------------------------------------------------------
def get_video_capture(source):
    if source is None or source == "":
        return None
    try:
        cap = cv2.VideoCapture(source)
        if cap.isOpened():
            return cap
        return None
    except Exception:
        return None

# ---------------------------------------------------------
# Real-Time Multi-Feed Stream Processor
# ---------------------------------------------------------
if st.session_state.is_streaming:
    caps = {}
    for cid in active_cams:
        src = st.session_state.cam_configs[cid].get("source")
        cap = get_video_capture(src)
        if cap:
            caps[cid] = cap

    if not caps:
        st.warning("⚠️ No active video sources available. Please upload a video or configure a camera in the sidebar.")
    else:
        max_loop = 300  # Runs continuously for up to 300 frames per session start
        frame_idx = 0

        while st.session_state.is_streaming and frame_idx < max_loop:
            frame_idx += 1
            all_detected_workers = []
            any_hazard_detected = False
            hazard_details = []

            for cid, cap in list(caps.items()):
                ret, frame = cap.read()
                if not ret:
                    # Loop video files continuously
                    if st.session_state.cam_configs[cid]["type"] == "video":
                        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                        ret, frame = cap.read()
                    if not ret:
                        continue

                # Run Real-Time Safety AI Pipeline
                pipeline = st.session_state.pipelines[f"cam_{cid}"]
                annotated_frame, summary = pipeline.process_frame(
                    frame=frame,
                    camera_id=f"cam_{cid}",
                    draw_overlay=True,
                )

                # Render video frame to UI
                rgb_frame = cv2.cvtColor(annotated_frame, cv2.COLOR_BGR2RGB)
                if cid in cam_viewports:
                    cam_viewports[cid].image(rgb_frame, channels="RGB", use_container_width=True)

                # Collect worker detections for alert badges
                workers = summary.get("workers", [])
                for w in workers:
                    w_copy = dict(w)
                    w_copy["cam_id"] = cid
                    all_detected_workers.append(w_copy)

                # Check for fire/smoke hazards
                if summary.get("hazards_detected", 0) > 0:
                    any_hazard_detected = True
                    hazard_details.append(f"CAM 0{cid} ({st.session_state.cam_configs[cid]['name']})")

            # Update Hazard Alert Banner
            if any_hazard_detected:
                hazard_alert_box.markdown(
                    f"""
                    <div class="hazard-banner">
                        <span style="font-size: 1.5rem;">🔥</span>
                        <div>
                            <div style="font-weight: 800; font-size: 0.95rem; color: #ffffff;">HAZARD / FIRE ALERT DETECTED!</div>
                            <div style="font-size: 0.78rem; color: #fecaca;">Active in: {', '.join(hazard_details)}</div>
                        </div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )
            else:
                hazard_alert_box.empty()

            # Render Square Worker Alert Badges
            with alerts_placeholder.container():
                if not all_detected_workers:
                    st.markdown(
                        """
                        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25);
                                    border-radius: 12px; padding: 22px; text-align: center; margin-top: 8px;">
                            <div style="font-weight: 700; color: #f0fdf4; font-size: 0.9rem;">No Active Violations</div>
                            <div style="color: #6ee7b7; font-size: 0.78rem; margin-top: 4px;">
                                Monitoring live worker streams. Workers detected with missing gear will show in color-coded squares.
                            </div>
                        </div>
                        """,
                        unsafe_allow_html=True,
                    )
                else:
                    # Build Square Badges Grid
                    badge_html = ['<div class="alert-grid">']
                    for w in all_detected_workers:
                        status = w.get("status", "COMPLIANT")
                        worker_id = w.get("worker_id", 1)
                        missing = w.get("missing_ppe", [])
                        worn = w.get("worn_ppe", [])

                        if status == "COMPLIANT":
                            badge_class = "square-green"
                            status_text = "COMPLIANT"
                            info_text = f"All OK<br><span style='font-size: 0.65rem; opacity: 0.85;'>{', '.join(worn).title() if worn else 'Full PPE'}</span>"
                        elif status == "MISSING ALL":
                            badge_class = "square-red"
                            status_text = "DANGER"
                            info_text = f"<b style='color:#ffcdd2;'>NO PPE</b><br><span style='font-size: 0.65rem;'>All Gear Missing</span>"
                        else:
                            badge_class = "square-yellow"
                            status_text = "PARTIAL"
                            missing_str = ", ".join(missing).title()
                            info_text = f"<b style='color:#fef08a;'>Missing:</b><br><span style='font-size: 0.68rem;'>{missing_str}</span>"

                        badge_html.append(
                            f"""
                            <div class="worker-square {badge_class}">
                                <div class="square-id">Worker #{worker_id}</div>
                                <div class="square-status">{status_text}</div>
                                <div class="square-info">{info_text}</div>
                            </div>
                            """
                        )
                    badge_html.append("</div>")
                    st.markdown("".join(badge_html), unsafe_allow_html=True)

            time.sleep(0.04)

        # Release video streams on loop completion
        for cap in caps.values():
            cap.release()

else:
    # Standby Preview: Show first frame of configured sources
    for cid in active_cams:
        src = st.session_state.cam_configs[cid].get("source")
        cap = get_video_capture(src)
        if cap:
            ret, frame = cap.read()
            if ret:
                pipeline = st.session_state.pipelines[f"cam_{cid}"]
                annotated_frame, summary = pipeline.process_frame(
                    frame=frame, camera_id=f"cam_{cid}", draw_overlay=True
                )
                rgb_frame = cv2.cvtColor(annotated_frame, cv2.COLOR_BGR2RGB)
                if cid in cam_viewports:
                    cam_viewports[cid].image(rgb_frame, channels="RGB", use_container_width=True)
            cap.release()
        else:
            if cid in cam_viewports:
                cam_viewports[cid].markdown(
                    f"""
                    <div style="background: rgba(15, 23, 42, 0.4); border: 2px dashed rgba(0, 242, 254, 0.25);
                                border-radius: 10px; padding: 30px; text-align: center;">
                        <div style="color: #94a3b8; font-size: 0.85rem;">CAM 0{cid} Standby</div>
                        <div style="color: #64748b; font-size: 0.75rem; margin-top: 4px;">Click 'Start' above or upload footage in sidebar</div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )

    with alerts_placeholder.container():
        st.markdown(
            """
            <div style="background: rgba(15, 23, 42, 0.5); border: 1px solid rgba(255, 255, 255, 0.08);
                        border-radius: 12px; padding: 22px; text-align: center;">
                <div style="color: #94a3b8; font-size: 0.85rem; font-weight: 700;">Sentinel In Standby</div>
                <div style="color: #64748b; font-size: 0.75rem; margin-top: 4px;">
                    Click <b>▶️ Start</b> in the top navbar to run real-time PPE equipment detection and multi-camera hazard analysis.
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )
