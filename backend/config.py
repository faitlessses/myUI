from __future__ import annotations

import os
from pathlib import Path

RUNTIME_DIR = Path(os.getenv("RUNTIME_DIR", "runtime")).resolve()
DB_PATH = Path(os.getenv("TRAINING_DB_PATH", RUNTIME_DIR / "training.db")).resolve()
JOBS_DIR = Path(os.getenv("JOBS_DIR", RUNTIME_DIR / "jobs")).resolve()
DIST_DIR = Path(os.getenv("DIST_DIR", "dist")).resolve()

AI_TOOLKIT_DIR = Path(os.getenv("AI_TOOLKIT_DIR", RUNTIME_DIR / "engines" / "ai-toolkit")).resolve()
KOHYA_DIR = Path(os.getenv("KOHYA_DIR", RUNTIME_DIR / "engines" / "kohya_ss")).resolve()
MAX_CONCURRENT_JOBS = max(1, int(os.getenv("MAX_CONCURRENT_JOBS", "1")))


def ensure_runtime_paths() -> None:
    for p in [RUNTIME_DIR, JOBS_DIR, AI_TOOLKIT_DIR.parent, KOHYA_DIR.parent]:
        p.mkdir(parents=True, exist_ok=True)
