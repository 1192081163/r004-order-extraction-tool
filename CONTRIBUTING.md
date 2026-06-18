# Contributing

## Development Setup

Install Node.js dependencies and Python runner dependencies:

```bash
npm install
python -m pip install -r requirements-python-runner.txt pytest
```

Run the standard checks before opening a pull request:

```bash
npm run typecheck
npm test
python -m pytest tests
npm run build
```

## Data Rules

Do not commit real order workbooks, customer files, mailbox exports, generated reports, credentials, or local packaging output. Keep local sample files under ignored folders such as `data/`, `outputs/`, or `reports/`.

When adding tests, use minimal synthetic workbooks or anonymized fixtures that do not expose customer names, addresses, order numbers, or email content.

## Release Notes

GitHub Actions owns release publishing for the Windows portable executable. CircleCI is configured for checks and artifacts only; it should not create GitHub releases.
