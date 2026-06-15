#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

python3 -m pip install -r requirements-desktop.txt pyinstaller
rm -rf build dist "订单提取工具-mac.zip"
python3 -m PyInstaller --clean --noconfirm order_extraction_tool.spec
ditto -c -k --sequesterRsrc --keepParent "dist/订单提取工具.app" "订单提取工具-mac.zip"

echo "Built dist/订单提取工具.app"
echo "Created 订单提取工具-mac.zip"
