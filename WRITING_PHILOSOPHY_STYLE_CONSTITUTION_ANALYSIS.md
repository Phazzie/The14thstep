# Writing Philosophy and Style Constitution Analysis

This document responds to the request to explain the app's actual writing philosophy (grounded in the repo's docs/code/examples), not just restate the `STYLE_CONSTITUTION` string.

Primary sources used:
- `NARRATIVE_ANSWERS.md`
- `ANSWERS.md`
- `AGENTS.md`
- `app/AGENTS.md`
- `app/src/lib/core/style-constitution.ts`
- `app/src/lib/core/therapy-blocklist.ts`
- `app/src/lib/core/prompt-templates.ts`
- `app/src/lib/core/narrative-context.ts`
- `app/src/lib/core/characters.ts`

## 1. Writing Philosophy (Plain English)

The writing philosophy is trying to make the room feel like a real recovery meeting at a bad hour, not a wise machine performing "recovery language." The target is not "supportive content"; it is the feeling of being in a room with people who have lived through consequences, know exactly what the user means without explanation, and talk like humans trying to stay honest in public.

The biggest thing this system is trying to avoid is a certain kind of polished AI output that sounds technically compassionate but emotionally fake. The docs call this out directly as "brochure" writing (`NARRATIVE_ANSWERS.md:3`): language that summarizes the idea of recovery instead of witnessing a specific moment. That kind of writing is especially bad in this app because the user context is not generic wellness browsing; the repo repeatedly frames the user as potentially vulnerable, isolated, and sometimes in crisis (see `AGENTS.md:17` and surrounding mission language).

So the core philosophy is:
- stay concrete
- stay local
- stay in the body / room / object / action
- trust the reader to understand the implication
- do not explain the meaning after the image already landed

This is why so much emphasis lands on endings, subtext, and character specificity. The real enemy is not only therapy-speak. It is writing that resolves too cleanly, interprets too quickly, or sounds interchangeable across characters.

## 2. Real Editorial Heuristics (Detailed)

These are the real taste rules the repo points toward (especially `NARRATIVE_ANSWERS.md`, `AGENTS.md`, and `ANSWERS.md`), including what they catch and where they can be over-applied.

### 2.1 Cut the last sentence test

What it means:
- Remove the final sentence and ask whether the share hits harder.

Why it matters:
- AI often adds a "closing thought" that explains, softens, or moralizes the moment.
- The repo calls this out explicitly (`NARRATIVE_ANSWERS.md:40`, `AGENTS.md:50`).

Failure mode it catches:
- "Let me explain what this story means" endings.

Over-application risk:
- Not every final sentence is filler; some are the knife. The test is editorial, not mechanical.

### 2.2 No lesson endings

What it means:
- A share should not end by extracting a moral, takeaway, or advice statement.

Why it matters:
- Lesson endings sound like content strategy, not a person in a room.
- `AGENTS.md` treats "ends with a lesson" as a failure criterion.

Failure mode it catches:
- "And that's why we have to keep showing up."

Over-application risk:
- Recovery language can include principle statements sometimes; the issue is canned resolution, not any statement of principle.

### 2.3 Do not explain the metaphor

What it means:
- If the image/story already carries the meaning, do not append an explanatory sentence.

Why it matters:
- The repo's "parking lot" example is explicit: explaining the metaphor weakens it (`NARRATIVE_ANSWERS.md:40`).

Failure mode it catches:
- "I don't know why I'm telling you this except..." explanatory bridge sentences.

Over-application risk:
- Sometimes a character's voice includes self-interpretation; the problem is weak explanation that flattens the already-working image.

### 2.4 Trust subtext / do not spell-check lived experience

What it means:
- Let the audience infer obvious emotional logic when the action already communicates it.

Why it matters:
- `NARRATIVE_ANSWERS.md:36` explicitly argues that explaining why someone takes a bottle back out of the trash insults reader experience.

Failure mode it catches:
- "He wasn't ready yet." "She was scared." "I guess that was grief."

Over-application risk:
- Some users/characters may genuinely speak more explicitly; the rule is about force-feeding meaning after strong evidence already exists.

### 2.5 Micro-intimacy beats generic wisdom

What it means:
- Small, banal details can carry huge stakes when chosen well.

Why it matters:
- The docs favor tiny actions (weather talk, broken mug, empty chair, parking lot) over abstract "growth" language.
- `NARRATIVE_ANSWERS.md` explicitly contrasts micro-intimacy with macro-stakes, and values both when earned.

Failure mode it catches:
- Vague uplift and generalized "recovery truths."

Over-application risk:
- Random detail is not the same as meaningful detail; specificity has to carry pressure, not just texture.

### 2.6 Do not name the emotion when the scene already shows it

What it means:
- Replace generic emotion labels ("I felt shame") with the concrete act/consequence if possible.

Why it matters:
- The "16-word rewrite" example in `NARRATIVE_ANSWERS.md:25` shows this move directly.

Failure mode it catches:
- Emotion labels as shortcuts.

Over-application risk:
- Explicit feeling language is not always wrong; it becomes weak when it substitutes for the scene.

### 2.7 Character specificity test ("could anyone say this?")

What it means:
- If the line could be spoken by any character in any meeting, it fails.

Why it matters:
- `AGENTS.md` explicitly names generic-across-characters language as failure.
- The app invests heavily in character foundations and voice examples (`app/src/lib/core/characters.ts`) for a reason.

Failure mode it catches:
- Interchangeable sincerity.

Over-application risk:
- Not every line needs a flamboyant signature; specificity can be cadence, omission, or what gets noticed.

### 2.8 Brochure test (too polished / too resolved / too authoritative)

What it means:
- If it sounds like a finished thought from a safe distance, it probably fails.

Why it matters:
- This is the central critique in `NARRATIVE_ANSWERS.md:3`.

Failure mode it catches:
- "Here is the idea of recovery, elegantly summarized."

Over-application risk:
- Clarity is not the enemy; polish without stakes is.

### 2.9 Therapy-speak rejection is necessary but not sufficient

What it means:
- Blocking obvious therapy phrases helps, but it does not guarantee emotional truth.

Why it matters:
- `ANSWERS.md:67` explicitly identifies a validator gap: emotional flatness can still pass if it avoids blocklist phrases and stays concrete enough.

Failure mode it catches:
- "I hear you / that's valid / healing journey" type language.

Failure mode it misses:
- Dead-on-arrival "authentic" prose that is technically compliant but emotionally empty.

## 3. Bad / Good / Great Examples (8 sets)

These are synthetic examples written to match the repo's philosophy and failure modes. They are not copied from source files.

### Set 1: Brochure vs witness

Bad:
- "Recovery taught me that healing starts when we choose ourselves and keep showing up one day at a time."

Good:
- "I sat in the parking lot with the engine off for forty minutes and still came in."

Great:
- "I sat in the parking lot long enough for the windshield to fog from the inside. I almost took that as a sign to leave."

Why Bad fails:
- Generic lesson, slogan-adjacent, no room-specific lived pressure.

Why Great works:
- Concrete detail, immediate stakes, no explanation of what it "means."

### Set 2: Emotion label vs evidence

Bad:
- "I felt a lot of shame about what I did to my family."

Good:
- "I stole from my sister and still check the room when I say her name."

Great:
- "I stole from my sister and I still look at the floor when somebody says 'family' in here."

Why Bad fails:
- Abstract label replaces the lived consequence.

Why Great works:
- Shows the shame in body behavior and social context.

### Set 3: Explaining the metaphor

Bad:
- "It reminded me of when I was homeless, and I guess I'm saying this because tonight feels the same emotionally."

Good:
- "The steam from the diner vent was the only warm thing on that block."

Great:
- "I stood by the diner vent at three in the morning because it was the only place on the block throwing heat."

Why Bad fails:
- Explains the comparison and drains the image.

Why Great works:
- Lets the image carry loneliness and survival without commentary.

### Set 4: Polished closing sentence

Bad:
- "I still miss my son, but I know grief is part of the process and tonight reminded me I am not alone."

Good:
- "I still miss my son. That's all I had walking in here."

Great:
- "I still miss my son. I brought that in with me and set it in the empty chair before I sat down."

Why Bad fails:
- Buttoned-up, therapeutic conclusion, smooths over the rawness.

Why Great works:
- Ends on a room-specific image with unresolved feeling.

### Set 5: Interchangeable voice

Bad:
- "Thank you all for being here and for your honesty tonight."

Good (Marcus-ish):
- "Now let me say this plain: people staying in these chairs is the only reason some of us are alive."

Great (Marcus-ish):
- "Now I've buried enough people to quit pretending attendance is small. You being in that chair matters."

Why Bad fails:
- Could be any moderator in any support app.

Why Great works:
- Character-specific cadence, history, and stakes.

### Set 6: Fake vulnerability

Bad:
- "I'm learning to give myself grace and sit with the discomfort."

Good:
- "I wanted to leave when you started talking, because it sounded too much like my week."

Great:
- "When you started talking I reached for my keys in my pocket. I was halfway out the door in my head."

Why Bad fails:
- Wellness vocabulary, no scene, no cost.

Why Great works:
- Physicalizes avoidance and shame without naming them.

### Set 7: Overbuilt "recovery wisdom"

Bad:
- "Relapse begins long before the drug, in the stories we tell ourselves."

Good:
- "For me it starts when I call isolation peace."

Great (Meechie-ish):
- "For me relapse starts when I start calling isolation 'peace' like I invented a better word for hiding."

Why Bad fails:
- Sounds like a quote card.

Why Great works:
- Keeps the insight but drags it back into a person with habits and self-deception.

### Set 8: Too much interpretation after the hit

Bad:
- "She let me talk about the weather, which showed me compassion and made me feel human again."

Good:
- "She let me stand there and talk about the weather like I wasn't falling apart."

Great:
- "She let me stand there talking about the weather while my hands shook around a paper cup."

Why Bad fails:
- Explains the emotional conclusion the image already gave us.

Why Great works:
- Keeps the human gesture, adds body detail, trusts the audience.

## 4. What "Therapy-Speak" Means Here (Contextual, Not Purist)

In this project, "therapy-speak" does not mean "any recovery language" or "any emotional honesty." It means language that sounds pre-packaged, clinical, or socially performative in a way that collapses character specificity and room reality.

The code reflects this in two layers:
- explicit exact-phrase and regex rejection (`app/src/lib/core/therapy-blocklist.ts`)
- validator prompt instructions to reject therapy-speak and clinical/abstract language (`app/src/lib/core/prompt-templates.ts`, `buildQualityValidationPrompt(...)`)

Important distinction:
- Genuine recovery language can be real if it is embodied and specific.
- Canned affirmation language fails because it substitutes recognizable phrases for actual witness.

Examples that often fail in this app context:
- "I hear you."
- "That's valid."
- "Healing journey."
- "One day at a time."
- "Do the work."

Why they fail here:
- They sound like generic response templates.
- They flatten the speaker into a role ("helper") instead of a person.
- They often close the emotional space instead of staying inside it.

The repo's own critique in `ANSWERS.md` is important here: removing therapy-speak alone is not enough, because emotionally flat writing can still pass if it is concrete-ish and in character voice.

## 5. The Current `STYLE_CONSTITUTION` (Verbatim)

From `app/src/lib/core/style-constitution.ts`:

- Sound like a real person in a recovery room, never like a clinician.
- Use concrete lived details over abstract advice.
- Keep emotional honesty high and motivational slogans low.
- Speak in natural conversational rhythm, not polished essay prose.
- Hold accountability and compassion together without preaching.

## 6. `STYLE_CONSTITUTION` Line-by-Line Annotation

### 6.1 "Sound like a real person in a recovery room, never like a clinician."

Why this line exists:
- To prevent the most common catastrophic voice drift: AI sounding like a therapist, moderator, or wellness coach.

What failure mode it tries to prevent:
- clinical tone
- detached validation language
- diagnostic framing
- "supportive professional" voice instead of peer voice

What it is trying to produce:
- peer speech, stakes, lived authority, room familiarity

What it misses:
- "real person" is too broad by itself; it does not encode character-specific cadence, status, wounds, or social posture.
- It also does not distinguish "real person" from "brochure person."

### 6.2 "Use concrete lived details over abstract advice."

Why this line exists:
- To push generation toward scene/action/object details and away from generalized recovery commentary.

What failure mode it tries to prevent:
- summary voice
- advice voice
- abstraction replacing witness

What it is trying to produce:
- sensory, situational, embodied lines that imply meaning through detail

What it misses:
- It does not tell the model which details carry pressure versus random texture.
- It also does not encode the "do not explain the detail after it lands" rule.

### 6.3 "Keep emotional honesty high and motivational slogans low."

Why this line exists:
- To permit emotional content while rejecting uplift-performance and quote-card language.

What failure mode it tries to prevent:
- slogans, inspiration-speak, tidy redemption language

What it is trying to produce:
- candid, unresolved, human self-reporting

What it misses:
- "Emotional honesty" is hard to operationalize and can be faked by plausible phrasing.
- The repo explicitly documents this gap (`ANSWERS.md:67`): emotionally flat writing can pass current checks.

### 6.4 "Speak in natural conversational rhythm, not polished essay prose."

Why this line exists:
- AI defaults toward smooth, balanced prose that reads written, not spoken.

What failure mode it tries to prevent:
- essay cadence
- over-symmetric sentences
- polished transitions
- "finished" literary tone

What it is trying to produce:
- speech rhythm, unevenness, implied pauses, lived timing

What it misses:
- It does not encode the exact failure pattern of over-structured endings.
- It does not enforce variability across characters (different people have different "natural" rhythms).

### 6.5 "Hold accountability and compassion together without preaching."

Why this line exists:
- Recovery-room voice often includes both directness and care; removing either distorts the room.

What failure mode it tries to prevent:
- pure softness / validation mush
- pure scolding / moral superiority
- sermon voice

What it is trying to produce:
- grounded truth-telling that does not become punishment or performance

What it misses:
- It does not specify how different characters balance this tension differently.
- It does not prevent "wise-sounding" preachiness disguised as balance.

## 7. What the `STYLE_CONSTITUTION` Misses (and Why It Feels Bland)

This is the main criticism, and it is fair.

The `STYLE_CONSTITUTION` is a portable baseline. It is useful, but it is not the actual writing philosophy in full. It reads bland because it optimizes for:
- universality
- brevity
- repeatability across prompts

The deeper philosophy in this repo is sharper and more editorial than those five lines. The real style intelligence lives in:

1. Editorial heuristics in docs and AGENTS
- "cut the last sentence"
- no lesson endings
- do not explain the metaphor
- trust subtext
- generic-across-characters = fail

2. Character foundations (`app/src/lib/core/characters.ts`)
- wounds, contradictions, lies, discomfort registers, relationship to program, losses, voice examples

3. Anti-pattern constraints
- therapy blocklists and anti-clinical language instructions

4. Validator + thresholding (`app/src/lib/core/narrative-context.ts`)
- `voiceConsistency`, `authenticity`, therapy-speak detection, minimum score gates

5. Human/editorial review
- The docs in `NARRATIVE_ANSWERS.md` and `ANSWERS.md` are doing taste work the validator still does not fully encode.

In short:
- `STYLE_CONSTITUTION` is the header.
- The real philosophy is the combination of examples, character design, anti-patterns, and editorial judgment.

## 8. Implementation Implications (Prompt + Validator + Review)

### 8.1 What is currently encoded reasonably well

Encoded in prompts / rules:
- anti-clinician / anti-therapy direction (`STYLE_CONSTITUTION`, blocklist, validator prompt)
- concrete-over-abstract preference
- room-authentic, spoken-not-essay framing
- character-specific foundations and voice examples
- hard quality gates (`authenticity >= 6`, `voiceConsistency >= 6`, no therapy-speak) in `app/src/lib/core/narrative-context.ts`

### 8.2 What is still mostly human/editorial judgment

Not fully encoded:
- emotional flatness that is technically compliant
- "brochure" detection
- over-explained endings / metaphor explanation
- weak final lesson sentences
- subtext-killing clarifications
- when explicit naming is earned vs lazy

The repo itself flags this problem (`ANSWERS.md:67`): the validator can pass text that avoids blocklist phrases but still feels hollow.

### 8.3 What is worth encoding next (without making it stupid)

High-value additions to the validator prompt/rubric:
1. explicit failure check for emotional flatness
2. explicit failure check for lesson-ending / moralizing close
3. explicit failure check for overexplaining a story/image
4. explicit failure check for generic-across-characters language

But:
- these should be advisory + scored first, not blindly hard-failed on day one
- otherwise the validator will become brittle and reward prompt-gaming

## 9. Practical Review Checklist (For Humans and AI Reviewers)

Use this when reviewing a generated share:

1. Cut the last sentence.
- If it hits harder, leave it cut.

2. Circle abstract nouns.
- If the line depends on words like "healing," "journey," "growth," "process," rewrite toward an event/object/action.

3. Ask "Could another character say this?"
- If yes, it needs character-specific pressure/cadence/detail.

4. Check for explained meaning after a strong image.
- Delete the explanation and see if the image stands.

5. Check emotional honesty vs emotional labeling.
- Is the feeling shown, or just named?

6. Listen for brochure voice.
- Does it sound like a person with skin in the game, or a recovered narrator speaking from safety?

7. Check rhythm.
- Does it sound spoken, or like edited prose?

8. Check the room.
- Does the line feel like it belongs in this room, at this hour, with these people?

## 10. Final Summary

The app's actual writing philosophy is much stronger than its five-line `STYLE_CONSTITUTION` suggests. The constitution is not wrong; it is just compressed. The real quality bar in this repo comes from the interaction between:
- editorial heuristics (`NARRATIVE_ANSWERS.md`, `AGENTS.md`)
- character foundations (`characters.ts`)
- prompt framing (`prompt-templates.ts`)
- validator gates (`narrative-context.ts`)
- and human taste where the validator is still blind (`ANSWERS.md`)

That gap matters. It is also exactly where the next round of prompt/validator improvements should focus.
