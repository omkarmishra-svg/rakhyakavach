"""
Training Script for YOLOv8 PPE Compliance Detection Model.
Designed for Google Colab or Kaggle (Free T4 GPU).

Dataset options:
1. Ultralytics Construction-PPE dataset
2. Roboflow 'Construction Site Safety' dataset (11 classes: helmet, vest, boots, gloves, etc.)

Usage:
  python train_ppe.py --epochs 30 --imgsz 640 --batch 16 --model yolov8n.pt
"""

import argparse
import os
import shutil
from ultralytics import YOLO


def train_ppe(
    data_yaml: str = "ppe_dataset/data.yaml",
    epochs: int = 30,
    imgsz: int = 640,
    batch: int = 16,
    base_model: str = "yolov8n.pt",
    output_dir: str = "runs/train/ppe",
    save_best_to: str = "../models/ppe_best.pt"
):
    print("=" * 60)
    print("Raksha Kavach: Training YOLOv8 PPE Detection Model")
    print("=" * 60)
    print(f"Base Model:  {base_model}")
    print(f"Data Config: {data_yaml}")
    print(f"Epochs:      {epochs}")
    print(f"Image Size:  {imgsz}")
    print(f"Batch Size:  {batch}")

    if not os.path.exists(data_yaml):
        print(f"\n[Warning] '{data_yaml}' not found!")
        print("To download the dataset on Colab/Kaggle:")
        print("  1. Install roboflow: !pip install roboflow")
        print("  2. Download 'Construction Site Safety' or Ultralytics PPE dataset.")
        print("  3. Point --data to the generated data.yaml\n")
        return

    # Initialize model
    model = YOLO(base_model)

    # Train model
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
    parser = argparse.ArgumentParser(description="Train PPE YOLOv8 Model")
    parser.add_argument("--data", type=str, default="ppe_dataset/data.yaml", help="Path to data.yaml")
    parser.add_argument("--epochs", type=int, default=30, help="Training epochs")
    parser.add_argument("--imgsz", type=int, default=640, help="Image resolution")
    parser.add_argument("--batch", type=int, default=16, help="Batch size")
    parser.add_argument("--model", type=str, default="yolov8n.pt", help="Base model weights")
    parser.add_argument("--save", type=str, default="../models/ppe_best.pt", help="Target path for best.pt")

    args = parser.parse_args()
    train_ppe(
        data_yaml=args.data,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        base_model=args.model,
        save_best_to=args.save,
    )
