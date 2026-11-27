<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>{page.status === 404 ? 'Wrong room' : 'The room went dark'} · The 14th Step</title>
</svelte:head>

<article class="sheet err">
	<span class="stamp">{page.status === 404 ? 'Wrong room' : 'Lights out'}</span>
	<h1>{page.status === 404 ? 'No meeting at this address.' : 'Something in the building broke.'}</h1>
	<p>
		{page.status === 404
			? 'The church changed the locks, or this door never had a meeting behind it.'
			: 'The secretary dropped the minutes. Your slip is still in your pocket.'}
	</p>
	<p class="links"><a href="/">Back to the slip</a> · <a href="/phone-list">Phone list</a></p>
</article>

<style>
	.err {
		max-width: 560px;
		margin: 40px auto 0;
		padding: 30px;
		transform: rotate(-1deg);
	}
	.stamp {
		font-size: 26px;
		transform: rotate(-6deg);
	}
	h1 {
		font-family: var(--stamp-font);
		font-weight: 400;
		font-size: 28px;
		margin: 18px 0 8px;
	}
	.links {
		font-family: var(--hand);
		color: var(--ballpoint);
		font-size: 20px;
	}
</style>
