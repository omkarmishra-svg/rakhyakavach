# 🚀 Raksha Kavach — 100% FREE Render.com Deployment Guide

Deploy the **entire Raksha Kavach application (React Frontend + FastAPI AI Backend + YOLOv8 Models)** on **Render.com completely free without entering a credit card**.

---

## 🌟 Why Render Free Tier is Perfect for this Project
- **100% FREE**: No credit card required to sign up.
- **Single Unified URL**: Both the Cyber-Deck React UI and AI API are served from one free service (e.g. `https://raksha-kavach.onrender.com`).
- **Free Automatic SSL / HTTPS**: Automatic Let's Encrypt certificates.
- **Auto-Deploy on Git Push**: Any changes pushed to your GitHub repo automatically trigger a zero-downtime rebuild.

---

## 📋 2-Minute Deployment (Method 1: 1-Click Blueprint - Recommended)

### Step 1: Sign Up on Render
1. Open [https://render.com](https://render.com) and click **Get Started for Free**.
2. Sign in with your **GitHub account** (`omkarmishra-svg`).

### Step 2: Deploy Using the Blueprint
1. Go directly to your [Render Blueprints Dashboard](https://dashboard.render.com/blueprints).
2. Click the **New Blueprint Instance** button.
3. Under *Connect a repository*, select **`rakhyakavach`** (or paste `https://github.com/omkarmishra-svg/rakhyakavach`).
4. Give your blueprint a Service Group Name: `raksha-kavach`.
5. Render will automatically detect `render.yaml` and configure the **Free Plan**.
6. Click **Apply**.

---

## 📋 Alternative: Manual Web Service (Method 2)

If you prefer deploying manually:
1. In the [Render Dashboard](https://dashboard.render.com/), click **New +** (top right) ➔ **Web Service**.
2. Select your GitHub repository: **`omkarmishra-svg/rakhyakavach`**.
3. Configure the following:
   - **Name**: `raksha-kavach` (or any name you like)
   - **Region**: Choose closest to you (e.g., `Singapore` or `Frankfurt` or `Oregon`)
   - **Branch**: `main`
   - **Language / Runtime**: **Docker** (Render will automatically detect our `Dockerfile`)
   - **Instance Type**: **Free** ($0 / month)
4. Click **Create Web Service** at the bottom.

---

## ⏳ What Happens During Build
Render's build system will automatically:
1. Build the Vite React frontend using Node 20 (`npm run build`).
2. Package Python 3.10, PyTorch, Ultralytics, and OpenCV headless.
3. Bundle the dual AI models (`ppe_multidomain_best.pt`, `fire_smoke_best.pt`).
4. Mount the React UI at the root `/` and AI API at `/api/`.
5. Run the health check on `/api/health`.

Once build completes (takes ~3–4 minutes for the first Docker image build), your website is live!

---

## 🌐 Your Live URLs
- **Live Cyber-Deck Dashboard**: `https://raksha-kavach.onrender.com`
- **AI Inference API**: `https://raksha-kavach.onrender.com/api/telemetry`
- **Interactive Swagger Docs**: `https://raksha-kavach.onrender.com/docs`
