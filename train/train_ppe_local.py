"""
Local Training Script for YOLOv8 PPE Detection Model.
Adapted from Kaggle kernel: hinepo/yolov8-finetuning-for-ppe-detection

Uses the Construction Site Safety Image Dataset (Roboflow) downloaded via Kaggle.
Supports both CPU and GPU training with auto-detection.

Classes (10): Hardhat, Mask, NO-Hardhat, NO-Mask, NO-Safety Vest,
              Person, Safety Cone, Safety Vest, machinery, vehicle

Usage:
  python train/train_ppe_local.py
  python train/train_ppe_local.py --epochs 10 --batch 8
"""

import argparse
import os
import sys
import shutil
import yaml

# Add project root to path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, PROJECT_ROOT)

try:
    from ultralytics import YOLO
except ImportError:
    print("ultralytics not installed. Run: pip install ultralytics")
    sys.exit(1)

try:
    import torch
    HAS_CUDA = torch.cuda.is_available()
except ImportError:
    HAS_CUDA = False


# ---- Configuration (adapted from Kaggle CFG class) ----
CLASSES = [
    'Hardhat', 'Mask', 'NO-Hardhat', 'NO-Mask',
    'NO-Safety Vest', 'Person', 'Safety Cone',
    'Safety Vest', 'machinery', 'vehicle'
]


def find_dataset_dir():
    """Locate the CSS dataset directory."""
    candidates = [
        os.path.join(PROJECT_ROOT, "dataset", "css-data"),
        os.path.join(PROJECT_ROOT, "dataset"),
        os.path.join(PROJECT_ROOT, "ppe_dataset"),
    ]
    for d in candidates:
        if os.path.isdir(d):
            # Check if train/images exists directly or one level deeper
            if os.path.isdir(os.path.join(d, "train", "images")):
                return d
            # Check subdirectories
            for sub in os.listdir(d):
                sub_path = os.path.join(d, sub)
                if os.path.isdir(sub_path) and os.path.isdir(os.path.join(sub_path, "train", "images")):
                    return sub_path
    return None


def create_data_yaml(dataset_dir, output_path):
    """Create data.yaml for YOLO training (matches Kaggle notebook format)."""
    data_config = {
        'train': os.path.join(dataset_dir, 'train').replace("\\", "/"),
        'val': os.path.join(dataset_dir, 'valid').replace("\\", "/"),
        'test': os.path.join(dataset_dir, 'test').replace("\\", "/"),
        'nc': len(CLASSES),
        'names': CLASSES,
    }
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w') as f:
        yaml.dump(data_config, f, default_flow_style=False)
    print(f"[OK] Created data.yaml at: {output_path}")
    return output_path


def train(args):
    print("=" * 60)
    print("  Raksha Kavach: YOLOv8 PPE Fine-Tuning (Local)")
    print("  Adapted from hinepo/yolov8-finetuning-for-ppe-detection")
    print("=" * 60)

    # Find dataset
    dataset_dir = find_dataset_dir()
    if dataset_dir is None:
        print("\n[ERROR] Dataset not found!")
        print("Download it first with:")
        print("  kaggle datasets download -d snehilsanyal/construction-site-safety-image-dataset-roboflow -p dataset --unzip")
        return False

    print(f"\n  Dataset:    {dataset_dir}")
    print(f"  Base Model: {args.model}")
    print(f"  Epochs:     {args.epochs}")
    print(f"  Batch Size: {args.batch}")
    print(f"  Image Size: {args.imgsz}")
    print(f"  Device:     {'CUDA' if HAS_CUDA else 'CPU'}")
    print()

    # Create data.yaml
    data_yaml = os.path.join(PROJECT_ROOT, "data.yaml")
    create_data_yaml(dataset_dir, data_yaml)

    # Determine device
    device = 0 if HAS_CUDA else "cpu"

    # Initialize model
    model_path = os.path.join(PROJECT_ROOT, args.model)
    if not os.path.exists(model_path):
        model_path = args.model  # Let ultralytics download it
    model = YOLO(model_path)

    # Train (matching Kaggle notebook parameters)
    print("\n[Training] Starting YOLOv8 fine-tuning...")
    model.train(
        data=data_yaml,
        task='detect',
        imgsz=args.imgsz,
        epochs=args.epochs,
        batch=args.batch,
        optimizer='auto',
        lr0=1e-3,
        lrf=0.01,
        weight_decay=5e-4,
        dropout=0.025,
        fraction=1.0,
        patience=max(5, args.epochs // 4),
        label_smoothing=0.0,
        name=f'ppe_css_{args.epochs}_epochs',
        seed=88,
        val=True,
        amp=HAS_CUDA,  # AMP only on GPU
        exist_ok=True,
        resume=False,
        device=device,
        verbose=True,
    )

    # Copy best weights to models/ directory
    best_weights = os.path.join("runs", "detect", f"ppe_css_{args.epochs}_epochs", "weights", "best.pt")
    if os.path.exists(best_weights):
        save_to = os.path.join(PROJECT_ROOT, "models", "ppe_best.pt")
        os.makedirs(os.path.dirname(save_to), exist_ok=True)
        shutil.copy(best_weights, save_to)
        print(f"\n{'=' * 60}")
        print(f"  [SUCCESS] Best weights saved to: {save_to}")
        print(f"{'=' * 60}")
        return True
    else:
        last_weights = os.path.join("runs", "detect", f"ppe_css_{args.epochs}_epochs", "weights", "last.pt")
        if os.path.exists(last_weights):
            save_to = os.path.join(PROJECT_ROOT, "models", "ppe_best.pt")
            os.makedirs(os.path.dirname(save_to), exist_ok=True)
            shutil.copy(last_weights, save_to)
            print(f"\n  [OK] Last weights saved to: {save_to}")
            return True
        print(f"\n  [WARN] No weights found. Check runs/detect/ for output.")
        return False


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train YOLOv8 PPE Model (Local)")
    parser.add_argument("--epochs", type=int, default=5, help="Training epochs (default: 5 for CPU, use 80 for GPU)")
    parser.add_argument("--batch", type=int, default=8, help="Batch size (default: 8)")
    parser.add_argument("--imgsz", type=int, default=640, help="Image resolution (default: 640)")
    parser.add_argument("--model", type=str, default="yolov8n.pt", help="Base model (yolov8n/s/m/l/x)")

    args = parser.parse_args()
    train(args)
