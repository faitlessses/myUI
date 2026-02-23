#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

python3 -m venv .venv
source .venv/bin/activate

python -m pip install --upgrade pip
pip install -r requirements.txt

mkdir -p runtime/engines

if [[ ! -d runtime/engines/ai-toolkit ]]; then
  git clone https://github.com/ostris/ai-toolkit.git runtime/engines/ai-toolkit
fi

if [[ ! -d runtime/engines/kohya_ss ]]; then
  git clone https://github.com/bmaltais/kohya_ss.git runtime/engines/kohya_ss
fi

if [[ -f runtime/engines/ai-toolkit/requirements.txt ]]; then
  (
    cd runtime/engines/ai-toolkit
    pip install -r requirements.txt
  ) || true
fi

if [[ -f runtime/engines/kohya_ss/requirements.txt ]]; then
  (
    cd runtime/engines/kohya_ss
    git submodule update --init --recursive || true
    # Some kohya revisions include editable ./sd-scripts entries that fail
    # when submodule layout differs. Strip only that line for robust bootstrap.
    grep -vE '^-e[[:space:]]+\./sd-scripts$' requirements.txt > requirements.codex.txt || cp requirements.txt requirements.codex.txt
    pip install -r requirements.codex.txt
  ) || true
fi

npm install
npm run build

echo "Bootstrap complete."
