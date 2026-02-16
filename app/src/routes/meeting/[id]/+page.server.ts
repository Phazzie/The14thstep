import { CORE_CHARACTERS } from '$lib/core/characters';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const meetingId = params.id?.trim();
	if (!meetingId) {
		throw error(400, 'Meeting id is required');
	}

	return {
		meetingId,
		userId: locals.userId,
		defaultTopic: 'Staying sober when I want to run',
		characters: CORE_CHARACTERS.map((character) => ({
			id: character.id,
			name: character.name,
			avatar: character.avatar,
			color: character.color,
			cleanTime: character.cleanTime
		}))
	};
};
