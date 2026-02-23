$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Test-Path .venv)) {
  python -m venv .venv
}

$python = Join-Path $root ".venv\Scripts\python.exe"
& $python -m pip install -r requirements.txt
npm install
npm run build
& $python -m uvicorn backend.app:app --host 0.0.0.0 --port 8000
