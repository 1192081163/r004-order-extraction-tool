@echo off
setlocal

cd /d "%~dp0"

py -m pip install -r requirements-desktop.txt pyinstaller
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist
py -m PyInstaller --clean --noconfirm --windowed --name "订单提取工具" --add-data "rules;rules" desktop_app.py

echo Built dist\订单提取工具\订单提取工具.exe
