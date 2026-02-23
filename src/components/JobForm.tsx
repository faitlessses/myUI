import { useState, type FormEvent } from "react";
import { extractUpload, previewDataset, uploadDataset, type EngineName, type JobCreatePayload } from "../lib/api";

interface JobFormProps {
  onCreate: (payload: JobCreatePayload) => Promise<void>;
  busy: boolean;
}

type PresetName = "portrait" | "style" | "product" | "anime";

type PresetConfig = {
  epochs: number;
  learningRate: number;
  batchSize: number;
  rank: number;
  alpha: number;
  captionDropout: number;
};

const PRESETS: Record<PresetName, PresetConfig> = {
  portrait: { epochs: 10, learningRate: 0.0001, batchSize: 1, rank: 32, alpha: 16, captionDropout: 0.05 },
  style: { epochs: 14, learningRate: 0.00008, batchSize: 1, rank: 64, alpha: 32, captionDropout: 0.1 },
  product: { epochs: 8, learningRate: 0.00012, batchSize: 2, rank: 32, alpha: 16, captionDropout: 0.02 },
  anime: { epochs: 12, learningRate: 0.00009, batchSize: 1, rank: 48, alpha: 24, captionDropout: 0.08 }
};

function suggestByVram(vramGb: number): { batchSize: number; rank: number; precision: string } {
  if (vramGb >= 40) return { batchSize: 4, rank: 128, precision: "bf16" };
  if (vramGb >= 24) return { batchSize: 2, rank: 64, precision: "bf16" };
  if (vramGb >= 16) return { batchSize: 1, rank: 48, precision: "fp16" };
  return { batchSize: 1, rank: 32, precision: "fp16" };
}

export function JobForm({ onCreate, busy }: JobFormProps) {
  const [name, setName] = useState("flux-job-1");
  const [engine, setEngine] = useState<EngineName>("ai-toolkit");
  const [datasetPath, setDatasetPath] = useState("/workspace/datasets/myset");
  const [baseModel, setBaseModel] = useState("black-forest-labs/FLUX.1-dev");
  const [outputDir, setOutputDir] = useState("/workspace/outputs/myset");
  const [resumeCheckpoint, setResumeCheckpoint] = useState("");
  const [trainCommand, setTrainCommand] = useState("");
  const [epochs, setEpochs] = useState(10);
  const [learningRate, setLearningRate] = useState(0.0001);
  const [batchSize, setBatchSize] = useState(1);
  const [rank, setRank] = useState(32);
  const [alpha, setAlpha] = useState(16);
  const [captionDropout, setCaptionDropout] = useState(0.05);
  const [precision, setPrecision] = useState("bf16");
  const [profile, setProfile] = useState<PresetName>("portrait");
  const [vramGb, setVramGb] = useState(24);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [previewItems, setPreviewItems] = useState<Array<{ path: string; url: string }>>([]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await onCreate({
      name,
      engine,
      dataset_path: datasetPath,
      base_model: baseModel,
      output_dir: outputDir,
      epochs,
      learning_rate: learningRate,
      batch_size: batchSize,
      extra: {
        resume_from_checkpoint: resumeCheckpoint,
        train_command: trainCommand,
        profile,
        rank,
        alpha,
        caption_dropout: captionDropout,
        precision,
        vram_gb: vramGb
      }
    });
  };

  const onFilePick = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setUploadMsg("");
    try {
      const uploaded = await uploadDataset(file);
      if (uploaded.path.toLowerCase().endsWith(".zip")) {
        const extracted = await extractUpload(uploaded.path);
        setDatasetPath(extracted.extract_dir);
        setUploadMsg(`Uploaded + extracted: ${uploaded.filename} (${extracted.file_count} files)`);
      } else {
        setDatasetPath(uploaded.path);
        setUploadMsg(`Uploaded: ${uploaded.filename}`);
      }
    } catch (err) {
      setUploadMsg((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const onPreview = async () => {
    setUploadMsg("");
    try {
      const payload = await previewDataset(datasetPath);
      setPreviewItems(payload.items.slice(0, 12));
      if (payload.count === 0) {
        setUploadMsg("No previewable images found in dataset path.");
      }
    } catch (err) {
      setUploadMsg((err as Error).message);
      setPreviewItems([]);
    }
  };

  const applyPreset = (presetName: PresetName) => {
    const p = PRESETS[presetName];
    setProfile(presetName);
    setEpochs(p.epochs);
    setLearningRate(p.learningRate);
    setBatchSize(p.batchSize);
    setRank(p.rank);
    setAlpha(p.alpha);
    setCaptionDropout(p.captionDropout);
  };

  const applyVramDefaults = () => {
    const s = suggestByVram(vramGb);
    setBatchSize(s.batchSize);
    setRank(s.rank);
    setPrecision(s.precision);
    setUploadMsg(`Applied VRAM defaults for ${vramGb}GB (${s.precision}, batch ${s.batchSize}, rank ${s.rank})`);
  };

  return (
    <form className="panel grid gap-3" onSubmit={submit}>
      <h2>Create Training Job</h2>
      <label>
        Job Name
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label>
        Engine
        <select value={engine} onChange={(e) => setEngine(e.target.value as EngineName)}>
          <option value="ai-toolkit">ai-toolkit</option>
          <option value="kohya-ss">kohya_ss</option>
        </select>
      </label>
      <div className="panel-inner grid gap-2">
        <strong>Smart Config</strong>
        <label>
          Profile Preset
          <select value={profile} onChange={(e) => applyPreset(e.target.value as PresetName)}>
            <option value="portrait">portrait</option>
            <option value="style">style</option>
            <option value="product">product</option>
            <option value="anime">anime</option>
          </select>
        </label>
        <div className="row">
          <label>
            GPU VRAM (GB)
            <input type="number" min={8} max={120} value={vramGb} onChange={(e) => setVramGb(Number(e.target.value))} />
          </label>
          <button type="button" onClick={applyVramDefaults}>Apply VRAM Defaults</button>
        </div>
      </div>
      <label>
        Upload Dataset File
        <input type="file" onChange={(e) => void onFilePick(e.target.files?.[0] ?? null)} />
      </label>
      {uploading ? <div className="muted">Uploading...</div> : null}
      {uploadMsg ? <div className="muted">{uploadMsg}</div> : null}
      <label>
        Dataset Path
        <input value={datasetPath} onChange={(e) => setDatasetPath(e.target.value)} required />
      </label>
      <button type="button" onClick={() => void onPreview()}>
        Preview Dataset
      </button>
      {previewItems.length > 0 ? (
        <div className="preview-grid">
          {previewItems.map((item) => (
            <img key={item.path} src={item.url} alt={item.path} loading="lazy" />
          ))}
        </div>
      ) : null}
      <label>
        Base Model
        <input value={baseModel} onChange={(e) => setBaseModel(e.target.value)} required />
      </label>
      <label>
        Output Dir
        <input value={outputDir} onChange={(e) => setOutputDir(e.target.value)} required />
      </label>
      <label>
        Resume Checkpoint (optional)
        <input value={resumeCheckpoint} onChange={(e) => setResumeCheckpoint(e.target.value)} placeholder="/workspace/outputs/run/last.safetensors" />
      </label>
      <label>
        Train Command Override (optional)
        <input value={trainCommand} onChange={(e) => setTrainCommand(e.target.value)} placeholder="python -m toolkit.train /path/config.yaml" />
      </label>
      <div className="row">
        <label>
          Epochs
          <input type="number" min={1} value={epochs} onChange={(e) => setEpochs(Number(e.target.value))} />
        </label>
        <label>
          LR
          <input type="number" step="0.00001" value={learningRate} onChange={(e) => setLearningRate(Number(e.target.value))} />
        </label>
        <label>
          Batch
          <input type="number" min={1} value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value))} />
        </label>
      </div>
      <div className="row">
        <label>
          Rank
          <input type="number" min={4} max={256} value={rank} onChange={(e) => setRank(Number(e.target.value))} />
        </label>
        <label>
          Alpha
          <input type="number" min={1} max={256} value={alpha} onChange={(e) => setAlpha(Number(e.target.value))} />
        </label>
        <label>
          Caption Dropout
          <input type="number" step="0.01" min={0} max={0.5} value={captionDropout} onChange={(e) => setCaptionDropout(Number(e.target.value))} />
        </label>
        <label>
          Precision
          <select value={precision} onChange={(e) => setPrecision(e.target.value)}>
            <option value="bf16">bf16</option>
            <option value="fp16">fp16</option>
          </select>
        </label>
      </div>
      <button disabled={busy || uploading} type="submit">{busy ? "Creating..." : "Create Job"}</button>
    </form>
  );
}
