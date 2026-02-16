-- Initial schema for The 14th Step milestone bootstrap.
-- Safe to run once on a fresh Supabase project.

create extension if not exists pgcrypto;

create table if not exists public.characters (
	id uuid primary key default gen_random_uuid(),
	name text not null,
	tier text not null check (tier in ('core', 'regular', 'pool', 'visitor', 'archived')),
	archetype text not null,
	clean_time_start date not null,
	voice text not null,
	wound text not null,
	contradiction text not null,
	quirk text not null,
	color text not null,
	avatar text not null,
	meeting_count integer not null default 0 check (meeting_count >= 0),
	created_at timestamptz not null default now(),
	last_seen_at timestamptz,
	status text not null default 'active' check (status in ('active', 'relapsed', 'archived')),
	profile_evolved jsonb not null default '{}'::jsonb,
	intro_style text
);

create table if not exists public.users (
	id uuid primary key references auth.users (id) on delete cascade,
	display_name text not null,
	clean_time text,
	meeting_count integer not null default 0 check (meeting_count >= 0),
	first_meeting_at timestamptz,
	last_meeting_at timestamptz,
	preferences jsonb not null default '{}'::jsonb,
	is_anonymous boolean not null default false
);

create table if not exists public.meetings (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references public.users (id) on delete cascade,
	meeting_type text not null default 'general',
	topic text not null,
	user_mood text not null,
	user_mind text,
	listening_only boolean not null default false,
	started_at timestamptz not null default now(),
	ended_at timestamptz,
	summary text,
	notable_moments jsonb,
	in_world_date date not null default (now() at time zone 'utc')::date
);

create table if not exists public.meeting_participants (
	meeting_id uuid not null references public.meetings (id) on delete cascade,
	character_id uuid not null references public.characters (id) on delete cascade,
	role text not null check (role in ('chair', 'active_sharer', 'quiet_presence')),
	shares_count integer not null default 0 check (shares_count >= 0),
	primary key (meeting_id, character_id)
);

create table if not exists public.shares (
	id uuid primary key default gen_random_uuid(),
	meeting_id uuid not null references public.meetings (id) on delete cascade,
	character_id uuid references public.characters (id) on delete set null,
	is_user_share boolean not null default false,
	content text not null check (length(content) > 0),
	interaction_type text not null check (
		interaction_type in ('standard', 'respond_to', 'disagree', 'parallel_story', 'expand', 'crosstalk', 'callback')
	),
	target_character_id uuid references public.characters (id) on delete set null,
	significance_score integer not null default 1 check (significance_score between 1 and 10),
	heavy_topic_tags text[] not null default '{}'::text[],
	sequence_order integer not null check (sequence_order >= 0),
	created_at timestamptz not null default now()
);

create table if not exists public.callbacks (
	id uuid primary key default gen_random_uuid(),
	origin_share_id uuid not null references public.shares (id) on delete cascade,
	character_id uuid not null references public.characters (id) on delete cascade,
	original_text text not null,
	callback_type text not null check (
		callback_type in ('self_deprecation', 'quirk_habit', 'catchphrase', 'absurd_detail', 'physical_behavioral', 'room_meta')
	),
	scope text not null check (scope in ('character', 'room')),
	potential_score integer not null check (potential_score between 1 and 10),
	times_referenced integer not null default 0 check (times_referenced >= 0),
	last_referenced_at timestamptz,
	status text not null default 'active' check (status in ('active', 'stale', 'retired', 'legend')),
	parent_callback_id uuid references public.callbacks (id) on delete set null
);

create index if not exists idx_shares_meeting_id on public.shares (meeting_id);
create index if not exists idx_shares_character_id on public.shares (character_id);
create index if not exists idx_shares_significance_score on public.shares (significance_score);
create index if not exists idx_callbacks_character_status on public.callbacks (character_id, status);
create index if not exists idx_callbacks_scope_status on public.callbacks (scope, status);
create index if not exists idx_meeting_participants_meeting_id on public.meeting_participants (meeting_id);
create index if not exists idx_meeting_participants_character_id on public.meeting_participants (character_id);

