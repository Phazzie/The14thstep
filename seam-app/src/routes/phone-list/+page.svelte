<script lang="ts">
	import PhoneList from '$lib/components/PhoneList.svelte';
</script>

<svelte:head>
	<title>Phone list · The 14th Step</title>
</svelte:head>

<article class="sheet back">
	<p class="tiny">BACK OF FORM 14-A · PRINTED ON EVERY SLIP</p>
	<h1>If tonight is that kind of night</h1>
	<p>
		The people in this meeting are made up. These numbers are not. Every one of them is free, and a real
		person answers. You don't have to be sure it's an emergency to call. You can call just because you
		don't want to be alone with it.
	</p>
	<PhoneList />
	<p class="also">
		If you want a real room with real folding chairs, the SAMHSA line can find one near you. So can a
		search for "NA meeting near me" or "AA meeting near me". Both run meetings online too, at every hour.
	</p>
	<p class="back-link"><a href="/">Back to the slip</a></p>
</article>

<style>
	.back {
		max-width: 680px;
		margin: 8px auto 0;
		padding: 28px 30px 22px;
		transform: rotate(0.5deg);
		display: grid;
		gap: 12px;
	}
	.tiny {
		font-size: 11px;
		letter-spacing: 0.08em;
		color: var(--toner-soft);
		margin: 0;
	}
	h1 {
		font-family: var(--stamp-font);
		font-weight: 400;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		font-size: clamp(26px, 6vw, 38px);
		line-height: 1.1;
		margin: 0;
	}
	p {
		margin: 0;
	}
	.also {
		font-size: 15px;
	}
	.back-link {
		font-family: var(--hand);
		font-size: 20px;
		color: var(--ballpoint);
	}
	@media (max-width: 560px) {
		.back {
			padding: 22px 18px;
			transform: none;
		}
	}
</style>
