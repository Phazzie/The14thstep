import { selectCharacters } from '$lib/core/character-selector';
import { detectCrisisContent, isMeetingInCrisis } from '$lib/core/crisis-engine';
import { createSeededRandom } from '$lib/core/random-utils';
import { initializeMeetingPhase } from '$lib/core/ritual-orchestration';
import { SeamErrorCodes } from '$lib/core/seam';
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
	if (!sharesResult.ok && sharesResult.error.code === SeamErrorCodes.NOT_FOUND) {
		throw error(404, 'Meeting not found');
	}
	if (!sharesResult.ok) {
		console.warn(`[meeting page] getMeetingShares failed for meeting=${meetingId}: ${sharesResult.error.message}`);
	}
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

	const persistedPhaseState = await locals.seams.database.getMeetingPhase(meetingId);
	if (!persistedPhaseState.ok) {
		if (persistedPhaseState.error.code === SeamErrorCodes.NOT_FOUND) {
			throw error(404, 'Meeting not found');
		}
		console.warn(
			`[meeting page] getMeetingPhase failed for meeting=${meetingId}: ${persistedPhaseState.error.message}`
		);
	}
	const phaseState: MeetingPhaseState =
		persistedPhaseState.ok && persistedPhaseState.value
			? persistedPhaseState.value
			: initializeMeetingPhase();

	const persistedParticipants = await locals.seams.database.getMeetingParticipants(meetingId);
	if (!persistedParticipants.ok && persistedParticipants.error.code === SeamErrorCodes.NOT_FOUND) {
		throw error(404, 'Meeting not found');
	}
	if (!persistedParticipants.ok) {
		console.warn(
			`[meeting page] getMeetingParticipants failed for meeting=${meetingId}: ${persistedParticipants.error.message}`
		);
	}

	const participants =
		persistedParticipants.ok && persistedParticipants.value.length > 0
			? persistedParticipants.value
			: (() => {
					const generated = selectCharacters({
						random: createSeededRandom(meetingId),
						nowIso: phaseState.phaseStartedAt.toISOString()
					}).map((character, seatOrder) => ({ ...character, seatOrder }));
					return generated;
				})();

	if (participants.length > 0 && (!persistedParticipants.ok || persistedParticipants.value.length === 0)) {
		const savedParticipants = await locals.seams.database.saveMeetingParticipants({
			meetingId,
			participants
		});
		if (savedParticipants.ok && savedParticipants.value.length > 0) {
			participants.splice(0, participants.length, ...savedParticipants.value);
		} else if (!savedParticipants.ok) {
			console.warn(
				`[meeting page] saveMeetingParticipants failed for meeting=${meetingId}: ${savedParticipants.error.message}`
			);
			throw error(502, 'Unable to load meeting roster');
		} else {
			throw error(502, 'Unable to load meeting roster');
		}
	}

	const transcript = sharesResult.ok
		? sharesResult.value.map((share) => ({
				...share,
				speakerName:
					share.isUserShare
						? initialUserName
						: participants.find((character) => character.id === share.characterId)?.name ?? 'Someone'
			}))
		: [];

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
		initialShares: transcript,
		characters: participants.map((character) => ({
			id: character.id,
			name: character.name,
			avatar: character.avatar,
			color: character.color,
			cleanTime: character.cleanTime,
			role: character.role,
			isVisitor: character.isVisitor,
			seatOrder: character.seatOrder
		}))
	};
};
