#!/usr/bin/env bash
set -euo pipefail
tool_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -x "$tool_dir/.venv/bin/python" ]]; then
  exec "$tool_dir/.venv/bin/python" "$tool_dir/pixel_tool.py" "$@"
fi
exec python3 "$tool_dir/pixel_tool.py" "$@"
