export type UploadStatus = "queued" | "processing" | "captioned" | "error";

export type Upload = {
  id: string;
  name: string;
  type: "image" | "video";
  status: UploadStatus;
  variants: number;
  qualityScore: number;
  description?: string;
};

export type TrainingStatus = "training" | "scheduling" | "complete";

export type TrainingRun = {
  id: string;
  title: string;
  progress: number;
  eta: string;
  loss: number;
  lr: number;
  checkpoints: number;
  status: TrainingStatus;
};

export type Metrics = {
  losses: number[];
  captionsPerMinute: number[];
  datasetGrowth: number[];
};

export interface TrainingState {
  uploads: Upload[];
  trainingRuns: TrainingRun[];
  metrics: Metrics;
  selectedModel: "flux1.dev" | "wan2.2";
  autoCaptioning: boolean;
  datasetCohesion: number;
  addUpload: (upload: Upload) => void;
  toggleAutoCaptioning: () => void;
  updateTrainingProgress: (runId: string, progress: number) => void;
  updateMetrics: (metrics: Partial<Metrics>) => void;
  setSelectedModel: (model: "flux1.dev" | "wan2.2") => void;
}
