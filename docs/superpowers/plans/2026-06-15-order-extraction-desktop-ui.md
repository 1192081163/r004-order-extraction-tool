# Order Extraction Desktop UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a visual desktop interface that accepts dragged folders or Excel files and automatically runs the existing order extraction flow.

**Architecture:** Add a testable runner layer between `extract.py` and the GUI. The runner normalizes inputs, writes outputs, reports progress, and captures per-file failures. The PySide6 GUI owns drag/drop, background execution, logs, and output actions.

**Tech Stack:** Python 3, existing `openpyxl` extraction code, PySide6 for the desktop UI, pytest/unittest for verification.

---

## File Structure

- Create `desktop_runner.py`: non-GUI service for input normalization, output paths, extraction execution, progress callbacks, and result data.
- Create `desktop_app.py`: PySide6 desktop app with drag/drop UI and background worker.
- Create `requirements-desktop.txt`: desktop-only dependency list.
- Create `tests/test_desktop_runner.py`: runner tests that do not require launching a GUI.
- Modify `docs/superpowers/specs/2026-06-15-order-extraction-desktop-design.md` only if implementation discoveries require scope clarification.

The workspace is not a git repository, so commit steps are skipped in this environment.

## Task 1: Runner Input Resolution

**Files:**
- Create: `desktop_runner.py`
- Test: `tests/test_desktop_runner.py`

- [ ] **Step 1: Write failing tests for folder and file input resolution**

```python
from pathlib import Path

from openpyxl import Workbook

from desktop_runner import resolve_input_paths


def make_workbook(path: Path) -> None:
    wb = Workbook()
    wb.active.title = "Other"
    wb.save(path)


def test_resolve_input_paths_accepts_folder_and_filters_excel_files(tmp_path):
    make_workbook(tmp_path / "order.xlsx")
    make_workbook(tmp_path / "order.xlsm")
    make_workbook(tmp_path / "~$temp.xlsx")
    (tmp_path / "notes.txt").write_text("ignore", encoding="utf-8")
    (tmp_path / "2026 Job Track.xlsx").write_text("ignore", encoding="utf-8")

    result = resolve_input_paths([tmp_path])

    assert [path.name for path in result.input_files] == ["order.xlsm", "order.xlsx"]
    assert result.base_dir == tmp_path
    assert "notes.txt" in result.skipped_files


def test_resolve_input_paths_accepts_multiple_excel_files(tmp_path):
    one = tmp_path / "one.xlsx"
    two = tmp_path / "two.xlsm"
    bad = tmp_path / "bad.txt"
    make_workbook(one)
    make_workbook(two)
    bad.write_text("ignore", encoding="utf-8")

    result = resolve_input_paths([two, bad, one])

    assert [path.name for path in result.input_files] == ["one.xlsx", "two.xlsm"]
    assert result.base_dir == tmp_path
    assert result.skipped_files == ["bad.txt"]
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python3 -m pytest tests/test_desktop_runner.py -q`

Expected: FAIL because `desktop_runner` does not exist.

- [ ] **Step 3: Implement minimal input resolution**

Create `desktop_runner.py` with:

```python
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable

import extract


VALID_SUFFIXES = {".xlsx", ".xlsm"}


@dataclass(frozen=True)
class InputResolution:
    input_files: list[Path]
    skipped_files: list[str]
    base_dir: Path


def is_valid_order_file(path: Path) -> bool:
    if not path.is_file():
        return False
    if path.name.startswith(".~") or path.name.lower().startswith("~$"):
        return False
    if path.suffix.lower() not in VALID_SUFFIXES:
        return False
    if "job track" in path.name.lower():
        return False
    if path.name == "总表.xlsx":
        return False
    return True


def resolve_input_paths(paths: Iterable[Path | str], recursive: bool = False) -> InputResolution:
    raw_paths = [Path(path).expanduser().resolve() for path in paths]
    input_files: list[Path] = []
    skipped_files: list[str] = []
    base_dir = raw_paths[0] if raw_paths else Path.cwd()

    for path in raw_paths:
        if path.is_dir():
            base_dir = path
            input_files.extend(extract.collect_input_files(path, recursive=recursive))
            continue
        if is_valid_order_file(path):
            input_files.append(path)
        else:
            skipped_files.append(path.name)

    input_files = sorted(dict.fromkeys(input_files))
    if input_files and not raw_paths[0].is_dir():
        base_dir = input_files[0].parent
    return InputResolution(input_files=input_files, skipped_files=skipped_files, base_dir=base_dir)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python3 -m pytest tests/test_desktop_runner.py -q`

Expected: PASS for the two new tests.

## Task 2: Runner Extraction Execution

**Files:**
- Modify: `desktop_runner.py`
- Test: `tests/test_desktop_runner.py`

- [ ] **Step 1: Write failing tests for output paths and no-input error**

```python
import pytest

from desktop_runner import NoInputFilesError, default_output_paths, run_extraction


def test_default_output_paths_use_output_folder(tmp_path):
    paths = default_output_paths(tmp_path)

    assert paths.output_dir == tmp_path / "order_extraction_output"
    assert paths.xlsx_output.name == "订单整理结果.xlsx"
    assert paths.csv_output.name == "extracted_job_rows.csv"
    assert paths.audit_output.name == "audit.csv"


def test_run_extraction_rejects_no_valid_files(tmp_path):
    with pytest.raises(NoInputFilesError, match="No valid order Excel files"):
        run_extraction([tmp_path / "notes.txt"])
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python3 -m pytest tests/test_desktop_runner.py -q`

Expected: FAIL because `NoInputFilesError`, `default_output_paths`, or `run_extraction` do not exist.

- [ ] **Step 3: Implement output path and no-input behavior**

Add to `desktop_runner.py`:

```python
@dataclass(frozen=True)
class OutputPaths:
    output_dir: Path
    csv_output: Path
    xlsx_output: Path
    audit_output: Path


@dataclass(frozen=True)
class ExtractionFailure:
    path: Path
    error: str


@dataclass(frozen=True)
class ExtractionResult:
    input_files: list[Path]
    rows: list[extract.ExtractedRow]
    skipped_files: list[str]
    failures: list[ExtractionFailure]
    outputs: OutputPaths


class NoInputFilesError(ValueError):
    pass


def default_output_paths(base_dir: Path) -> OutputPaths:
    output_dir = base_dir / "order_extraction_output"
    return OutputPaths(
        output_dir=output_dir,
        csv_output=output_dir / "extracted_job_rows.csv",
        xlsx_output=output_dir / "订单整理结果.xlsx",
        audit_output=output_dir / "audit.csv",
    )


def run_extraction(
    paths: Iterable[Path | str],
    *,
    recursive: bool = False,
    infer_manual: bool = True,
    progress: callable | None = None,
) -> ExtractionResult:
    resolution = resolve_input_paths(paths, recursive=recursive)
    if not resolution.input_files:
        raise NoInputFilesError("No valid order Excel files were found.")
    outputs = default_output_paths(resolution.base_dir)
    rows: list[extract.ExtractedRow] = []
    failures: list[ExtractionFailure] = []
    total = len(resolution.input_files)
    for index, path in enumerate(resolution.input_files, start=1):
        if progress:
            progress(index, total, path, "running")
        try:
            rows.append(extract.extract_workbook(path, infer_manual=infer_manual))
        except Exception as exc:
            failures.append(ExtractionFailure(path=path, error=str(exc)))
            if progress:
                progress(index, total, path, "failed")
        else:
            if progress:
                progress(index, total, path, "completed")
    extract.write_csv(rows, outputs.csv_output)
    extract.write_xlsx(rows, outputs.xlsx_output, resolution.base_dir, resolution.input_files)
    extract.write_audit_csv(rows, outputs.audit_output)
    return ExtractionResult(
        input_files=resolution.input_files,
        rows=rows,
        skipped_files=resolution.skipped_files,
        failures=failures,
        outputs=outputs,
    )
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python3 -m pytest tests/test_desktop_runner.py -q`

Expected: PASS for runner tests.

## Task 3: Desktop GUI

**Files:**
- Create: `desktop_app.py`
- Create: `requirements-desktop.txt`

- [ ] **Step 1: Add PySide6 dependency file**

Create `requirements-desktop.txt`:

```text
PySide6>=6.7,<7
```

- [ ] **Step 2: Implement PySide6 app**

Create `desktop_app.py` with a `QMainWindow`, drop zone widget, options, progress bar, log panel, background `QThread`, and actions for opening output workbook/folder.

- [ ] **Step 3: Run GUI import smoke check**

Run:

```bash
python3 - <<'PY'
from desktop_app import OrderExtractionWindow
print(OrderExtractionWindow.__name__)
PY
```

Expected: prints `OrderExtractionWindow`. If PySide6 is missing, install with `python3 -m pip install -r requirements-desktop.txt` and rerun.

## Task 4: Full Verification

**Files:**
- Existing tests and new files.

- [ ] **Step 1: Run existing extraction tests**

Run: `python3 -m pytest tests/test_extract_rules.py -q`

Expected: all existing tests pass.

- [ ] **Step 2: Run desktop runner tests**

Run: `python3 -m pytest tests/test_desktop_runner.py -q`

Expected: all new tests pass.

- [ ] **Step 3: Run a sample extraction through the runner**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
from desktop_runner import run_extraction
result = run_extraction([Path("order_excels_dedup/AFDC 29603 Door Skins .xlsx")])
print(len(result.rows))
print(result.outputs.xlsx_output.exists())
print(result.outputs.csv_output.exists())
print(result.outputs.audit_output.exists())
PY
```

Expected: prints `1`, then `True`, `True`, `True`.

- [ ] **Step 4: Run GUI smoke check**

Run:

```bash
QT_QPA_PLATFORM=offscreen python3 - <<'PY'
import sys
from PySide6.QtWidgets import QApplication
from desktop_app import OrderExtractionWindow
app = QApplication(sys.argv)
window = OrderExtractionWindow()
print(window.windowTitle())
PY
```

Expected: prints the desktop app title without crashing.
