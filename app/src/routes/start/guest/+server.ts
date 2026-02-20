import { randomUUID } from 'node:crypto';
import { redirect, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ cookies }) => {
	const guestSessionId = randomUUID();
	const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toUTCString();

	cookies.set('guest_session_id', guestSessionId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: false,
		expires: new Date(expiresAt)
	});

	throw redirect(303, '/meeting');
};
