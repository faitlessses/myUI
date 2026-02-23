# Vast LoRA Trainer Platform

Production-ready single-container web UI for LoRA training on Vast.ai with switchable engines:
- `ai-toolkit`
- `kohya_ss`

## What Works

- Create jobs from web form
- Start/stop training process
- Live log tail
- Artifact discovery + download
- SQLite persistence for jobs
- Frontend served by FastAPI in one container

## Vast.ai Quick Start (Linux)

```bash
git clone <your-repo-url> lora-platform
cd lora-platform
chmod +x scripts/bootstrap.sh scripts/start.sh
./scripts/bootstrap.sh
PORT=8000 ./scripts/start.sh
```

Expose port `8000` in Vast template/network settings, then open:

`http://<vast-instance-ip>:8000`

## Dev Mode (split frontend/backend)

Terminal 1:
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000
```

Terminal 2:
```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Engine Notes

- `ai-toolkit`: install/clone toolkit under `runtime/engines/ai-toolkit` or set `AI_TOOLKIT_DIR`.
- `kohya_ss`: clone under `runtime/engines/kohya_ss` or set `KOHYA_DIR`.
- If repos are missing, jobs still create but start may fail with command errors visible in logs.

## Test + Build

```bash
pytest -q
npm run build
```
