"""
Train YOLOv8 on the Construction-PPE dataset (Ultralytics official 11-class PPE).
Classes: helmet, gloves, vest, boots, goggles, none, Person, no_helmet, no_goggle, no_gloves, no_boots
Saves best weights directly to models/ppe_best.pt.
"""

import os
import sys
import shutil
import argparse
import torch
from ultralytics import YOLO

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_YAML = os.path.join(PROJECT_ROOT, "dataset", "construction-ppe", "data.yaml")
SAVE_BEST_TO = os.path.join(PROJECT_ROOT, "models", "ppe_best.pt")


def main():
    parser = argparse.ArgumentParser(description="Train YOLOv8 on Construction-PPE")
    parser.add_argument("--epochs", type=int, default=5, help="Number of epochs (default: 5 for CPU)")
    parser.add_argument("--batch", type=int, default=8, help="Batch size (default: 8)")
    parser.add_argument("--imgsz", type=int, default=416, help="Image size (default: 416)")
    parser.add_argument("--model", type=str, default="yolov8n.pt", help="Base model")
    args = parser.parse_args()

    print("=" * 60)
    print("  RAKSHA KAVACH: Fine-Tuning YOLOv8 on Construction-PPE")
    print(f"  Dataset:    {DATA_YAML}")
    print(f"  Epochs:     {args.epochs}")
    print(f"  Batch Size: {args.batch}")
    print(f"  Image Size: {args.imgsz}")
    print(f"  Device:     {'CUDA' if torch.cuda.is_available() else 'CPU'}")
    print(f"  Target:     {SAVE_BEST_TO}")
    print("=" * 60)

    if not os.path.exists(DATA_YAML):
        print(f"[Error] {DATA_YAML} not found!")
        sys.exit(1)

    # Initialize model
    base_model = os.path.join(PROJECT_ROOT, args.model) if os.path.exists(os.path.join(PROJECT_ROOT, args.model)) else args.model
    model = YOLO(base_model)

    device = 0 if torch.cuda.is_available() else "cpu"

    # Train
    results = model.train(
        data=DATA_YAML,
        task="detect",
        epochs=args.epochs,
        batch=args.batch,
        imgsz=args.imgsz,
        project=os.path.join(PROJECT_ROOT, "runs", "train"),
        name="construction_ppe",
        exist_ok=True,
        device=device,
        amp=torch.cuda.is_available(),
        patience=5,
        verbose=True,
    )

    # Copy best weights
    best_weights = os.path.join(PROJECT_ROOT, "runs", "train", "construction_ppe", "weights", "best.pt")
    if os.path.exists(best_weights):
        os.makedirs(os.path.dirname(SAVE_BEST_TO), exist_ok=True)
        shutil.copy(best_weights, SAVE_BEST_TO)
        print(f"\n[SUCCESS] New fine-tuned model saved to: {SAVE_BEST_TO}")
    else:
        last_weights = os.path.join(PROJECT_ROOT, "runs", "train", "construction_ppe", "weights", "last.pt")
        if os.path.exists(last_weights):
            os.makedirs(os.path.dirname(SAVE_BEST_TO), exist_ok=True)
            shutil.copy(last_weights, SAVE_BEST_TO)
            print(f"\n[OK] Model weights saved to: {SAVE_BEST_TO}")


if __name__ == "__main__":
    main()
