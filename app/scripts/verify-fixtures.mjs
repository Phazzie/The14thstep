#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd(), '..');
const registryPath = path.join(repoRoot, 'seam-registry.json');

async function main() {
	// TODO(M9): Replace this scaffold with freshnessDays enforcement per seam fixture timestamps.
	const raw = await readFile(registryPath, 'utf8');
	const parsed = JSON.parse(raw);
	if (!parsed || !Array.isArray(parsed.seams) || parsed.seams.length === 0) {
		throw new Error('Invalid seam-registry.json: seams list missing or empty');
	}

	console.log(`[verify:fixtures] scaffold check passed (${parsed.seams.length} seams found).`);
	console.log('[verify:fixtures] TODO(M9): enforce fixture freshness windows and fail stale fixtures.');
}

main().catch((error) => {
	console.error('[verify:fixtures] failed:', error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
});
