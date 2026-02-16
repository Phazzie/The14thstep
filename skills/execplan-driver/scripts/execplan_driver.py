#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime as dt
import re
import sys
from pathlib import Path


SECTION_PROGRESS = "Progress"
SECTION_DISCOVERIES = "Surprises & Discoveries"
SECTION_DECISIONS = "Decision Log"
SECTION_OUTCOMES = "Outcomes & Retrospective"


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def write_text(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8")


def section_bounds(text: str, title: str) -> tuple[int, int]:
    pattern = rf"^##\s+{re.escape(title)}\s*$"
    match = re.search(pattern, text, flags=re.MULTILINE)
    if not match:
        raise ValueError(f"Missing section heading: ## {title}")

    start = match.end()
    next_heading = re.search(r"^##\s+.+$", text[start:], flags=re.MULTILINE)
    if next_heading:
        end = start + next_heading.start()
    else:
        end = len(text)
    return start, end


def replace_section_body(text: str, title: str, new_body: str) -> str:
    start, end = section_bounds(text, title)
    return text[:start] + new_body + text[end:]


def append_to_section(text: str, title: str, block: str) -> str:
    start, end = section_bounds(text, title)
    body = text[start:end]
    sep = "\n" if body.endswith("\n") else "\n\n"
    if body.strip() == "":
        sep = "\n"
    updated = body + sep + block.rstrip() + "\n"
    return replace_section_body(text, title, updated)


def progress_summary(text: str) -> tuple[int, int]:
    start, end = section_bounds(text, SECTION_PROGRESS)
    body = text[start:end]
    items = re.findall(r"^\s*-\s\[( |x)\]\s.+$", body, flags=re.MULTILINE)
    done = sum(1 for item in items if item == "x")
    return len(items), done


def mark_progress_item(text: str, item_substring: str) -> str:
    start, end = section_bounds(text, SECTION_PROGRESS)
    body = text[start:end]
    lines = body.splitlines(keepends=True)

    needle = item_substring.lower()
    for idx, line in enumerate(lines):
        if "- [ ]" in line and needle in line.lower():
            lines[idx] = line.replace("- [ ]", "- [x]", 1)
            return replace_section_body(text, SECTION_PROGRESS, "".join(lines))
    raise ValueError(f"No unchecked Progress item matched: {item_substring}")


def cmd_summary(plan: Path) -> int:
    text = read_text(plan)
    total, done = progress_summary(text)
    print(f"Plan: {plan}")
    print(f"Progress items: {done}/{total} complete, {total - done} open")
    return 0


def cmd_check(plan: Path, item: str) -> int:
    text = read_text(plan)
    updated = mark_progress_item(text, item)
    write_text(plan, updated)
    print(f"Marked complete in Progress: {item}")
    return 0


def cmd_add_discovery(plan: Path, observation: str, evidence: str) -> int:
    text = read_text(plan)
    block = f"- Observation: {observation}\n  Evidence: {evidence}"
    updated = append_to_section(text, SECTION_DISCOVERIES, block)
    write_text(plan, updated)
    print("Added discovery entry.")
    return 0


def cmd_add_decision(
    plan: Path, decision: str, rationale: str, author: str, date: str | None
) -> int:
    text = read_text(plan)
    day = date or dt.date.today().isoformat()
    block = (
        f"- Decision: {decision}\n"
        f"  Rationale: {rationale}\n"
        f"  Date/Author: {day} / {author}"
    )
    updated = append_to_section(text, SECTION_DECISIONS, block)
    write_text(plan, updated)
    print("Added decision entry.")
    return 0


def cmd_add_outcome(plan: Path, text_value: str) -> int:
    text = read_text(plan)
    day = dt.date.today().isoformat()
    block = f"- {day}: {text_value}"
    updated = append_to_section(text, SECTION_OUTCOMES, block)
    write_text(plan, updated)
    print("Added outcome entry.")
    return 0


def cmd_add_revision_note(plan: Path, note: str) -> int:
    text = read_text(plan).rstrip()
    day = dt.date.today().isoformat()
    line = f"Revision note ({day}): {note}"
    updated = text + "\n\n" + line + "\n"
    write_text(plan, updated)
    print("Added revision note.")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Keep PLANS.md-style ExecPlans updated during implementation."
    )
    parser.add_argument(
        "--plan",
        required=True,
        type=Path,
        help="Path to the ExecPlan markdown file.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("summary", help="Show Progress checklist summary.")

    p_check = sub.add_parser("check", help="Mark first matching unchecked progress item.")
    p_check.add_argument("--item", required=True, help="Substring to match in Progress list.")

    p_disc = sub.add_parser("add-discovery", help="Append entry to Surprises & Discoveries.")
    p_disc.add_argument("--observation", required=True)
    p_disc.add_argument("--evidence", required=True)

    p_decision = sub.add_parser("add-decision", help="Append entry to Decision Log.")
    p_decision.add_argument("--decision", required=True)
    p_decision.add_argument("--rationale", required=True)
    p_decision.add_argument("--author", required=True)
    p_decision.add_argument("--date", default=None, help="YYYY-MM-DD. Defaults to today.")

    p_outcome = sub.add_parser("add-outcome", help="Append entry to Outcomes & Retrospective.")
    p_outcome.add_argument("--text", required=True, dest="text_value")

    p_rev = sub.add_parser("add-revision-note", help="Append file-end revision note.")
    p_rev.add_argument("--note", required=True)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    plan: Path = args.plan

    if not plan.exists():
        print(f"Plan file not found: {plan}", file=sys.stderr)
        return 1

    try:
        if args.command == "summary":
            return cmd_summary(plan)
        if args.command == "check":
            return cmd_check(plan, args.item)
        if args.command == "add-discovery":
            return cmd_add_discovery(plan, args.observation, args.evidence)
        if args.command == "add-decision":
            return cmd_add_decision(
                plan=plan,
                decision=args.decision,
                rationale=args.rationale,
                author=args.author,
                date=args.date,
            )
        if args.command == "add-outcome":
            return cmd_add_outcome(plan, args.text_value)
        if args.command == "add-revision-note":
            return cmd_add_revision_note(plan, args.note)
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        return 2

    parser.print_help()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
