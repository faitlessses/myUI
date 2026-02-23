from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path
from threading import Lock, Thread
from typing import Any

from backend.config import AI_TOOLKIT_DIR, JOBS_DIR, KOHYA_DIR, MAX_CONCURRENT_JOBS
from backend.db import get_job, list_jobs, update_job
from backend.engines import build_ai_toolkit_command, build_kohya_command

PROCESS_LOCK = Lock()
RUNNING: dict[int, subprocess.Popen[str]] = {}


def _job_workspace(job_id: int) -> Path:
    ws = JOBS_DIR / str(job_id)
    ws.mkdir(parents=True, exist_ok=True)
    return ws


def _detect_python_bin() -> str:
    return "python"


def _write_ai_toolkit_config(job: dict[str, Any], workspace: Path) -> Path:
    config_path = workspace / "train_config.json"
    extra = job.get("extra") or {}
    rank = int(extra.get("rank", 32))
    alpha = int(extra.get("alpha", 16))
    precision = str(extra.get("precision", "bf16"))
    caption_dropout = float(extra.get("caption_dropout", 0.05))
    profile = str(extra.get("profile", "custom"))
    vram_gb = int(extra.get("vram_gb", 0)) if str(extra.get("vram_gb", "")).strip() else 0

    payload: dict[str, Any] = {
        "job": {"name": job["name"], "type": "lora"},
        "model": {"base_model": job["base_model"]},
        "data": {"train_images": job["dataset_path"]},
        "train": {
            "epochs": job["epochs"],
            "learning_rate": job["learning_rate"],
            "batch_size": job["batch_size"],
            "mixed_precision": precision,
            "caption_dropout_rate": caption_dropout,
        },
        "network": {
            "dim": rank,
            "alpha": alpha,
        },
        "meta": {
            "profile": profile,
            "vram_gb": vram_gb,
        },
        "output": {"dir": job["output_dir"]},
    }

    resume = extra.get("resume_from_checkpoint")
    if resume:
        payload["train"]["resume_from_checkpoint"] = resume

    config_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return config_path


def _build_command(job: dict[str, Any], workspace: Path) -> tuple[str, Path]:
    python_bin = _detect_python_bin()
    extra = job.get("extra") or {}

    if job["engine"] == "ai-toolkit":
        config_path = _write_ai_toolkit_config(job, workspace)
        command = build_ai_toolkit_command(
            python_bin=python_bin,
            config_path=str(config_path),
            override_command=extra.get("train_command", ""),
        )
        cwd = AI_TOOLKIT_DIR if AI_TOOLKIT_DIR.exists() else workspace
        return command, cwd

    train_script = str((KOHYA_DIR / "sd-scripts" / "train_network.py"))
    if not Path(train_script).exists():
        train_script = "train_network.py"
    command = build_kohya_command(
        python_bin=python_bin,
        train_script=train_script,
        dataset_path=job["dataset_path"],
        output_dir=job["output_dir"],
        base_model=job["base_model"],
        epochs=job["epochs"],
        learning_rate=job["learning_rate"],
        batch_size=job["batch_size"],
        network_dim=int(extra.get("rank", 32)),
        network_alpha=int(extra.get("alpha", 16)),
        mixed_precision=str(extra.get("precision", "bf16")),
        caption_dropout_rate=float(extra.get("caption_dropout", 0.05)),
        resume_checkpoint=str(extra.get("resume_from_checkpoint", "")),
    )
    cwd = KOHYA_DIR if KOHYA_DIR.exists() else workspace
    return command, cwd


def _cleanup_running_locked() -> None:
    stale: list[int] = []
    for jid, proc in RUNNING.items():
        if proc.poll() is not None:
            stale.append(jid)
    for jid in stale:
        RUNNING.pop(jid, None)


def _running_count() -> int:
    with PROCESS_LOCK:
        _cleanup_running_locked()
        return len(RUNNING)


def _launch_job(job_id: int) -> dict[str, Any]:
    job = get_job(job_id)
    if job["status"] == "running":
        return job

    workspace = _job_workspace(job_id)
    log_path = workspace / "train.log"
    command, cwd = _build_command(job, workspace)

    logf = open(log_path, "a", encoding="utf-8")
    logf.write(f"Starting command: {command}\n")
    logf.flush()

    proc = subprocess.Popen(
        command,
        shell=True,
        cwd=str(cwd),
        stdout=logf,
        stderr=subprocess.STDOUT,
        text=True,
    )

    with PROCESS_LOCK:
        RUNNING[job_id] = proc

    update_job(
        job_id,
        status="running",
        command=command,
        log_path=str(log_path),
        pid=proc.pid,
        started_at=job["updated_at"].isoformat() if job.get("updated_at") else None,
        error=None,
    )

    t = Thread(target=_monitor_job, args=(job_id, proc, log_path, logf), daemon=True)
    t.start()
    return get_job(job_id)


def start_job(job_id: int) -> dict[str, Any]:
    job = get_job(job_id)
    if job["status"] == "running":
        return job
    if job["status"] == "completed":
        return job

    if _running_count() >= MAX_CONCURRENT_JOBS:
        return update_job(job_id, status="queued", error=None)

    return _launch_job(job_id)


def _start_next_queued_if_possible() -> None:
    while _running_count() < MAX_CONCURRENT_JOBS:
        queued = [job for job in list_jobs() if job["status"] == "queued"]
        if not queued:
            return
        next_job = sorted(queued, key=lambda x: x["id"])[0]
        _launch_job(int(next_job["id"]))


def _monitor_job(job_id: int, proc: subprocess.Popen[str], log_path: Path, logf: Any) -> None:
    code = proc.wait()
    status = "completed" if code == 0 else "failed"
    update_job(
        job_id,
        status=status,
        exit_code=code,
        ended_at=get_job(job_id)["updated_at"].isoformat(),
    )
    with PROCESS_LOCK:
        RUNNING.pop(job_id, None)
    with open(log_path, "a", encoding="utf-8") as final_log:
        final_log.write(f"\nProcess exited with code {code}\n")
    try:
        logf.close()
    except Exception:
        pass
    _start_next_queued_if_possible()


def stop_job(job_id: int) -> dict[str, Any]:
    with PROCESS_LOCK:
        proc = RUNNING.get(job_id)

    if proc is None:
        job = get_job(job_id)
        if job["status"] == "running":
            return update_job(job_id, status="stopped", error="Process handle not found")
        return job

    proc.terminate()
    try:
        proc.wait(timeout=8)
    except subprocess.TimeoutExpired:
        proc.kill()

    with PROCESS_LOCK:
        RUNNING.pop(job_id, None)

    updated = update_job(job_id, status="stopped", exit_code=proc.returncode)
    _start_next_queued_if_possible()
    return updated


def read_logs(job_id: int, lines: int = 120) -> list[str]:
    job = get_job(job_id)
    log_path = job.get("log_path")
    if not log_path:
        return []
    p = Path(log_path)
    if not p.exists():
        return []
    return p.read_text(encoding="utf-8", errors="ignore").splitlines()[-max(lines, 1):]


def parse_progress(job_id: int) -> dict[str, Any]:
    lines = read_logs(job_id, lines=500)
    step_pattern = re.compile(r"(?:step|\[)\s*(?P<current>\d+)\s*/\s*(?P<total>\d+)", flags=re.IGNORECASE)
    loss_pattern = re.compile(r"loss[:=]\s*([0-9]*\.?[0-9]+)", flags=re.IGNORECASE)
    lr_pattern = re.compile(r"lr[:=]\s*([0-9eE\.\-]+)", flags=re.IGNORECASE)
    eta_pattern = re.compile(r"eta[:=]\s*([0-9:dhms ]+)", flags=re.IGNORECASE)
    progress = {
        "current_step": 0,
        "total_steps": 0,
        "percent": 0,
        "loss": None,
        "learning_rate": None,
        "eta": None,
    }
    for line in reversed(lines):
        match = step_pattern.search(line)
        if not match:
            continue
        current = int(match.group("current"))
        total = int(match.group("total"))
        percent = int((current * 100) / total) if total > 0 else 0
        progress["current_step"] = current
        progress["total_steps"] = total
        progress["percent"] = min(max(percent, 0), 100)
        loss_match = loss_pattern.search(line)
        if loss_match:
            progress["loss"] = float(loss_match.group(1))
        lr_match = lr_pattern.search(line)
        if lr_match:
            progress["learning_rate"] = float(lr_match.group(1))
        eta_match = eta_pattern.search(line)
        if eta_match:
            progress["eta"] = eta_match.group(1).strip()
        break
    return progress


def list_artifacts(job_id: int) -> list[str]:
    job = get_job(job_id)
    output_dir = Path(job["output_dir"])
    if not output_dir.exists():
        return []
    artifacts: list[str] = []
    for pattern in ["*.safetensors", "*.ckpt", "*.pt", "*.png", "*.jpg", "*.json", "*.yaml"]:
        for p in output_dir.rglob(pattern):
            artifacts.append(str(p))
    return sorted(set(artifacts))
