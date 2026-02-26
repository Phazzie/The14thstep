# Writing Philosophy Extraction + Implementation Audit Prompt (V2)

## Instructions For The AI Running This Prompt (read first)

You are being asked to do **two jobs** at once:
1. extract and explain the app's real writing philosophy
2. audit how much of that philosophy is actually enforced in the current code

To do this correctly, follow these rules:

1. **Read the repo sources first before drafting anything**
- Do not start writing from general knowledge.
- Read the listed docs/code files and ground your claims in them.

2. **Separate taste analysis from runtime/code claims**
- You may write strongly/opinionatedly about writing quality.
- But any claim about current implementation behavior must be evidence-backed.

3. **Use file paths + line numbers for runtime claims**
- If you say "the validator enforces X" or "the prompt includes Y," cite exact file references.
- If you cannot verify a claim in the current code, label it as an inference or open question.

4. **Do not rely on memory of prior versions**
- This repo has evolved.
- Do not assume old prompt shapes, old validator behavior, or old route logic still applies.

5. **Be explicit about what is missing from the implementation**
- If the philosophy is richer than the code, say so.
- Distinguish between:
  - baseline constraints
  - editorial heuristics
  - runtime enforcement

6. **Use concrete examples, not generic writing advice**
- The point is to explain this project's writing taste, not "creative writing" in general.

7. **Be honest about uncertainty**
- If docs and code conflict, say so.
- Prefer code for runtime truth, docs for intent/taste.

## How to use this file (for the person running the prompt)

1. Copy the prompt block below (the fenced ```text``` block) into the other AI.
2. Give it access to this repository/files (or paste the relevant files if it cannot read the repo directly).
3. Tell it to save the result as a document, not a chat reply, if you want something reusable.
4. Judge the output in two separate buckets:
   - writing philosophy / taste quality
   - implementation audit accuracy
5. Reject any answer that makes runtime claims without file+line evidence.

Use this prompt with another AI when you want a repo-grounded explanation of the app's writing philosophy **and** a reliable audit of how much of that philosophy is currently encoded in prompts/validators.

```text
You are doing a writing-philosophy extraction and implementation-audit pass for an AI recovery-meeting app.

This is NOT a generic writing exercise.
You must infer and explain the writing philosophy from the project’s actual docs, examples, and code context.

Critical instruction:
- Do NOT rely on memory or assumptions from prior versions of this repo.
- For any claim about current runtime behavior, cite exact file paths and line numbers from the current code.
- If something is an inference, label it as an inference.
- If docs and code disagree, explicitly say so and treat code as the source of truth for runtime behavior.

Your task:
1. Read the project’s writing/style guidance and examples.
2. Explain the real writing philosophy in plain language.
3. Provide concrete examples of bad / good / great lines in that style.
4. Show the current STYLE_CONSTITUTION exactly.
5. Annotate each line of the STYLE_CONSTITUTION sentence-by-sentence:
   - why that line exists
   - what failure mode it is preventing
   - what it is trying to produce
   - what it misses / where deeper taste is still needed
6. Audit how much of the philosophy is currently encoded in prompts/validator/runtime checks.

Important:
- Be specific.
- Use examples.
- Do not flatten this into generic “creative writing tips.”
- Be willing to say where the implementation is bland or incomplete.
- Treat the style constitution as a compressed baseline, not the whole writing system.

## Repository context to use (read these first)
Start here:
- `CODEX_START_HERE.md` (repo root) — orientation only if needed
- `HANDOFF_CODEX_FINAL_M11-19.md` (repo root) — context on voice pipeline and quality philosophy
- `AGENTS.md` (repo root) — prompt-critical guidance and editorial heuristics references
- `app/AGENTS.md` — app implementation constraints

Primary writing/style sources (most important)
- `NARRATIVE_ANSWERS.md` (repo root)
- `ANSWERS.md` (repo root)
- `app/src/lib/core/style-constitution.ts`
- `app/src/lib/core/therapy-blocklist.ts`
- `app/src/lib/core/prompt-templates.ts`
- `app/src/lib/core/characters.ts`
- `app/src/lib/core/narrative-context.ts`

Optional supporting context (if needed)
- `app/src/lib/core/voice-pipeline.ts`
- `app/src/lib/core/prompt-templates.spec.ts`
- `app/src/lib/core/narrative-context.spec.ts`
- `app/src/routes/meeting/[id]/share/+server.ts`

## What to extract / pay attention to
Focus on the actual editorial heuristics and taste signals, including (but not limited to):
- “cut the last sentence” logic
- anti-moralizing / anti-lesson-ending instincts
- anti-overexplaining / anti-metaphor-explaining instincts
- subtext and restraint
- specificity / lived detail / micro-intimacy
- “could any character say this?” character-specificity test
- therapy-speak and clinician-tone rejection
- how authenticity is judged
- how validator/gates/rules encode (or fail to encode) the philosophy

## Output format (required)

### 1. Writing Philosophy (Plain English)
- What the writing is trying to feel like
- What kinds of “AI writing” failures it is trying to avoid
- Why this matters in a recovery-room context

### 2. Real Editorial Heuristics (Detailed)
- List the actual taste rules you infer from docs/examples
- For each:
  - what it means
  - why it matters
  - a failure mode it catches
  - a caution against over-applying it mechanically

### 3. Bad / Good / Great Examples (At least 8 sets)
- Each set should be a short line or mini-share in the app’s setting
- Format:
  - Bad
  - Good
  - Great
  - Why Bad fails
  - Why Great works
- Make the examples feel like actual people in the room, not polished fiction workshop samples

### 4. The Current STYLE_CONSTITUTION (Verbatim)
Use the exact text from `app/src/lib/core/style-constitution.ts`.

### 5. STYLE_CONSTITUTION Line-by-Line Annotation
For EACH line:
- Why this line is in there
- What it is trying to prevent
- What it is trying to produce
- What it cannot capture by itself

### 6. What the STYLE_CONSTITUTION Misses (Important)
- Explain why it reads bland compared to the real guidance
- Explain the difference between:
  - baseline portable constraints
  - actual editorial taste / writing intelligence
- Identify which other layers carry the real style (character foundations, examples, validators, human review, etc.)

### 7. Implementation Audit (Strictly Evidence-Backed)
Split this section into three subsections:

#### 7A. Verified from code (with exact file paths + line numbers)
- What is currently encoded in prompts
- What is currently encoded in validator parsing/gates
- What is currently enforced at runtime

#### 7B. Inferred from docs/examples (label as inference)
- What appears to be intended but not necessarily enforced

#### 7C. Open questions / needs verification
- Any ambiguity or places where code/docs conflict

Rules for this section:
- Do not claim runtime behavior without citing exact current code.
- Quote short snippets only when necessary.
- If unsure, say unsure.

### 8. What Is Worth Encoding Next (Without Making It Rigid)
- Which editorial heuristics are high-value to encode in validator/prompt review
- Which should remain human/editorial judgment
- Risks of overfitting

### 9. Practical Review Checklist
- Give a concise checklist for human or AI reviewers evaluating generated shares

## Tone requirements
- Serious, sharp, practical
- Respectful of the emotional setting
- No fluff
- No corporate writing
- Do not overpraise
- Critique the gaps honestly

## Constraints
- Use normal repo file references (not `file://` URLs)
- Quote sparingly
- Prefer concrete examples over abstraction
```
