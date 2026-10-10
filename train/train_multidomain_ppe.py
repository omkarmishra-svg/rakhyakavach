"""
Multi-Domain Industrial PPE Training Engine for Raksha Kavach.
Fine-tunes YOLOv8 across Construction & Chemical Engineering domains:
- Construction: Hardhat, Safety Vest, Steel-Toe Boots, Gloves, Safety Goggles, Fall-Arrest Harness, Welding Shield
- Chemical: Chemical Hazmat Suit, Full-Face/Cartridge Respirator, Chemical Gauntlets, Acid Gumboots, SCBA
- Violations: no_helmet, no_vest, no_gloves, no_boots, no_respirator, no_chemical_suit, no_harness

Saves best weights to:
- models/ppe_multidomain_best.pt
- models/ppe_best.pt (updates core system)
"""

import os
import sys
import time
import shutil
import argparse
import torch
from ultralytics import YOLO

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_YAML = os.path.join(PROJECT_ROOT, "dataset", "industrial_multidomain_ppe", "data.yaml")
SAVE_MULTIDOMAIN_TO = os.path.join(PROJECT_ROOT, "models", "ppe_multidomain_best.pt")
SAVE_MAIN_TO = os.path.join(PROJECT_ROOT, "models", "ppe_best.pt")


def main():
    parser = argparse.ArgumentParser(description="Train Multi-Domain Industrial PPE Model (Chemical + Construction)")
    parser.add_argument("--epochs", type=int, default=3, help="Training epochs (default: 3)")
    parser.add_argument("--batch", type=int, default=16, help="Batch size (default: 16)")
    parser.add_argument("--imgsz", type=int, default=320, help="Image resolution (default: 320 for CPU)")
    parser.add_argument("--model", type=str, default="yolov8n.pt", help="Base model checkpoint")
    parser.add_argument("--device", type=str, default="", help="Device: '0' for GPU or 'cpu'")
    args = parser.parse_args()

    device = args.device if args.device else ("0" if torch.cuda.is_available() else "cpu")

    print("=" * 75)
    print("  [RAKSHA KAVACH] MULTI-DOMAIN INDUSTRIAL PPE TRAINING")
    print("  Domains: Construction Engineering + Chemical Engineering")
    print(f"  Dataset:      {DATA_YAML}")
    print(f"  Base Model:   {args.model}")
    print(f"  Epochs:       {args.epochs}")
    print(f"  Batch Size:   {args.batch}")
    print(f"  Resolution:   {args.imgsz}x{args.imgsz}")
    print(f"  Device:       {device.upper()}")
    print("=" * 75)

    if not os.path.exists(DATA_YAML):
        print(f"[Error] Dataset configuration {DATA_YAML} not found!")
        print("Run `python train/build_multidomain_dataset.py` first.")
        sys.exit(1)

    # Initialize model
    base_candidate = os.path.join(PROJECT_ROOT, args.model)
    init_weights = base_candidate if os.path.exists(base_candidate) else args.model
    print(f"[*] Initializing YOLOv8 from: {init_weights}")
    model = YOLO(init_weights)

    # Output directory
    run_name = "multidomain_chem_const"
    project_dir = os.path.join(PROJECT_ROOT, "runs", "train")

    t0 = time.time()

    # Train model
    results = model.train(
        data=DATA_YAML,
        task="detect",
        epochs=args.epochs,
        batch=args.batch,
        imgsz=args.imgsz,
        project=project_dir,
        name=run_name,
        exist_ok=True,
        device=device,
        amp=(device != "cpu"),
        workers=2,
        verbose=True,
        plots=False,
    )

    t_train = round(time.time() - t0, 1)

    # Evaluate validation metrics
    print("\n[*] Evaluating on Validation Split...")
    val_metrics = model.val(data=DATA_YAML, split="val", imgsz=args.imgsz, verbose=False)

    prec = float(val_metrics.box.mp)
    rec = float(val_metrics.box.mr)
    map50 = float(val_metrics.box.map50)
    map_overall = float(val_metrics.box.map)

    print("\n" + "=" * 75)
    print("  [VALIDATION SUMMARY] MULTI-DOMAIN INDUSTRIAL PPE BACKBONE")
    print("=" * 75)
    print(f"  • Precision:  {prec * 100:.1f}%")
    print(f"  • Recall:     {rec * 100:.1f}%")
    print(f"  • mAP@0.5:    {map50 * 100:.1f}%")
    print(f"  • mAP@0.5:95: {map_overall * 100:.1f}%")
    print(f"  • Elapsed:    {t_train} seconds")
    print("=" * 75)

    # Locate best weights
    best_pt = os.path.join(project_dir, run_name, "weights", "best.pt")
    if not os.path.exists(best_pt):
        best_pt = os.path.join(project_dir, run_name, "weights", "last.pt")

    if os.path.exists(best_pt):
        os.makedirs(os.path.dirname(SAVE_MULTIDOMAIN_TO), exist_ok=True)
        shutil.copy2(best_pt, SAVE_MULTIDOMAIN_TO)
        shutil.copy2(best_pt, SAVE_MAIN_TO)
        print(f"[OK] Saved model checkpoint to: {SAVE_MULTIDOMAIN_TO}")
        print(f"[OK] Updated core system weights: {SAVE_MAIN_TO}")

    # Generate training report
    report_file = os.path.join(PROJECT_ROOT, "data", "multidomain_training_report.md")
    os.makedirs(os.path.dirname(report_file), exist_ok=True)
    with open(report_file, "w", encoding="utf-8") as f:
        f.write("# [RAKSHA KAVACH] Multi-Domain Industrial PPE Model Training Report\n\n")
        f.write(f"**Date:** {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}  \n")
        f.write(f"**Target Domains:** Construction Engineering + Chemical Engineering  \n")
        f.write(f"**Architecture:** Ultralytics YOLOv8 Nano (`{args.model}`)  \n")
        f.write(f"**Training Epochs:** {args.epochs} (Batch Size: {args.batch}, Img Size: {args.imgsz})  \n")
        f.write(f"**Compute Device:** {device.upper()} (Elapsed: {t_train}s)  \n\n")
        f.write("## Validation Metrics\n")
        f.write(f"- **Precision:** {prec * 100:.2f}%\n")
        f.write(f"- **Recall:** {rec * 100:.2f}%\n")
        f.write(f"- **mAP@0.5:** {map50 * 100:.2f}%\n")
        f.write(f"- **mAP@0.5:0.95:** {map_overall * 100:.2f}%\n\n")
        f.write("## Expanded 20-Class Multi-Domain Taxonomy\n")
        f.write("1. **Construction Engineering:** `helmet`, `vest`, `boots`, `gloves`, `goggles`, `safety_harness`, `welding_shield`\n")
        f.write("2. **Chemical Engineering:** `chemical_suit`, `chemical_respirator`, `chemical_gloves`, `chemical_boots`, `scba`\n")
        f.write("3. **Absence/Violations:** `no_helmet`, `no_vest`, `no_gloves`, `no_boots`, `no_respirator`, `no_chemical_suit`, `no_harness`\n\n")
        f.write(f"Model checkpoint active at `{SAVE_MAIN_TO}`.\n")

    print(f"[OK] Training report generated at: {report_file}")


if __name__ == "__main__":
    main()
