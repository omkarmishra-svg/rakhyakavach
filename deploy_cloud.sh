#!/usr/bin/env bash
# ==============================================================================
# RAKSHA KAVACH // Cloud VPS Turnkey Deployment Script
# Target OS: Ubuntu 22.04 / 24.04 LTS (Hostinger VPS / DigitalOcean / AWS EC2 / Hetzner)
# ==============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN}  RAKSHA KAVACH // Cloud VPS Turnkey Deployment Script      ${NC}"
echo -e "${CYAN}  FastAPI + YOLOv8 + React Vite Sentry Floor               ${NC}"
echo -e "${CYAN}============================================================${NC}"
echo ""

# 1. Root check
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Please run this script as root or with sudo:${NC}"
  echo "  sudo bash deploy_cloud.sh"
  exit 1
fi

# 2. Update system and install prerequisites
echo -e "${YELLOW}[1/6] Updating system packages & installing dependencies...${NC}"
apt-get update -y
apt-get install -y --no-install-recommends \
    curl \
    git \
    ufw \
    ca-certificates \
    gnupg \
    lsb-release \
    sqlite3

# 3. Install Docker & Docker Compose if not installed
echo -e "${YELLOW}[2/6] Verifying Docker and Docker Compose...${NC}"
if ! command -v docker &> /dev/null; then
    echo "Installing Docker Engine..."
    apt-get install -y docker.io docker-compose-plugin
    systemctl enable --now docker
else
    echo "Docker already installed: $(docker --version)"
fi

# Ensure docker-compose command is available
if ! command -v docker-compose &> /dev/null; then
    echo "Symlinking docker compose plugin..."
    ln -s /usr/libexec/docker/cli-plugins/docker-compose /usr/local/bin/docker-compose || true
fi

# 4. Configure Firewall (UFW)
echo -e "${YELLOW}[3/6] Configuring UFW Firewall...${NC}"
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP Web'
ufw allow 443/tcp comment 'HTTPS SSL'
ufw allow 3000/tcp comment 'Raksha Dashboard'
ufw allow 8000/tcp comment 'Raksha AI API'
echo "y" | ufw enable || true
echo -e "${GREEN}Firewall configured.${NC}"

# 5. Environment configuration setup
echo -e "${YELLOW}[4/6] Setting up production environment variables (.env)...${NC}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}Created .env from .env.example.${NC}"
    else
        cat << 'EOF' > .env
HOST=0.0.0.0
PORT=8000
ALERT_COOLDOWN_SECONDS=60
FRAME_SAMPLE_RATE=1
PPE_CONFIDENCE_THRESHOLD=0.30
FIRE_CONFIDENCE_THRESHOLD=0.25
TEMPORAL_WINDOW_FRAMES=3
FACE_BLURRING_ENABLED=true
INCIDENT_RETENTION_DAYS=30
SLACK_WEBHOOK_URL=
GROQ_API_KEY=
GEMINI_API_KEY=
EOF
        echo -e "${GREEN}Created default .env.${NC}"
    fi
fi

# Ensure data directory exists
mkdir -p data/uploads

# 6. Verify Model Weights
echo -e "${YELLOW}[5/6] Checking AI model weights...${NC}"
if [ ! -f "models/ppe_multidomain_best.pt" ] && [ ! -f "models/ppe_best.pt" ]; then
    echo -e "${RED}[WARNING] Model weights missing in models/ directory!${NC}"
    echo "Please ensure models/ppe_multidomain_best.pt and models/fire_smoke_best.pt are present."
else
    echo -e "${GREEN}Model weights found in models/ directory.${NC}"
fi

# 7. Build and Start Docker Containers
echo -e "${YELLOW}[6/6] Building and starting Raksha Kavach containers...${NC}"
docker compose down || true
docker compose up -d --build

# 8. Verification and Health Check
echo ""
echo -e "${YELLOW}Waiting for AI backend to pass health check (15s)...${NC}"
sleep 15

SERVER_IP=$(curl -s https://api.ipify.org || hostname -I | awk '{print $1}')

if curl -s -f "http://localhost:8000/api/health" > /dev/null; then
    echo -e "${GREEN}============================================================${NC}"
    echo -e "${GREEN}  ✓ RAKSHA KAVACH DEPLOYED SUCCESSFULLY ON CLOUD VPS!      ${NC}"
    echo -e "${GREEN}============================================================${NC}"
    echo ""
    echo -e "  🌐 Cyber-Deck Dashboard:  ${CYAN}http://${SERVER_IP}:3000${NC}"
    echo -e "  ⚙️  AI Inference API:       ${CYAN}http://${SERVER_IP}:8000${NC}"
    echo -e "  📖 Swagger Documentation:  ${CYAN}http://${SERVER_IP}:8000/docs${NC}"
    echo ""
    echo -e "  To inspect logs:   ${YELLOW}docker compose logs -f${NC}"
    echo -e "  To restart:        ${YELLOW}docker compose restart${NC}"
    echo -e "  To stop:           ${YELLOW}docker compose down${NC}"
    echo -e "${GREEN}============================================================${NC}"
else
    echo -e "${RED}[WARNING] Backend health check did not respond immediately.${NC}"
    echo "Check container logs with: docker compose logs backend"
fi
