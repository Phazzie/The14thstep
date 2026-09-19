import { error, json, type RequestEvent } from '@sveltejs/kit';
import { SeamErrorCodes, err, type SeamErrorCode, type SeamResult } from '$lib/core/seam';
import type { AuthPort } from '$lib/seams/auth/contract';
import type { DatabasePort } from '$lib/seams/database/contract';
import { validateUuid } from '$lib/seams/uuid/contract';

export interface MeetingAccessSeams {
	auth: AuthPort;
	database: DatabasePort;
	[key: string]: unknown;
}

const MEETING_ROUTE_PATTERN = /^\/meeting\/([^/?#]+)/i;

export function isMeetingRoute(pathname: string): boolean {
	return MEETING_ROUTE_PATTERN.test(pathname);
}

export function extractMeetingId(pathname: string): string | null {
	const match = pathname.match(MEETING_ROUTE_PATTERN);
	return match ? match[1] : null;
}

export function isApiRequest(event: RequestEvent, pathname: string): boolean {
	const accept = event.request.headers.get('accept') ?? '';
	const contentType = event.request.headers.get('content-type') ?? '';
	if (accept.includes('application/json') || contentType.includes('application/json')) {
		return true;
	}
	return /^\/meeting\/[^/?#]+\/(share|user-share|crisis|close|expand)(\/|$)/i.test(pathname);
}

function dispatchNotFound(isApi: boolean): Response {
	if (isApi) {
		return json(err(SeamErrorCodes.NOT_FOUND, 'Meeting not found'), { status: 404 });
	}
	throw error(404, 'Meeting not found');
}

function dispatchServerError(isApi: boolean, status: number, code: SeamErrorCode, message: string): Response {
	if (isApi) {
		return json(err(code, message), { status });
	}
	throw error(status, message);
}

export async function resolveMeetingAccess(
	event: RequestEvent,
	seams: MeetingAccessSeams,
	existingAuthResult?: SeamResult<{ userId: string }>
): Promise<Response | null> {
	const pathname = event.url?.pathname ?? (event.request ? new URL(event.request.url).pathname : '');
	const meetingId = extractMeetingId(pathname);
	if (!meetingId) {
		event.locals.meetingContext = null;
		return null;
	}

	const isApi = isApiRequest(event, pathname);

	// 1. Validate UUID format before any database I/O
	if (!validateUuid(meetingId)) {
		return dispatchNotFound(isApi);
	}

	// 2. Authenticate
	const authResult =
		existingAuthResult ?? (await seams.auth.getSession(event.request.headers.get('cookie')));

	if (!authResult.ok) {
		if (authResult.error.code === SeamErrorCodes.UNAUTHORIZED) {
			// Absent session receives generic 404
			return dispatchNotFound(isApi);
		}
		if (authResult.error.code === SeamErrorCodes.UPSTREAM_UNAVAILABLE) {
			return dispatchServerError(isApi, 503, authResult.error.code, authResult.error.message);
		}
		const status = authResult.error.code === SeamErrorCodes.CONTRACT_VIOLATION ? 502 : 500;
		return dispatchServerError(isApi, status, authResult.error.code, authResult.error.message);
	}

	const userId = authResult.value.userId;
	if (!userId) {
		return dispatchNotFound(isApi);
	}

	// 3. Centralized owner-filtered meeting query
	const meetingResult = await seams.database.getOwnedMeeting({ meetingId, userId });
	if (!meetingResult.ok) {
		if (meetingResult.error.code === SeamErrorCodes.NOT_FOUND) {
			return dispatchNotFound(isApi);
		}
		if (meetingResult.error.code === SeamErrorCodes.UPSTREAM_UNAVAILABLE) {
			return dispatchServerError(isApi, 503, meetingResult.error.code, meetingResult.error.message);
		}
		const status = meetingResult.error.code === SeamErrorCodes.CONTRACT_VIOLATION ? 502 : 500;
		return dispatchServerError(isApi, status, meetingResult.error.code, meetingResult.error.message);
	}

	event.locals.meetingContext = meetingResult.value;
	return null;
}
