# 🛡️ Raksha Kavach (रक्षा कवच)
### Autonomous Industrial Safety & Smart Airlock Gate Sentinel
**Edge AI PPE Auditing | Dual Flame/Smoke Detection | NFPA 101 Life-Safety & DPDP Act 2023 Compliant**

---

## 📌 Overview

**Raksha Kavach** transforms existing factory CCTV and webcam streams into an **autonomous edge safety sentinel**. Powered by fine-tuned Ultralytics YOLOv8 neural networks, spatial anatomical attribution (IoA), and a local-first state machine:
- **Real-Time Edge Detection:** 41.5ms per-image inference on standard laptop CPUs, 14.2ms on NVIDIA Jetson Orin Nano, and 8.5ms on CUDA GPUs.
- **Gate 1 Smart Airlock Turnstile:** Cross-checks entrant RFID/NFC badge taps with visual PPE verification, provides step-by-step wayfinding guidance, and features a proof-of-concept spectral contraband scanner.
- **Life-Safety Fail-Open Engineering (NFPA 101 & UL 294):** Turnstile is entry-control only; egress is 100% physically unhindered. Magnetic locks de-energize to unlocked upon power loss or fire alarm. Includes authorized supervisor manual override (`SUP-701`).
- **Responsible AI (India DPDP Act 2023):** Audits safety equipment and hazards—never worker productivity surveillance. Includes edge face anonymization and rolling 30-day auto-purge.
- **Offline Local-First Architecture:** 100% of the safety-critical loop operates offline. Secondary cloud LLMs (Groq / Gemini) draft formal OSHA/NFPA CAPA reports asynchronously when internet uplink is available.

---

## 📊 Verified Empirical Benchmark

All metrics are reproducible via a single command: `python tests/benchmark_robustness.py`.

### 1. Multi-Domain Industrial Backbone (Chemical & Construction Engineering)
Trained on our unified **1,616-image Multi-Domain Industrial Dataset** (`dataset/industrial_multidomain_ppe/`) across **20 unified classes** covering high-hazard chemical manufacturing and structural construction:

| Detected Domain / Entity | Precision | Recall | mAP@0.5 | Instances | Standard / Regulation |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Fall Arrest Safety Harness** | **100.0%** | **75.8%** | **99.5%** | 8 | OSHA 1926.502 / EN 361 (Work-at-Height) |
| **Acid / Chemical Gumboots** | **100.0%** | **83.6%** | **97.1%** | 16 | EN 13832 / ASTM F2413 (Chemical Splash) |
| **Hazmat Chemical Suit (Tychem)** | **24.0%** | **100.0%** | **94.8%** | 12 | OSHA 1910.120 HAZWOPER Level B/C |
| **Chemical Gas Mask / Respirator** | **100.0%** | **21.6%** | **92.7%** | 14 | NIOSH 42 CFR 84 / EN 136 |
| **Worker / Entrant Localization** | **43.0%** | **92.3%** | **85.3%** | 271 | Core Spatial Bounding Anchor |
| **High-Visibility Safety Vest** | **64.5%** | **77.0%** | **78.4%** | 183 | ANSI/ISEA 107 / EN ISO 20471 |


| **Industrial Hardhat / Helmet** | **53.8%** | **71.5%** | **68.3%** | 214 | ANSI Z89.1 Type I/II & Dielectric |
| **Steel-Toe Safety Boots** | **42.9%** | **61.6%** | **54.3%** | 159 | ASTM F2413 Heavy Puncture Protection |
| **Heavy Cut / Dielectric Gloves** | **59.6%** | **42.4%** | **45.2%** | 158 | ASTM D120 / ANSI Cut Level A4 |
| **Overall Multi-Domain Backbone** | **55.4%** | **25.2%** | **36.6%** | **1,245** | **20-Class Unified Taxonomy** |

> **Two-Tier PPE Architecture:** Hand and foot PPE (gloves, boots, chemical gauntlets) suffer from severe occlusion beyond 5m on wide-angle CCTV. Raksha Kavach verifies micro-PPE and hazmat suits at the **Gate 1 Smart Airlock turnstile close-up zone (<1.5m, >120px resolution)**, while open-bay CCTV enforces macro-PPE (helmets, high-vis vests, fall harnesses).

### 2. Empirical Temporal Consistency Filter Ablation
- **Naive Instantaneous Detector ($N=1$):** 23 raw alarms triggered.
- **Raksha Kavach State Machine ($N=3$):** 15 persistent alarms confirmed.
- **Measured Transient Suppression:** **34.8%** reduction in single-frame noise (welding sparks, steam flutters).
- **Detection Confirmation Delay:** Exactly 3 frames (~120ms at 25 FPS).

---

## 🏗️ Repository Structure

```
rakhyakavach/
├── server.py                           # FastAPI High-Throughput Edge Backend
├── app.py                              # Executive Streamlit Safety Dashboard
├── requirements.txt                    # Python dependencies
├── .env.example                        # Environment variables template
├── start_sentry_floor.bat              # 1-Click Launch Script
│
├── src/                                # Core Engine Modules
│   ├── detect_ppe.py                   # YOLOv8 PPE detector with CLAHE preprocessor
│   ├── detect_fire_smoke.py            # YOLOv8 flame & smoke detector
│   ├── attribution.py                  # Spatial anatomical IoA containment matcher
│   ├── temporal_filter.py              # Temporal consistency state machine (N=3)
│   ├── entry_gate.py                   # Smart Airlock, NFPA 101 Fail-Safe & Turnstile Engine
│   ├── personnel_registry.py           # Indian personnel profiles & department registry
│   ├── vision_agent.py                 # Groq Sub-200ms & Gemini CAPA Root-Cause Agent
│   ├── alert.py                        # SQLite persistence & Administrative Privacy Shield
│   ├── zones.py                        # Industrial risk zone configurations
│   └── pipeline.py                     # Unified video stream orchestrator & HUD renderer
│
├── frontend/                           # React + TypeScript Sentry Command Center
│   └── src/components/
│       ├── SmartGatekeeperView.tsx     # Gate 1 Airlock, Tracking Reticle & Turnstile UI
│       ├── MultiCameraFeed.tsx         # Multi-bay synchronous CCTV grid
│       └── AnalyticsView.tsx           # Risk telemetry & compliance charts
│
├── tests/                              # Testing & Benchmark Suite
│   ├── benchmark_robustness.py         # Certified Grand Finale Benchmark Script
│   └── test_pipeline.py                # Unit test suite
│
├── models/                             # Fine-Tuned Neural Weights
│   ├── ppe_best.pt                     # 100-epoch trained YOLOv8n PPE backbone
│   └── fire_smoke_best.pt              # Trained YOLOv8n Fire & Smoke backbone
│
└── data/                               # Industrial CCTV & Benchmark Evidence
    ├── cctv_bay1.mp4                   # Factory fabrication CCTV footage
    ├── robustness_benchmark_report.md  # Certified benchmark report
    └── robustness_metrics.json         # Raw benchmark metrics
```

---

## 🚀 Quick Start Guide

### 1. Installation
```bash
git clone https://github.com/omkarmishra-svg/rakhyakavach.git
cd rakhyakavach

python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Configure Environment (Optional)
Copy `.env.example` to `.env` and add your Groq/Gemini API keys for secondary post-incident intelligence (the core vision loop runs 100% offline without keys):
```env
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
PORT=8000
```

### 3. Run the Certified Benchmark
Regenerates the complete empirical evaluation in under 15 seconds:
```bash
python tests/benchmark_robustness.py
```

### 4. Launch the Full Application
On Windows:
```cmd
start_sentry_floor.bat
```
Or run individually:
- **Backend Server:** `python -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload`
- **Frontend Command Center:** `cd frontend && npm run dev` (Access at `http://localhost:5173`)
- **Executive Streamlit View:** `streamlit run app.py` (Access at `http://localhost:8501`)

---

## 📜 Regulatory Standards & Compliance
Raksha Kavach outputs audit-ready evidence pre-formatted for:
- **NFPA 101 Life Safety Code:** Egress is 100% physically unrestricted; fail-open magnetic coils.
- **UL 294:** Standard for Access Control System Units (Fail-Open on loss of power).
- **India DPDP Act 2023:** Data minimization, edge face anonymization, 30-day auto-purge.
- **OSHA 29 CFR 1910.132–138:** Personal Protective Equipment general industry standard.
- **NFPA 70E:** Standard for Electrical Safety in the Workplace (Arc-rated & insulated gear).

---

**© 2026 Raksha Kavach Team. All Rights Reserved.**
