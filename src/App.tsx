import { useEffect, useMemo, useState } from "react";
import {
  createJob,
  getArtifacts,
  getProgress,
  healthz,
  listJobs,
  startJob,
  stopJob,
  type Job,
  type JobProgress,
  type JobCreatePayload
} from "./lib/api";
import { JobForm } from "./components/JobForm";
import { JobList } from "./components/JobList";
import { JobDetail } from "./components/JobDetail";

export default function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [artifacts, setArtifacts] = useState<string[]>([]);
  const [progress, setProgress] = useState<JobProgress>({
    current_step: 0,
    total_steps: 0,
    percent: 0,
    loss: null,
    learning_rate: null,
    eta: null
  });
  const [health, setHealth] = useState("checking");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedId) ?? null,
    [jobs, selectedId]
  );

  const refreshJobs = async () => {
    try {
      const next = await listJobs();
      setJobs(next);
      if (next.length > 0 && selectedId === null) {
        setSelectedId(next[0].id);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const refreshArtifacts = async () => {
    if (!selectedId) return;
    try {
      const [nextArtifacts, nextProgress] = await Promise.all([
        getArtifacts(selectedId),
        getProgress(selectedId)
      ]);
      setArtifacts(nextArtifacts);
      setProgress(nextProgress);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const hz = await healthz();
        setHealth(hz.ok ? "online" : "offline");
      } catch {
        setHealth("offline");
      }
      await refreshJobs();
    };

    void init();
    const interval = setInterval(() => {
      void refreshJobs();
      void refreshArtifacts();
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    void refreshArtifacts();
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${window.location.host}/api/jobs/${selectedId}/logs/ws`);
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { lines?: string[]; progress?: JobProgress };
        setLogs(payload.lines ?? []);
        if (payload.progress) {
          setProgress(payload.progress);
        }
      } catch {
        // ignore malformed payloads
      }
    };
    ws.onerror = () => {
      setError("WebSocket log stream disconnected.");
    };
    return () => ws.close();
  }, [selectedId]);

  const onCreate = async (payload: JobCreatePayload) => {
    setCreating(true);
    setError(null);
    try {
      const created = await createJob(payload);
      await refreshJobs();
      setSelectedId(created.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const onStart = async (jobId: number) => {
    setError(null);
    try {
      await startJob(jobId);
      await refreshJobs();
      if (selectedId === jobId) await refreshArtifacts();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const onStop = async (jobId: number) => {
    setError(null);
    try {
      await stopJob(jobId);
      await refreshJobs();
      if (selectedId === jobId) await refreshArtifacts();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>Flux/Kohya LoRA Trainer</h1>
          <p>Single-container Vast.ai training control panel</p>
        </div>
        <span className={`pill ${health}`}>API: {health}</span>
      </header>

      {error ? <div className="error">{error}</div> : null}

      <div className="layout">
        <JobForm onCreate={onCreate} busy={creating} />
        <JobList
          jobs={jobs}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onStart={onStart}
          onStop={onStop}
        />
      </div>

      <JobDetail job={selectedJob} logs={logs} artifacts={artifacts} progress={progress} />
    </div>
  );
}
