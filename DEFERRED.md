# Deferred Work

Out-of-scope issues discovered while executing the active ExecPlan go here.

Format:

- `YYYY-MM-DD` — short description of the deferred issue and why it was deferred.

- `2026-03-19` — Full replay-free refresh recovery for mid-round auto beats is still incomplete; the current persisted phase model does not encode enough substep detail to resume every in-flight room beat without a broader ritual-state expansion.
- `2026-03-19` — Newcomer-specific spoken welcome before topic selection is still partly local UI text; making that fully room-led would require either an additional persisted intro/topic subphase or a richer topic-selection contract.
- `2026-03-19` — The meeting page still emits Svelte 5 `state_referenced_locally` warnings from its intentional initial-snapshot setup; fixing that cleanly needs a focused rune-state cleanup pass rather than another ad hoc initialization rewrite.
