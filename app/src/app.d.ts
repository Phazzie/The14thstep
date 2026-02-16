import type { AuthPort } from '$lib/seams/auth/contract';
import type { DatabasePort } from '$lib/seams/database/contract';
import type { GrokAiPort } from '$lib/seams/grok-ai/contract';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			seams: {
				auth: AuthPort;
				database: DatabasePort;
				grokAi: GrokAiPort;
			};
			userId: string | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
