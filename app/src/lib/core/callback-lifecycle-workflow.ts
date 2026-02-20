import { shouldRetireForInactivity } from '$lib/core/callback-lifecycle';
import { err, ok, type SeamResult } from '$lib/core/seam';
import type { CallbackRecord, CallbackStatus } from '$lib/seams/database/contract';

interface CallbackLifecycleWorkflowDatabasePort {
	getActiveCallbacks(input: { characterId: string; meetingId: string }): Promise<SeamResult<CallbackRecord[]>>;
	updateCallback(input: {
		id: string;
		updates: {
			status?: CallbackStatus;
			scope?: CallbackRecord['scope'];
			timesReferenced?: number;
			lastReferencedAt?: string;
		};
	}): Promise<SeamResult<CallbackRecord>>;
	getMeetingCountAfterDate(input: { userId: string; startedAfter: string }): Promise<SeamResult<number>>;
}

export interface RunCallbackLifecycleWorkflowInput {
	meetingId: string;
	userId: string;
	presentCharacterIds: string[];
	database: CallbackLifecycleWorkflowDatabasePort;
}

export interface CallbackLifecycleWorkflowSummary {
	evaluated: number;
	retired: number;
	skipped: number;
}

export async function runCallbackLifecycleWorkflow(
	input: RunCallbackLifecycleWorkflowInput
): Promise<SeamResult<CallbackLifecycleWorkflowSummary>> {
	const callbacksById = new Map<string, CallbackRecord>();

	const presentCharacterIds = [...new Set(input.presentCharacterIds.filter((id) => id.trim().length > 0))];
	for (const characterId of presentCharacterIds) {
		const callbacksResult = await input.database.getActiveCallbacks({
			characterId,
			meetingId: input.meetingId
		});
		if (!callbacksResult.ok) {
			return err(callbacksResult.error.code, callbacksResult.error.message, callbacksResult.error.details);
		}

		for (const callback of callbacksResult.value) {
			if (callback.status !== 'active' && callback.status !== 'stale') continue;
			callbacksById.set(callback.id, callback);
		}
	}

	let evaluated = 0;
	let retired = 0;
	let skipped = 0;

	for (const callback of callbacksById.values()) {
		evaluated += 1;
		if (!callback.lastReferencedAt) {
			skipped += 1;
			continue;
		}

		const meetingCountResult = await input.database.getMeetingCountAfterDate({
			userId: input.userId,
			startedAfter: callback.lastReferencedAt
		});
		if (!meetingCountResult.ok) {
			return err(meetingCountResult.error.code, meetingCountResult.error.message, meetingCountResult.error.details);
		}

		if (
			shouldRetireForInactivity({
				callback,
				meetingsSinceLastReferenced: meetingCountResult.value
			})
		) {
			const updateResult = await input.database.updateCallback({
				id: callback.id,
				updates: { status: 'retired' }
			});
			if (!updateResult.ok) {
				return err(updateResult.error.code, updateResult.error.message, updateResult.error.details);
			}
			retired += 1;
		}
	}

	return ok({ evaluated, retired, skipped });
}
