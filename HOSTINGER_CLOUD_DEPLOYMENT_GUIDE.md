# ☁️ Raksha Kavach — Hostinger & Cloud VPS Deployment Guide

This guide provides a step-by-step, turnkey walkthrough for deploying **Raksha Kavach (रक्षा कवच)** to **Hostinger VPS** or any Linux Cloud VPS (DigitalOcean, AWS EC2, Hetzner, Linode).

---

## ⚠️ Important Note on Hostinger Plans

- **❌ DO NOT USE Hostinger Web / Shared Hosting ($2.99/mo)**: Shared hosting only supports PHP/WordPress and cannot run Docker, Python FastAPI daemons, OpenCV, or PyTorch neural networks.
- **✅ USE Hostinger KVM VPS (KVM 1, KVM 2, or KVM 4)**: KVM VPS provides a full Ubuntu Linux operating system with dedicated CPU, RAM, root SSH access, and complete Docker support.
  - **Recommended Plan**: **Hostinger KVM 2** (2 vCPU, 8 GB RAM, 100 GB NVMe SSD) — approx. $6.99/mo, ideal for running real-time YOLOv8 inference and the React UI.

---

## 📋 Step-by-Step Deployment Instructions

### Step 1: Set Up Hostinger KVM VPS in hPanel

1. Log into your [Hostinger hPanel](https://hpanel.hostinger.com/).
2. Navigate to **VPS** ➔ Click on your VPS plan.
3. In the **Operating System** section:
   - Select **Plain OS** ➔ **Ubuntu 22.04 64bit** (or Ubuntu 24.04).
   - Set a strong **Root Password** (or paste your SSH public key).
   - Click **Install / Change OS**.
4. Note your **VPS IP Address** (e.g., `185.123.45.67`) shown on the dashboard.

---

### Step 2: Connect to Your VPS via SSH

Open PowerShell (Windows) or Terminal (Mac/Linux) on your computer and connect:

```bash
ssh root@YOUR_VPS_IP
# Example: ssh root@185.123.45.67
```
Enter your root password when prompted.

---

### Step 3: Clone or Upload the Codebase

#### Method A: Via Git / GitHub (Recommended)
Push your code to a GitHub repository (public or private):

```bash
# On your VPS terminal:
cd /opt
git clone https://github.com/YOUR_GITHUB_USERNAME/rakhyakavach.git
cd rakhyakavach
```
*(If private, use a GitHub Personal Access Token or upload an SSH deploy key).*

#### Method B: Direct Upload via SCP from Windows PowerShell
If your code is only on your local machine, run this command from your local Windows PowerShell:

```powershell
# Run from your local Windows PC:
scp -r "c:\Users\ASUS\OneDrive\Desktop\rakhyakavach" root@YOUR_VPS_IP:/opt/
```

---

### Step 4: 1-Click Automated Deployment Script

Once inside `/opt/rakhyakavach` on the VPS, execute the included deployment script:

```bash
cd /opt/rakhyakavach

# Make the deployment script executable and run:
chmod +x deploy_cloud.sh
sudo bash deploy_cloud.sh
```

**What `deploy_cloud.sh` does automatically:**
1. Installs Docker Engine and Docker Compose.
2. Configures the UFW firewall (opens ports 22, 80, 443, 3000, 8000).
3. Verifies AI model weights (`models/ppe_multidomain_best.pt` and `models/fire_smoke_best.pt`).
4. Generates production `.env` configuration.
5. Builds and launches the FastAPI backend and React frontend containers.
6. Executes automated health checks on `http://localhost:8000/api/health`.

Once complete, your application will be live at:
- **Cyber-Deck Dashboard**: `http://YOUR_VPS_IP:3000`
- **AI Inference API**: `http://YOUR_VPS_IP:8000`
- **Swagger Documentation**: `http://YOUR_VPS_IP:8000/docs`

---

### Step 5: (Optional) Point a Custom Domain & Free SSL (HTTPS)

To access your dashboard at `https://safety.yourcompany.com` instead of `http://YOUR_VPS_IP:3000`:

#### 1. Configure DNS in Hostinger / Cloudflare / GoDaddy
Add an **A Record**:
- **Type**: `A`
- **Name / Host**: `safety` (or `@` for root domain)
- **Points to / Value**: `YOUR_VPS_IP`
- **TTL**: 300

#### 2. Install Nginx and Let's Encrypt Certbot on the Host
Run the following commands on your VPS terminal:

```bash
# Install Nginx and Certbot
apt update && apt install -y nginx certbot python3-certbot-nginx

# Create reverse proxy configuration
cat << 'EOF' > /etc/nginx/sites-available/raksha
server {
    server_name safety.yourcompany.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 300s;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/raksha /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx

# Obtain Free Automatic SSL Certificate
certbot --nginx -d safety.yourcompany.com --non-interactive --agree-tos -m your-email@example.com
```

Now you have a secure `https://safety.yourcompany.com` enterprise safety sentinel with automatic SSL renewals!

---

## 🛠️ Common VPS Management Commands

| Action | Command |
| :--- | :--- |
| **View Live Container Logs** | `docker compose logs -f` |
| **Check Container Status** | `docker compose ps` |
| **Restart Application** | `docker compose restart` |
| **Stop Application** | `docker compose down` |
| **Rebuild After Code Update** | `git pull && docker compose up -d --build` |
| **Monitor Host CPU & RAM** | `htop` |

---

## 🌐 Alternative Cloud Providers (AWS / DigitalOcean / Render)

If you are evaluating other cloud platforms alongside Hostinger:

1. **DigitalOcean ($6–$12/mo Droplet)**:
   - Create an Ubuntu 22.04 Droplet (Basic, Regular with SSD, 4GB RAM).
   - Follow the exact same `deploy_cloud.sh` script.
2. **AWS EC2 (Elastic Compute Cloud)**:
   - Launch an **Ubuntu 22.04 LTS** instance (`t3.large` for CPU, or `g4dn.xlarge` if NVIDIA GPU inference is desired).
   - Attach a Security Group allowing Inbound TCP on ports `22, 80, 443, 3000, 8000`.
   - Run `deploy_cloud.sh`.
3. **Render.com / Railway.app**:
   - Connect your GitHub repo.
   - Deploy backend using `Dockerfile.backend` and frontend using `Dockerfile.frontend`.
