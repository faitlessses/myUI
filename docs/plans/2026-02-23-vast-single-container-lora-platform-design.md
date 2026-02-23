# Vast Single-Container LoRA Platform Design

## Goal
Deliver a production-usable, single-container web platform that runs on Vast.ai and manages Flux LoRA training with switchable engines (`ai-toolkit`, `kohya_ss`) from one UI.

## Architecture
A single Python process hosts a FastAPI API and serves the built React app from `/`. Training execution runs as async background subprocess jobs managed by the API process. Job state persists in SQLite for crash-safe reloads. A lightweight polling UI controls jobs, tails logs, and downloads artifacts.

## Components
- API server (`backend/app.py`): REST endpoints, static file serving, background job orchestration.
- Storage (`backend/db.py`): SQLite tables for jobs, events, and config snapshots.
- Engine adapters (`backend/engines/*.py`): map canonical job config to command lines for ai-toolkit and kohya.
- Runtime service (`backend/services/jobs.py`): create/start/stop, monitor process, stream log tail.
- Frontend (`src/App.tsx` + new components): dataset path setup, job creation wizard, run monitor, artifacts pane.
- Startup scripts (`scripts/start.ps1`, `scripts/start.sh`): install deps, build frontend, run uvicorn.

## Data Flow
User config in UI -> POST `/api/jobs` -> SQLite row created -> engine command generated -> subprocess launched in job workspace -> stdout/stderr appended to log file -> polling endpoints return status/progress/log tail -> artifact scanner lists output files for download.

## Error Handling
- Validation rejects missing dataset path/base model/engine.
- Command resolution errors return explicit remediation text.
- Process failures captured with exit code + last log lines.
- Stop operation sends terminate then kill fallback.
- API startup checks and creates all required directories.

## Security Model
Single-user local control panel for private Vast instance. No remote auth by default. CORS restricted to same-origin and localhost.

## Persistence
SQLite default at `runtime/training.db`; optional PostgreSQL DSN env variable placeholder for future migration hooks.

## Testing
- API tests: job create/list/get, start/stop lifecycle, engine command resolution.
- Adapter tests: expected command flags for both engines.
- UI smoke: TypeScript build passes and app renders API-backed sections.

## Deployment
Vast.ai single container runbook:
1. clone repo
2. run bootstrap script
3. open exposed port in browser
