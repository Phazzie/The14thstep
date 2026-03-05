-- Clerk auth cutover: users are now app-owned identities, not constrained by auth.users.
-- Safe with existing data; does not change users.id type.

alter table if exists public.users
	drop constraint if exists users_id_fkey;
