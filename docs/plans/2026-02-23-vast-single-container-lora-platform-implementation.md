# Vast LoRA Platform Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a single-container Vast.ai web app that creates and runs LoRA training jobs with `ai-toolkit` and `kohya_ss` backends.

**Architecture:** FastAPI + SQLite backend serves a React frontend and executes training processes via adapter commands. UI polls API for status/logs/artifacts.

**Tech Stack:** Python 3.11+, FastAPI, Uvicorn, Pydantic, SQLite, React+Vite+TypeScript.

---

### Task 1: Add Backend Dependencies and Layout

**Files:**
- Create: `backend/__init__.py`
- Create: `backend/app.py`
- Create: `backend/db.py`
- Create: `backend/models.py`
- Create: `backend/schemas.py`
- Create: `backend/services/jobs.py`
- Create: `backend/engines/ai_toolkit.py`
- Create: `backend/engines/kohya_ss.py`
- Create: `backend/engines/__init__.py`
- Create: `requirements.txt`

**Step 1: Write failing backend tests for API shape and lifecycle.**
**Step 2: Run tests to confirm failures.**
**Step 3: Implement minimal backend to satisfy tests.**
**Step 4: Run tests to confirm passes.**

### Task 2: Implement Job Runner and Engine Adapters

**Files:**
- Modify: `backend/services/jobs.py`
- Modify: `backend/engines/ai_toolkit.py`
- Modify: `backend/engines/kohya_ss.py`
- Test: `tests/test_engines.py`

**Step 1: Add failing adapter tests for command generation.**
**Step 2: Implement canonical config -> command mapping.**
**Step 3: Verify tests pass.**

### Task 3: Replace Frontend With API-Driven Control UI

**Files:**
- Modify: `src/App.tsx`
- Create: `src/lib/api.ts`
- Create: `src/components/JobForm.tsx`
- Create: `src/components/JobList.tsx`
- Create: `src/components/JobDetail.tsx`
- Modify: `src/styles/global.css`

**Step 1: Add failing UI typing/build checks for new API model usage.**
**Step 2: Implement creation form, list, logs tail, artifacts view, start/stop actions.**
**Step 3: Verify `npm run build` passes.**

### Task 4: Add Startup Scripts and Vast Runbook

**Files:**
- Create: `scripts/start.sh`
- Create: `scripts/start.ps1`
- Create: `scripts/bootstrap.sh`
- Modify: `README.md`

**Step 1: Implement reproducible setup/run commands.**
**Step 2: Document Vast.ai port exposure and launch flow.**
**Step 3: Verify command docs align with actual scripts.**

### Task 5: Final Verification

**Files:**
- Verify: backend + frontend + docs files above

**Step 1: Run backend tests (`pytest`).**
**Step 2: Run frontend build (`npm run build`).**
**Step 3: Summarize exact launch commands for Vast.ai.**
