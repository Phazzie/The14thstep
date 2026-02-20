import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const GUEST_COOKIE_NAME = 't14s_guest';
const GUEST_TTL_SECONDS = 60 * 60 * 12;

export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = (await request.json().catch(() => ({}))) as { displayName?: string };
	const displayName = body.displayName?.trim() || 'Friend';
	const guestId = crypto.randomUUID();
	const expiresAt = new Date(Date.now() + GUEST_TTL_SECONDS * 1000).toISOString();

	cookies.set(
		GUEST_COOKIE_NAME,
		JSON.stringify({
			guestId,
			displayName,
			expiresAt
		}),
		{
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: GUEST_TTL_SECONDS
		}
	);

	return json({ kind: 'guest', guestId, displayName, expiresAt }, { status: 201 });
};
