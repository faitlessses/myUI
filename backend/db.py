from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any

from .config import DB_PATH, ensure_runtime_paths

DB_LOCK = Lock()


def utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


def _connect() -> sqlite3.Connection:
    ensure_runtime_paths()
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with DB_LOCK:
        conn = _connect()
        try:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS jobs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    engine TEXT NOT NULL,
                    status TEXT NOT NULL,
                    dataset_path TEXT NOT NULL,
                    base_model TEXT NOT NULL,
                    output_dir TEXT NOT NULL,
                    epochs INTEGER NOT NULL,
                    learning_rate REAL NOT NULL,
                    batch_size INTEGER NOT NULL,
                    extra_json TEXT NOT NULL,
                    command TEXT,
                    log_path TEXT,
                    pid INTEGER,
                    exit_code INTEGER,
                    error TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    started_at TEXT,
                    ended_at TEXT
                )
                """
            )
            conn.commit()
        finally:
            conn.close()


def create_job(payload: dict[str, Any]) -> dict[str, Any]:
    import json

    now = utcnow()
    with DB_LOCK:
        conn = _connect()
        try:
            cur = conn.execute(
                """
                INSERT INTO jobs (
                    name, engine, status, dataset_path, base_model, output_dir,
                    epochs, learning_rate, batch_size, extra_json, created_at, updated_at
                ) VALUES (?, ?, 'created', ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    payload["name"],
                    payload["engine"],
                    payload["dataset_path"],
                    payload["base_model"],
                    payload["output_dir"],
                    payload["epochs"],
                    payload["learning_rate"],
                    payload["batch_size"],
                    json.dumps(payload.get("extra", {})),
                    now,
                    now,
                ),
            )
            conn.commit()
            job_id = int(cur.lastrowid)
        finally:
            conn.close()
    return get_job(job_id)


def list_jobs() -> list[dict[str, Any]]:
    with DB_LOCK:
        conn = _connect()
        try:
            rows = conn.execute("SELECT * FROM jobs ORDER BY id DESC").fetchall()
            return [_row_to_job(row) for row in rows]
        finally:
            conn.close()


def get_job(job_id: int) -> dict[str, Any]:
    with DB_LOCK:
        conn = _connect()
        try:
            row = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
            if row is None:
                raise KeyError(f"Job {job_id} not found")
            return _row_to_job(row)
        finally:
            conn.close()


def update_job(job_id: int, **fields: Any) -> dict[str, Any]:
    if not fields:
        return get_job(job_id)
    fields["updated_at"] = utcnow()
    cols = ", ".join([f"{k} = ?" for k in fields])
    values = list(fields.values()) + [job_id]

    with DB_LOCK:
        conn = _connect()
        try:
            conn.execute(f"UPDATE jobs SET {cols} WHERE id = ?", values)
            conn.commit()
        finally:
            conn.close()
    return get_job(job_id)


def _row_to_job(row: sqlite3.Row) -> dict[str, Any]:
    import json

    obj = dict(row)
    obj["extra"] = json.loads(obj.pop("extra_json", "{}") or "{}")
    for key in ["created_at", "updated_at", "started_at", "ended_at"]:
        if obj.get(key):
            obj[key] = datetime.fromisoformat(obj[key])
    return obj
