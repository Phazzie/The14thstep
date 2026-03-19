alter table public.meeting_participants
	add column if not exists seat_order integer;

update public.meeting_participants
set seat_order = 0
where seat_order is null;

alter table public.meeting_participants
	alter column seat_order set not null;

create unique index if not exists idx_meeting_participants_meeting_seat_order
	on public.meeting_participants (meeting_id, seat_order);

alter table public.shares
	drop constraint if exists shares_interaction_type_check;

alter table public.shares
	add constraint shares_interaction_type_check check (
		interaction_type in (
			'standard',
			'respond_to',
			'disagree',
			'parallel_story',
			'expand',
			'crosstalk',
			'callback',
			'hard_question',
			'farewell'
		)
	);
