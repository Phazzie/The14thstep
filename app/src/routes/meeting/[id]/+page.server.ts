import { CORE_CHARACTERS } from '$lib/core/characters';
import { detectCrisisContent, isMeetingInCrisis } from '$lib/core/crisis-engine';
import { initializeMeetingPhase } from '$lib/core/ritual-orchestration';
import type { MeetingPhaseState } from '$lib/core/types';
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
	const crisisFromSetup = detectCrisisContent(initialMind);

	const sharesResult = await locals.seams.database.getMeetingShares(meetingId);
	const crisisFromShares =
		sharesResult.ok &&
		isMeetingInCrisis({
			shares: sharesResult.value.map((share) => ({
				content: share.content,
				significanceScore: share.significanceScore
			}))
		});
	const initialCrisisMode = crisisFromSetup || crisisFromShares;
	const shouldTriggerInitialCrisisSupport = crisisFromSetup && !crisisFromShares;

	// Initialize phase state for this meeting
	const phaseState: MeetingPhaseState = initializeMeetingPhase();

	return {
		meetingId,
		userId: locals.userId,
		defaultTopic: initialMind,
		initialUserName,
		initialCleanTime,
		initialMood,
		initialCrisisMode,
		shouldTriggerInitialCrisisSupport,
		listeningOnly,
		phaseState,
		characters: CORE_CHARACTERS.map((character) => ({
			id: character.id,
			name: character.name,
			avatar: character.avatar,
			color: character.color,
			cleanTime: character.cleanTime
		}))
	};
};
