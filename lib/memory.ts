import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { ChatMessage, Fact, Mode, Role, Session } from "./types";

const DATA_DIR = process.env.NOX_DATA_DIR ?? join(process.cwd(), "data");
mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = join(DATA_DIR, "nox.db");

declare global {
  // eslint-disable-next-line no-var
  var __nox_db: Database.Database | undefined;
}

function getDb(): Database.Database {
  if (globalThis.__nox_db) return globalThis.__nox_db;
  const d = new Database(DB_PATH);
  d.pragma("journal_mode = WAL");
  d.pragma("foreign_keys = ON");
  d.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'untitled',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_active TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'standard',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, id);

    CREATE TABLE IF NOT EXISTS facts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS session_state (
      session_id TEXT PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
      sticky_mode TEXT NOT NULL DEFAULT 'standard',
      turns_since_change INTEGER NOT NULL DEFAULT 0,
      summary TEXT NOT NULL DEFAULT ''
    );
  `);
  globalThis.__nox_db = d;
  return d;
}

export function ensureSession(id: string, title = "untitled"): Session {
  const d = getDb();
  d.prepare(`INSERT OR IGNORE INTO sessions (id, title) VALUES (?, ?)`).run(id, title);
  d.prepare(`INSERT OR IGNORE INTO session_state (session_id) VALUES (?)`).run(id);
  d.prepare(`UPDATE sessions SET last_active = datetime('now') WHERE id = ?`).run(id);
  return d.prepare(`SELECT * FROM sessions WHERE id = ?`).get(id) as Session;
}

export function renameSession(id: string, title: string): void {
  getDb().prepare(`UPDATE sessions SET title = ? WHERE id = ?`).run(title.slice(0, 80), id);
}

export function deleteSession(id: string): void {
  getDb().prepare(`DELETE FROM sessions WHERE id = ?`).run(id);
}

export function appendMessage(args: {
  sessionId: string;
  role: Role;
  content: string;
  mode: Mode;
}): ChatMessage {
  const d = getDb();
  const info = d.prepare(
    `INSERT INTO messages (session_id, role, content, mode) VALUES (?, ?, ?, ?)`,
  ).run(args.sessionId, args.role, args.content, args.mode);
  return d.prepare(`SELECT * FROM messages WHERE id = ?`).get(info.lastInsertRowid) as ChatMessage;
}

export function updateMessageContent(id: number, content: string): void {
  getDb().prepare(`UPDATE messages SET content = ? WHERE id = ?`).run(content, id);
}

export function getMessages(sessionId: string, limit = 200): ChatMessage[] {
  const d = getDb();
  const rows = d.prepare(
    `SELECT * FROM messages WHERE session_id = ? ORDER BY id DESC LIMIT ?`,
  ).all(sessionId, limit) as ChatMessage[];
  return rows.reverse();
}

const APPROX_TOKENS_PER_CHAR = 0.25;
const HISTORY_TOKEN_BUDGET = 6000;

export function getMessagesWithinBudget(sessionId: string): {
  recent: ChatMessage[];
  dropped: ChatMessage[];
} {
  const all = getMessages(sessionId, 500);
  const recent: ChatMessage[] = [];
  let used = 0;
  for (let i = all.length - 1; i >= 0; i--) {
    const m = all[i];
    const cost = Math.ceil(m.content.length * APPROX_TOKENS_PER_CHAR) + 8;
    if (used + cost > HISTORY_TOKEN_BUDGET) break;
    recent.unshift(m);
    used += cost;
  }
  const dropped = all.slice(0, all.length - recent.length);
  return { recent, dropped };
}

export function listSessions(): Session[] {
  const d = getDb();
  return d.prepare(`SELECT * FROM sessions ORDER BY last_active DESC LIMIT 50`).all() as Session[];
}

export function getSessionState(sessionId: string): {
  sticky_mode: Mode;
  turns_since_change: number;
  summary: string;
} {
  const d = getDb();
  ensureSession(sessionId);
  return d.prepare(
    `SELECT sticky_mode, turns_since_change, summary FROM session_state WHERE session_id = ?`,
  ).get(sessionId) as { sticky_mode: Mode; turns_since_change: number; summary: string };
}

export function setSessionMode(sessionId: string, mode: Mode, reset: boolean): void {
  const d = getDb();
  if (reset) {
    d.prepare(
      `UPDATE session_state SET sticky_mode = ?, turns_since_change = 0 WHERE session_id = ?`,
    ).run(mode, sessionId);
  } else {
    d.prepare(
      `UPDATE session_state SET turns_since_change = turns_since_change + 1 WHERE session_id = ?`,
    ).run(sessionId);
  }
}

export function setSessionSummary(sessionId: string, summary: string): void {
  getDb().prepare(`UPDATE session_state SET summary = ? WHERE session_id = ?`).run(summary, sessionId);
}

export function setFact(key: string, value: string, category = "general"): Fact {
  const d = getDb();
  d.prepare(`
    INSERT INTO facts (key, value, category) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      category = excluded.category,
      updated_at = datetime('now')
  `).run(key, value, category);
  return d.prepare(`SELECT * FROM facts WHERE key = ?`).get(key) as Fact;
}

export function deleteFact(key: string): void {
  getDb().prepare(`DELETE FROM facts WHERE key = ?`).run(key);
}

export function listFacts(): Fact[] {
  return getDb().prepare(`SELECT * FROM facts ORDER BY category, key`).all() as Fact[];
}

const FACT_TOKEN_BUDGET = 1200;

export function listFactsWithinBudget(): Fact[] {
  const all = listFacts();
  const out: Fact[] = [];
  let used = 0;
  for (const f of all) {
    const cost = Math.ceil((f.key.length + f.value.length + f.category.length) * APPROX_TOKENS_PER_CHAR) + 4;
    if (used + cost > FACT_TOKEN_BUDGET) break;
    out.push(f);
    used += cost;
  }
  return out;
}
