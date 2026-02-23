from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

EngineName = Literal["ai-toolkit", "kohya-ss"]
JobStatus = Literal["created", "queued", "running", "completed", "failed", "stopped"]


class JobCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    engine: EngineName
    dataset_path: str = Field(min_length=1)
    base_model: str = Field(min_length=1)
    output_dir: str = Field(min_length=1)
    epochs: int = Field(default=10, ge=1, le=1000)
    learning_rate: float = Field(default=1e-4, gt=0)
    batch_size: int = Field(default=1, ge=1, le=128)
    extra: Dict[str, Any] = Field(default_factory=dict)


class JobResponse(BaseModel):
    id: int
    name: str
    engine: EngineName
    status: JobStatus
    dataset_path: str
    base_model: str
    output_dir: str
    epochs: int
    learning_rate: float
    batch_size: int
    created_at: datetime
    updated_at: datetime
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    command: Optional[str] = None
    log_path: Optional[str] = None
    exit_code: Optional[int] = None
    error: Optional[str] = None


class JobListResponse(BaseModel):
    jobs: List[JobResponse]


class JobActionResponse(BaseModel):
    id: int
    status: JobStatus
    message: str


class JobLogsResponse(BaseModel):
    id: int
    status: JobStatus
    lines: List[str]


class JobArtifactsResponse(BaseModel):
    id: int
    artifacts: List[str]


class UploadResponse(BaseModel):
    filename: str
    path: str
    size: int


class ExtractRequest(BaseModel):
    path: str


class ExtractResponse(BaseModel):
    extract_dir: str
    file_count: int


class DatasetPreviewItem(BaseModel):
    path: str
    url: str


class DatasetPreviewResponse(BaseModel):
    count: int
    items: List[DatasetPreviewItem]


class JobProgressResponse(BaseModel):
    current_step: int = 0
    total_steps: int = 0
    percent: int = 0
    loss: Optional[float] = None
    learning_rate: Optional[float] = None
    eta: Optional[str] = None


class HealthzResponse(BaseModel):
    ok: bool
    db_path: str
    runtime_dir: str
