# Tech Stack

## Core Technologies
- **Frontend Framework:** SvelteKit (Fast, minimal boilerplate, great for real-time updates and simple state management).
- **Styling:** Tailwind CSS (Fast, consistent, fits the "gritty" style requirements easily).
- **Backend & Database:** Supabase (Real-time PostgreSQL database + Authentication + Edge Functions. Fits the "low friction" requirement and integrates well with SvelteKit).

## Architecture
- **State Management:** Svelte Stores (Built-in, minimal boilerplate. Perfect for handling the current meeting state, messages, and character data).
- **API Integration:** Grok-4-1-fast-reasoning (via X.AI API) for AI character generation and reasoning.

## Testing
- **Unit & Integration:** Vitest + Testing Library (Standard for SvelteKit. Fast, uses familiar syntax (Jest-like), and works out of the box).
- **End-to-End:** Playwright (Recommended for critical user flows like meeting attendance and crisis detection).
