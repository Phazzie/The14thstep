# Implementation Plan: Migrate React Artifact to SvelteKit

## Phase 1: Project Initialization & Infrastructure
- [ ] Task: Initialize SvelteKit Project
    - [ ] Create new SvelteKit project (`npm create svelte@latest`).
    - [ ] Install Tailwind CSS and configure `tailwind.config.js` with project colors (amber, gray).
    - [ ] Install Supabase client (`@supabase/supabase-js`) and setup environment variables.
    - [ ] Create initial file structure: `src/lib/components`, `src/lib/stores`, `src/routes`.
- [ ] Task: Database Schema Design (Supabase)
    - [ ] Create `profiles` table (id, username, clean_time, created_at).
    - [ ] Create `characters` table (id, name, archetype, voice_prompt, initial_clean_time).
    - [ ] Create `meetings` table (id, topic, created_at, active_participants).
    - [ ] Create `shares` table (id, meeting_id, character_id, content, created_at, tags).
    - [ ] Create `continuing_bonds` table (id, char_a, char_b, relationship_type, intensity).
    - [ ] Write migration script/seed data for Core Cast (Marcus, Heather, etc.).
- [ ] Task: AI Service Integration (Grok-4-1)
    - [ ] Implement `src/lib/server/ai.ts` wrapper for X.AI API.
    - [ ] Create `generateCharacterShare` function with prompt engineering (ported from React).
    - [ ] Create `detectCrisis` function for safety checks.
    - [ ] Write integration test to verify AI response format.
- [ ] Task: Conductor - User Manual Verification 'Project Initialization & Infrastructure' (Protocol in workflow.md)

## Phase 2: Core Meeting Engine Port
- [ ] Task: Meeting State Management (Svelte Stores)
    - [ ] Create `meetingStore.ts` to track phase (setup, intro, topic, discussion, closing).
    - [ ] Create `participantStore.ts` to manage active characters and turn-taking.
    - [ ] Implement "Empty Chair" logic as a reactive state.
- [ ] Task: Character System Implementation
    - [ ] Port `coreCharacters` logic from React to database-backed service.
    - [ ] Implement `MeetingCircle.svelte` component (visual representation of participants).
    - [ ] Implement `Avatar.svelte` component.
- [ ] Task: User Onboarding Flow
    - [ ] Create `/` (Home) route with "Join Meeting" form.
    - [ ] Implement Setup Form (Name -> Clean Time -> Mood).
    - [ ] Connect form submission to Supabase `profiles` creation (anonymous or auth).
- [ ] Task: Meeting Room Interface
    - [ ] Create `/meeting/[id]` route.
    - [ ] Implement `MessageList.svelte` to display real-time shares.
    - [ ] Implement `ShareInput.svelte` for user contributions.
    - [ ] Connect UI to `meetingStore` and Supabase Realtime subscriptions.
- [ ] Task: Conductor - User Manual Verification 'Core Meeting Engine Port' (Protocol in workflow.md)

## Phase 3: AI Logic & Game Loop
- [ ] Task: Turn-Taking Logic
    - [ ] Implement server-side logic to determine next speaker (weighted random + "hand raise").
    - [ ] Implement `generateIntro` flow for meeting start.
    - [ ] Implement `generateTopicSelect` flow for Chair (Marcus).
- [ ] Task: Discussion Logic
    - [ ] Connect `generateCharacterShare` to meeting flow.
    - [ ] Implement "Expand" feature (deepen a share).
    - [ ] Implement "Cross-talk" logic (interruptions/reactions).
- [ ] Task: Crisis Intervention Logic
    - [ ] Port `handleCrisis` logic from React.
    - [ ] Ensure immediate override of meeting flow upon detection.
    - [ ] Implement resource display system message.
- [ ] Task: Conductor - User Manual Verification 'AI Logic & Game Loop' (Protocol in workflow.md)

## Phase 4: Polish & Refinement
- [ ] Task: Styling & Theming
    - [ ] Apply "Gritty Realism" theme (dark mode, amber accents).
    - [ ] Polish animations for new messages/character speaking indicators.
    - [ ] Ensure responsive design for mobile (critical for "in-pocket" usage).
- [ ] Task: User Experience Testing
    - [ ] Verify "Low Friction" entry flow.
    - [ ] Test "Just Listening" mode.
    - [ ] Verify error states and loading skeletons.
- [ ] Task: Final Deployment Prep
    - [ ] Configure build settings for Vercel/Netlify (adapter-auto).
    - [ ] Verify environment variables in production.
- [ ] Task: Conductor - User Manual Verification 'Polish & Refinement' (Protocol in workflow.md)
