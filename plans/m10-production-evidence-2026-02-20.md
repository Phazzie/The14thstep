# Milestone 10 Production Evidence (2026-02-20)

This file records the production verification pass used to close remaining Milestone 10 items.

## Deployment evidence

- Command run from `app/`:
  - `npx --yes vercel deploy --prod --yes --token $VERCEL_TOKEN`
- Result:
  - Production deployment URL: `https://the14thstep-mgf7kj8x8-phazzies-projects.vercel.app`
  - Alias promotion completed: `https://the14thstep.vercel.app`

## Auth/session smoke (production)

- Sign in action:
  - `POST https://the14thstep.vercel.app/?/signIn`
  - Response body: `{"type":"redirect","status":303,"location":"/"}`
- Signed-in UI marker observed:
  - Home page rendered `Signed in as <code>...</code>` (session recognized).
- Sign out action:
  - `POST https://the14thstep.vercel.app/?/signOut`
  - Response body: `{"type":"redirect","status":303,"location":"/"}`
- Signed-out UI marker observed:
  - Home page rendered `Sign in with your Supabase account.`

## Auth-bound meeting creation proof (locals.userId path)

To remove ambiguity with `PROBE_USER_ID` fallback, a distinct smoke user was created via service-role admin APIs and used for sign-in/join flow.

- Created smoke user id:
  - `0d9bacb6-5d4d-4639-9f07-b8ba98cfbab1`
- Join action response:
  - `{"type":"redirect","status":303,"location":"/meeting/f55f6c76-895f-4564-9dea-ad13a927489d?..."}`
- Production DB verification for that meeting:
  - Meeting id: `f55f6c76-895f-4564-9dea-ad13a927489d`
  - `meetings.user_id`: `0d9bacb6-5d4d-4639-9f07-b8ba98cfbab1`
  - Expected user id: `0d9bacb6-5d4d-4639-9f07-b8ba98cfbab1`
  - Match: `true`

## Crisis-mode smoke (production)

- User-share crisis trigger:
  - `POST /meeting/df243c44-bca9-4c45-ad9c-40bb6cfe1b8d/user-share`
  - Response `200`, payload includes:
    - `crisis: true`
    - persisted user share with `significanceScore: 10`
- Crisis endpoint:
  - `POST /meeting/df243c44-bca9-4c45-ad9c-40bb6cfe1b8d/crisis`
  - Response `200`, payload includes:
    - two shares in order: Marcus then Heather
    - `resources.sticky: true`
    - expected resource lines (`988`, `SAMHSA`, support line)
- Normal share blocked during crisis:
  - `GET /meeting/.../share?...&crisisMode=1`
  - Response `409`
  - Payload error: `Character shares are paused during crisis mode`

## Callback lifecycle smoke (production)

- Seeded callback id:
  - `97c9d6ae-9acf-4e88-a21a-29e097545a5e`
- Meeting:
  - `d9e3201a-d273-4a8f-a108-fef4a9b14d04`
- Share stream persisted payload included callback in `callbacksUsed` on first attempt.
- Post-share DB check for callback row:
  - `times_referenced: 1`
  - `last_referenced_at: 2026-02-20T07:57:57.314+00:00`
  - `status: active`

## Schema readiness checks (production Supabase)

Executed with service-role key against production data plane:

- `characters` shape/select check: pass (`rows: 6`, core names present)
- `users` shape/select check: pass
- `meetings` shape/select check: pass
- `shares` shape/select check: pass
- `callbacks` shape/select check: pass
- `auth/users` coherence probe (`PROBE_USER_ID` profile in `public.users`): pass

Structured result summary:

```json
{
  "passed": 6,
  "failed": 0
}
```

## Milestone 10 closeout note

This evidence set covers the remaining checklist gaps:
- schema readiness confirmation,
- auth/session production smoke,
- crisis-mode production smoke,
- callback lifecycle production verification,
- deploy + alias confirmation.
