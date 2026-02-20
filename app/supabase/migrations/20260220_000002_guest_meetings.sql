-- Allow meetings to be started by authenticated users OR guest sessions.

alter table public.meetings
	alter column user_id drop not null;

alter table public.meetings
	add column if not exists guest_session_id uuid;

alter table public.meetings
	drop constraint if exists meetings_identity_check;

alter table public.meetings
	add constraint meetings_identity_check check (
		(user_id is not null and guest_session_id is null)
		or (user_id is null and guest_session_id is not null)
	);

create index if not exists idx_meetings_guest_session_id on public.meetings (guest_session_id);
