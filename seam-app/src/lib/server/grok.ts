/**
 * Purpose: one call to xAI Grok's chat completions endpoint.
 * Why: the only outside service the rebuilt room needs. Everything else lives on the user's device.
 * Invariants: server-only. The key is never logged or returned. Any failure returns null so the
 * caller can fall back to the house tape; this function never throws on network trouble.
 */
export const GROK_URL = 'https://api.x.ai/v1/chat/completions';
export const DEFAULT_MODEL = 'grok-4-1-fast-reasoning';

export interface GrokDeps {
	apiKey: string | undefined;
	fetch: typeof fetch;
	model?: string;
	timeoutMs?: number;
}

export async function grokComplete(system: string, user: string, deps: GrokDeps): Promise<string | null> {
	if (!deps.apiKey) return null;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), deps.timeoutMs ?? 15_000);
	try {
		const response = await deps.fetch(GROK_URL, {
			method: 'POST',
			signal: controller.signal,
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${deps.apiKey}`
			},
			body: JSON.stringify({
				model: deps.model ?? DEFAULT_MODEL,
				temperature: 0.9,
				max_tokens: 400,
				messages: [
					{ role: 'system', content: system },
					{ role: 'user', content: user }
				]
			})
		});
		if (!response.ok) return null;
		const payload: unknown = await response.json();
		const content = (payload as { choices?: { message?: { content?: unknown } }[] })?.choices?.[0]?.message
			?.content;
		return typeof content === 'string' && content.trim() ? content.trim() : null;
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
	}
}
