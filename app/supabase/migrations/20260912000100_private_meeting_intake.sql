-- Purpose: Store meeting-specific display-name and clean-time snapshots privately.
-- Why: Clean meeting URLs need durable intake without inventing data for historical rows.
-- Info flow: New meeting inserts may write snapshots; existing rows expose truthful nulls.
-- Invariants: Columns stay nullable and repeated migration application is harmless.

alter table public.meetings
	add column if not exists user_display_name text,
	add column if not exists user_clean_time text;

alter table public.characters enable row level security;
alter table public.users enable row level security;
alter table public.meetings enable row level security;
alter table public.meeting_participants enable row level security;
alter table public.shares enable row level security;
alter table public.callbacks enable row level security;

revoke all privileges on all tables in schema public from public, anon, authenticated;
revoke all privileges on all sequences in schema public from public, anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

alter default privileges in schema public
	revoke all privileges on tables from public, anon, authenticated;
alter default privileges in schema public
	revoke all privileges on sequences from public, anon, authenticated;
alter default privileges in schema public
	revoke execute on functions from public, anon, authenticated;
