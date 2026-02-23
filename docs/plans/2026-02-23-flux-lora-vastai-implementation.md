# Flux LoRA Vast.ai Notebook Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a ready-to-run `.ipynb` that trains Flux LoRA on Vast.ai with ai-toolkit-style workflow and approved operational features.

**Architecture:** Scaffold an experiment notebook, replace template cells with a deterministic training pipeline, and validate notebook JSON plus generated artifact paths. Keep all controls centralized in one parameter cell for reproducibility.

**Tech Stack:** Python 3.10+, Jupyter Notebook, PyTorch/CUDA, ai-toolkit-compatible shell workflow, Vast.ai Linux runtime.

---

### Task 1: Create Design and Output Directories

**Files:**
- Create: `docs/plans/2026-02-23-flux-lora-vastai-design.md`
- Create: `docs/plans/2026-02-23-flux-lora-vastai-implementation.md`
- Create: `output/jupyter-notebook/`

**Step 1: Ensure required directories exist**
Run: `New-Item -ItemType Directory -Force -Path docs/plans,output/jupyter-notebook | Out-Null`
Expected: Directories exist with no errors.

**Step 2: Verify directory creation**
Run: `Get-ChildItem docs,output`
Expected: `docs/plans` and `output/jupyter-notebook` present.

### Task 2: Scaffold Notebook File

**Files:**
- Create: `output/jupyter-notebook/flux-lora-vastai-ai-toolkit.ipynb`

**Step 1: Run scaffold helper**
Run: `python C:/Users/Tyuki/.codex/skills/jupyter-notebook/scripts/new_notebook.py --kind experiment --title "Flux LoRA Vast.ai ai-toolkit Workflow" --out output/jupyter-notebook/flux-lora-vastai-ai-toolkit.ipynb --force`
Expected: File is written successfully.

**Step 2: Verify notebook exists**
Run: `Get-Item output/jupyter-notebook/flux-lora-vastai-ai-toolkit.ipynb`
Expected: File exists.

### Task 3: Replace Notebook Cells With Operational Workflow

**Files:**
- Modify: `output/jupyter-notebook/flux-lora-vastai-ai-toolkit.ipynb`

**Step 1: Define cell set**
Include markdown/code cells for: objective, prerequisites, config, runtime checks, bootstrap, dataset ingest, captioning, quality gate, YAML config generation, training launch, log tail, validation, cost guard, publish pack, and next steps.

**Step 2: Write notebook JSON updates**
Programmatically update `cells` and preserve notebook metadata/nbformat fields.
Expected: Valid JSON notebook with runnable ordered cells.

**Step 3: Verify JSON validity**
Run: `Get-Content -Raw output/jupyter-notebook/flux-lora-vastai-ai-toolkit.ipynb | ConvertFrom-Json | Out-Null`
Expected: No parse errors.

### Task 4: Verify Required Features Are Present

**Files:**
- Modify: `output/jupyter-notebook/flux-lora-vastai-ai-toolkit.ipynb`

**Step 1: Check for approved controls**
Run text checks for: `ALLOW_NSFW`, `RESUME_FROM_CHECKPOINT`, `VAST_AUTO_MOUNT_PATHS`, `QUALITY_GATE`, `WANDB`, `COST_GUARD`, and publish bundle references.
Expected: All controls present.

**Step 2: Ensure trainer command path is explicit**
Verify notebook documents where to insert the exact ai-toolkit train command if user’s fork differs.
Expected: Clear editable command cell.

### Task 5: Final Verification

**Files:**
- Verify: `docs/plans/2026-02-23-flux-lora-vastai-design.md`
- Verify: `docs/plans/2026-02-23-flux-lora-vastai-implementation.md`
- Verify: `output/jupyter-notebook/flux-lora-vastai-ai-toolkit.ipynb`

**Step 1: Validate notebook parse**
Run: `Get-Content -Raw output/jupyter-notebook/flux-lora-vastai-ai-toolkit.ipynb | ConvertFrom-Json | Out-Null`
Expected: Pass.

**Step 2: Show workspace changes**
Run: `git status --short`
Expected: Only new plan docs and notebook changes relevant to task.