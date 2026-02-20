<script lang="ts">
import SetupFlow from '$lib/components/SetupFlow.svelte';
import type { ActionData, PageData } from './$types';

	let { data, form } = $props<{ data?: PageData; form?: ActionData }>();
	const userId = $derived(data?.userId ?? null);
</script>

<main class="mx-auto max-w-2xl p-4">
	<section class="mb-4 rounded-xl border border-gray-700 bg-gray-900 p-4">
		<h2 class="text-lg font-semibold text-amber-200">Account</h2>
		{#if userId}
			<p class="mt-1 text-sm text-gray-300">Signed in as <code>{userId}</code></p>
			<form method="POST" action="?/signOut" class="mt-3">
				<button type="submit" class="rounded bg-gray-700 px-3 py-2 text-sm text-gray-100 hover:bg-gray-600">
					Sign Out
				</button>
			</form>
		{:else}
			<p class="mt-1 text-sm text-gray-300">Sign in with your Supabase account.</p>
			{#if form && 'authMessage' in form && form.authMessage}
				<p class="mt-2 text-sm text-rose-300" role="alert">{form.authMessage}</p>
			{/if}
			<form method="POST" action="?/signIn" class="mt-3 grid gap-2">
				<label class="text-sm text-gray-200" for="email">Email</label>
				<input
					id="email"
					name="email"
					type="email"
					required
					autocomplete="email"
					class="rounded border border-gray-600 bg-gray-950 px-3 py-2 text-sm text-gray-100"
				/>
				<label class="text-sm text-gray-200" for="password">Password</label>
				<input
					id="password"
					name="password"
					type="password"
					required
					autocomplete="current-password"
					class="rounded border border-gray-600 bg-gray-950 px-3 py-2 text-sm text-gray-100"
				/>
				<button type="submit" class="mt-1 rounded bg-amber-500 px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-amber-400">
					Sign In
				</button>
			</form>
		{/if}
	</section>
	<SetupFlow {form} />
</main>
