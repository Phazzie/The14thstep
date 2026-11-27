# Inventory: what the old app does (seam-v2 step 1, survey)

Surveyed from `app/` on `main` at 7f84328 (2026-11-27). Judged from code, not docs.

## Screens

| Route | What the user sees | State |
|---|---|---|
| `/` | Four-step intake: name, clean time, mood (8 choices), "what's on your mind" + "listening only" toggle. A random line from `startup-sayings.ts`. Clerk sign-in. | Works, but posts to Supabase |
| `/meeting/[id]` | The room: circle of six characters, transcript, user input. Ritual: empty chair, Marcus opens, silence, Chrystal reads, six intros, user intro, topic pick (10 topics), three sharing rounds with user turns, an optional "hard question", closing, "Keep coming back", a farewell, then a reflection summary. Expand a share. Crisis support. | Dead in production: every route needs the Supabase tenant that no longer exists |
| `/privacy`, `/terms` | Static legal pages | Works |
| `/probes/sse`, `/api/probes/sse` | Developer probe | Not user-facing |

## Outside services

| Service | Address | Used for | State |
|---|---|---|---|
| xAI Grok | `https://api.x.ai/v1/responses`, model `grok-4-1-fast-reasoning` | Every character share, crisis replies, summary, quality scoring | Key exists in Vercel **production only** |
| Supabase | env `SUPABASE_URL` | Users, meetings, shares, callbacks, character memory | **Gone** (STATUS.md, #71) |
| Clerk | env `CLERK_*` | Sign-in | Configured, pointless without the database |

## Data

Meetings, shares, callbacks and character memory rows in Supabase. Intake answers ride in the URL (#78, a privacy leak). No route checks who owns a meeting (#78).

## Login

Clerk session cookie. Required before joining.

## When things fail

Errors surface as raw `errorMessage` strings in the transcript. With the database gone, the landing page fails to create a meeting at all.

## What is worth keeping (and is kept, verbatim where it matters)

- The six core characters with their wound, lie, voice and three real voice lines (`app/src/lib/core/characters.ts`).
- The style constitution and therapy-speak blocklist.
- The ritual order of a meeting.
- Crisis keywords and the rule that crisis replies always name 988 and 911.
- The startup sayings ("A fake meeting with fake people is better than a real meeting with fake people.").
- The ten topics.

## What is dropped, and why

- Supabase, Clerk, callbacks, cross-meeting memory: they depend on a database that is gone, and they are what leaked user text (#78). The rebuild keeps everything on the user's device.
- Seven-candidate voice scoring: expensive, slow, and the morning budget is $0. One generation plus a structural check replaces it.
