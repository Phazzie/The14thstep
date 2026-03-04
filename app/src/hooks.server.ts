import type { Handle } from '@sveltejs/kit';
import { SeamErrorCodes, err } from '$lib/core/seam';
import type { DatabasePort } from '$lib/seams/database/contract';
import type { GrokAiPort } from '$lib/seams/grok-ai/contract';
import { createAuthAdapter } from '$lib/server/seams/auth/adapter';
import { createDatabaseAdapter } from '$lib/server/seams/database/adapter';
import { createGrokAiAdapter } from '$lib/server/seams/grok-ai/adapter';

function createUnavailableDatabaseAdapter(message: string): DatabasePort {
	return {
		async getUserById() {
			return err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, message);
		},
		async ensureUserProfile() {
			return err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, message);
		},
		async createMeeting() {
			return err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, message);
		},
		async appendShare() {
			return err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, message);
		},
		async getHeavyMemory() {
			return err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, message);
		},
		async getShareById() {
			return err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, message);
		},
		async getMeetingShares() {
			return err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, message);
		},
		async updateMeetingPhase() {
			return err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, message);
		},
		async getMeetingPhase() {
			return err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, message);
		},
		async createCallback() {
			return err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, message);
		},
		async getActiveCallbacks() {
			return err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, message);
		},
		async markCallbackReferenced() {
			return err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, message);
		},
		async completeMeeting() {
			return err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, message);
		},
		async updateCallback() {
			return err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, message);
		},
		async getMeetingCountAfterDate() {
			return err(SeamErrorCodes.UPSTREAM_UNAVAILABLE, message);
		}
	};
}

function buildSeamBundle(): {
	auth: ReturnType<typeof createAuthAdapter>;
	database: DatabasePort;
	grokAi: GrokAiPort;
} {
	let database: DatabasePort;
	try {
		database = createDatabaseAdapter();
	} catch (error) {
		const message =
			error instanceof Error ? `Database adapter unavailable: ${error.message}` : 'Database adapter unavailable';
		database = createUnavailableDatabaseAdapter(message);
	}

	return {
		auth: createAuthAdapter(),
		database,
		grokAi: createGrokAiAdapter()
	};
}

export const handle: Handle = async ({ event, resolve }) => {
	const seams = buildSeamBundle();
	event.locals.seams = seams;

	const sessionResult = await seams.auth.getSession(event.request.headers.get('cookie'));
	if (!sessionResult.ok) {
		console.warn(
			`[auth.session] unresolved code=${sessionResult.error.code} message=${sessionResult.error.message}`
		);
	}
	event.locals.userId = sessionResult.ok ? sessionResult.value.userId : null;

	return resolve(event);
};
