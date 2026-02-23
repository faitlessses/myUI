import type { Job, JobProgress } from "../lib/api";

interface JobDetailProps {
  job: Job | null;
  logs: string[];
  artifacts: string[];
  progress: JobProgress;
}

export function JobDetail({ job, logs, artifacts, progress }: JobDetailProps) {
  if (!job) {
    return (
      <div className="panel">
        <h2>Job Detail</h2>
        <p>Select a job to view logs and artifacts.</p>
      </div>
    );
  }

  return (
    <div className="panel grid gap-3">
      <h2>Job Detail #{job.id}</h2>
      <div className="muted">Command: {job.command || "(not started)"}</div>
      <div className="muted">Output: {job.output_dir}</div>
      <div className="muted">
        Progress: {progress.current_step}/{progress.total_steps} ({progress.percent}%)
        {progress.loss !== null ? ` · loss ${progress.loss}` : ""}
        {progress.learning_rate !== null ? ` · lr ${progress.learning_rate}` : ""}
        {progress.eta ? ` · eta ${progress.eta}` : ""}
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress.percent}%` }} />
      </div>

      <h3>Live Logs</h3>
      <pre className="log-box">{logs.join("\n") || "No logs yet."}</pre>

      <h3>Artifacts</h3>
      {artifacts.length === 0 ? <p>No artifacts yet.</p> : null}
      <ul className="artifact-list">
        {artifacts.map((artifact) => (
          <li key={artifact}>
            <a href={`/api/jobs/${job.id}/artifacts/download?path=${encodeURIComponent(artifact)}`} target="_blank" rel="noreferrer">
              {artifact}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
