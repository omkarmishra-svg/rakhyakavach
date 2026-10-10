# 🚀 Raksha Kavach (रक्षा कवच) — Comprehensive Enterprise Deployment Plan

**Autonomous Industrial Safety & Smart Airlock Gate Sentinel**  
*Dual AI Hazard Detection | Edge Computer Vision | NFPA 101 & UL 294 Life-Safety | DPDP Act 2023 Compliant*

---

## 📑 Table of Contents
1. [Executive Deployment Overview](#1-executive-deployment-overview)
2. [Deployment Topology Matrix](#2-deployment-topology-matrix)
3. [Hardware, Camera & Network Sizing](#3-hardware-camera--network-sizing)
4. [Containerization & Orchestration (Docker & Compose)](#4-containerization--orchestration-docker--compose)
5. [Turnkey Configuration & Environment Management](#5-turnkey-configuration--environment-management)
6. [Native Edge Deployment (NVIDIA Jetson / Industrial PC)](#6-native-edge-deployment-nvidia-jetson--industrial-pc)
7. [Physical Life-Safety & Hardware Interfacing (NFPA 101 & UL 294)](#7-physical-life-safety--hardware-interfacing-nfpa-101--ul-294)
8. [Data Privacy, Security & DPDP Act 2023 Compliance](#8-data-privacy-security--dpdp-act-2023-compliance)
9. [Monitoring, Observability & Watchdogs](#9-monitoring-observability--watchdogs)
10. [Backup, High Availability & Rollback Runbook](#10-backup-high-availability--rollback-runbook)
11. [Pre-Flight Go-Live Verification Checklist](#11-pre-flight-go-live-verification-checklist)

---

## 1. Executive Deployment Overview

Raksha Kavach is engineered with an **Offline Local-First Architecture**. All primary safety-critical loops—including:
- Video stream ingestion (RTSP / USB / ONVIF)
- Dual-pass CLAHE contrast equalization (dust/steam/night shifts)
- YOLOv8 dual neural inference (PPE multi-domain + Fire/Smoke)
- Spatial anatomical attribution (IoA)
- Temporal state machine filtering ($N=3$ frames)
- Smart airlock magnetic turnstile access gating (UL 294 / NFPA 101)
- Edge face anonymization & local SQLite incident auditing (DPDP Act 2023)

operate **100% locally on on-premise edge compute with zero internet connectivity required**. Secondary cloud LLMs (Groq Qwen-2.5-32B and Gemini 2.5 Flash) operate asynchronously as post-incident assistants for drafting OSHA/NFPA incident documentation and CAPA reports only when an uplink is available.

```
                           ┌───────────────────────────────────────────────┐
                           │      FACTORY CCTV / AIRLOCK CAMERAS           │
                           │  - RTSP Bay 1..6 (H.264/H.265 PoE Streams)    │
                           │  - Gate 1 Airlock Camera (<1.5m high-res)     │
                           └───────────────────────┬───────────────────────┘
                                                   │
                                                   ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                   ON-PREMISE EDGE INFERENCE SENTINEL (JETSON / RTX IPC)                  │
│                                                                                          │
│  ┌─────────────────────────┐   ┌──────────────────────────┐   ┌───────────────────────┐  │
│  │ Dual CLAHE Preprocessor │──▶│ YOLOv8 Dual Backbone     │──▶│ Spatial Attributor    │  │
│  │ (Steam / Glare Filter)  │   │ (PPE + Fire/Smoke)       │   │ (IoA Anatomical Mask) │  │
│  └─────────────────────────┘   └──────────────────────────┘   └───────────┬───────────┘  │
│                                                                           │              │
│  ┌─────────────────────────┐   ┌──────────────────────────┐               ▼              │
│  │ Magnetic Turnstile Relay│◀──│ Airlock Access Engine    │◀──┌───────────────────────┐  │
│  │ (UL 294 / Fail-Open)    │   │ (NFPA 70E Verification)  │   │ Temporal State Machine│  │
│  └─────────────────────────┘   └──────────────────────────┘   │ (N=3 Frame Buffer)    │  │
│                                                               └───────────┬───────────┘  │
│                                                                           │              │
│  ┌─────────────────────────┐   ┌──────────────────────────┐               ▼              │
│  │ React Sentry Cyber-Deck │◀──│ FastAPI Core Backend     │◀──┌───────────────────────┐  │
│  │ Dashboard (Port 3000)   │   │ (Port 8000 + SQLite DB)  │   │ DPDP Face Anonymizer  │  │
│  └─────────────────────────┘   └──────────────────────────┘   └───────────────────────┘  │
└──────────────────────────────────────────┬───────────────────────────────────────────────┘
                                           │ (Optional Async Cloud Uplink)
                                           ▼
                           ┌───────────────────────────────────────────────┐
                           │ CLOUD SECONDARY REPORTING (ASYNCHRONOUS)      │
                           │ - Groq / Gemini (OSHA & CAPA Root Cause Draft)│
                           │ - Corporate Safety Slack / Webhook Alerts     │
                           └───────────────────────────────────────────────┘
```

---

## 2. Deployment Topology Matrix

Depending on the operational scale, Raksha Kavach supports four verified deployment topologies:

| Topology | Use Case | Target Hardware | Processing Location | Internet Dependency | Gating Latency |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Topology A: Edge Box (Airlock Gate)** | Single Turnstile / Hazardous Bay Gate | NVIDIA Jetson Orin Nano / Orin NX (8-16GB) | Local Edge Unit | **0% (100% Offline)** | **<25 ms** |
| **Topology B: Factory Server (Multi-Bay)** | Plant-Wide CCTV Hub (4–16 RTSP streams) | Industrial Rack PC (Intel i7/Xeon + RTX 4060/A2000/T4) | Central Server Room | **0% (100% Offline)** | **<45 ms / stream** |
| **Topology C: Enterprise Hybrid** | Multi-Plant Regional Manufacturing | Edge Nodes (A/B) + AWS/Azure Central Hub | Edge (Inference) + Cloud (Audit) | Hybrid (Graceful Local Fallback) | **<35 ms (Edge)** |
| **Topology D: Staging / Client Demo** | Web Pilot & Executive Demonstrations | Ubuntu 22.04 LTS VPS (Docker + Nginx TLS) | Cloud Container | High Speed Uplink | **~80–120 ms** |

---

## 3. Hardware, Camera & Network Sizing

### 3.1 Compute Sizing Guidelines

| Component | Minimum (Edge / Single Camera) | Recommended (Industrial Plant 6 Bays) | Enterprise (16+ Cameras High Throughput) |
| :--- | :--- | :--- | :--- |
| **CPU** | Intel Core i5 (11th Gen+) or ARM Cortex-A78AE | Intel Core i7 (13th Gen+) / AMD Ryzen 7 7800X | Intel Xeon Silver / AMD EPYC (16+ Cores) |
| **RAM** | 16 GB DDR4/DDR5 | 32 GB DDR5 | 64 GB ECC DDR5 |
| **GPU / Accelerator** | NVIDIA Jetson Orin Nano (8GB) or GTX 1660 Ti | NVIDIA RTX 4060 (8GB) / RTX A2000 (12GB) | NVIDIA RTX 4080 (16GB) / RTX A4500 / L4 |
| **Storage** | 256 GB NVMe SSD (Class 30+) | 1 TB NVMe SSD (PCIe 4.0, TBW > 600) | 2 TB Enterprise NVMe (RAID 1 Mirror) |
| **Inference Engine** | PyTorch / ONNX Runtime | PyTorch (FP16) or TensorRT Engine | TensorRT Engine (FP16 / INT8 calibrated) |

### 3.2 Camera Specification & Mounting Rules

*Critical Rule:* High-risk extremities (gloves, boots, dielectric eyewear) suffer from sub-30px degradation beyond 5 meters at 1080p. Deploy the **Two-Tier Vision Standard**:

1. **Gate 1 Airlock Inspection Camera (Tier 1)**:
   - **Resolution**: 1080p @ 30 FPS or 4K @ 20 FPS (H.264/H.265 via RTSP/ONVIF Profile S).
   - **Distance**: Mounted at $1.2\text{m} - 1.5\text{m}$ distance from worker turnstile position.
   - **Field of View (FoV)**: $60^\circ - 75^\circ$ narrow angle lens to capture full body vertical profile with $>120\times 120\text{px}$ glove/boot resolution.
   - **Lighting**: Minimum 300 Lux LED diffuse overhead bar (eliminates harsh shadows).

2. **Open Bay Surveillance Cameras (Tier 2)**:
   - **Resolution**: 1080p @ 15-25 FPS.
   - **Distance**: $3\text{m} - 8\text{m}$ mounting height, $45^\circ$ downward tilt.
   - **Lens**: Varifocal $2.8\text{mm} - 12\text{mm}$ with True WDR (Wide Dynamic Range $\ge 120\text{dB}$) for welding glare and outdoor sunlight transition.
   - **Targeting**: Macro-PPE (Hardhats, High-Vis Vests, Chemical Suits, Fall-Arrest Harnesses) + Smoke/Fire Plumes.

### 3.3 Network & Industrial OT/IT Isolation

```
           [ Corporate IT Network ] (ERP / HR - Read-Only Isolated)
                      │
           ======================= [ Firewalled Dual-NIC Gateway ]
                      │
           [ Industrial Safety OT Network (VLAN 10: 192.168.10.0/24) ]
             ├── 192.168.10.1   Managed PoE+ Switch
             ├── 192.168.10.10  Gate 1 Airlock IP Camera (RTSP)
             ├── 192.168.10.11  Bay 1 High-Voltage CCTV (RTSP)
             ├── 192.168.10.12  Bay 2 Chemical Loading CCTV (RTSP)
             ├── 192.168.10.50  Advantech / Moxa Modbus Relay Unit (Turnstile Barrier)
             └── 192.168.10.100 Raksha Kavach Edge Sentinel Server
```

- **Bandwidth Budget**: 6 cameras $\times$ 4 Mbps H.264 = 24 Mbps total OT network traffic (well within 1 Gbps PoE switch backplane).
- **Subnet Isolation**: CCTV cameras must NEVER be exposed to public WAN or corporate WiFi.

---

## 4. Containerization & Orchestration (Docker & Compose)

To achieve reproducible zero-downtime deployment, Raksha Kavach is partitioned into two container microservices with persistent data volumes:

### 4.1 Backend Container Architecture (`Dockerfile.backend`)
- Base Image: `nvidia/cuda:12.1.1-runtime-ubuntu22.04` (with automatic CPU fallback on standard x86).
- Python 3.10 runtime with PyTorch, Ultralytics, OpenCV headless, FastAPI, and Uvicorn.
- Mounts `/app/data` for the SQLite incident vault (`incidents.db`) and uploaded streams.
- Mounts `/app/models` for model weights (`ppe_multidomain_best.pt`, `fire_smoke_best.pt`).

### 4.2 Frontend Container Architecture (`Dockerfile.frontend`)
- Multi-Stage Build:
  - Stage 1: `node:20-alpine` compiling Vite TypeScript bundle (`npm run build`).
  - Stage 2: `nginx:alpine` serving static SPA assets with built-in reverse proxy routing `/api` and `/data` to the backend.

### 4.3 Multi-Container Production Topology (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  raksha-backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    container_name: raksha-backend
    restart: always
    environment:
      - PORT=8000
      - ALERT_COOLDOWN_SECONDS=60
      - FRAME_SAMPLE_RATE=1
      - PPE_CONFIDENCE_THRESHOLD=0.30
      - FIRE_CONFIDENCE_THRESHOLD=0.25
      - TEMPORAL_WINDOW_FRAMES=3
      - SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL:-}
      - GROQ_API_KEY=${GROQ_API_KEY:-}
      - GEMINI_API_KEY=${GEMINI_API_KEY:-}
    volumes:
      - ./data:/app/data
      - ./models:/app/models
    ports:
      - "8000:8000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 10s
      timeout: 5s
      retries: 3
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]

  raksha-frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.frontend
    container_name: raksha-frontend
    restart: always
    ports:
      - "3000:80"
    depends_on:
      raksha-backend:
        condition: service_healthy

volumes:
  data:
  models:
```

---

## 5. Turnkey Configuration & Environment Management

Create a production `.env` configuration file on the target host:

```bash
# ==============================================================================
# RAKSHA KAVACH // PRODUCTION ENVIRONMENT CONFIGURATION
# ==============================================================================

# Network & Host
HOST=0.0.0.0
PORT=8000

# Edge AI Pipeline Parameters
FRAME_SAMPLE_RATE=1                   # 1 = Full temporal fidelity; 2-3 = Edge compute throttling
PPE_CONFIDENCE_THRESHOLD=0.30         # Calibrated for multi-domain PPE recall
FIRE_CONFIDENCE_THRESHOLD=0.25        # High sensitivity fire/smoke detection
TEMPORAL_WINDOW_FRAMES=3              # N=3 frame buffer for 34.8% transient suppression

# Gating & Safety Protocol
ALERT_COOLDOWN_SECONDS=60             # Alert suppression window per zone
RELAY_PULSE_DURATION_MS=2500          # Magnetic turnstile admittance duration

# Privacy & Compliance (DPDP Act 2023)
FACE_BLURRING_ENABLED=true            # Enforce edge facial anonymization
INCIDENT_RETENTION_DAYS=30            # Strict 30-day auto-purge policy

# Asynchronous Cloud AI Reporting (Optional - Offline Graceful Fallback)
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=AIzaSy...
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

---

## 6. Native Edge Deployment (NVIDIA Jetson / Industrial PC)

For dedicated edge appliances without Docker overhead, deploy natively via Ubuntu systemd services.

### 6.1 TensorRT Engine Optimization (Jetson / RTX GPUs)
Accelerate raw PyTorch weights into FP16 TensorRT `.engine` models for up to 3.2x latency reduction:

```bash
# Export PPE multi-domain weights to TensorRT FP16
yolo export model=models/ppe_multidomain_best.pt format=engine half=True device=0

# Export Fire/Smoke weights to TensorRT FP16
yolo export model=models/fire_smoke_best.pt format=engine half=True device=0
```

### 6.2 Linux Systemd Auto-Start Service Units

Create `/etc/systemd/system/raksha-backend.service`:
```ini
[Unit]
Description=Raksha Kavach Industrial Safety AI Backend
After=network.target

[Service]
Type=simple
User=safety-admin
WorkingDirectory=/opt/rakhyakavach
EnvironmentFile=/opt/rakhyakavach/.env
ExecStart=/opt/rakhyakavach/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8000 --workers 1
Restart=always
RestartSec=3
KillSignal=SIGINT
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

Create `/etc/systemd/system/raksha-frontend.service`:
```ini
[Unit]
Description=Raksha Kavach Sentry Floor Frontend
After=network.target raksha-backend.service

[Service]
Type=simple
User=safety-admin
WorkingDirectory=/opt/rakhyakavach/frontend
ExecStart=/usr/bin/npm run preview -- --host 0.0.0.0 --port 3000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and activate:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now raksha-backend raksha-frontend
```

---

## 7. Physical Life-Safety & Hardware Interfacing (NFPA 101 & UL 294)

The deployment must comply with life-safety egress standards: **NFPA 101 (Life Safety Code)** and **UL 294 (Standard for Access Control System Units)**.

### 7.1 Electrical Wiring & Relay Fail-Open Topology

```
                       [ 24V DC Industrial Power Supply ]
                                     │
                     ┌───────────────┴───────────────┐
                     │                               │
        [ FACP Fire Alarm NC Relay ]                 │
      (Opens instantly during fire alarm)            │
                     │                               │
        [ Mechanical Key Switch SUP-701 ]            │
         (Master Emergency Manual Bypass)            │
                     │                               │
     [ Raksha Kavach Watchdog Relay (NC) ]           │
      (De-energizes Open on Power/OS Failure)        │
                     │                               │
                     ▼                               ▼
       [ Magnetic Turnstile Lock (+) ]   [ Magnetic Turnstile Lock (-) ]
                     │
         ╔═══════════════════════════════════════════╗
         ║  FAIL-OPEN BEHAVIOR:                      ║
         ║  Power Loss   ──▶ Circuit Opens ──▶ FREE  ║
         ║  Fire Alarm   ──▶ Circuit Opens ──▶ FREE  ║
         ║  OS Crash     ──▶ Relay Drops   ──▶ FREE  ║
         ║  Egress (Out) ──▶ Mechanical    ──▶ FREE  ║
         ╚═══════════════════════════════════════════╝
```

### 7.2 Core Physical Life-Safety Commandments
1. **Uninhibited Egress**: Egress (exiting hazardous zones) must NEVER depend on AI camera verification or software approval. Egress turnstiles must be one-way mechanical free-wheeling or equipped with a panic crash bar.
2. **De-Energized Fail-Open**: Magnetic turnstile locks must be wired in a normally-closed (fail-safe) loop. In the event of:
   - Power failure
   - Edge PC reboot or kernel panic
   - Camera cable severance
   The relay de-energizes, unlocking the turnstile to free rotation.
3. **Hardware Watchdog**: An external hardware watchdog timer polls the `/api/health` endpoint every 2 seconds. If three pings fail, it drops the physical relay coil.
4. **Fire Alarm Control Panel (FACP) Shunt**: The local building fire alarm panel is wired in series with the turnstile power feed. Any building fire alarm activation physically cuts power to the locks.

---

## 8. Data Privacy, Security & DPDP Act 2023 Compliance

India's **Digital Personal Data Protection (DPDP) Act 2023** requires strict minimization, purpose limitation, and storage limitation when processing sensor data on employees.

### 8.1 Responsible AI Guarantees
- **No Biometric Identification**: Raksha Kavach detects *objects* (helmets, vests, boots, gloves, smoke plumes), not facial biometric hashes.
- **Edge Face Anonymization**: Bounding boxes detected as `person` undergo real-time facial region blurring (Gaussian blur $\sigma=15$) before any video frame or snapshot is committed to storage.
- **HR & Surveillance Isolation**: The telemetry stream is restricted to Safety Officers and Environmental Health & Safety (EHS) leads. It cannot be routed into employee productivity or time-tracking databases.

### 8.2 Automated 30-Day Storage Purge
The SQLite incident vault (`incidents.db`) enforces a 30-day rolling purge window via automated cron:

```bash
# Add to /etc/cron.daily/raksha-audit-purge
#!/bin/bash
sqlite3 /opt/rakhyakavach/data/incidents.db "DELETE FROM incidents WHERE timestamp < datetime('now', '-30 days'); VACUUM;"
```

---

## 9. Monitoring, Observability & Watchdogs

### 9.1 Native API Telemetry Endpoints
- **Liveness & Readiness**: `GET /api/health` — returns service status, version, and UTC timestamp.
- **Plant Telemetry**: `GET /api/telemetry` — returns active warnings, critical hazards, worker counts, and zone statuses.
- **Live Incidents Stream**: `GET /api/incidents` — live JSON incident feed with severity filtering.

### 9.2 CCTV Reconnection Watchdog
CCTV RTSP streams in industrial environments experience packet loss and camera restarts. The backend `server.py` and OpenCV capture pipeline implement an exponential backoff auto-reconnect loop:

```python
# Automatic RTSP reconnection loop in Sentry Floor
max_retries = 10
retry_delay = 2.0  # seconds

while not stop_flag:
    cap = cv2.VideoCapture(rtsp_url)
    if not cap.isOpened():
        time.sleep(retry_delay)
        retry_delay = min(retry_delay * 1.5, 30.0)
        continue
    retry_delay = 2.0  # reset on successful connect
    ...
```

---

## 10. Backup, High Availability & Rollback Runbook

### 10.1 SQLite Database Durability & WAL Mode
Enable Write-Ahead Logging (WAL) to prevent database locks during simultaneous frame writes and UI queries:

```sql
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
```

Daily automated snapshot backup:
```bash
# Daily hot backup without locking
sqlite3 /opt/rakhyakavach/data/incidents.db ".backup /opt/rakhyakavach/backups/incidents_$(date +%F).db"
```

### 10.2 Model Rollback Procedure
If a fine-tuned model checkpoint produces unexpected false alarms on a new shift:

```bash
# Revert to known stable golden checkpoint
cp /opt/rakhyakavach/models/backup/ppe_multidomain_golden.pt /opt/rakhyakavach/models/ppe_multidomain_best.pt
sudo systemctl restart raksha-backend
```

---

## 11. Pre-Flight Go-Live Verification Checklist

Before commissioning Raksha Kavach into active factory production, the commissioning engineer and safety officer must sign off on all 12 validation steps:

```markdown
### 📋 Pre-Flight Commissioning Sign-Off (Raksha Kavach v2.0)

Facility Name: __________________________   Date: _______________
Lead EHS Engineer: ______________________   Sign-Off: ___________

[ ] 1. Camera Feeds Verified:
       - Gate 1 Airlock Camera mounted <1.5m at eye-height.
       - Bay 1-6 CCTV streams verified at 1080p, >=20 FPS over RTSP.
[ ] 2. Dual CLAHE Preprocessor Checked:
       - Night shift and low-illumination video streams produce clear contrast.
[ ] 3. Model Accuracy & Benchmark Suite:
       - python tests/benchmark_robustness.py executed with zero regressions.
       - python tests/test_pipeline.py passed 100%.
[ ] 4. Temporal State Machine Validation:
       - Transient single-frame welding glares suppressed (N=3 frame buffer).
[ ] 5. Gate Access & Airlock Gating:
       - RFID badge cross-checked against visual PPE (Helmet, Vest, Goggles, Boots).
       - Denied entry when required PPE is absent.
[ ] 6. Life-Safety Fail-Open Check (NFPA 101 / UL 294):
       - Manual power disconnection to Edge PC causes turnstile to IMMEDIATELY unlock.
       - Building Fire Alarm Panel simulation de-energizes turnstiles.
       - Egress direction mechanically unobstructed at all times.
[ ] 7. Supervisor Key Override (SUP-701):
       - Mechanical bypass key unlocks turnstile and logs override in SQLite.
[ ] 8. DPDP Act 2023 Compliance:
       - Facial blurring verified active on live streams and saved snapshots.
[ ] 9. Rate Limiting & Cooldown:
       - Alert spam suppression verified (ALERT_COOLDOWN_SECONDS=60).
[ ] 10. Offline Local-First Immunity:
       - Uplink cable disconnected from edge unit; detection and turnstile gating continue with 0ms interruption.
[ ] 11. Database Retention & Purge:
       - SQLite WAL mode active and 30-day rolling retention cron verified.
[ ] 12. Cyber-Deck Command Center:
       - Frontend accessible at http://<edge-ip>:3000 with real-time telemetry updates.
```
