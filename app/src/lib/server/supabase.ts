import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type ServiceRoleSupabaseClient = SupabaseClient;

interface CreateSupabaseServiceRoleClientOptions {
	env?: NodeJS.ProcessEnv;
}

function readRequiredEnv(env: NodeJS.ProcessEnv, name: string): string {
	const value = env[name]?.trim();
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

export function createSupabaseServiceRoleClient(
	options: CreateSupabaseServiceRoleClientOptions = {}
): ServiceRoleSupabaseClient {
	const env = options.env ?? process.env;
	const supabaseUrl = readRequiredEnv(env, 'SUPABASE_URL');
	const serviceRoleKey = readRequiredEnv(env, 'SUPABASE_SERVICE_ROLE_KEY');

	return createClient(supabaseUrl, serviceRoleKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});
}
