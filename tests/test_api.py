import os
import zipfile
import json
import time
from io import BytesIO
from pathlib import Path

from fastapi.testclient import TestClient

os.environ.setdefault("TRAINING_DB_PATH", str(Path("runtime") / "test-training.db"))
os.environ.setdefault("MAX_CONCURRENT_JOBS", "1")

from backend.app import app
from backend.db import update_job


client = TestClient(app)


def test_healthz() -> None:
    res = client.get("/api/healthz")
    assert res.status_code == 200
    payload = res.json()
    assert payload["ok"] is True


def test_create_and_get_job() -> None:
    payload = {
        "name": "smoke-job",
        "engine": "ai-toolkit",
        "dataset_path": "/workspace/data",
        "base_model": "black-forest-labs/FLUX.1-dev",
        "output_dir": "/workspace/out",
        "epochs": 2,
        "learning_rate": 0.0001,
        "batch_size": 1,
    }
    created = client.post("/api/jobs", json=payload)
    assert created.status_code == 201
    job = created.json()
    assert job["name"] == "smoke-job"
    assert job["status"] == "created"

    fetched = client.get(f"/api/jobs/{job['id']}")
    assert fetched.status_code == 200
    fetched_payload = fetched.json()
    assert fetched_payload["id"] == job["id"]


def test_start_and_stop_job() -> None:
    payload = {
        "name": "lifecycle-job",
        "engine": "kohya-ss",
        "dataset_path": "/workspace/data",
        "base_model": "runwayml/stable-diffusion-v1-5",
        "output_dir": "/workspace/out",
        "epochs": 1,
        "learning_rate": 0.0001,
        "batch_size": 1,
    }
    created = client.post("/api/jobs", json=payload)
    assert created.status_code == 201
    job = created.json()

    started = client.post(f"/api/jobs/{job['id']}/start")
    assert started.status_code == 200
    assert started.json()["status"] in {"running", "queued", "failed"}

    stopped = client.post(f"/api/jobs/{job['id']}/stop")
    assert stopped.status_code == 200
    assert stopped.json()["status"] in {"stopped", "failed", "completed"}


def test_upload_dataset_file() -> None:
    files = {"file": ("sample.txt", b"hello-data", "text/plain")}
    res = client.post("/api/uploads", files=files)
    assert res.status_code == 201
    payload = res.json()
    assert payload["path"].endswith("sample.txt")
    assert Path(payload["path"]).exists()


def test_logs_websocket_stream() -> None:
    payload = {
        "name": "ws-job",
        "engine": "ai-toolkit",
        "dataset_path": "/workspace/data",
        "base_model": "black-forest-labs/FLUX.1-dev",
        "output_dir": "/workspace/out",
        "epochs": 1,
        "learning_rate": 0.0001,
        "batch_size": 1,
    }
    created = client.post("/api/jobs", json=payload)
    job = created.json()
    log_path = Path("runtime") / f"ws-{job['id']}.log"
    log_path.parent.mkdir(parents=True, exist_ok=True)
    log_path.write_text("line-1\nline-2\n", encoding="utf-8")
    update_job(job["id"], log_path=str(log_path), status="running")

    with client.websocket_connect(f"/api/jobs/{job['id']}/logs/ws") as ws:
      message = ws.receive_json()
      assert "lines" in message
      assert any("line-1" in x for x in message["lines"])
      assert "progress" in message


def test_job_progress_endpoint_parses_metrics() -> None:
    payload = {
        "name": "progress-job",
        "engine": "ai-toolkit",
        "dataset_path": "/workspace/data",
        "base_model": "black-forest-labs/FLUX.1-dev",
        "output_dir": "/workspace/out",
        "epochs": 1,
        "learning_rate": 0.0001,
        "batch_size": 1,
    }
    created = client.post("/api/jobs", json=payload)
    job = created.json()
    log_path = Path("runtime") / f"progress-{job['id']}.log"
    log_path.parent.mkdir(parents=True, exist_ok=True)
    log_path.write_text(
        "step 120/1000 loss=0.1234 lr=0.0001 eta=00:20:10\n",
        encoding="utf-8",
    )
    update_job(job["id"], log_path=str(log_path), status="running")

    res = client.get(f"/api/jobs/{job['id']}/progress")
    assert res.status_code == 200
    progress = res.json()
    assert progress["current_step"] == 120
    assert progress["total_steps"] == 1000
    assert progress["percent"] == 12
    assert abs(progress["loss"] - 0.1234) < 1e-6


def test_extract_uploaded_zip() -> None:
    zip_buf = BytesIO()
    with zipfile.ZipFile(zip_buf, "w") as zf:
        zf.writestr("images/a.jpg", b"jpg-bytes")
        zf.writestr("images/b.png", b"png-bytes")
    files = {"file": ("dataset.zip", zip_buf.getvalue(), "application/zip")}
    uploaded = client.post("/api/uploads", files=files)
    assert uploaded.status_code == 201
    uploaded_path = uploaded.json()["path"]

    extracted = client.post("/api/uploads/extract", json={"path": uploaded_path})
    assert extracted.status_code == 200
    payload = extracted.json()
    assert Path(payload["extract_dir"]).exists()
    assert payload["file_count"] >= 2


def test_dataset_preview_lists_images() -> None:
    preview_root = Path("runtime") / "preview-test"
    preview_root.mkdir(parents=True, exist_ok=True)
    (preview_root / "one.jpg").write_bytes(b"x")
    (preview_root / "two.png").write_bytes(b"y")
    (preview_root / "three.txt").write_text("skip", encoding="utf-8")

    res = client.get(f"/api/datasets/preview?path={preview_root}")
    assert res.status_code == 200
    payload = res.json()
    assert payload["count"] == 2
    assert all("path" in item for item in payload["items"])


def test_ai_toolkit_extras_written_to_config() -> None:
    payload = {
        "name": "extras-job",
        "engine": "ai-toolkit",
        "dataset_path": "/workspace/data",
        "base_model": "black-forest-labs/FLUX.1-dev",
        "output_dir": "/workspace/out",
        "epochs": 3,
        "learning_rate": 0.0002,
        "batch_size": 1,
        "extra": {
            "rank": 64,
            "alpha": 32,
            "caption_dropout": 0.1,
            "precision": "fp16",
            "resume_from_checkpoint": "/workspace/out/last.safetensors",
            "train_command": "python -c \"print('dry-run')\"",
        },
    }
    created = client.post("/api/jobs", json=payload)
    assert created.status_code == 201
    job = created.json()
    started = client.post(f"/api/jobs/{job['id']}/start")
    assert started.status_code == 200

    config_path = Path("runtime") / "jobs" / str(job["id"]) / "train_config.json"
    assert config_path.exists()
    cfg = json.loads(config_path.read_text(encoding="utf-8"))
    assert cfg["network"]["dim"] == 64
    assert cfg["network"]["alpha"] == 32
    assert cfg["train"]["mixed_precision"] == "fp16"
    assert cfg["train"]["caption_dropout_rate"] == 0.1
    assert cfg["train"]["resume_from_checkpoint"] == "/workspace/out/last.safetensors"


def test_queue_and_auto_start_next_job() -> None:
    first = client.post(
        "/api/jobs",
        json={
            "name": "queue-first",
            "engine": "ai-toolkit",
            "dataset_path": "/workspace/data",
            "base_model": "black-forest-labs/FLUX.1-dev",
            "output_dir": "/workspace/out",
            "epochs": 1,
            "learning_rate": 0.0001,
            "batch_size": 1,
            "extra": {"train_command": "python -c \"import time; time.sleep(2)\""},
        },
    ).json()
    second = client.post(
        "/api/jobs",
        json={
            "name": "queue-second",
            "engine": "ai-toolkit",
            "dataset_path": "/workspace/data",
            "base_model": "black-forest-labs/FLUX.1-dev",
            "output_dir": "/workspace/out",
            "epochs": 1,
            "learning_rate": 0.0001,
            "batch_size": 1,
            "extra": {"train_command": "python -c \"print('done')\""},
        },
    ).json()

    start_first = client.post(f"/api/jobs/{first['id']}/start")
    assert start_first.status_code == 200
    assert start_first.json()["status"] in {"running", "queued"}

    start_second = client.post(f"/api/jobs/{second['id']}/start")
    assert start_second.status_code == 200
    assert start_second.json()["status"] in {"queued", "running"}

    # Wait for first to free slot and second to auto-start/finish.
    deadline = time.time() + 8
    seen_progress = False
    while time.time() < deadline:
        second_job = client.get(f"/api/jobs/{second['id']}").json()
        if second_job["status"] in {"running", "completed", "failed"}:
            seen_progress = True
            break
        time.sleep(0.25)
    assert seen_progress is True
