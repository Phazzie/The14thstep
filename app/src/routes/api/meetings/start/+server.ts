import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { checkBackendConfig } from '$lib/server/config/runtime';

const GUEST_COOKIE_NAME = 't14s_guest';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const config = checkBackendConfig();
	if (!config.ok) {
		return json({ message: config.message }, { status: 503 });
	}

	const guestCookie = cookies.get(GUEST_COOKIE_NAME);
	if (!guestCookie) {
		return json({ message: 'Session expired. Start a new one-time meeting.' }, { status: 401 });
	}

	const body = (await request.json().catch(() => ({}))) as {
		topic?: string;
		mood?: string;
		listeningOnly?: boolean;
	};

	const topic = body.topic?.trim() || 'Keeping your head straight today';
	const mood = body.mood?.trim() || 'rough day';
	const listeningOnly = Boolean(body.listeningOnly);

	return json(
		{
			meetingId: crypto.randomUUID(),
			topic,
			mood,
			listeningOnly,
			startedAt: new Date().toISOString()
		},
		{ status: 201 }
	);
};
