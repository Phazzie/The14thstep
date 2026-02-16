import { CORE_CHARACTERS } from '$lib/core/characters';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const meetingId = params.id?.trim();
	if (!meetingId) {
		throw error(400, 'Meeting id is required');
	}

	const initialUserName = url.searchParams.get('name')?.trim() || 'You';
	const initialCleanTime = url.searchParams.get('cleanTime')?.trim() || null;
	const initialMood = url.searchParams.get('mood')?.trim() || 'present';
	const initialMind = url.searchParams.get('mind')?.trim() || 'Staying sober when I want to run';
	const listeningOnly = url.searchParams.get('listen') === '1';

	return {
		meetingId,
		userId: locals.userId,
		defaultTopic: initialMind,
		initialUserName,
		initialCleanTime,
		initialMood,
		listeningOnly,
		characters: CORE_CHARACTERS.map((character) => ({
			id: character.id,
			name: character.name,
			avatar: character.avatar,
			color: character.color,
			cleanTime: character.cleanTime
		}))
	};
};
