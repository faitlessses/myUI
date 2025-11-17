import { Metrics, TrainingRun, Upload } from "../types/training";

export const mockUploads: Upload[] = [
  {
    id: "flux-char-001",
    name: "Neon Courier",
    type: "image",
    status: "captioned",
    variants: 28,
    qualityScore: 92
  },
  {
    id: "wan-story-014",
    name: "Synthwave Chase",
    type: "video",
    status: "queued",
    variants: 12,
    qualityScore: 84
  },
  {
    id: "flux-promo-203",
    name: "Astral Broadcast",
    type: "image",
    status: "processing",
    variants: 46,
    qualityScore: 88
  }
];

export const mockTrainingRuns: TrainingRun[] = [
  {
    id: "run-neo-27",
    title: "Flux1.dev • Cinematic fashion",
    progress: 72,
    eta: "00:18:44",
    loss: 0.12,
    lr: 1.5e-4,
    checkpoints: 7,
    status: "training"
  },
  {
    id: "run-wan-09",
    title: "Wan2.2 • Cyber thriller stingers",
    progress: 38,
    eta: "00:42:11",
    loss: 0.21,
    lr: 1.0e-4,
    checkpoints: 4,
    status: "scheduling"
  }
];

export const mockMetrics: Metrics = {
  losses: [0.34, 0.29, 0.22, 0.18, 0.15, 0.14, 0.12],
  captionsPerMinute: [18, 24, 33, 47, 49, 58, 61],
  datasetGrowth: [320, 420, 588, 802, 920, 1105, 1314]
};
