# NOX

A personal AI operating system. Modeled on the fusion of J.A.R.V.I.S. and F.R.I.D.A.Y., evolved one generation beyond either. Persistent intelligence layer: chief of staff, principal engineer, intelligence analyst, financial advisor, medical observer, and trusted confidant.

Local-first. Runs against Ollama. No data leaves your machine.

## What's in v0.2

- Streaming chat with mid-stream cancellation (Esc or Stop button)
- Persistent SQLite memory: sessions, messages, facts
- Eight registers with heuristic auto-detection (standard, deep_work, war_room, recovery, tactical, workshop, counsel, crisis)
- Sticky mode with decay: non-standard modes persist for N follow-up turns
- Per-mode temperature (crisis 0.15, war_room 0.25, workshop 0.8, etc.)
- Token-budgeted history with rolling summary of dropped turns
- Markdown rendering with syntax-highlighted code
- Crisis banner with audio cue when mode flips to CRISIS
- Session switcher: create, rename, delete, swap
- Memory panel: edit facts in place, PII guard with override
- Capability honesty in the system prompt (NOX will not claim it sent the email)
- Optional shared-secret auth for multi-device use
- Live region for screen readers, ARIA labels, keyboard-first input
- Unit tests for mode detection and PII guard

## Stack

- Next.js 15 (App Router, Node runtime)
- TypeScript, Tailwind
- Ollama (local model backend)
- better-sqlite3 (persistent memory)
- react-markdown + rehype-highlight
- Vitest

## Prerequisites

1. Node 20+.
2. [Ollama](https://ollama.com) running locally.
3. A pulled model. Recommended:
   ```
   ollama pull llama3.1:8b
   ```
   Larger if you have the VRAM:
   ```
   ollama pull qwen2.5:14b
   ollama pull llama3.1:70b
   ```

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `OLLAMA_HOST` | `http://127.0.0.1:11434` | Ollama server URL |
| `NOX_MODEL` | `llama3.1:8b` | Default model |
| `NOX_DATA_DIR` | `./data` | SQLite database directory |
| `NOX_AUTH_TOKEN` | empty | If set, requires `Authorization: Bearer <token>` or session cookie on all API routes |

## Security note

The API endpoints are unauthenticated by default. This is fine for `localhost`. If you bind to a network interface or run behind a reverse proxy:
- Set `NOX_AUTH_TOKEN` to a long random string.
- Browser sessions can authenticate once via `POST /api/auth` with `{ "token": "..." }`, which sets an `HttpOnly` cookie.
- Programmatic clients use `Authorization: Bearer <token>`.

Anyone with API access can read and write your memory store. Treat the token like an SSH key.

## Architecture

```
app/
  api/
    auth/route.ts        Optional token gate
    chat/route.ts        SSE streaming, abort-aware, partial persistence
    memory/route.ts      Facts CRUD with PII guard
    models/route.ts      Lists installed Ollama models
    sessions/route.ts    Sessions CRUD
  layout.tsx, page.tsx, globals.css
components/
  Chat.tsx               Main client: streaming, abort, mode display
  StatusBar.tsx          Top bar: mode, model, sessions, clock, backend health
  CrisisBanner.tsx       Audio + banner on crisis-mode entry
  MemoryPanel.tsx        Right rail: log/edit facts, PII feedback
  SessionSwitcher.tsx    Create, rename, switch, delete sessions
  Markdown.tsx           Markdown + code highlight bubble
lib/
  nox-prompt.ts          System prompt, mode overlays, capability honesty
  modes.ts               Mode auto-detection with stickiness
  ollama.ts              Streaming + one-shot Ollama clients (abort-aware)
  memory.ts              SQLite: sessions, messages, facts, session_state
  summarize.ts           Rolling summary of dropped history
  pii.ts                 Secret-pattern detection for fact saves
  auth.ts                Optional shared-secret guard
  types.ts
tests/
  modes.test.ts          Mode detection + stickiness
  pii.test.ts            Secret-pattern coverage
```

## Modes

Auto-detected from the user message; shifts system prompt and temperature.

| Mode | Trigger | Temp |
| --- | --- | --- |
| `STANDARD` | default | 0.60 |
| `DEEP WORK` | "heads down", "DND", "focus block" | 0.45 |
| `WAR ROOM` | outage, breach, board call, term sheet | 0.25 |
| `RECOVERY` | exhausted, sick, rough day | 0.55 |
| `TACTICAL` | "ASAP", "pull over", "kill the process" | 0.20 |
| `WORKSHOP` | refactor, stack trace, code blocks | 0.80 |
| `COUNSEL` | "should I", "honest take", relationship | 0.55 |
| `CRISIS` | bleeding, intruder, can't breathe, 911 | 0.15 |

Non-standard modes are sticky for several follow-up turns (crisis 6, deep_work 8, war_room 5, etc.) so a one-word follow-up like "and?" doesn't drop the register.

## Memory

Facts in the right panel are injected into the system prompt every turn, grouped by category, within a 1200-token budget. Conversation history is included up to 6000 tokens; anything older is folded into a rolling summary on a background task.

Secret patterns (API keys, JWTs, SSNs, private keys, credit cards) are blocked by default with an override checkbox.

## Scripts

- `npm run dev`        development server
- `npm run build`      production build
- `npm run start`      run production build
- `npm run typecheck`  type check
- `npm run lint`       lint
- `npm test`           run unit tests
- `npm run test:watch` run tests in watch mode

## Deliberately out of scope (still)

- No tool calling, web search, shell exec, file I/O.
- No calendar, email, or external integrations.
- No vector search over long-term memory.
- No voice, image, or multimodal input.

These remain v1+ work. The system prompt now explicitly tells the model it lacks these capabilities, so it won't pretend.
