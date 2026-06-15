# Order Extraction Desktop UI Design

## Goal

Build a visual desktop interface for the existing order extraction module. The app accepts dragged folders or multiple Excel files, runs the current extraction logic automatically, and gives the user clear progress, logs, and output-file actions.

## Current Context

- Core extraction logic lives in `extract.py`.
- `extract_workbook(path, infer_manual=False)` extracts one workbook into an `ExtractedRow`.
- `collect_input_files(input_dir, recursive=False)` scans a folder for `.xlsx` and `.xlsm` order files.
- `write_csv`, `write_xlsx`, and `write_audit_csv` already write the output formats needed by the desktop app.
- The repository is not currently a git repository, so this design cannot be committed from this workspace.

## Product Brief

The desktop app should feel like a work utility rather than a marketing page. The first screen is the working screen: a large drop zone, a compact options area, progress feedback, and a log/result panel. It should support full interactivity for the main workflow.

## Supported Inputs

- A dragged folder containing order Excel files.
- Multiple dragged `.xlsx` or `.xlsm` files.
- A manual file/folder picker as a fallback for users who do not drag.

The app ignores unsupported files, Excel temporary files, and job-track/summary workbooks using the same filtering rules as the existing extractor where possible.

## Output Behavior

For each run, the app writes into an output folder named `order_extraction_output` next to the selected folder, or next to the first selected Excel file when the user drops individual files.

Default outputs:

- `订单整理结果.xlsx`
- `extracted_job_rows.csv`
- `audit.csv`

The result view shows the scanned file count, extracted row count, skipped file count, failed file count, and output paths.

## UI Layout

The main window contains:

- Header: app title and short status text.
- Drop zone: accepts folders and Excel files, with clear empty, hover, running, success, and error states.
- Options: recursive scan toggle and infer-manual toggle.
- Progress area: progress bar, current file name, and summary counters.
- Log panel: timestamped messages for scanned, skipped, failed, and completed items.
- Result actions: open output workbook, open output folder, and reset for another run.

## Architecture

Keep extraction behavior separate from UI code.

- `desktop_runner.py` owns file/folder normalization, output path selection, progress callbacks, and error collection.
- `desktop_app.py` owns the PySide6 UI, drag/drop handlers, background worker thread, and user actions.
- `extract.py` remains the source of truth for parsing and writing order data.

This keeps the desktop shell replaceable and keeps the extraction logic testable without launching a GUI.

## Error Handling

- Per-file extraction failures are captured and shown in the log.
- A failed file does not stop the whole run.
- If no valid Excel files are found, the UI shows an error state and no output files are written.
- If output writing fails, the run reports a final error and keeps the log visible.

## Testing

Focused automated tests cover the non-GUI runner:

- Folder input resolves valid Excel files using existing filtering.
- Multiple file input preserves valid files and skips unsupported files.
- Output paths are created in the expected output folder.
- A run with valid sample files writes CSV, XLSX, and audit files.
- A run with no valid files raises a clear error.

The GUI is verified with a smoke check that imports/constructs the application classes without starting the full event loop when PySide6 is installed.

## Out Of Scope

- Changing extraction rules.
- Editing source Excel files.
- Comparing against a total workbook from the GUI.
- Building a signed installer or distributable `.app` in the first pass.
