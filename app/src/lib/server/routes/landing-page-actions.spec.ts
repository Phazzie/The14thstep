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

function joinWith(fields: Record<string, string>, userId: string | null = null) {
	return actions.join({
		request: buildJoinRequest(fields),
		locals: {
			userId,
			seams: {
				database: {},
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
				message: 'A user ID is required to start a meeting.'
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
			mind: '',
			userId: 'user-123'
		});

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

		const result = await joinWith(
			{
				userName: 'Lane',
				cleanTime: '22 days',
				mood: 'anxious',
				mind: 'Trying not to spiral',
				userId: 'missing-user'
			},
			null
		);

		expect(createMeetingMock).toHaveBeenCalledTimes(1);
		expect(result).toMatchObject({
			status: 404,
			data: {
				message: 'We could not find that account. Sign in again or provide a valid user ID.'
			}
		});
	});
});
