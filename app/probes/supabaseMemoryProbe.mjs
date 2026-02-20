#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const probeUserId = process.env.PROBE_USER_ID?.trim();
const maxMs = Number.parseInt(process.env.SUPABASE_MEMORY_PROBE_MAX_MS || '800', 10);
const fixturePath = path.join(
	process.cwd(),
	'src',
	'lib',
	'seams',
	'database',
	'fixtures',
	'probe.sample.json'
);

async function main() {
	if (!supabaseUrl) throw new Error('SUPABASE_URL is required');
	if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
	if (!probeUserId) throw new Error('PROBE_USER_ID is required');

	const supabase = createClient(supabaseUrl, serviceRoleKey, {
		auth: { autoRefreshToken: false, persistSession: false }
	});

	const startedAt = Date.now();

	const [heavyRes, userHeavyRes, recentMeetingsRes] = await Promise.all([
		supabase.from('shares').select('*').gte('significance_score', 7),
		supabase
			.from('shares')
			.select('*, meetings!inner(user_id)')
			.gte('significance_score', 6)
			.eq('meetings.user_id', probeUserId),
		supabase
			.from('meetings')
			.select('id, started_at')
			.eq('user_id', probeUserId)
			.order('started_at', { ascending: false })
			.limit(3)
	]);

	if (heavyRes.error) throw new Error(`Heavy query failed: ${heavyRes.error.message}`);
	if (userHeavyRes.error) throw new Error(`User-heavy query failed: ${userHeavyRes.error.message}`);
	if (recentMeetingsRes.error)
		throw new Error(`Recent meetings query failed: ${recentMeetingsRes.error.message}`);

	const recentMeetingIds = (recentMeetingsRes.data ?? []).map((meeting) => meeting.id);

	const recentSharesRes =
		recentMeetingIds.length > 0
			? await supabase
					.from('shares')
					.select('*')
					.in('meeting_id', recentMeetingIds)
					.order('sequence_order', { ascending: true })
			: { data: [], error: null };

	if (recentSharesRes.error)
		throw new Error(`Recent shares query failed: ${recentSharesRes.error.message}`);

	const map = new Map();
	for (const row of heavyRes.data ?? []) map.set(row.id, row);
	for (const row of userHeavyRes.data ?? []) map.set(row.id, row);
	for (const row of recentSharesRes.data ?? []) map.set(row.id, row);

	const combined = [...map.values()];
	const elapsedMs = Date.now() - startedAt;

	console.log(`[supabase-memory-probe] heavy>=7 rows: ${(heavyRes.data ?? []).length}`);
	console.log(
		`[supabase-memory-probe] heavy>=6 for user rows: ${(userHeavyRes.data ?? []).length}`
	);
	console.log(
		`[supabase-memory-probe] last-3-meetings shares rows: ${(recentSharesRes.data ?? []).length}`
	);
	console.log(`[supabase-memory-probe] merged unique rows: ${combined.length}`);
	console.log(`[supabase-memory-probe] elapsed: ${elapsedMs}ms`);
	console.log(`[supabase-memory-probe] threshold: ${maxMs}ms`);

	if (!Number.isFinite(maxMs) || maxMs <= 0) {
		throw new Error('SUPABASE_MEMORY_PROBE_MAX_MS must be a positive integer');
	}

	if (elapsedMs > maxMs) {
		throw new Error(`Query bundle exceeded target latency (${maxMs}ms): ${elapsedMs}ms`);
	}

	await mkdir(path.dirname(fixturePath), { recursive: true });
	await writeFile(
		fixturePath,
		JSON.stringify(
			{
				probedAt: new Date().toISOString(),
				environment: 'live',
				probe: 'supabase-memory',
				status: 'PASS',
				thresholdMs: maxMs,
				elapsedMs,
				heavyRows: (heavyRes.data ?? []).length,
				userHeavyRows: (userHeavyRes.data ?? []).length,
				recentSharesRows: (recentSharesRes.data ?? []).length,
				mergedRows: combined.length
			},
			null,
			2
		)
	);
	console.log(`[supabase-memory-probe] wrote fixture: ${fixturePath}`);

	console.log('[supabase-memory-probe] PASS');
}

main().catch((error) => {
	console.error(
		`[supabase-memory-probe] FAIL: ${error instanceof Error ? error.message : String(error)}`
	);
	process.exitCode = 1;
});
