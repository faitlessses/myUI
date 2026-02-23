export type EngineName = "ai-toolkit" | "kohya-ss";

export type JobStatus = "created" | "queued" | "running" | "completed" | "failed" | "stopped";

export interface Job {
  id: number;
  name: string;
  engine: EngineName;
  status: JobStatus;
  dataset_path: string;
  base_model: string;
  output_dir: string;
  epochs: number;
  learning_rate: number;
  batch_size: number;
  created_at: string;
  updated_at: string;
  started_at?: string | null;
  ended_at?: string | null;
  command?: string | null;
  log_path?: string | null;
  exit_code?: number | null;
  error?: string | null;
}

export interface JobCreatePayload {
  name: string;
  engine: EngineName;
  dataset_path: string;
  base_model: string;
  output_dir: string;
  epochs: number;
  learning_rate: number;
  batch_size: number;
  extra: Record<string, unknown>;
}

export interface JobProgress {
  current_step: number;
  total_steps: number;
  percent: number;
  loss: number | null;
  learning_rate: number | null;
  eta: string | null;
}

const jsonHeaders = { "Content-Type": "application/json" };

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed with ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function healthz(): Promise<{ ok: boolean }> {
  const res = await fetch("/api/healthz");
  return parseJson<{ ok: boolean }>(res);
}

export async function uploadDataset(file: File): Promise<{ filename: string; path: string; size: number }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/uploads", { method: "POST", body: formData });
  return parseJson<{ filename: string; path: string; size: number }>(res);
}

export async function extractUpload(path: string): Promise<{ extract_dir: string; file_count: number }> {
  const res = await fetch("/api/uploads/extract", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ path })
  });
  return parseJson<{ extract_dir: string; file_count: number }>(res);
}

export async function previewDataset(path: string): Promise<{ count: number; items: Array<{ path: string; url: string }> }> {
  const res = await fetch(`/api/datasets/preview?path=${encodeURIComponent(path)}`);
  return parseJson<{ count: number; items: Array<{ path: string; url: string }> }>(res);
}

export async function listJobs(): Promise<Job[]> {
  const res = await fetch("/api/jobs");
  const payload = await parseJson<{ jobs: Job[] }>(res);
  return payload.jobs;
}

export async function createJob(payload: JobCreatePayload): Promise<Job> {
  const res = await fetch("/api/jobs", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  });
  return parseJson<Job>(res);
}

export async function startJob(jobId: number): Promise<void> {
  const res = await fetch(`/api/jobs/${jobId}/start`, { method: "POST" });
  await parseJson(res);
}

export async function stopJob(jobId: number): Promise<void> {
  const res = await fetch(`/api/jobs/${jobId}/stop`, { method: "POST" });
  await parseJson(res);
}

export async function getLogs(jobId: number): Promise<string[]> {
  const res = await fetch(`/api/jobs/${jobId}/logs?lines=120`);
  const payload = await parseJson<{ lines: string[] }>(res);
  return payload.lines;
}

export async function getArtifacts(jobId: number): Promise<string[]> {
  const res = await fetch(`/api/jobs/${jobId}/artifacts`);
  const payload = await parseJson<{ artifacts: string[] }>(res);
  return payload.artifacts;
}

export async function getProgress(jobId: number): Promise<JobProgress> {
  const res = await fetch(`/api/jobs/${jobId}/progress`);
  return parseJson<JobProgress>(res);
}
