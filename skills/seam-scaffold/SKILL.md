---
name: seam-scaffold
description: Legacy scaffold reference for new seam bundles. The bundled script is not a drop-in command for this checkout because it assumes `src/` and `seam-registry.json` share one root.
---

# Seam Scaffold

The current application source is in `app/src/`, while `seam-registry.json` is
at the repository root. The bundled script assumes both paths are under one
root, so it can create files in the wrong location or a second registry. Do not
run it against this checkout until the tool itself is reconciled with the
repository layout. Follow the seam workflow in `app/AGENTS.md` for new seams.

## Run

The historical command below shows the script's original interface. It is not a
safe command for this checkout:

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
