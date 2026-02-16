#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path


def to_pascal(name: str) -> str:
    return "".join(part.capitalize() for part in name.replace("_", "-").split("-") if part)


def write_file(path: Path, content: str, dry_run: bool) -> str:
    if dry_run:
        return f"[dry-run] create {path.as_posix()}"
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        return f"[skip] exists {path.as_posix()}"
    path.write_text(content, encoding="utf-8")
    return f"[create] {path.as_posix()}"


def contract_template(interface: str) -> str:
    return (
        "import type { Result } from '$lib/core/types';\n\n"
        f"export interface {interface}Seam {{\n"
        "  // TODO: define seam operations for this contract.\n"
        "}\n\n"
        f"export type {interface}Result<T> = Result<T>;\n"
    )


def mock_template(interface: str) -> str:
    return (
        f"import type {{ {interface}Seam }} from './contract';\n\n"
        f"export function create{interface}Mock(): {interface}Seam {{\n"
        "  return {\n"
        "    // TODO: implement fixture-backed operations.\n"
        f"  }} as {interface}Seam;\n"
        "}\n"
    )


def contract_test_template(name: str) -> str:
    return (
        "import { describe, expect, it } from 'vitest';\n\n"
        f"describe('{name} seam contract', () => {{\n"
        "  it('placeholder contract test', () => {\n"
        "    expect(true).toBe(true);\n"
        "  });\n"
        "});\n"
    )


def probe_template(name: str) -> str:
    return (
        "import { mkdir, writeFile } from 'node:fs/promises';\n"
        "import { join } from 'node:path';\n\n"
        "async function main() {\n"
        "  const fixtures = join(process.cwd(), 'src/lib/seams', "
        f"'{name}', 'fixtures');\n"
        "  await mkdir(fixtures, { recursive: true });\n"
        "  await writeFile(\n"
        "    join(fixtures, 'sample.json'),\n"
        "    JSON.stringify({ ok: true, value: {}, probedAt: new Date().toISOString(), environment: 'dev' }, null, 2)\n"
        "  );\n"
        "  await writeFile(\n"
        "    join(fixtures, 'fault.json'),\n"
        "    JSON.stringify({ ok: false, error: { code: 'UPSTREAM_ERROR', message: 'TODO' }, probedAt: new Date().toISOString(), environment: 'dev' }, null, 2)\n"
        "  );\n"
        "  console.log('Wrote probe fixtures.');\n"
        "}\n\n"
        "main().catch((err) => {\n"
        "  console.error(err);\n"
        "  process.exit(1);\n"
        "});\n"
    )


def adapter_template(interface: str, seam_name: str) -> str:
    return (
        f"import type {{ {interface}Seam }} from '$lib/seams/{seam_name}/contract';\n\n"
        f"export function create{interface}Adapter(): {interface}Seam {{\n"
        "  return {\n"
        "    // TODO: implement real adapter with contract validation and taxonomy mapping.\n"
        f"  }} as {interface}Seam;\n"
        "}\n"
    )


def fixture_sample() -> str:
    return json.dumps(
        {
            "ok": True,
            "value": {},
            "probedAt": "1970-01-01T00:00:00.000Z",
            "environment": "dev",
        },
        indent=2,
    ) + "\n"


def fixture_fault() -> str:
    return json.dumps(
        {
            "ok": False,
            "error": {"code": "UPSTREAM_ERROR", "message": "TODO"},
            "probedAt": "1970-01-01T00:00:00.000Z",
            "environment": "dev",
        },
        indent=2,
    ) + "\n"


def ensure_registry(
    root: Path,
    name: str,
    seam_type: str,
    classification: str,
    freshness_days: int | None,
    idempotent: bool,
    dry_run: bool,
) -> str:
    registry_path = root / "seam-registry.json"
    if registry_path.exists():
        try:
            data = json.loads(registry_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise ValueError(f"Invalid JSON in seam-registry.json: {exc}") from exc
    else:
        data = {"seams": []}

    if "seams" not in data or not isinstance(data["seams"], list):
        raise ValueError("seam-registry.json must contain an object with a seams array.")

    if any(item.get("name") == name for item in data["seams"] if isinstance(item, dict)):
        return "[skip] seam-registry.json already has entry"

    base = {
        "name": name,
        "type": seam_type,
        "contract": f"src/lib/seams/{name}/contract.ts",
        "fixtures": f"src/lib/seams/{name}/fixtures/",
        "mock": f"src/lib/seams/{name}/mock.ts",
        "tests": f"src/lib/seams/{name}/contract.test.ts",
        "idempotent": idempotent,
        "dataClassification": classification,
    }

    if seam_type == "io":
        base["probe"] = f"src/lib/seams/{name}/probe.ts"
        base["adapter"] = f"src/lib/server/seams/{name}/adapter.ts"
        base["freshnessDays"] = freshness_days
    else:
        base["adapter"] = f"src/lib/seams/{name}/adapter.ts"
        base["freshnessDays"] = None

    data["seams"].append(base)
    if dry_run:
        return "[dry-run] update seam-registry.json"

    registry_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    return "[update] seam-registry.json"


def validate_name(name: str) -> None:
    if not name:
        raise ValueError("Seam name cannot be empty.")
    allowed = set("abcdefghijklmnopqrstuvwxyz0123456789-")
    if any(ch not in allowed for ch in name):
        raise ValueError("Seam name must use lowercase letters, digits, and hyphens only.")


def main() -> int:
    parser = argparse.ArgumentParser(description="Scaffold seam files and registry entries.")
    parser.add_argument("--name", required=True, help="Seam name (kebab-case).")
    parser.add_argument("--type", choices=["io", "pure"], default="io", dest="seam_type")
    parser.add_argument("--root", default=".", help="Repository root path.")
    parser.add_argument("--freshness-days", type=int, default=7)
    parser.add_argument("--classification", choices=["public", "sensitive"], default="public")
    parser.add_argument("--non-idempotent", action="store_true")
    parser.add_argument("--skip-registry", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    try:
        validate_name(args.name)
    except ValueError as exc:
        print(str(exc))
        return 2

    root = Path(args.root).resolve()
    name = args.name
    seam_type = args.seam_type
    interface = to_pascal(name)

    logs: list[str] = []

    seam_root = root / "src/lib/seams" / name
    fixtures_root = seam_root / "fixtures"

    logs.append(write_file(seam_root / "contract.ts", contract_template(interface), args.dry_run))
    logs.append(write_file(seam_root / "mock.ts", mock_template(interface), args.dry_run))
    logs.append(write_file(seam_root / "contract.test.ts", contract_test_template(name), args.dry_run))
    logs.append(write_file(fixtures_root / "sample.json", fixture_sample(), args.dry_run))
    logs.append(write_file(fixtures_root / "fault.json", fixture_fault(), args.dry_run))

    if seam_type == "io":
        logs.append(write_file(seam_root / "probe.ts", probe_template(name), args.dry_run))
        logs.append(
            write_file(
                root / "src/lib/server/seams" / name / "adapter.ts",
                adapter_template(interface, name),
                args.dry_run,
            )
        )
    else:
        logs.append(
            write_file(seam_root / "adapter.ts", adapter_template(interface, name), args.dry_run)
        )

    if not args.skip_registry:
        try:
            logs.append(
                ensure_registry(
                    root=root,
                    name=name,
                    seam_type=seam_type,
                    classification=args.classification,
                    freshness_days=args.freshness_days if seam_type == "io" else None,
                    idempotent=not args.non_idempotent,
                    dry_run=args.dry_run,
                )
            )
        except ValueError as exc:
            print(str(exc))
            return 2

    for line in logs:
        print(line)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
