---
name: seam-scaffold
description: Scaffold new seam bundles for the hexagonal architecture used in this project. Use when adding a seam and you need the standard contract/probe/fixtures/mock/contract-test/adapter file layout plus seam-registry.json entry.
---

# Seam Scaffold

Use the bundled script to create seam files with consistent paths and templates.

## Run

From repo root, run:

    python skills/seam-scaffold/scripts/seam_scaffold.py --name grok-ai --type io --classification sensitive

## Behavior

- Create `src/lib/seams/<name>/` with:
  - `contract.ts`
  - `mock.ts`
  - `contract.test.ts`
  - `fixtures/sample.json`
  - `fixtures/fault.json`
- For `--type io`, also create:
  - `probe.ts`
  - `src/lib/server/seams/<name>/adapter.ts`
- For `--type pure`, also create:
  - `src/lib/seams/<name>/adapter.ts`
- Update (or create) `seam-registry.json` unless `--skip-registry` is set.

## Examples

    python skills/seam-scaffold/scripts/seam_scaffold.py --name database --type io --classification sensitive --freshness-days 7
    python skills/seam-scaffold/scripts/seam_scaffold.py --name clock --type pure --classification public
    python skills/seam-scaffold/scripts/seam_scaffold.py --name auth --type io --dry-run

## Notes

- Keep seam names lowercase with hyphens.
- Use `--dry-run` first when unsure.
- Fill in generated TODOs immediately after scaffolding.
