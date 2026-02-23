# Flux LoRA Vast.ai Notebook Design

## Goal
Create a ready-to-run Jupyter notebook for personal Flux LoRA training on Vast.ai using an ai-toolkit-style workflow, including NSFW-capable dataset handling and full operational controls.

## Architecture
The notebook is a single operational workflow with deterministic setup and parameterized controls at the top. It runs in sequence: runtime preflight, environment bootstrap, data prep, captioning, config generation, training, monitoring, sampling, and artifact packaging. User-editable knobs are centralized in one config cell to reduce mistakes during rented GPU sessions.

## Components
- Runtime Preflight: verify GPU visibility, CUDA, VRAM, disk, and mount points.
- Environment Bootstrap: create virtualenv, install dependencies, clone/update toolkit.
- Dataset Pipeline: ingest/extract dataset, normalize folder structure, run quality checks.
- Captioning Pipeline: optional auto-caption generation with manual override hooks.
- Training Config Builder: generate YAML from notebook parameters.
- Training Runner: launch training, support resume from checkpoint, tail logs.
- Validation: run sample inference from produced LoRA.
- Publishing Pack: bundle LoRA + metadata + prompts for download.

## Data Flow
Inputs (dataset zip/folder + base model id + hyperparameters) flow into prepared training folders and generated captions. The config generator writes a reproducible config artifact. Trainer produces checkpoints/final LoRA and logs. Validation reads final artifacts for sample generation. Export packs all outputs and metadata into a portable bundle.

## Error Handling
Each critical stage performs explicit fail-fast checks with actionable messages:
- Missing GPU/CUDA, insufficient disk, empty dataset, missing captions (when required), missing checkpoints for resume.
- Training command failures surface process output and final exit code.
- Path detection handles common Vast.ai mount layouts and falls back to user-specified path.

## Testing and Verification
Notebook includes verification cells for:
- Environment readiness and dependency import checks.
- Dataset quality gate thresholds.
- Config preview before training.
- Post-training artifact existence checks and sample generation sanity check.

## Approved Scope
Approved by user:
- ai-toolkit-based custom workflow
- NSFW toggle with no forced filtering
- Auto mount-path detection
- Resume from checkpoint
- Quality gate preflight
- Cost/time guard estimation
- Publishing bundle output
- Optional Weights & Biases logging