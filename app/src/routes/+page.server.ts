import { createMeeting } from '$lib/core/meeting';
import { SeamErrorCodes } from '$lib/core/seam';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

function asTrimmedString(value: FormDataEntryValue | null): string {
	return typeof value === 'string' ? value.trim() : '';
}

function statusFromSeamCode(code: string): number {
	if (code === SeamErrorCodes.INPUT_INVALID) return 400;
	if (code === SeamErrorCodes.UNAUTHORIZED) return 401;
	if (code === SeamErrorCodes.NOT_FOUND) return 404;
	if (code === SeamErrorCodes.RATE_LIMITED) return 429;
	if (code === SeamErrorCodes.UPSTREAM_UNAVAILABLE) return 503;
	return 500;
}

export const actions: Actions = {
	join: async ({ request, locals }) => {
		const formData = await request.formData();

		const topic = asTrimmedString(formData.get('topic'));
		const mood = asTrimmedString(formData.get('mood'));
		const submittedUserId = asTrimmedString(formData.get('userId'));
		const listeningOnly = formData.get('listeningOnly') === 'on';
		const fallbackUserId = submittedUserId || process.env.PROBE_USER_ID?.trim() || '';
		const userId = locals.userId ?? fallbackUserId;

		const values = {
			topic,
			mood,
			userId: submittedUserId,
			listeningOnly
		};

		if (!userId) {
			return fail(400, { message: 'A user ID is required to start a meeting.', values });
		}
		if (!topic || !mood) {
			return fail(400, { message: 'Topic and mood are required.', values });
		}

		const result = await createMeeting(
			{
				database: locals.seams.database,
				grokAi: locals.seams.grokAi
			},
			{
				userId,
				topic,
				userMood: mood,
				listeningOnly
			}
		);

		if (!result.ok) {
			const status = statusFromSeamCode(result.error.code);
			const message = status === 400 ? 'Topic and mood are required.' : 'Unable to start the meeting right now.';
			return fail(status, { message, values });
		}

		throw redirect(303, `/meeting/${result.value.id}`);
	}
};
