# Track Specification: Core Migration & Meeting Flow

## Goal
Migrate the existing React-based Recovery Meeting Simulator to a SvelteKit application. Replace the in-memory state with Supabase (PostgreSQL) for persistence and switch the AI generation from Claude to Grok-4-1-fast-reasoning.

## Core Features
1.  **Project Scaffolding:** Initialize SvelteKit with Tailwind CSS and Supabase client.
2.  **Database Schema:** Design and implement tables for `users`, `characters`, `meetings`, `shares`, and `continuing_bonds` (relationships).
3.  **AI Integration:** Create a server-side service to interface with Grok-4-1-fast-reasoning for character voice generation, crisis detection, and meeting facilitation.
4.  **Meeting Engine:** Port the React logic (phaser, turn-taking, "empty chair") to SvelteKit stores/server logic.
5.  **Character System:** Implement the "Core Cast" (Marcus, Heather, etc.) as database entries with dynamic state (clean time, mood).

## Technical Requirements
-   **Frontend:** SvelteKit + Tailwind CSS.
-   **Backend:** Supabase (Auth, DB, Realtime).
-   **AI:** X.AI API (Grok-4-1-fast-reasoning).
-   **Testing:** Vitest for logic, Playwright for critical flows.

## User Flows
1.  **Onboarding:** User enters name/alias -> Clean time -> Mood -> "Join Meeting".
2.  **Meeting Start:** "Empty Chair" ritual -> Marcus (Chair) opens -> Introductions.
3.  **Discussion:** Topic selection -> AI Characters share -> User shares (or passes) -> Cross-talk/Reactions.
4.  **Closing:** Meeting summary/reflection -> "Keep Coming Back".

## Success Criteria
-   User can complete a full meeting cycle (Start -> Share -> End).
-   AI characters respond in-voice using Grok.
-   Meeting history is saved to Supabase.
-   Crisis keywords trigger appropriate intervention logic.
