# ==============================================================================
# RAKSHA KAVACH // Production Unified Dockerfile for Render.com Free Tier
# Multi-stage build: React Frontend + FastAPI AI Inference Backend in a Single Service
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build the React TypeScript Frontend
# ------------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Python 3.10 Runtime with FastAPI & YOLOv8 Vision
# ------------------------------------------------------------------------------
FROM python:3.10-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PORT=10000

# Install essential graphics libraries for headless OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    ffmpeg \
    libsm6 \
    libxext6 \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python requirements
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
    fastapi>=0.109.0 \
    uvicorn>=0.27.0 \
    python-multipart>=0.0.9 \
    pydantic>=2.0.0 \
    pyyaml>=6.0.0 \
    opencv-python-headless>=4.8.0 \
    -r requirements.txt

# Copy backend source code & AI models
COPY src/ /app/src/
COPY models/ /app/models/
COPY server.py /app/server.py
COPY data.yaml /app/data.yaml

# Create persistent storage directories
RUN mkdir -p /app/data/uploads

# Copy compiled React frontend assets from Stage 1
COPY --from=frontend-builder /frontend/dist /app/frontend/dist

EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:${PORT:-10000}/api/health || exit 1

CMD ["python", "server.py"]
