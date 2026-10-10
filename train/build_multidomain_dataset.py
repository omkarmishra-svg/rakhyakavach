"""
Dataset Builder: Unified Multi-Domain Industrial PPE Dataset for Construction & Chemical Engineering.
Combines:
1. Real Construction-PPE dataset (1,416 annotated images: hardhats, vests, gloves, boots, goggles, persons).
2. Synthesized & Augmented Chemical Engineering scenes (hazmat suits, full-face respirators,
   chemical gauntlets, acid gumboots, SCBA packs, chemical splash shields).
3. Specialized Construction Engineering scenes (fall-arrest safety harnesses, welding visors).
4. Explicit negative violation annotations (no_chemical_suit, no_respirator, no_harness, etc.).

Outputs structured dataset in:
dataset/industrial_multidomain_ppe/
  ├── images/train/, labels/train/
  ├── images/val/, labels/val/
  ├── images/test/, labels/test/
  └── data.yaml
"""

import os
import shutil
import random
import cv2
import numpy as np

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC_DATASET = os.path.join(PROJECT_ROOT, "dataset", "construction-ppe")
OUT_DIR = os.path.join(PROJECT_ROOT, "dataset", "industrial_multidomain_ppe")

# Unified 20-Class Multi-Domain Taxonomy
CLASS_NAMES = [
    "helmet",               # 0 (Construction / General)
    "gloves",               # 1 (Construction / Leather)
    "vest",                 # 2 (Construction / High-Vis)
    "boots",                # 3 (Construction / Steel-Toe)
    "goggles",              # 4 (General / Eye Protection)
    "Person",               # 5 (Human Subject)
    "safety_harness",       # 6 (Construction / Fall Arrest)
    "welding_shield",       # 7 (Construction / Hot Works)
    "chemical_suit",        # 8 (Chemical / Hazmat Coverall)
    "chemical_respirator",   # 9 (Chemical / Gas Mask / Cartridge)
    "chemical_gloves",      # 10 (Chemical / Long Nitrile/Butyl)
    "chemical_boots",       # 11 (Chemical / Acid Gumboots)
    "scba",                 # 12 (Chemical / Breathing Pack)
    "no_helmet",            # 13 (Violation)
    "no_vest",              # 14 (Violation)
    "no_gloves",            # 15 (Violation)
    "no_boots",             # 16 (Violation)
    "no_respirator",        # 17 (Chemical Violation)
    "no_chemical_suit",     # 18 (Chemical Violation)
    "no_harness",           # 19 (Construction Height Violation)
]

# Mapping from original Construction-PPE (11 classes) to Unified Taxonomy
ORIGINAL_MAP = {
    0: 0,   # helmet -> helmet
    1: 1,   # gloves -> gloves
    2: 2,   # vest -> vest
    3: 3,   # boots -> boots
    4: 4,   # goggles -> goggles
    5: None,# none -> drop
    6: 5,   # Person -> Person
    7: 13,  # no_helmet -> no_helmet
    8: None,# no_goggle -> drop
    9: 15,  # no_gloves -> no_gloves
    10: 16, # no_boots -> no_boots
}


def draw_chemical_worker(canvas: np.ndarray, x: int, y: int, w: int, h: int, equipped: dict) -> list:
    """
    Draw a stylized chemical plant worker with precise synthetic bounding boxes.
    equipped: dict flags for {'suit': bool, 'respirator': bool, 'gloves': bool, 'boots': bool, 'scba': bool}
    Returns list of (class_id, norm_x, norm_y, norm_w, norm_h)
    """
    ih, iw = canvas.shape[:2]
    annotations = []

    # 1. Person bounding box
    annotations.append((5, (x + w / 2) / iw, (y + h / 2) / ih, w / iw, h / ih))

    # Head coordinates
    head_cx = x + w // 2
    head_cy = y + int(h * 0.15)
    head_r = int(w * 0.22)

    # Torso coordinates
    torso_x = x + int(w * 0.15)
    torso_y = y + int(h * 0.28)
    torso_w = int(w * 0.70)
    torso_h = int(h * 0.42)

    # Legs & Boots
    leg_y = torso_y + torso_h
    leg_h = int(h * 0.26)
    boot_h = int(h * 0.10)

    # Draw body base (dark underlayer)
    cv2.circle(canvas, (head_cx, head_cy), head_r, (180, 150, 130), -1)
    cv2.rectangle(canvas, (torso_x, torso_y), (torso_x + torso_w, torso_y + torso_h), (40, 45, 55), -1)

    # Chemical Suit (Tychem Yellow or Acid Orange coverall)
    if equipped.get("suit", False):
        suit_color = (30, 210, 240) if random.random() > 0.3 else (20, 120, 240) # Bright yellow or safety orange
        cv2.rectangle(canvas, (torso_x - 4, torso_y), (torso_x + torso_w + 4, torso_y + torso_h + int(leg_h * 0.75)), suit_color, -1)
        # Suit hood
        cv2.ellipse(canvas, (head_cx, head_cy - 4), (head_r + 4, head_r + 8), 0, 0, 360, suit_color, 4)
        suit_bx = (x + w / 2) / iw
        suit_by = (torso_y + int(torso_h * 0.8)) / ih
        suit_bw = (torso_w + 12) / iw
        suit_bh = (torso_h + int(leg_h * 0.75)) / ih
        annotations.append((8, suit_bx, suit_by, suit_bw, suit_bh))
    else:
        annotations.append((18, (x + w / 2) / iw, (torso_y + torso_h / 2) / ih, torso_w / iw, torso_h / ih))

    # Chemical Respirator / Full-Face Gas Mask
    if equipped.get("respirator", False):
        cv2.circle(canvas, (head_cx, head_cy + 4), int(head_r * 0.75), (35, 35, 45), -1)
        cv2.rectangle(canvas, (head_cx - 10, head_cy - 4), (head_cx + 10, head_cy + 12), (180, 220, 230), -1) # Visor glass
        # Dual filter canisters (pink/yellow cartridges)
        cv2.circle(canvas, (head_cx - 14, head_cy + 10), 6, (140, 50, 190), -1)
        cv2.circle(canvas, (head_cx + 14, head_cy + 10), 6, (140, 50, 190), -1)
        resp_bx = head_cx / iw
        resp_by = (head_cy + 4) / ih
        resp_bw = (head_r * 1.6) / iw
        resp_bh = (head_r * 1.6) / ih
        annotations.append((9, resp_bx, resp_by, resp_bw, resp_bh))
    else:
        annotations.append((17, head_cx / iw, head_cy / ih, (head_r * 1.5) / iw, (head_r * 1.5) / ih))

    # SCBA Breathing Tank on back
    if equipped.get("scba", False):
        cv2.rectangle(canvas, (torso_x - 14, torso_y + 10), (torso_x - 2, torso_y + torso_h - 10), (200, 200, 40), -1) # Yellow cylinder
        annotations.append((12, (torso_x - 8) / iw, (torso_y + torso_h / 2) / ih, 16 / iw, (torso_h - 15) / ih))

    # Chemical Gloves (extended nitrile blue / teal gauntlets)
    if equipped.get("gloves", False):
        # Left and right hand
        cv2.rectangle(canvas, (torso_x - 12, torso_y + int(torso_h * 0.7)), (torso_x - 2, torso_y + torso_h + 10), (180, 120, 20), -1)
        cv2.rectangle(canvas, (torso_x + torso_w + 2, torso_y + int(torso_h * 0.7)), (torso_x + torso_w + 12, torso_y + torso_h + 10), (180, 120, 20), -1)
        annotations.append((10, (torso_x - 7) / iw, (torso_y + torso_h) / ih, 14 / iw, 24 / ih))
        annotations.append((10, (torso_x + torso_w + 7) / iw, (torso_y + torso_h) / ih, 14 / iw, 24 / ih))

    # Chemical Boots (acid-resistant black/yellow gumboots)
    if equipped.get("boots", False):
        b_y = leg_y + leg_h - boot_h
        cv2.rectangle(canvas, (torso_x + 4, b_y), (torso_x + int(torso_w * 0.45), b_y + boot_h), (25, 25, 30), -1)
        cv2.rectangle(canvas, (torso_x + int(torso_w * 0.55), b_y), (torso_x + torso_w - 4, b_y + boot_h), (25, 25, 30), -1)
        cv2.line(canvas, (torso_x + 4, b_y + 2), (torso_x + int(torso_w * 0.45), b_y + 2), (0, 220, 255), 2)
        cv2.line(canvas, (torso_x + int(torso_w * 0.55), b_y + 2), (torso_x + torso_w - 4, b_y + 2), (0, 220, 255), 2)
        annotations.append((11, (x + w / 2) / iw, (b_y + boot_h / 2) / ih, (torso_w * 0.9) / iw, (boot_h * 1.2) / ih))

    return annotations


def draw_construction_worker(canvas: np.ndarray, x: int, y: int, w: int, h: int, equipped: dict) -> list:
    """
    Draw a high-rise / scaffolding construction worker with fall-arrest harness & welding shield.
    """
    ih, iw = canvas.shape[:2]
    annotations = []

    # Person
    annotations.append((5, (x + w / 2) / iw, (y + h / 2) / ih, w / iw, h / ih))

    head_cx = x + w // 2
    head_cy = y + int(h * 0.14)
    head_r = int(w * 0.22)

    torso_x = x + int(w * 0.15)
    torso_y = y + int(h * 0.26)
    torso_w = int(w * 0.70)
    torso_h = int(h * 0.44)

    # Base head & clothes
    cv2.circle(canvas, (head_cx, head_cy), head_r, (170, 140, 120), -1)
    cv2.rectangle(canvas, (torso_x, torso_y), (torso_x + torso_w, torso_y + torso_h), (50, 60, 75), -1)

    # Helmet
    if equipped.get("helmet", True):
        h_color = (0, 215, 255) if random.random() > 0.5 else (240, 240, 240)
        cv2.ellipse(canvas, (head_cx, head_cy - 4), (head_r + 4, head_r), 0, 180, 360, h_color, -1)
        annotations.append((0, head_cx / iw, (head_cy - 5) / ih, (head_r * 2.3) / iw, (head_r * 1.5) / ih))
    else:
        annotations.append((13, head_cx / iw, head_cy / ih, (head_r * 2.0) / iw, (head_r * 1.5) / ih))

    # Welding Shield
    if equipped.get("welding", False):
        cv2.rectangle(canvas, (head_cx - head_r, head_cy - 2), (head_cx + head_r, head_cy + int(head_r * 1.6)), (30, 30, 35), -1)
        cv2.rectangle(canvas, (head_cx - 10, head_cy + 4), (head_cx + 10, head_cy + 16), (20, 180, 80), -1) # Dark green welding lens
        annotations.append((7, head_cx / iw, (head_cy + 8) / ih, (head_r * 2.2) / iw, (head_r * 2.0) / ih))

    # Safety Vest
    if equipped.get("vest", True):
        v_color = (40, 230, 130) if random.random() > 0.4 else (20, 120, 240)
        cv2.rectangle(canvas, (torso_x, torso_y), (torso_x + torso_w, torso_y + torso_h), v_color, -1)
        # Silver reflective stripes
        cv2.line(canvas, (torso_x, torso_y + 15), (torso_x + torso_w, torso_y + 15), (220, 220, 220), 3)
        cv2.line(canvas, (torso_x, torso_y + torso_h - 15), (torso_x + torso_w, torso_y + torso_h - 15), (220, 220, 220), 3)
        annotations.append((2, (torso_x + torso_w / 2) / iw, (torso_y + torso_h / 2) / ih, torso_w / iw, torso_h / ih))
    else:
        annotations.append((14, (torso_x + torso_w / 2) / iw, (torso_y + torso_h / 2) / ih, torso_w / iw, torso_h / ih))

    # Fall-Arrest Full Body Safety Harness
    if equipped.get("harness", False):
        # Cross chest straps (yellow/orange webbing)
        harness_color = (0, 140, 255)
        cv2.line(canvas, (torso_x + 4, torso_y), (torso_x + torso_w - 4, torso_y + torso_h), harness_color, 4)
        cv2.line(canvas, (torso_x + torso_w - 4, torso_y), (torso_x + 4, torso_y + torso_h), harness_color, 4)
        # Center D-Ring
        cv2.circle(canvas, (head_cx, torso_y + int(torso_h * 0.4)), 5, (200, 200, 200), -1)
        # Leg loops
        cv2.ellipse(canvas, (torso_x + int(torso_w * 0.3), torso_y + torso_h), (12, 6), 0, 0, 360, harness_color, 3)
        cv2.ellipse(canvas, (torso_x + int(torso_w * 0.7), torso_y + torso_h), (12, 6), 0, 0, 360, harness_color, 3)
        annotations.append((6, (torso_x + torso_w / 2) / iw, (torso_y + torso_h * 0.55) / ih, (torso_w * 0.95) / iw, (torso_h * 1.1) / ih))
    else:
        annotations.append((19, (torso_x + torso_w / 2) / iw, (torso_y + torso_h / 2) / ih, torso_w / iw, torso_h / ih))

    # Boots
    if equipped.get("boots", True):
        b_y = torso_y + torso_h + int(h * 0.18)
        b_h = int(h * 0.10)
        cv2.rectangle(canvas, (torso_x + 4, b_y), (torso_x + int(torso_w * 0.45), b_y + b_h), (35, 45, 65), -1)
        cv2.rectangle(canvas, (torso_x + int(torso_w * 0.55), b_y), (torso_x + torso_w - 4, b_y + b_h), (35, 45, 65), -1)
        annotations.append((3, (x + w / 2) / iw, (b_y + b_h / 2) / ih, (torso_w * 0.85) / iw, b_h / ih))

    # Gloves
    if equipped.get("gloves", True):
        cv2.circle(canvas, (torso_x - 6, torso_y + torso_h), 7, (120, 140, 150), -1)
        cv2.circle(canvas, (torso_x + torso_w + 6, torso_y + torso_h), 7, (120, 140, 150), -1)
        annotations.append((1, (torso_x - 6) / iw, (torso_y + torso_h) / ih, 16 / iw, 16 / ih))
        annotations.append((1, (torso_x + torso_w + 6) / iw, (torso_y + torso_h) / ih, 16 / iw, 16 / ih))

    return annotations


def generate_chemical_synthetic_images(split: str, count: int = 120):
    """Generate synthetic chemical engineering scenes with full annotations."""
    img_dir = os.path.join(OUT_DIR, "images", split)
    lbl_dir = os.path.join(OUT_DIR, "labels", split)
    os.makedirs(img_dir, exist_ok=True)
    os.makedirs(lbl_dir, exist_ok=True)

    print(f"[*] Generating {count} synthetic Chemical Engineering samples for {split}...")

    for idx in range(count):
        # 640x640 canvas
        canvas = np.full((640, 640, 3), (40, 48, 56), dtype=np.uint8)

        # Industrial background: pipes, pressure gauges, chemical vats
        # Pipes
        cv2.line(canvas, (0, 100), (640, 100), (80, 85, 95), 18)
        cv2.line(canvas, (0, 130), (640, 130), (120, 60, 40), 12)
        cv2.line(canvas, (450, 0), (450, 640), (70, 75, 85), 24)
        # Pressure gauge
        cv2.circle(canvas, (450, 115), 22, (200, 200, 210), -1)
        cv2.circle(canvas, (450, 115), 20, (30, 35, 40), -1)
        cv2.line(canvas, (450, 115), (460, 105), (0, 0, 220), 2)
        # Hazard signage
        cv2.rectangle(canvas, (60, 40), (160, 85), (0, 180, 240), -1) # Yellow warning sign
        cv2.putText(canvas, "ACID HAZARD", (65, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1)

        # Add 1 to 2 workers in scene
        num_workers = random.choice([1, 1, 2])
        all_annos = []

        for w_i in range(num_workers):
            wx = 100 + w_i * 240 + random.randint(-20, 20)
            wy = 180 + random.randint(-15, 25)
            ww = random.randint(110, 145)
            wh = int(ww * 2.8)

            is_chemical = random.random() > 0.35
            if is_chemical:
                # Chemical Worker
                equipped = {
                    "suit": random.random() > 0.15,
                    "respirator": random.random() > 0.20,
                    "gloves": random.random() > 0.25,
                    "boots": random.random() > 0.15,
                    "scba": random.random() > 0.70,
                }
                annos = draw_chemical_worker(canvas, wx, wy, ww, wh, equipped)
            else:
                # High-rise Construction Worker
                equipped = {
                    "helmet": random.random() > 0.15,
                    "vest": random.random() > 0.15,
                    "harness": random.random() > 0.30,
                    "welding": random.random() > 0.75,
                    "gloves": random.random() > 0.20,
                    "boots": random.random() > 0.15,
                }
                annos = draw_construction_worker(canvas, wx, wy, ww, wh, equipped)

            all_annos.extend(annos)

        # Save image and label
        fname = f"synth_chem_const_{split}_{idx:04d}"
        cv2.imwrite(os.path.join(img_dir, f"{fname}.jpg"), canvas)

        with open(os.path.join(lbl_dir, f"{fname}.txt"), "w") as f:
            for cls_id, bx, by, bw, bh in all_annos:
                bx = max(0.01, min(0.99, bx))
                by = max(0.01, min(0.99, by))
                bw = max(0.01, min(0.99, bw))
                bh = max(0.01, min(0.99, bh))
                f.write(f"{cls_id} {bx:.6f} {by:.6f} {bw:.6f} {bh:.6f}\n")


def copy_and_remap_original_dataset():
    """Copy real construction images and remap class IDs to unified schema."""
    if not os.path.exists(SRC_DATASET):
        print(f"[!] Source dataset {SRC_DATASET} not found. Skipping copy.")
        return

    for split in ["train", "val", "test"]:
        src_img_dir = os.path.join(SRC_DATASET, "images", split)
        src_lbl_dir = os.path.join(SRC_DATASET, "labels", split)
        dst_img_dir = os.path.join(OUT_DIR, "images", split)
        dst_lbl_dir = os.path.join(OUT_DIR, "labels", split)
        os.makedirs(dst_img_dir, exist_ok=True)
        os.makedirs(dst_lbl_dir, exist_ok=True)

        if not os.path.exists(src_img_dir):
            continue

        images = [f for f in os.listdir(src_img_dir) if f.lower().endswith((".jpg", ".jpeg", ".png"))]
        print(f"[*] Copying and remapping {len(images)} real images from {split}...")

        for img_name in images:
            base, _ = os.path.splitext(img_name)
            src_img_path = os.path.join(src_img_dir, img_name)
            src_lbl_path = os.path.join(src_lbl_dir, f"{base}.txt")

            dst_img_path = os.path.join(dst_img_dir, img_name)
            dst_lbl_path = os.path.join(dst_lbl_dir, f"{base}.txt")

            # Copy image
            shutil.copy2(src_img_path, dst_img_path)

            # Remap labels
            if os.path.exists(src_lbl_path):
                remapped_lines = []
                with open(src_lbl_path, "r") as rf:
                    for line in rf:
                        parts = line.strip().split()
                        if not parts:
                            continue
                        orig_cls = int(parts[0])
                        new_cls = ORIGINAL_MAP.get(orig_cls)
                        if new_cls is not None:
                            remapped_lines.append(f"{new_cls} " + " ".join(parts[1:]))

                with open(dst_lbl_path, "w") as wf:
                    for rl in remapped_lines:
                        wf.write(f"{rl}\n")


def write_data_yaml():
    """Write unified data.yaml configuration."""
    yaml_path = os.path.join(OUT_DIR, "data.yaml")
    with open(yaml_path, "w", encoding="utf-8") as f:
        f.write("# Unified Multi-Domain Industrial PPE Dataset\n")
        f.write("# Domains: Construction Engineering + Chemical Engineering\n")
        f.write(f"path: {OUT_DIR.replace(os.sep, '/')}\n")
        f.write("train: images/train\n")
        f.write("val: images/val\n")
        f.write("test: images/test\n\n")
        f.write(f"nc: {len(CLASS_NAMES)}\n")
        f.write("names:\n")
        for i, name in enumerate(CLASS_NAMES):
            f.write(f"  {i}: {name}\n")

    print(f"[OK] Created dataset configuration: {yaml_path}")


def main():
    print("=" * 75)
    print("  [RAKSHA KAVACH] BUILDING UNIFIED MULTI-DOMAIN INDUSTRIAL PPE DATASET")
    print("  Domains: Chemical Engineering & Construction Engineering")
    print(f"  Destination: {OUT_DIR}")
    print("=" * 75)

    os.makedirs(OUT_DIR, exist_ok=True)

    # 1. Copy and remap real Construction PPE dataset
    copy_and_remap_original_dataset()

    # 2. Augment with synthesized Chemical Engineering & Construction samples
    generate_chemical_synthetic_images("train", count=150)
    generate_chemical_synthetic_images("val", count=25)
    generate_chemical_synthetic_images("test", count=25)

    # 3. Create unified data.yaml
    write_data_yaml()

    print("\n[SUCCESS] Unified Multi-Domain Dataset built successfully!")


if __name__ == "__main__":
    main()
