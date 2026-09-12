# DRAFT LESSONS_LEARNED ENTRY FOR M11-19 AUDIT

## 2026-02-21

### Process

- **Autonomous agent work can outpace documentation**: Previous Codex session implemented M11-17 fully but did not update ExecPlan Progress checkboxes, creating misleading "incomplete" status. Always verify codebase state against plan checkboxes before starting new work.
- **Specification documents separate from ExecPlans can create hidden requirements**: The Writing Engine & Narrative Context System spec (`14th_step_writing_and_strategy.md`) defined M11-19 requirements but was not explicitly linked from ExecPlan milestone descriptions. Cross-reference specs explicitly in milestone text to avoid rediscovery.
- **Haiku Explore agents excel at codebase audit**: Using Haiku with `subagent_type=Explore` to verify milestone status before execution prevented duplicate implementation work and correctly identified 85% completion (M11-17 done, M13/M18/M19 incomplete).

### Technical

- **Voice example fields are highest-leverage prompt improvement**: Implementation of `voiceExamples` as required 3-tuple across all characters (M11) correlates with quality improvements. This field should never be optional or allow placeholder text.
- **Quality validator scores generated but not enforced**: `voiceConsistency` and `authenticity` scores (0-10) are generated on every share but only `pass` boolean used in retry logic. The numeric scores exist in validator output but are discarded. Threshold enforcement (>=6) exists but only checks boolean, not scores.
- **Voice pipeline retry attempts vs candidate generation are different patterns**: Current implementation uses 3 retry attempts with same prompt (M15 pattern). M13 spec requires 7 independent candidate generations with comparative scoring - this is a generate-multiple-then-select pattern, not retry-on-failure.
- **Meeting ritual prompts vs runtime orchestration**: Prompt templates can exist (opening, intro, reading) without being wired into meeting flow phases. Check both prompt existence AND runtime invocation when auditing milestone completion.
- **Style constitution injection is per-call, not cached**: `STYLE_CONSTITUTION` is concatenated into every generation prompt. Consider moving to system role or separate injection point to reduce token usage on repeated calls within same meeting.

### Architecture

- **Character foundation fields support progressive enhancement**: Adding M11 narrative fields (`lie`, `lostThing`, etc.) to existing character types did not break M0-10 functionality. Optional-then-required migration path worked cleanly.
- **Narrative context caching prevents duplicate generation calls**: M14 `meetingNarrativeContextCache` Map + in-flight deduplication means multiple characters sharing in same meeting don't regenerate identical context. This pattern should be applied to other meeting-scoped expensive operations.
- **Crisis detection precedence matters**: `isMeetingInCrisis()` checks setup-time AND persisted in-meeting flags with correct precedence. Crisis state must be meeting-scoped, not share-scoped, to prevent state drift across character turns.

### Counterintuitive

- **More complete implementation can look "incomplete" in tracking**: M11-17 fully implemented in code but marked incomplete in ExecPlan creates false signal. Living documents that fall behind actual progress are more dangerous than incomplete implementation because they misdirect effort.
- **3 attempts != 7 candidates**: Retry logic (attempt same generation 3 times on failure) feels similar to candidate generation (generate 7 variations, score all, pick best) but these are architecturally different patterns with different quality outcomes.
- **Prompt existence != runtime behavior**: A beautifully crafted prompt template sitting unused in codebase provides zero user value. Always verify call sites, not just implementations.
