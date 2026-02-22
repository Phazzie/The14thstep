Here are the answers to your questions based on a direct inspection of the current codebase:

### 1. The Exact Rendered Prompt for Marcus

Assuming the one prior share in context is `User: I had a really hard day today.`, here is the exact string that Grok reads (from `buildCharacterSharePrompt` in `app/src/lib/core/prompt-templates.ts`):

```text
You are Marcus, The Chair.

Voice: Measured, story-driven, starts with Now or See.

Wound: Daughter will not speak to him, watched too many people die.

Contradiction: Calm can read as distance.

Quirk: Always has the chipped coffee cup.

YOUR HISTORY: none

CONTINUITY NOTES: none

CALLBACK OPPORTUNITIES THIS MEETING: none

MEETING CONTEXT:
Current topic: Staying clean when everything falls apart
Recent shares:
User: I had a really hard day today.

Write exactly 3-4 sentences. Concrete language only. No therapy-speak. Include one physical action if natural.
```

### 2. Trace of `voiceConsistency` and `authenticity`

In `app/src/routes/meeting/[id]/share/+server.ts` (around line 91), the validator response is parsed by `parseQualityValidation(raw: string)`.

```typescript
function parseQualityValidation(raw: string): { pass: boolean } | null {
  // ... parses JSON ...
  if (!isObject(parsed) || typeof parsed.pass !== "boolean") {
    return null;
  }
  return { pass: parsed.pass };
}
```

**Conclusion:** The `voiceConsistency` and `authenticity` fields that Grok returns are **completely discarded** at the parsing step. The route only extracts and uses the `pass` boolean. If `pass` is true, the share is accepted; if false, it generates a retry. The numeric scores are never logged or evaluated in the production runtime.

### 3. Differences in Marcus's prompt: Meeting 1 vs Meeting 10

In Meeting 1, Marcus's dynamic history fields are empty (they render as `YOUR HISTORY: none`, `CONTINUITY NOTES: none`, etc.).

By Meeting 10, the prompt dynamically injects user history via `buildPromptContext()` in the share route. The following fields will update:

- **`YOUR HISTORY`**: Populates with up to 6 `heavyMemoryLines` (e.g., facts about the user like "User called sponsor before using last week.")
- **`CONTINUITY NOTES`**: Populates with up to 4 `continuityLines` (long-term narrative arcs).
- **`CALLBACK OPPORTUNITIES THIS MEETING`**: Populates with up to 3 `selectedCallbacks` formatted with scores (e.g., `direct_reference [room] score 10: I almost ran today.`).

The static fields that _never_ change are his Core Character setup: Archetype, Voice, Wound, Contradiction, Quirk, and the structural formatting instructions (3-4 sentences, physical action, etc.). By meeting 10, Marcus knows specific vulnerabilities and past phrases the user has shared in meetings 1-9.

### 4. Therapy-speak blocklist vs. Quality validator gaps

They are doing different but overlapping jobs:

- **The Blocklist** (`THERAPY_SPEAK_EXACT_PHRASES`) provides hardcoded string matches (e.g., "holding space", "doing the work").
- **The Quality Validator** is an LLM pass that evaluates the vibe—checking for "voice drift" or if language is "abstract/clinical".

**The Gap:** Because the quality validator only outputs a binary `pass: boolean` in production, and its prompt specifies failing only if therapy-speak appears, voice drifts, or language is clinical/abstract, **there is no explicit check for emotional flatness**. A share can easily avoid exact blocklist phrases, stay in character voice, use concrete nouns, and still be completely devoid of emotional depth or vulnerability. It will pass both checks and be delivered to the user.

### 5. Random Visitor Info vs Marcus

When a visitor is generated (via `generateVisitors` in `app/src/lib/core/character-selector.ts`), they receive a randomized name, wound, contradiction, and clean time from a predefined list.
However, their `voice` and `quirk` are hardcoded and identical for _every single visitor_:

- Voice: `"Concrete, specific, emotionally raw."`
- Quirk: `"Looks down before saying hard truths."`

When Grok receives the prompt for a visitor, it gets the exact same **fields** as Marcus (Voice, Wound, Contradiction, Quirk)—but with the generic visitor data.
Notably, `YOUR HISTORY`, `CONTINUITY NOTES`, and `CALLBACKS` will always evaluate to `none` for visitors since they have no meeting history. Also, while `cleanTime` is generated for visitors, `buildCharacterSharePrompt` actually **omits** clean time for all characters during sharing prompts.

### 6. The single thing most likely to make it feel like AI

**File:** `app/src/lib/core/prompt-templates.ts`
**Line 38** (inside `buildCharacterSharePrompt`):
`'Write exactly 3-4 sentences. Concrete language only. No therapy-speak. Include one physical action if natural.'`

**Why:** Over-indexing on the instructions `"exactly 3-4 sentences"` and `"Include one physical action"`.
If every single character in the room suddenly performs a stage-direction physical action (shifting in their seat, looking at their coffee cup, sighing) in exactly 3-4 sentences every time it's their turn to speak, it creates a deeply unnatural, mathematically rigid cadence. Humans have varied sentence lengths (1-sentence bursts vs long rambles) and don't constantly narrate stage directions. This uniform structure screams "AI template" rather than authentic human sharing.
