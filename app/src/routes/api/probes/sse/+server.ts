import type { RequestHandler } from './$types';

const encoder = new TextEncoder();

function wait(ms: number) {
	return new Promise<void>((resolve) => {
		setTimeout(resolve, ms);
	});
}

function sseChunk(event: string, data: Record<string, unknown>): Uint8Array {
	return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export const GET: RequestHandler = async () => {
	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			void (async () => {
				controller.enqueue(sseChunk('meta', { probe: 'sse', chunkCount: 5, intervalMs: 500 }));

				for (let index = 1; index <= 5; index += 1) {
					controller.enqueue(
						sseChunk('chunk', {
							index,
							message: `probe chunk ${index}`,
							emittedAt: new Date().toISOString()
						})
					);
					await wait(500);
				}

				controller.enqueue(sseChunk('done', { emittedAt: new Date().toISOString() }));
				controller.close();
			})().catch((error) => {
				controller.error(error);
			});
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
