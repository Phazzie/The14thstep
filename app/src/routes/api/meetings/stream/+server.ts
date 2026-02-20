import type { RequestHandler } from './$types';

const encoder = new TextEncoder();

function wait(ms: number) {
	return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function chunk(data: string): Uint8Array {
	return encoder.encode(`data: ${data}\n\n`);
}

export const GET: RequestHandler = async ({ cookies }) => {
	const guestId = cookies.get('guest_session_id');
	if (!guestId) {
		return new Response('Missing guest session', { status: 401 });
	}

	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			void (async () => {
				controller.enqueue(chunk('Marcus: Keep coming back. Glad you made it in.'));
				await wait(300);
				controller.enqueue(chunk('Heather: Look, if you made it here tonight, that counts.'));
				await wait(300);
				controller.enqueue(
					chunk('Meechie: See what happened was, you showed up anyway. That matters.')
				);
				controller.enqueue(chunk('[DONE]'));
				controller.close();
			})();
		}
	});

	return new Response(stream, {
		headers: {
			'content-type': 'text/event-stream',
			'cache-control': 'no-cache, no-transform',
			connection: 'keep-alive'
		}
	});
};
