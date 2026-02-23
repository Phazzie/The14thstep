-- M18 Migration: Add meeting phase state persistence
-- Adds phase_state JSONB column to meetings table and voice_candidate_metadata to shares table

-- Add phase_state column to meetings table
alter table if exists public.meetings
add column if not exists phase_state jsonb;

-- Add voice_candidate_metadata column to shares table (for M13 voice pipeline)
alter table if exists public.shares
add column if not exists voice_candidate_metadata jsonb;

-- Create index on phase_state for efficient querying
create index if not exists idx_meetings_phase on public.meetings((phase_state->>'currentPhase'));

-- Create index on voice_candidate_metadata for shares with candidates
drop index if exists idx_shares_voice_candidate;
create index if not exists idx_shares_voice_candidate on public.shares(((voice_candidate_metadata->>'voiceConsistency')::int));

-- Add comment documenting the phase_state structure
comment on column public.meetings.phase_state is 'JSON structure: { currentPhase: string, phaseStartedAt: string (ISO 8601), roundNumber?: number, charactersSpokenThisRound: string[], userHasSharedInRound: boolean }';

comment on column public.shares.voice_candidate_metadata is 'JSON structure: { text: string, voiceConsistency: 0-10, authenticity: 0-10, therapySpeakDetected: boolean, retryAttempt: number }';
