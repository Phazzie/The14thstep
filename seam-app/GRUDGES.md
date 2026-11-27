# GRUDGES

Things that failed silently or lied. Check before every deploy.

1. **2026-11-27, old app: "READY" deploy that cannot serve anyone.** Vercel project `app` shows
   its production deployment as READY, but every route needs a Supabase tenant that no longer
   exists. Green status, dead app. The rebuild has no database for this reason.
2. **2026-11-27, old project `the14thstep`:** production deploy in ERROR ("Resource provisioning
   failed") sitting next to the READY `app` project from the same commit. Two projects, one repo,
   easy to check the wrong one.
3. **2026-11-27, the Grok key is production-only.** On the old project `XAI_API_KEY` targets
   production only, so every preview deployment silently has no key. In the rebuild that means
   the house tape plays; the slip says "(tape)" and the minutes header says so, so it can't lie.
4. **2026-11-27, `npm install` crashed** with `Cannot read properties of null (reading 'edgesOut')`
   (an npm arborist bug). Fixed with `legacy-peer-deps=true` in `.npmrc`; `npm ci` is clean.
