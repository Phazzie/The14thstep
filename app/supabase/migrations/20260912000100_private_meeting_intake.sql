-- Migration: 20260912000100_private_meeting_intake.sql
-- Epic #78 (Private Intake & Route Ownership)
-- Adds nullable intake snapshot columns, indexes user_id, enables RLS, and sets default-deny boundary for public/anon/authenticated roles.

-- 1. Add nullable snapshot columns to public.meetings
alter table public.meetings 
    add column if not exists user_display_name text,
    add column if not exists user_clean_time text;

-- 2. Index user_id on public.meetings for efficient owner-filtered lookups
create index if not exists idx_meetings_user_id on public.meetings (user_id);

-- 3. Enable Row-Level Security on all application tables in public schema
alter table public.meetings enable row level security;
alter table public.users enable row level security;
alter table public.characters enable row level security;
alter table public.meeting_participants enable row level security;
alter table public.shares enable row level security;
alter table public.callbacks enable row level security;

-- 4. Default-Deny: Revoke all permissions on public schema objects from public, anon, and authenticated
revoke all on all tables in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

-- Revoke default privileges for future objects created in schema public
alter default privileges in schema public revoke all on tables from public, anon, authenticated;
alter default privileges in schema public revoke all on sequences from public, anon, authenticated;
alter default privileges in schema public revoke all on functions from public, anon, authenticated;

-- 5. Explicitly re-grant full privileges to service_role
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;
