#!/usr/bin/env bash
set -euo pipefail
tool_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
python3 -m venv "$tool_dir/.venv"
"$tool_dir/.venv/bin/python" -m pip install -r "$tool_dir/requirements.txt"
