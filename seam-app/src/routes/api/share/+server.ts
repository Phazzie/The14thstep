import { json, type RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { handleShare } from '$lib/server/share-handler';

const WINDOW_MS = 60_000;
const LIMIT = 40;
const hits = new Map<string, number[]>();

function rateLimited(ip: string, now: number): boolean {
	const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
	recent.push(now);
	hits.set(ip, recent);
	if (hits.size > 5_000) hits.clear();
	return recent.length > LIMIT;
}

export const POST: RequestHandler = async ({ request, getClientAddress, fetch }) => {
	if (rateLimited(getClientAddress(), Date.now())) {
		return json({ error: 'The room needs a minute. Try again shortly.' }, { status: 429 });
	}
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'That request did not look like a meeting.' }, { status: 400 });
	}
	const result = await handleShare(body, {
		apiKey: env.XAI_API_KEY,
		model: env.XAI_MODEL,
		fetch
	});
	return json(result.body, { status: result.status });
};
