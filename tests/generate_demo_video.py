"""
Synthetic Factory Video Generator for Raksha Kavach.
Produces a realistic test clip with simulated workers, PPE compliance,
PPE violations (missing helmets), and a simulated flame hazard event.
"""

import os
import cv2
import numpy as np


def generate_factory_demo_video(
    output_path: str = "data/demo_factory.mp4",
    duration_sec: int = 8,
    fps: int = 20,
    width: int = 854,
    height: int = 480,
):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    total_frames = duration_sec * fps
    print(f"[DemoGenerator] Generating {total_frames} frames ({duration_sec}s) at {output_path}...")

    # Worker trajectory parameters
    w1_x, w1_y = 100, 200  # Compliant worker (moves right)
    w2_x, w2_y = 650, 180  # Non-compliant worker (moves left)

    for i in range(total_frames):
        # 1. Industrial factory floor background (dark textured warehouse)
        frame = np.full((height, width, 3), (35, 38, 45), dtype=np.uint8)

        # Factory floor perspective lines
        cv2.line(frame, (0, 360), (width, 360), (60, 65, 75), 2)
        cv2.line(frame, (0, 480), (int(width * 0.35), 360), (50, 55, 65), 1)
        cv2.line(frame, (width, 480), (int(width * 0.65), 360), (50, 55, 65), 1)

        # Factory machinery / shelves in background
        cv2.rectangle(frame, (40, 120), (220, 360), (45, 50, 60), -1)
        cv2.rectangle(frame, (60, 150), (200, 240), (25, 30, 40), -1)
        cv2.putText(frame, "ZONE 1: FABRICATION", (50, 140), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (120, 130, 145), 1)

        # Overhead safety signage
        cv2.rectangle(frame, (int(width / 2 - 120), 20), (int(width / 2 + 120), 55), (20, 120, 220), -1)
        cv2.putText(frame, "SAFETY ZONE: PPE MANDATORY", (int(width / 2 - 110), 43), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)

        # 2. Worker 1 (COMPLIANT: Wears Yellow Helmet + Neon Vest)
        cur_w1_x = int(w1_x + (i * 2.2)) % (width - 150)
        _draw_simulated_worker(
            frame,
            center_x=cur_w1_x,
            base_y=370,
            has_helmet=True,
            has_vest=True,
            worker_label="Worker 101",
        )

        # 3. Worker 2 (VIOLATION: Missing Helmet, has dark hair, wears vest)
        cur_w2_x = int(w2_x - (i * 1.8))
        if cur_w2_x < 150:
            cur_w2_x = width - 120
        _draw_simulated_worker(
            frame,
            center_x=cur_w2_x,
            base_y=360,
            has_helmet=False,
            has_vest=True,
            worker_label="Worker 102",
        )

        # 4. Fire / Hazard event in frames 60 to 140
        if 55 <= i <= 135:
            flame_x, flame_y = 520, 320
            # Flickering orange-red flame
            flicker = np.random.randint(-4, 5)
            cv2.ellipse(frame, (flame_x + flicker, flame_y), (24, 38), 0, 0, 360, (0, 140, 255), -1)
            cv2.ellipse(frame, (flame_x, flame_y - 8), (14, 25), 0, 0, 360, (0, 220, 255), -1)
            cv2.putText(frame, "SPARK / FLAME", (flame_x - 45, flame_y - 45), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 165, 255), 1)

        out.write(frame)

    out.release()
    print(f"[DemoGenerator] Finished generating demo video ({os.path.getsize(output_path)} bytes).")


def _draw_simulated_worker(
    frame: np.ndarray,
    center_x: int,
    base_y: int,
    has_helmet: bool = True,
    has_vest: bool = True,
    worker_label: str = "Worker",
):
    """Draws a stylized human figure with distinguishable headgear and torso vest."""
    # Worker body proportions
    w_width = 54
    w_height = 140
    top_y = base_y - w_height
    head_radius = 16
    head_y = top_y + head_radius + 4

    # 1. Legs / Pants (Dark navy blue)
    cv2.rectangle(frame, (center_x - 18, base_y - 65), (center_x - 4, base_y), (60, 40, 30), -1)
    cv2.rectangle(frame, (center_x + 4, base_y - 65), (center_x + 18, base_y), (60, 40, 30), -1)
    # Safety boots (Dark grey)
    cv2.rectangle(frame, (center_x - 22, base_y - 12), (center_x - 3, base_y), (30, 30, 30), -1)
    cv2.rectangle(frame, (center_x + 3, base_y - 12), (center_x + 22, base_y), (30, 30, 30), -1)

    # 2. Torso
    torso_top = head_y + head_radius + 2
    torso_bottom = base_y - 65
    if has_vest:
        # High-visibility fluorescent neon-green vest with reflective silver stripes
        cv2.rectangle(frame, (center_x - 22, torso_top), (center_x + 22, torso_bottom), (30, 220, 80), -1)
        # Reflective stripes
        cv2.line(frame, (center_x - 22, torso_top + 16), (center_x + 22, torso_top + 16), (230, 240, 240), 3)
        cv2.line(frame, (center_x - 22, torso_top + 32), (center_x + 22, torso_top + 32), (230, 240, 240), 3)
    else:
        # Regular dark work shirt
        cv2.rectangle(frame, (center_x - 22, torso_top), (center_x + 22, torso_bottom), (70, 70, 70), -1)

    # 3. Head & Face
    cv2.circle(frame, (center_x, head_y), head_radius, (140, 180, 220), -1)  # Skin tone

    if has_helmet:
        # Bright safety yellow hard-hat with brim
        cv2.ellipse(frame, (center_x, head_y - 6), (head_radius + 4, head_radius), 0, 180, 360, (0, 225, 255), -1)
        cv2.ellipse(frame, (center_x, head_y - 4), (head_radius + 7, 5), 0, 0, 360, (0, 225, 255), -1)
    else:
        # Dark hair (No helmet)
        cv2.ellipse(frame, (center_x, head_y - 6), (head_radius + 1, head_radius - 2), 0, 180, 360, (20, 20, 20), -1)


if __name__ == "__main__":
    generate_factory_demo_video()
