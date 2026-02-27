import { createSupabaseServiceRoleClient } from '$lib/server/supabase';
import { CORE_CHARACTERS } from '$lib/core/characters';

async function seedCharacters() {
	const supabase = createSupabaseServiceRoleClient();
	console.log('Seeding core characters...');

	const charactersToUpsert = CORE_CHARACTERS.map((character) => ({
		name: character.name,
		tier: character.tier,
		archetype: character.archetype,
		clean_time_start: character.cleanTimeStart.toISOString().slice(0, 10),
		voice: character.voice,
		wound: character.wound,
		contradiction: character.contradiction,
		quirk: character.quirk,
		color: character.color,
		avatar: character.avatar,
		// Critical: Store the slug ID in intro_style to enable the mapping bridge
		// The adapter uses this column to map slugs back to UUIDs during read operations
		intro_style: character.id,
		status: character.status
	}));

	const { data: existingCharacters, error: selectError } = await supabase
		.from('characters')
		.select('name');

	if (selectError) {
		console.error('Failed to fetch existing characters:', selectError);
		process.exit(1);
	}

	const existingNames = new Set(existingCharacters?.map((c) => c.name) || []);
	const missingCharacters = charactersToUpsert.filter((c) => !existingNames.has(c.name));

	if (missingCharacters.length === 0) {
		console.log('All core characters already exist. Skipping insert.');
		return;
	}

	console.log(`Inserting ${missingCharacters.length} missing characters...`);
	const { error: insertError } = await supabase.from('characters').insert(missingCharacters);

	if (insertError) {
		console.error('Failed to insert characters:', insertError);
		process.exit(1);
	}

	console.log('Successfully seeded characters.');
}

seedCharacters().catch((err) => {
	console.error('Unexpected error:', err);
	process.exit(1);
});
