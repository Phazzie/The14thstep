import { SeamErrorCodes } from '$lib/core/seam';
import { createMeeting } from '$lib/core/meeting';
import { describe, expect, it, vi } from 'vitest';
import { actions } from '../../../routes/+page.server';

vi.mock('$lib/core/meeting', () => ({
	createMeeting: vi.fn()
}));

function buildJoinRequest(fields: Record<string, string>) {
	const body = new URLSearchParams(fields);
	return new Request('http://localhost/?/join', {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body
	});
}

function createCookieJar() {
	const store = new Map<string, string>();
	return {
		get(name: string) {
			return store.get(name);
		},
		set(name: string, value: string) {
			store.set(name, value);
		},
		delete(name: string) {
			store.delete(name);
		}
	};
}

function joinWith(
	fields: Record<string, string>,
	options: {
		userId?: string | null;
		database?: Record<string, unknown>;
	} = {}
) {
	const userId = options.userId ?? null;
	const database =
		options.database ??
		({
			getUserById: vi.fn(async () => ({
				ok: true,
				value: { id: userId ?? 'user-1' }
			}))
		} satisfies Record<string, unknown>);

	return actions.join({
		request: buildJoinRequest(fields),
		cookies: createCookieJar(),
		locals: {
			userId,
			seams: {
				database,
				grokAi: {}
			}
		}
	} as never);
}

describe('landing page actions', () => {
	it('returns 400 when join is submitted without any user id source', async () => {
		const createMeetingMock = vi.mocked(createMeeting);
		createMeetingMock.mockReset();

		const result = await joinWith({
			userName: 'Lane',
			cleanTime: '22 days',
			mood: 'anxious',
			mind: 'Trying not to spiral'
		});

		expect(createMeetingMock).not.toHaveBeenCalled();
			expect(result).toMatchObject({
				status: 400,
				data: {
					message: 'Continue as guest or sign in before starting a meeting.'
				}
			});
		});

	it('returns 400 when required setup fields are missing', async () => {
		const createMeetingMock = vi.mocked(createMeeting);
		createMeetingMock.mockReset();

		const result = await joinWith({
			userName: '',
			cleanTime: '22 days',
			mood: 'anxious',
			mind: ''
		}, { userId: 'user-123' });

		expect(createMeetingMock).not.toHaveBeenCalled();
		expect(result).toMatchObject({
			status: 400,
			data: {
				message: 'Name, clean time, mood, and mind are required.'
			}
		});
	});

	it('maps NOT_FOUND createMeeting errors to a useful account message', async () => {
		const createMeetingMock = vi.mocked(createMeeting);
		createMeetingMock.mockReset();
		createMeetingMock.mockResolvedValue({
			ok: false,
			error: {
				code: SeamErrorCodes.NOT_FOUND,
				message: 'getUserById record not found'
			}
		});

		const result = await joinWith({
			userName: 'Lane',
			cleanTime: '22 days',
			mood: 'anxious',
			mind: 'Trying not to spiral'
		}, { userId: 'user-123' });

		expect(createMeetingMock).toHaveBeenCalledTimes(1);
		expect(result).toMatchObject({
			status: 404,
			data: {
				message: 'We could not find that account. Sign in again or continue as guest.'
			}
		});
	});

	it('proves the workflow receives private intake and redirects to exact clean path', async () => {
		const createMeetingMock = vi.mocked(createMeeting);
		createMeetingMock.mockReset();
		createMeetingMock.mockResolvedValue({
			ok: true,
			value: { id: 'meeting-456' } as never
		});

		await expect(
			joinWith(
				{
					userName: 'Lane',
					cleanTime: '22 days',
					mood: 'anxious',
					mind: 'Trying not to spiral'
				},
				{ userId: 'user-123' }
			)
		).rejects.toMatchObject({
			status: 303,
			location: '/meeting/meeting-456'
		});

		expect(createMeetingMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				userId: 'user-123',
				topic: 'Trying not to spiral',
				userMood: 'anxious',
				userMind: 'Trying not to spiral',
				userDisplayName: 'Lane',
				userCleanTime: '22 days',
				listeningOnly: false
			})
		);
	});

	it('handles listening-only join and redirects to clean path', async () => {
		const createMeetingMock = vi.mocked(createMeeting);
		createMeetingMock.mockReset();
		createMeetingMock.mockResolvedValue({
			ok: true,
			value: { id: 'meeting-789' } as never
		});

		await expect(
			joinWith(
				{
					userName: 'Sam',
					cleanTime: '1 year',
					mood: 'peaceful',
					mind: 'Grateful to be here',
					listeningOnly: 'on'
				},
				{ userId: 'user-123' }
			)
		).rejects.toMatchObject({
			status: 303,
			location: '/meeting/meeting-789'
		});

		expect(createMeetingMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				userId: 'user-123',
				topic: 'Grateful to be here',
				userMood: 'peaceful',
				userMind: 'Grateful to be here',
				userDisplayName: 'Sam',
				userCleanTime: '1 year',
				listeningOnly: true
			})
		);
	});
});

