import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { ChatMessage, Fact, Mode, Role, Session } from "./types";

const DATA_DIR = process.env.NOX_DATA_DIR ?? join(process.cwd(), "data");
mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = join(DATA_DIR, "nox.db");

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
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
  `);
  return db;
}

export function ensureSession(id: string, title = "untitled"): Session {
  const d = getDb();
  d.prepare(`INSERT OR IGNORE INTO sessions (id, title) VALUES (?, ?)`).run(id, title);
  d.prepare(`UPDATE sessions SET last_active = datetime('now') WHERE id = ?`).run(id);
  return d.prepare(`SELECT * FROM sessions WHERE id = ?`).get(id) as Session;
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

export function getMessages(sessionId: string, limit = 40): ChatMessage[] {
  const d = getDb();
  const rows = d.prepare(
    `SELECT * FROM messages WHERE session_id = ? ORDER BY id DESC LIMIT ?`,
  ).all(sessionId, limit) as ChatMessage[];
  return rows.reverse();
}

export function listSessions(): Session[] {
  const d = getDb();
  return d.prepare(`SELECT * FROM sessions ORDER BY last_active DESC LIMIT 50`).all() as Session[];
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
