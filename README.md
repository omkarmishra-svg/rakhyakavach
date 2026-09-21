# ️ Raksha Kavach — Factory Safety AI Monitoring System

An end-to-end, real-time computer vision safety platform designed for industrial manufacturing floors, warehouses, and hazardous plants. **Raksha Kavach** actively monitors video streams (CCTV, webcams, recorded footage) to enforce PPE compliance, detect flame/smoke hazards, apply temporal smoothing to eliminate false alarms, store cryptographic timestamped snapshot evidence, and surface predictive risk analytics in an executive Streamlit dashboard.

---

## Key Features & Market Differentiators

### 1. Dual Detection Engine & Spatial Attribution
- **YOLOv8 PPE Detection**: Detects `person`, `helmet`, `vest`, `boots`, `gloves`, and `goggles`.
- **Spatial Containment Matching**: Uses geometric attribution (head, torso, extremities) to attribute safety gear to specific workers (`is_compliant`, list of `missing_ppe`).
- **Fire & Smoke Hazard Sentinel**: Identifies localized flames, open sparks, and thermal signatures with prioritized severity (`Critical`, `High`).

### 2. Temporal Smoothing Filter
- Eliminates single-frame flickers, occlusions, and false positives.
- A violation candidate must persist across $N$ consecutive sampled frames before transitioning to a **Confirmed Incident**.

### 3. Business Differentiator 1: Predictive Risk Analytics
- Aggregates violation frequency by factory zone (`Heavy Machinery`, `Assembly Line`, `Loading Dock`, `Chemical Storage`).
- Computes dynamic **Zone Risk Indices** and forecasts safety vulnerability before accidents occur.

### 4. Business Differentiator 2: Audit & Insurance Evidence Hub
- Automated SQLite incident logging with ISO timestamps, worker IDs, and bounding coordinates.
- **Timestamped Evidence Snapshots**: Cropped and stored in `data/snapshots/` for tamper-resistant proof.
- **One-Click Compliance Export**: Instant CSV download and generated OSHA / Insurance Compliance Certificates.

### 5. Multi-Channel Alerting & Rate Limiting
- Configurable per-zone cooldown timers (e.g. 60s) to prevent spamming notifications.
- Webhook dispatchers for **Slack**, **Discord**, and **Microsoft Teams**.

---

## Repository Structure

```
rakhyakavach/
├── app.py                              # Executive Streamlit Safety Dashboard
├── requirements.txt                    # Python dependencies
├── .env.example                        # Environment variables template
├── run_dashboard.bat                   # 1-Click Windows Dashboard Launcher
│
├── src/                                # Core Engine Modules
│   ├── __init__.py
│   ├── detect_ppe.py                   # YOLOv8 PPE detector with fallback heuristics
│   ├── detect_fire_smoke.py            # YOLOv8 Fire & Smoke detector
│   ├── attribution.py                  # Spatial person <-> gear containment matcher
│   ├── temporal_filter.py              # Temporal smoothing buffer
│   ├── zones.py                        # Zone definitions & required PPE rules
│   ├── alert.py                        # SQLite persistence, snapshot capture & webhooks
│   └── pipeline.py                     # Unified video stream orchestrator & HUD renderer
│
├── train/                              # GPU Training Scripts (Colab / Kaggle)
│   ├── train_ppe.py                    # Fine-tune YOLOv8 on PPE dataset
│   └── train_fire_smoke.py             # Fine-tune YOLOv8 on Fire/Smoke dataset
│
├── tests/                              # Testing & Verification
│   ├── test_pipeline.py                # Unit and integration test suite
│   └── generate_demo_video.py          # Synthetic factory test footage generator
│
└── data/                               # Generated Data & Evidence
    ├── demo_factory.mp4                # 8-second realistic factory test clip
    ├── incidents.db                    # SQLite incident database
    └── snapshots/                      # Violation image evidence snapshots
```

---

## Quick Start Guide

### 1. Installation
Clone or navigate to the project directory:
```bash
cd rakhyakavach
pip install -r requirements.txt
```

### 2. Generate Demo Video
If you don't have a live factory camera or video file handy, generate the synthetic test clip:
```bash
python tests/generate_demo_video.py
```
This generates `data/demo_factory.mp4` featuring:
- Worker 101: Compliant (Yellow Helmet + Neon Vest)
- Worker 102: Non-compliant (Missing Helmet, Wears Vest)
- High-heat flame/spark hazard event at seconds 3–6

### 3. Run Unit Tests
Verify the pipeline logic (spatial attribution, temporal filtering, alert rate-limiting):
```bash
python tests/test_pipeline.py
```

### 4. Launch the Executive Dashboard
Run the Streamlit application:
```bash
streamlit run app.py
```
Or double-click `run_dashboard.bat` on Windows.

---

## ️ Dashboard Overview

- ** Live Video Stream & Sentinel**: Live HUD overlay, worker bounding boxes, real-time compliance KPI gauges, and active alert cards.
- ** Predictive Risk & Zone Analytics**: Zone risk ranking table, bar charts by equipment category, and 30-day safety forecasting.
- **️ Audit & Insurance Compliance Hub**: Filterable incident table, snapshot gallery, and one-click CSV / Markdown certificate exports.
- **️ Factory Rules & Webhook Setup**: Interactive per-zone PPE requirement toggles, Slack/Discord webhook URL test button, and database reset.

---

## ️ Fine-Tuning Models on Cloud GPU (Colab / Kaggle)

To train custom YOLOv8 models on Roboflow datasets using free cloud GPUs:
1. Open Google Colab or Kaggle with a free T4 GPU.
2. Upload `train/train_ppe.py` or `train/train_fire_smoke.py`.
3. Set your Roboflow API key and run:
   ```bash
   python train/train_ppe.py
   python train/train_fire_smoke.py
   ```
4. Download the generated `best.pt` weights and place them in `models/ppe_best.pt` and `models/fire_smoke_best.pt`.
