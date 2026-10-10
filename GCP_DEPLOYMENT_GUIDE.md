# ☁️ Raksha Kavach — Google Cloud Platform (GCP) Deployment Guide

**Step-by-step walkthrough to deploy Raksha Kavach on Google Cloud Compute Engine using your $300 Free Trial Credit.**

---

## 🌟 Why GCP is Ideal for Raksha Kavach
- **$300 Free Credit**: 90-day free trial on new accounts.
- **1-Click Browser SSH**: Connect directly from your web browser with zero local tools or SSH keys required.
- **Dedicated Specs**: 2–4 vCPUs and 8–16 GB RAM run dual YOLOv8 inference smoothly.
- **1-Click Automated Setup**: Our turnkey `deploy_cloud.sh` script automates Docker, dependencies, and health checks.

---

## 📋 Step 1: Claim Free Trial & Open Google Cloud Console

1. Go to [https://cloud.google.com/free](https://cloud.google.com/free).
2. Click **Get started for free** and sign in with your Google account.
3. Accept terms, fill in your profile, and activate your **$300 free credits**.
4. Open the [Google Cloud Console](https://console.cloud.google.com/).

---

## 🖥️ Step 2: Create a Compute Engine VM Instance

1. In the GCP Console search bar at the top, type **VM instances** and select it (or go to **Compute Engine** ➔ **VM instances**).
2. If prompted, click **Enable Compute Engine API** (takes ~30 seconds).
3. Click the blue button **Create Instance** at the top.
4. Configure the following fields:

| Setting | Value / Selection | Reason |
| :--- | :--- | :--- |
| **Name** | `raksha-sentinel-vm` | Human-readable identifier |
| **Region / Zone** | `us-central1` or `asia-south1` (Mumbai) | Choose region closest to you |
| **Series** | **E2** | Cost-effective and stable |
| **Machine Type** | **e2-standard-2** (2 vCPU, 8 GB memory) OR **e2-standard-4** (4 vCPU, 16 GB memory) | 8–16 GB RAM handles dual YOLOv8 models effortlessly |
| **Boot Disk** | Click **Change** ➔ OS: **Ubuntu**, Version: **Ubuntu 22.04 LTS**, Size: **50 GB** (Balanced persistent disk) ➔ Click **Select** | Clean LTS environment with ample room for models and Docker |
| **Firewall** | Check **☑ Allow HTTP traffic**<br>Check **☑ Allow HTTPS traffic** | Allows web visitors to reach the server |

5. Click **Create** at the bottom of the page.
6. Wait 30–60 seconds until a green checkmark appears next to `raksha-sentinel-vm`.
7. **Copy your External IP** displayed in the table (e.g., `34.123.45.67`).

---

## 🛡️ Step 3: Open Dashboard Ports (3000 & 8000) in GCP Firewall

By default, GCP restricts custom ports. Let's allow ports `3000` (UI) and `8000` (API):

1. In the GCP Console search bar, type **Firewall** and select **VPC network ➔ Firewall**.
2. Click **Create Firewall Rule** at the top:
   - **Name**: `allow-raksha-ports`
   - **Network**: `default`
   - **Targets**: `All instances in the network`
   - **Source IPv4 ranges**: `0.0.0.0/0`
   - **Protocols and ports**:
     - Check **Specified protocols and ports**
     - Check **TCP** and enter: `3000, 8000`
3. Click **Create**.

---

## 🚀 Step 4: 1-Click Launch via In-Browser SSH

1. Go back to **Compute Engine ➔ VM instances**.
2. In the row for `raksha-sentinel-vm`, click the **SSH** button under the *Connect* column.
3. A terminal window will open right in your web browser!
4. In that browser terminal, paste and run these two commands:

```bash
cd /opt && sudo git clone https://github.com/omkarmishra-svg/rakhyakavach.git
cd /opt/rakhyakavach && sudo bash deploy_cloud.sh
```

**Sit back and watch!** The script will automatically:
- Install Docker Engine & Compose
- Configure host firewall
- Verify AI model weights (`ppe_multidomain_best.pt`, `fire_smoke_best.pt`)
- Generate production `.env`
- Build and spin up the backend and frontend microservices
- Run `/api/health` automated checks

---

## 🌐 Step 5: Access Your Live Cloud Dashboard

Once `deploy_cloud.sh` finishes, your application is live on the internet!

Open your browser and navigate to:
- **Cyber-Deck Dashboard**: `http://YOUR_EXTERNAL_IP:3000`
- **AI Inference API**: `http://YOUR_EXTERNAL_IP:8000`
- **Interactive Swagger Docs**: `http://YOUR_EXTERNAL_IP:8000/docs`

*(Replace `YOUR_EXTERNAL_IP` with the External IP from Step 2, e.g. `http://34.123.45.67:3000`)*

---

## 🛠️ Helpful VM Management Commands (Inside the GCP SSH Terminal)

```bash
# View real-time AI inference and stream logs
sudo docker compose logs -f

# Restart services
sudo docker compose restart

# Check container status
sudo docker compose ps

# Update code from GitHub and re-build
cd /opt/rakhyakavach
sudo git pull && sudo docker compose up -d --build
```
