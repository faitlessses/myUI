import type { Job } from "../lib/api";

interface JobListProps {
  jobs: Job[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onStart: (id: number) => Promise<void>;
  onStop: (id: number) => Promise<void>;
}

export function JobList({ jobs, selectedId, onSelect, onStart, onStop }: JobListProps) {
  return (
    <div className="panel grid gap-3">
      <h2>Jobs</h2>
      {jobs.length === 0 ? <p>No jobs yet.</p> : null}
      {jobs.map((job) => (
        <div
          key={job.id}
          className={`job-card ${selectedId === job.id ? "selected" : ""}`}
          onClick={() => onSelect(job.id)}
        >
          <div className="row between">
            <strong>{job.name}</strong>
            <span className={`status ${job.status}`}>{job.status}</span>
          </div>
          <div className="muted">#{job.id} · {job.engine}</div>
          <div className="muted">{job.base_model}</div>
          <div className="row gap-2">
            <button
              onClick={async (e) => {
                e.stopPropagation();
                await onStart(job.id);
              }}
              disabled={job.status === "running"}
            >
              Start
            </button>
            <button
              onClick={async (e) => {
                e.stopPropagation();
                await onStop(job.id);
              }}
              disabled={job.status !== "running"}
            >
              Stop
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
