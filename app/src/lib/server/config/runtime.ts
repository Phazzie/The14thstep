import { env } from '$env/dynamic/private';

export interface BackendConfigCheck {
	ok: boolean;
	message?: string;
}

const REQUIRED_BACKEND_ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const;

export function checkBackendConfig(): BackendConfigCheck {
	const shouldRequireBackend = env.REQUIRE_BACKEND === 'true';

	if (!shouldRequireBackend) {
		return { ok: true };
	}

	const missing = REQUIRED_BACKEND_ENV.filter((key) => !env[key]);
	if (missing.length > 0) {
		console.error('Backend misconfigured: missing required environment values.', {
			missing
		});
		return {
			ok: false,
			message: 'Service temporarily unavailable. Please try again shortly.'
		};
	}

	return { ok: true };
}
