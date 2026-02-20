#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.PROBE_BASE_URL || process.env.PROBE_BASE || 'http://127.0.0.1:5173';
const url = `${baseUrl.replace(/\/$/, '')}/api/probes/sse`;
const fixturePath = path.join(process.cwd(), 'probes', 'fixtures', 'sse-probe.sample.json');

function parseSseEvents(rawText) {
	const events = [];
	const blocks = rawText
		.split('\n\n')
		.map((entry) => entry.trim())
		.filter(Boolean);

	for (const block of blocks) {
		const lines = block.split('\n');
		let event = 'message';
		let data = '';

		for (const line of lines) {
			if (line.startsWith('event:')) {
				event = line.slice('event:'.length).trim();
			}
			if (line.startsWith('data:')) {
				data = line.slice('data:'.length).trim();
			}
		}

		events.push({ event, data });
	}

	return events;
}

async function main() {
	console.log(`[sse-probe] requesting ${url}`);
	const started = Date.now();
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`SSE probe failed with status ${response.status}`);
	}

	const text = await response.text();
	const elapsedMs = Date.now() - started;
	const events = parseSseEvents(text);
	const chunkEvents = events.filter((entry) => entry.event === 'chunk');

	console.log(`[sse-probe] received ${events.length} events in ${elapsedMs}ms`);

	if (chunkEvents.length !== 5) {
		throw new Error(`Expected 5 chunk events, received ${chunkEvents.length}`);
	}

	if (elapsedMs < 2200) {
		throw new Error(
			`Probe completed too quickly (${elapsedMs}ms). Expected roughly 5 chunks over ~2500ms.`
		);
	}

	await mkdir(path.dirname(fixturePath), { recursive: true });
	await writeFile(
		fixturePath,
		JSON.stringify(
			{
				probedAt: new Date().toISOString(),
				environment: 'local',
				probe: 'sse',
				status: 'PASS',
				elapsedMs,
				eventCount: events.length,
				chunkCount: chunkEvents.length
			},
			null,
			2
		)
	);
	console.log(`[sse-probe] wrote fixture: ${fixturePath}`);

	console.log('[sse-probe] PASS');
}

main().catch((error) => {
	console.error(`[sse-probe] FAIL: ${error instanceof Error ? error.message : String(error)}`);
	process.exitCode = 1;
});
