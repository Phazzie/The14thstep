#!/usr/bin/env node

import { readdir } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import path from 'node:path';

const compositionDir = path.join(process.cwd(), 'tests', 'composition');

async function findCompositionSpecs(dir) {
	const entries = await readdir(dir, { withFileTypes: true });
	const files = [];

	for (const entry of entries) {
		const entryPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await findCompositionSpecs(entryPath)));
			continue;
		}
		if (/\.((test)|(spec))\.(ts|js)$/.test(entry.name)) {
			files.push(entryPath);
		}
	}

	return files;
}

function runVitestComposition() {
	execSync('npx vitest --run --project server tests/composition', {
		cwd: process.cwd(),
		stdio: 'inherit',
		shell: true
	});
}

async function main() {
	const specFiles = await findCompositionSpecs(compositionDir);
	if (specFiles.length === 0) {
		throw new Error('No composition spec files found under tests/composition');
	}

	console.log(`[verify:composition] running ${specFiles.length} composition spec file(s)...`);
	runVitestComposition();
	console.log('[verify:composition] PASS');
}

main().catch((error) => {
	console.error(
		'[verify:composition] failed:',
		error instanceof Error ? error.message : String(error)
	);
	process.exitCode = 1;
});
