#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd(), '..');
const registryPath = path.join(repoRoot, 'seam-registry.json');
const DAY_MS = 24 * 60 * 60 * 1000;

function isObject(value) {
	return typeof value === 'object' && value !== null;
}

function parseIsoTimestamp(value) {
	if (typeof value !== 'string' || value.trim().length === 0) return null;
	const parsed = Date.parse(value);
	return Number.isFinite(parsed) ? parsed : null;
}

async function main() {
	const raw = await readFile(registryPath, 'utf8');
	const parsed = JSON.parse(raw);
	if (!parsed || !Array.isArray(parsed.seams) || parsed.seams.length === 0) {
		throw new Error('Invalid seam-registry.json: seams list missing or empty');
	}

	const ioSeams = parsed.seams.filter((seam) => isObject(seam) && seam.io === true);
	if (ioSeams.length === 0) {
		throw new Error(
			'No I/O seams configured in seam-registry.json (expected seam.io=true entries).'
		);
	}

	const now = Date.now();
	const failures = [];
	let checkedFiles = 0;

	for (const seam of ioSeams) {
		const seamId = typeof seam.id === 'string' ? seam.id : 'unknown-seam';
		const freshnessDays = seam.freshnessDays;
		const fixturePaths = seam.freshnessFixtures;

		if (!Number.isInteger(freshnessDays) || freshnessDays <= 0) {
			failures.push(`${seamId}: freshnessDays must be a positive integer`);
			continue;
		}
		if (!Array.isArray(fixturePaths) || fixturePaths.length === 0) {
			failures.push(`${seamId}: freshnessFixtures must be a non-empty array`);
			continue;
		}

		for (const fixtureRelPath of fixturePaths) {
			if (typeof fixtureRelPath !== 'string' || fixtureRelPath.trim().length === 0) {
				failures.push(`${seamId}: fixture path is missing or invalid`);
				continue;
			}

			const fixtureAbsPath = path.join(repoRoot, fixtureRelPath);
			let fixtureRaw;
			try {
				fixtureRaw = await readFile(fixtureAbsPath, 'utf8');
			} catch (error) {
				failures.push(`${seamId}: unable to read fixture ${fixtureRelPath} (${error.message})`);
				continue;
			}

			let fixtureParsed;
			try {
				fixtureParsed = JSON.parse(fixtureRaw);
			} catch {
				failures.push(`${seamId}: fixture ${fixtureRelPath} is not valid JSON`);
				continue;
			}

			const probedAt = isObject(fixtureParsed) ? fixtureParsed.probedAt : null;
			const probedAtMs = parseIsoTimestamp(probedAt);
			if (probedAtMs === null) {
				failures.push(`${seamId}: fixture ${fixtureRelPath} is missing valid probedAt`);
				continue;
			}

			const ageDays = (now - probedAtMs) / DAY_MS;
			checkedFiles += 1;
			if (ageDays > freshnessDays) {
				failures.push(
					`${seamId}: fixture ${fixtureRelPath} is stale (${ageDays.toFixed(1)} days > ${freshnessDays})`
				);
				continue;
			}

			console.log(
				`[verify:fixtures] PASS ${seamId} ${fixtureRelPath} age=${ageDays.toFixed(1)}d limit=${freshnessDays}d`
			);
		}
	}

	if (failures.length > 0) {
		console.error('[verify:fixtures] FAIL');
		for (const failure of failures) {
			console.error(`  - ${failure}`);
		}
		throw new Error(`Fixture freshness verification failed (${failures.length} issue(s)).`);
	}

	console.log(
		`[verify:fixtures] PASS (${checkedFiles} fixture file(s) checked across ${ioSeams.length} I/O seams).`
	);
}

main().catch((error) => {
	console.error(
		'[verify:fixtures] failed:',
		error instanceof Error ? error.message : String(error)
	);
	process.exitCode = 1;
});
