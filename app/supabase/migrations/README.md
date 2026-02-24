# Supabase Migration Rollout Notes

## M18 phase-state migration (`20260221_000002_add_meeting_phase_state.sql`)

### Why this note exists

This migration adds:

- `meetings.phase_state` (`jsonb`)
- `shares.voice_candidate_metadata` (`jsonb`)
- indexes including `idx_shares_voice_candidate` on `shares`

The index statements are standard `DROP INDEX` / `CREATE INDEX` operations, which can take stronger locks on `public.shares` than desired during a live production rollout.

### Decision (post-ship hardening issue `#16`)

Default rollout strategy for this migration is:

1. Apply the migration during a low-traffic window / maintenance window.
2. Verify completion before restoring normal traffic.

We are **not** rewriting the committed migration to use `CONCURRENTLY` in-place because:

- PostgreSQL forbids `CREATE INDEX CONCURRENTLY` / `DROP INDEX CONCURRENTLY` inside transaction blocks.
- Migration runners commonly wrap migration files in transactions.
- Changing an already-shipped migration file is riskier than documenting a safe rollout procedure.

### If live traffic makes locking risk unacceptable

Use a split/manual strategy instead of editing the committed migration:

1. Run the non-index parts of the migration (or a split copy) in the normal migration path.
2. Run index changes as manual SQL outside a transaction using a DB console/session:
   - `DROP INDEX CONCURRENTLY IF EXISTS idx_shares_voice_candidate;`
   - `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shares_voice_candidate ON public.shares (((voice_candidate_metadata->>'voiceConsistency')::int));`
3. Record the exact commands and timing in release evidence / deployment notes.

### Rollout checks (recommended)

- Before applying: confirm expected traffic window and rollback owner
- During apply: monitor active locks / query activity if available
- After apply:
  - verify `meetings.phase_state` and `shares.voice_candidate_metadata` columns exist
  - verify `idx_meetings_phase` and `idx_shares_voice_candidate` indexes exist
  - run a smoke flow (`share` -> `user-share` -> `close`) and confirm no migration-related errors

### Reminder

This file documents **operational rollout guidance**. It does not replace environment-specific DB migration commands (`supabase db push`, SQL editor, CI migration step, etc.).
