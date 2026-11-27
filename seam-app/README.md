# The 14th Step (rebuild)

A recovery meeting that is open at 3am. Six regulars, written by hand and voiced by Grok, run a
real meeting: empty chair, opening, reading, introductions, topic, three rounds, closing. You can
introduce yourself, pick the topic, share, pass, or just listen. If you type something that sounds
like you might not be safe, the room stops and the phone list comes out, without waiting on any AI.

The whole thing is a **Proof of Attendance slip**, the paper people get signed at court-ordered
meetings. The front is the sign-in form. The back is the minutes, typed by the secretary. When the
meeting ends, Marcus (a chatbot) signs it and it gets stamped ATTENDED. Valid for tonight. Not valid
for court, probation, your P.O., your sponsor, or your mother.

This folder is a rebuild of the app in `../app`, which is left untouched. See `plan/` for how it
was planned (seam-v2 process, done by hand) and `CUTOVER.md` for what is and isn't carried over.

## Run it

```bash
npm ci
cp .env.example .env.local   # add XAI_API_KEY, or leave it out to hear the house tape
npm run dev                  # http://localhost:5173
```

Checks: `npm run check`, `npm test` (24 unit tests), `npm run build`, `npm run test:e2e` (4 browser tests).

## How it works

- No database, no sign-in. The meeting lives in the browser's localStorage under one key.
- `POST /api/share` builds a prompt from the character's profile and asks Grok
  (`grok-4-1-fast-reasoning`) for one line. Empty, overlong or therapy-speak answers are retried
  once, then replaced by a hand-written **house tape** line, which is labelled "(tape)" on the slip.
- The meeting is a fixed list of beats from a seed (`src/lib/core/script.ts`), walked by a cursor,
  so refreshing never repeats anything.
- Crisis replies and the phone list (988, 911, Crisis Text Line, SAMHSA) are written by hand in
  `src/lib/core/crisis.ts` and never touch the network.

## Environment

| Variable | Needed | What for |
|---|---|---|
| `XAI_API_KEY` | for live voices | Without it the whole meeting plays from the house tape |
| `XAI_MODEL` | no | Defaults to `grok-4-1-fast-reasoning` |

## What's still rough

- Without `XAI_API_KEY` every voice is the tape, so a second meeting repeats lines.
- No live Grok answer has been recorded yet; the Grok call is tested against a stub only.
- Dropped from the old app: "expand a share", the AI end-of-meeting summary, memory across meetings.
- The rate limit is in-memory per server instance, which is light protection, not real protection.
