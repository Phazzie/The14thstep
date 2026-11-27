import { describe, expect, it, vi } from 'vitest';
import { handleShare } from '$lib/server/share-handler';

const valid = {
	speakerId: 'heather',
	slot: 'round',
	topic: 'Finding reasons to stay',
	userName: 'Dana',
	userMood: 'angry',
	n: 4,
	recent: [{ speaker: 'Marcus', text: 'Now let me own my side.' }]
};

function grokReply(text: string) {
	return new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), {
		status: 200,
		headers: { 'content-type': 'application/json' }
	});
}

describe('share handler', () => {
	it('P8: an invalid request gets 400', async () => {
		const fetchSpy = vi.fn();
		const res = await handleShare({ speakerId: 'heather' }, { apiKey: 'k', fetch: fetchSpy });
		expect(res.status).toBe(400);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('P8: a good Grok answer comes back as source grok', async () => {
		const fetchSpy = vi.fn(async () =>
			grokReply('Look, I kept the bus pass in my bra for a month like it was money.')
		);
		const res = await handleShare(valid, { apiKey: 'k', fetch: fetchSpy as unknown as typeof fetch });
		expect(res.status).toBe(200);
		expect(res.body).toEqual({
			text: 'Look, I kept the bus pass in my bra for a month like it was money.',
			source: 'grok'
		});
		const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('https://api.x.ai/v1/chat/completions');
		expect(String((init.headers as Record<string, string>).authorization)).toBe('Bearer k');
	});

	it('P13b: no key means the tape, never a 500, and no network call', async () => {
		const fetchSpy = vi.fn();
		const res = await handleShare(valid, { apiKey: undefined, fetch: fetchSpy });
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ source: 'tape' });
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('P13b: Grok failing means the tape', async () => {
		const fetchSpy = vi.fn(async () => new Response('nope', { status: 500 }));
		const res = await handleShare(valid, { apiKey: 'k', fetch: fetchSpy as unknown as typeof fetch });
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ source: 'tape' });
	});

	it('P7/P13b: therapy-speak is retried once, then replaced by the tape', async () => {
		const fetchSpy = vi.fn(async () => grokReply("I hear you. That's valid. Thank you for sharing."));
		const res = await handleShare(valid, { apiKey: 'k', fetch: fetchSpy as unknown as typeof fetch });
		expect(fetchSpy).toHaveBeenCalledTimes(2);
		expect(res.body).toMatchObject({ source: 'tape' });
	});

	it('strips a speaker-name prefix and quotes Grok sometimes adds', async () => {
		const fetchSpy = vi.fn(async () => grokReply('Heather: "Listen, the bus still runs at six."'));
		const res = await handleShare(valid, { apiKey: 'k', fetch: fetchSpy as unknown as typeof fetch });
		expect(res.body).toEqual({ text: 'Listen, the bus still runs at six.', source: 'grok' });
	});
});
