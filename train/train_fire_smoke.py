"""
Training Script for YOLOv8 Fire & Smoke Hazard Detection Model.
Designed for Google Colab or Kaggle (Free T4 GPU).

Dataset options:
1. Roboflow Universe 'fire smoke detection dataset' (classes: fire, smoke)
2. Kaggle Fire and Smoke YOLO dataset

Usage:
  python train_fire_smoke.py --epochs 30 --imgsz 640 --batch 16 --model yolov8n.pt
"""

import argparse
import os
import shutil
from ultralytics import YOLO


def train_fire_smoke(
    data_yaml: str = "fire_dataset/data.yaml",
    epochs: int = 30,
    imgsz: int = 640,
    batch: int = 16,
    base_model: str = "yolov8n.pt",
    output_dir: str = "runs/train/fire_smoke",
    save_best_to: str = "../models/fire_smoke_best.pt"
):
    print("=" * 60)
    print("Raksha Kavach: Training YOLOv8 Fire & Smoke Detection Model")
    print("=" * 60)
    print(f"Base Model:  {base_model}")
    print(f"Data Config: {data_yaml}")
    print(f"Epochs:      {epochs}")
    print(f"Image Size:  {imgsz}")
    print(f"Batch Size:  {batch}")

    if not os.path.exists(data_yaml):
        print(f"\n[Warning] '{data_yaml}' not found!")
        print("To download the dataset on Colab/Kaggle:")
        print("  1. Search 'fire smoke detection' on Roboflow Universe / Kaggle.")
        print("  2. Export in YOLOv8 format.")
        print("  3. Point --data to data.yaml\n")
        return

    model = YOLO(base_model)

    results = model.train(
        data=data_yaml,
        epochs=epochs,
        imgsz=imgsz,
        batch=batch,
        project=output_dir,
        name="experiment",
        exist_ok=True,
    )

    best_weights = os.path.join(output_dir, "experiment", "weights", "best.pt")
    if os.path.exists(best_weights):
        os.makedirs(os.path.dirname(save_best_to), exist_ok=True)
        shutil.copy(best_weights, save_best_to)
        print(f"\n[Success] Best weights saved to: {save_best_to}")
    else:
        print(f"\nTraining finished. Check results in {output_dir}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Fire & Smoke YOLOv8 Model")
    parser.add_argument("--data", type=str, default="fire_dataset/data.yaml", help="Path to data.yaml")
    parser.add_argument("--epochs", type=int, default=30, help="Training epochs")
    parser.add_argument("--imgsz", type=int, default=640, help="Image resolution")
    parser.add_argument("--batch", type=int, default=16, help="Batch size")
    parser.add_argument("--model", type=str, default="yolov8n.pt", help="Base model weights")
    parser.add_argument("--save", type=str, default="../models/fire_smoke_best.pt", help="Target path for best.pt")

    args = parser.parse_args()
    train_fire_smoke(
        data_yaml=args.data,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        base_model=args.model,
        save_best_to=args.save,
    )
