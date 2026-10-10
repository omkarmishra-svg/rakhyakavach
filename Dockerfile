# ==============================================================================
# RAKSHA KAVACH // Production Unified Dockerfile for Render.com Free Tier
# Multi-stage build: React Frontend + FastAPI AI Inference Backend in a Single Service
# CPU-optimized PyTorch (avoids 2.5GB CUDA bloat and build timeouts)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build the React TypeScript Frontend
# ------------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm install

# Copy source and config files (node_modules is excluded by .dockerignore)
COPY frontend/src ./src
COPY frontend/index.html ./
COPY frontend/tsconfig.json ./
COPY frontend/vite.config.ts ./

RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Python 3.10 Runtime with FastAPI & YOLOv8 Vision
# ------------------------------------------------------------------------------
FROM python:3.10-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PORT=10000

# Install graphics and curl for healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ffmpeg \
    libsm6 \
    libxext6 \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install CPU-optimized PyTorch first (only ~150MB, prevents memory exhaustion & build timeouts)
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Install FastAPI and inference requirements with OpenCV headless
RUN pip install --no-cache-dir \
    fastapi>=0.109.0 \
    uvicorn>=0.27.0 \
    python-multipart>=0.0.9 \
    pydantic>=2.0.0 \
    pyyaml>=6.0.0 \
    ultralytics>=8.0.0 \
    opencv-python-headless>=4.8.0 \
    pillow>=10.0.0 \
    requests>=2.31.0 \
    python-dotenv>=1.0.0

# Copy application source code and fine-tuned models
COPY src/ /app/src/
COPY models/ /app/models/
COPY data/ /app/data/
COPY server.py /app/server.py
COPY data.yaml /app/data.yaml


# Ensure persistent storage directories exist
RUN mkdir -p /app/data/uploads

# Copy compiled React frontend assets from Stage 1
COPY --from=frontend-builder /frontend/dist /app/frontend/dist

EXPOSE 10000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:${PORT:-10000}/api/health || exit 1

CMD ["python", "server.py"]
