from __future__ import annotations

import asyncio
import zipfile
from pathlib import Path
from urllib.parse import quote

from fastapi import FastAPI, File, HTTPException, Query, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import DB_PATH, DIST_DIR, RUNTIME_DIR, ensure_runtime_paths
from .db import create_job, get_job, init_db, list_jobs
from .schemas import (
    HealthzResponse,
    JobActionResponse,
    JobArtifactsResponse,
    JobCreateRequest,
    JobListResponse,
    JobLogsResponse,
    JobResponse,
    DatasetPreviewResponse,
    ExtractRequest,
    ExtractResponse,
    JobProgressResponse,
    UploadResponse,
)
from .services.jobs import list_artifacts, parse_progress, read_logs, start_job, stop_job

ensure_runtime_paths()
init_db()

app = FastAPI(title="Vast LoRA Platform", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/healthz", response_model=HealthzResponse)
def healthz() -> HealthzResponse:
    return HealthzResponse(ok=True, db_path=str(DB_PATH), runtime_dir=str(RUNTIME_DIR))


@app.post("/api/uploads", response_model=UploadResponse, status_code=201)
async def api_upload_dataset(file: UploadFile = File(...)) -> UploadResponse:
    uploads_dir = RUNTIME_DIR / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    safe_name = Path(file.filename or "upload.bin").name
    target = uploads_dir / safe_name
    content = await file.read()
    target.write_bytes(content)
    return UploadResponse(filename=safe_name, path=str(target), size=len(content))


@app.post("/api/uploads/extract", response_model=ExtractResponse)
def api_extract_upload(payload: ExtractRequest) -> ExtractResponse:
    src = Path(payload.path)
    if not src.exists() or not src.is_file():
        raise HTTPException(status_code=404, detail="Upload file not found")
    if src.suffix.lower() != ".zip":
        raise HTTPException(status_code=400, detail="Only .zip extraction is supported")

    extract_dir = src.parent / f"{src.stem}_extracted"
    extract_dir.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(src, "r") as zf:
        zf.extractall(extract_dir)
    file_count = sum(1 for p in extract_dir.rglob("*") if p.is_file())
    return ExtractResponse(extract_dir=str(extract_dir), file_count=file_count)


@app.get("/api/datasets/preview", response_model=DatasetPreviewResponse)
def api_dataset_preview(path: str, limit: int = Query(default=60, ge=1, le=500)) -> DatasetPreviewResponse:
    root = Path(path)
    if not root.exists():
        raise HTTPException(status_code=404, detail="Dataset path not found")
    if not root.is_dir():
        raise HTTPException(status_code=400, detail="Dataset path must be a directory")

    exts = {".jpg", ".jpeg", ".png", ".webp"}
    items = []
    for p in root.rglob("*"):
        if p.is_file() and p.suffix.lower() in exts:
            enc = quote(str(p), safe="")
            items.append({"path": str(p), "url": f"/api/datasets/file?path={enc}"})
            if len(items) >= limit:
                break
    return DatasetPreviewResponse(count=len(items), items=items)


@app.get("/api/datasets/file")
def api_dataset_file(path: str) -> FileResponse:
    p = Path(path)
    if not p.exists() or not p.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(p)


@app.get("/api/jobs", response_model=JobListResponse)
def api_list_jobs() -> JobListResponse:
    jobs = [JobResponse.model_validate(job) for job in list_jobs()]
    return JobListResponse(jobs=jobs)


@app.post("/api/jobs", response_model=JobResponse, status_code=201)
def api_create_job(payload: JobCreateRequest) -> JobResponse:
    created = create_job(payload.model_dump())
    return JobResponse.model_validate(created)


@app.get("/api/jobs/{job_id}", response_model=JobResponse)
def api_get_job(job_id: int) -> JobResponse:
    try:
        job = get_job(job_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return JobResponse.model_validate(job)


@app.post("/api/jobs/{job_id}/start", response_model=JobActionResponse)
def api_start_job(job_id: int) -> JobActionResponse:
    try:
        updated = start_job(job_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return JobActionResponse(id=job_id, status=updated["status"], message="Job start requested")


@app.post("/api/jobs/{job_id}/stop", response_model=JobActionResponse)
def api_stop_job(job_id: int) -> JobActionResponse:
    try:
        updated = stop_job(job_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return JobActionResponse(id=job_id, status=updated["status"], message="Job stop requested")


@app.get("/api/jobs/{job_id}/logs", response_model=JobLogsResponse)
def api_job_logs(job_id: int, lines: int = Query(default=120, ge=1, le=2000)) -> JobLogsResponse:
    try:
        job = get_job(job_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return JobLogsResponse(id=job_id, status=job["status"], lines=read_logs(job_id, lines=lines))


@app.get("/api/jobs/{job_id}/progress", response_model=JobProgressResponse)
def api_job_progress(job_id: int) -> JobProgressResponse:
    try:
        get_job(job_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return JobProgressResponse.model_validate(parse_progress(job_id))


@app.websocket("/api/jobs/{job_id}/logs/ws")
async def ws_job_logs(job_id: int, websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        while True:
            try:
                job = get_job(job_id)
            except KeyError:
                await websocket.send_json({"id": job_id, "status": "failed", "lines": ["job not found"]})
                await websocket.close()
                return

            lines = read_logs(job_id, lines=120)
            await websocket.send_json(
                {"id": job_id, "status": job["status"], "lines": lines, "progress": parse_progress(job_id)}
            )
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        return


@app.get("/api/jobs/{job_id}/artifacts", response_model=JobArtifactsResponse)
def api_job_artifacts(job_id: int) -> JobArtifactsResponse:
    try:
        get_job(job_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return JobArtifactsResponse(id=job_id, artifacts=list_artifacts(job_id))


@app.get("/api/jobs/{job_id}/artifacts/download")
def api_download_artifact(job_id: int, path: str) -> FileResponse:
    try:
        artifacts = set(list_artifacts(job_id))
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    if path not in artifacts:
        raise HTTPException(status_code=404, detail="Artifact not found")
    p = Path(path)
    return FileResponse(p, filename=p.name)


if DIST_DIR.exists():
    assets_dir = DIST_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")


@app.get("/{full_path:path}")
def serve_spa(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")
    index = DIST_DIR / "index.html"
    if index.exists():
        return FileResponse(index)
    return {
        "message": "Frontend build not found. Run `npm run build` first.",
        "path": full_path,
    }
