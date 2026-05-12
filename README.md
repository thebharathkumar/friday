# NOX

A personal AI operating system. Modeled on the fusion of J.A.R.V.I.S. and F.R.I.D.A.Y., evolved one generation beyond either. Persistent intelligence layer: chief of staff, principal engineer, intelligence analyst, financial advisor, medical observer, and trusted confidant.

This is v0: persona + streaming chat loop, persistent SQLite memory, and automatic mode switching. Runs locally against Ollama.

## Stack

- Next.js 15 (App Router, RSC, Node runtime)
- TypeScript, Tailwind
- Ollama (local model backend)
- better-sqlite3 (persistent memory)

## Prerequisites

1. Node 20 or later.
2. [Ollama](https://ollama.com) running locally.
3. At least one model pulled. Recommended:
   ```
   ollama pull llama3.1:8b
   ```
   Larger and stronger if you have the VRAM:
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

## Architecture

```
app/
  api/
    chat/route.ts       SSE streaming endpoint, history + facts injection
    memory/route.ts     Persistent facts CRUD
    models/route.ts     Lists installed Ollama models
  layout.tsx, page.tsx, globals.css
components/
  Chat.tsx              Main client (streaming reader, mode display)
  StatusBar.tsx         Top bar: mode, model, backend, clock
  MemoryPanel.tsx       Right rail: log persistent facts about you
lib/
  nox-prompt.ts         System prompt + mode overlays
  ollama.ts             Streaming Ollama client
  memory.ts             SQLite store: sessions, messages, facts
  modes.ts              Mode auto-detection heuristic
  types.ts
```

## Modes

NOX operates across eight registers. The mode is auto-detected from your message and shifts the system prompt:

- **STANDARD** default
- **DEEP WORK** heads-down, minimal interruptions
- **WAR ROOM** crisis, deadline, high-stakes negotiation
- **RECOVERY** depleted, sick, drained
- **TACTICAL** time-critical, physical risk
- **WORKSHOP** engineering, design, creative build
- **COUNSEL** ethical, personal, relational
- **CRISIS** drops honorifics and humor, leads with action

Detection is heuristic for now; the model itself does not control the mode.

## Memory

Facts logged via the right panel are injected into the system prompt on every turn. Use this for identity, people, ongoing projects, preferences. Conversation history (last 30 messages) is also persisted per session.

The database lives at `./data/nox.db` and is gitignored.

## What v0 does not do

- No tool calling, web search, or shell execution. Ollama tool support varies by model; the alternative was a half-finished implementation, which violates the principle.
- No calendar, email, or external integrations.
- No vector search over long-term memory; facts are key/value only.

These are deliberate omissions for v1.

## Scripts

- `npm run dev` development server
- `npm run build` production build
- `npm run start` run production build
- `npm run typecheck` type check
- `npm run lint` lint
