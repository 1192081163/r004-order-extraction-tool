# 订单提取工具

可视化桌面工具，用来拖入订单 Excel 文件或文件夹，自动生成订单整理结果。

## Windows 打包

1. 安装 Python 3.12，并勾选 `Add Python to PATH`。
2. 打开 CMD 或 PowerShell。
3. 进入项目目录。
4. 运行：

```bat
build_windows.bat
```

打包结果在：

```text
dist\订单提取工具\订单提取工具.exe
```

发给别人时，请压缩并发送整个文件夹：

```text
dist\订单提取工具\
```

不要只发送单独的 `.exe`，因为旁边还有 Python、PySide6 和规则文件依赖。

## macOS 打包

```bash
./build_mac.sh
```

打包结果：

```text
dist/订单提取工具.app
订单提取工具-mac.zip
```

## 本地运行

```bash
python3 -m pip install -r requirements-desktop.txt
python3 desktop_app.py
```

## 文件说明

- `desktop_app.py`: 桌面界面。
- `desktop_runner.py`: 文件解析、输出路径和提取执行层。
- `extract.py`: 订单提取核心逻辑。
- `rules/`: 客户别名、工作日和忽略规则。
- `build_windows.bat`: Windows 打包脚本。
- `build_mac.sh`: macOS 打包脚本。

## 数据安全

仓库默认不包含订单 Excel、输出结果、打包产物和本地日志。把新订单拖进软件处理即可，不需要把订单文件提交到 GitHub。
