import { beforeEach, describe, expect, it } from 'vitest';
import { validateUuid } from '$lib/seams/uuid/contract';
import {
	assertNoVercelMockBoundary,
	createServerTestingComposition,
	isE2eMockSeamsEnabled
} from './server-composition';
import playwrightConfig from '../../../../playwright.config';

describe('server-composition: preview isolation and security boundary', () => {
	beforeEach(() => {
		delete process.env.E2E_MOCK_SEAMS;
		delete process.env.VERCEL;
	});

	it('detects E2E_MOCK_SEAMS flag correctly', () => {
		expect(isE2eMockSeamsEnabled()).toBe(false);
		process.env.E2E_MOCK_SEAMS = '1';
		expect(isE2eMockSeamsEnabled()).toBe(true);
	});

	it('fails closed when VERCEL=1 and E2E_MOCK_SEAMS=1 (fail closed guard)', () => {
		process.env.VERCEL = '1';
		process.env.E2E_MOCK_SEAMS = '1';
		expect(() => assertNoVercelMockBoundary()).toThrow(
			'E2E_MOCK_SEAMS cannot be activated in a VERCEL deployment environment'
		);
		expect(() => isE2eMockSeamsEnabled()).toThrow(
			'E2E_MOCK_SEAMS cannot be activated in a VERCEL deployment environment'
		);
	});

	it('creates valid in-memory seam state with valid UUID generation and ownership isolation', async () => {
		const composition = createServerTestingComposition();

		// Auth guest creation
		const guest = await composition.auth.signInGuest();
		expect(guest.ok).toBe(true);
		if (!guest.ok) return;

		expect(validateUuid(guest.value.userId)).toBe(true);

		// Session resolution via cookie
		const sessionResult = await composition.auth.getSession(
			`sb-access-token=${guest.value.accessToken}`
		);
		expect(sessionResult.ok).toBe(true);
		if (!sessionResult.ok) return;
		expect(sessionResult.value.userId).toBe(guest.value.userId);

		// Database profile bootstrap
		const profileResult = await composition.database.ensureUserProfile({
			id: guest.value.userId,
			displayName: 'Guest',
			cleanTime: null,
			isAnonymous: true
		});
		expect(profileResult.ok).toBe(true);

		// Create meeting
		const meetingResult = await composition.database.createMeeting({
			userId: guest.value.userId,
			topic: 'Staying sober',
			userMood: 'hopeful',
			userMind: 'One day at a time',
			userDisplayName: 'Guest User',
			userCleanTime: '30 days',
			listeningOnly: false
		});
		expect(meetingResult.ok).toBe(true);
		if (!meetingResult.ok) return;

		expect(validateUuid(meetingResult.value.id)).toBe(true);
		expect(meetingResult.value.userDisplayName).toBe('Guest User');
		expect(meetingResult.value.userCleanTime).toBe('30 days');

		// Owner lookup succeeds for owner
		const ownedResult = await composition.database.getOwnedMeeting({
			meetingId: meetingResult.value.id,
			userId: guest.value.userId
		});
		expect(ownedResult.ok).toBe(true);

		// Owner lookup returns NOT_FOUND for different user (isolation)
		const otherUserResult = await composition.database.getOwnedMeeting({
			meetingId: meetingResult.value.id,
			userId: 'other-user-999'
		});
		expect(otherUserResult.ok).toBe(false);
		if (!otherUserResult.ok) {
			expect(otherUserResult.error.code).toBe('NOT_FOUND');
		}
	});

	it('verifies playwright config has reuseExistingServer: false and sets E2E_MOCK_SEAMS', () => {
		const webServer = playwrightConfig.webServer;
		expect(webServer).toBeDefined();
		expect((webServer as { reuseExistingServer: boolean }).reuseExistingServer).toBe(false);
		expect((webServer as { env: Record<string, string> }).env?.E2E_MOCK_SEAMS).toBe('1');
	});
});
