export type Mode =
  | "standard"
  | "deep_work"
  | "war_room"
  | "recovery"
  | "tactical"
  | "workshop"
  | "counsel"
  | "crisis";

export type Role = "user" | "assistant" | "system";

export interface ChatMessage {
  id: number;
  session_id: string;
  role: Role;
  content: string;
  mode: Mode;
  created_at: string;
}

export interface Fact {
  id: number;
  key: string;
  value: string;
  category: string;
  updated_at: string;
}

export interface Session {
  id: string;
  title: string;
  created_at: string;
  last_active: string;
}

export const ALL_MODES: Mode[] = [
  "standard",
  "deep_work",
  "war_room",
  "recovery",
  "tactical",
  "workshop",
  "counsel",
  "crisis",
];
