#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

helper_dir="$repo_root/python-helper"
work_dir="$repo_root/build/python-runner"
spec_dir="$repo_root/build"
rules_dir="$repo_root/rules"
bridge_path="$repo_root/python_extraction_bridge.py"

rm -rf "$helper_dir"
mkdir -p "$helper_dir" "$spec_dir"

python3 -m PyInstaller \
  --clean \
  --noconfirm \
  --onefile \
  --console \
  --name "order-python-runner" \
  --distpath "$helper_dir" \
  --workpath "$work_dir" \
  --specpath "$spec_dir" \
  --add-data "$rules_dir:rules" \
  "$bridge_path"
