import os
import sys
import re
import time
import subprocess
import urllib.request
import urllib.error

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
CLOUDFLARED_EXE = os.path.join(PROJECT_ROOT, "cloudflared.exe")
URL_FILE = os.path.join(PROJECT_ROOT, "CLOUDFLARE_URL.txt")

def is_backend_ready():
    try:
        req = urllib.request.Request("http://127.0.0.1:8000/api/health")
        with urllib.request.urlopen(req, timeout=2) as resp:
            return resp.status == 200
    except Exception:
        return False

def ensure_backend():
    if is_backend_ready():
        print("[OK] AI Sentinel backend is already active on http://127.0.0.1:8000")
        return None

    print("[*] Starting AI Sentinel Server (FastAPI + YOLOv8)...")
    server_process = subprocess.Popen(
        [sys.executable, os.path.join(PROJECT_ROOT, "server.py")],
        cwd=PROJECT_ROOT
    )

    print("[*] Waiting for backend to load AI models and initialize...")
    for _ in range(30):
        if is_backend_ready():
            print("[OK] AI Sentinel Server is online!")
            return server_process
        time.sleep(1)

    print("[WARNING] Server did not respond within 30 seconds. Continuing to start tunnel...")
    return server_process

def start_tunnel():
    if not os.path.exists(CLOUDFLARED_EXE):
        print(f"[ERROR] cloudflared.exe not found at {CLOUDFLARED_EXE}")
        sys.exit(1)

    ensure_backend()

    print("[*] Launching Cloudflare Tunnel to http://127.0.0.1:8000...")
    tunnel_cmd = [CLOUDFLARED_EXE, "tunnel", "--url", "http://127.0.0.1:8000"]

    process = subprocess.Popen(
        tunnel_cmd,
        cwd=PROJECT_ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    url_found = None
    url_pattern = re.compile(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com")

    if process.stdout is not None:
        for line in iter(process.stdout.readline, ''):
            print(line, end='', flush=True)
            if not url_found:
                match = url_pattern.search(line)
                if match:
                    url_found = match.group(0)
                    with open(URL_FILE, "w", encoding="utf-8") as f:
                        f.write(url_found + "\n")
                    print("\n" + "=" * 65)
                    print("  RAKSHA KAVACH // CLOUDFLARE LIVE TUNNEL IS READY!")
                    print(f"  Public URL: {url_found}")
                    print(f"  Saved to:   {URL_FILE}")
                    print("=" * 65 + "\n", flush=True)

    process.wait()

if __name__ == "__main__":
    start_tunnel()
