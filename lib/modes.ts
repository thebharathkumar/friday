import type { Mode } from "./types";

interface DetectInput {
  text: string;
  hour: number;
  stickyMode?: Mode;
  turnsSinceModeChange?: number;
}

interface DetectResult {
  mode: Mode;
  sticky: boolean;
}

const CRISIS_PATTERNS = [
  /\b(emergency|help me|i('|')?m hurt|bleeding|crash(ed|ing)?|on fire|break[- ]?in|intruder|overdose|chest pain|can('|')?t breathe)\b/i,
  /\b(911|999|112)\b/,
];

const TACTICAL_PATTERNS = [
  /\b(right now|immediately|asap|urgent|time[- ]?critical|deadline in (minutes|an hour))\b/i,
  /\b(pull over|stop the (car|bleeding)|lock the (door|file)|kill the (process|server))\b/i,
];

const WAR_ROOM_PATTERNS = [
  /\b(production (is )?down|outage|breach|leaked|exposed|sev[ -]?(0|1|one|zero))\b/i,
  /\b(board (call|meeting)|term sheet|acquisition|negotiation|counter[- ]?offer)\b/i,
];

const RECOVERY_PATTERNS = [
  /\b(exhausted|burned? ?out|wrecked|drained|haven('|')?t slept|sick|fever|migraine|headache|hangover)\b/i,
  /\b(rough (day|night|week)|just had a (long|terrible) day)\b/i,
];

const COUNSEL_PATTERNS = [
  /\b(should i|am i wrong|honest take|tell me the truth|gut check|second opinion|talk me through)\b/i,
  /\b(relationship|breakup|argument with|dad|mom|partner|wife|husband|kid|friend (problem|thing))\b/i,
];

const WORKSHOP_PATTERNS = [
  /\b(refactor|architecture|design (the|a) (system|api|schema)|debug|stack trace|code review)\b/i,
  /```/,
  /\b(typescript|python|rust|sql|kubernetes|docker|nextjs|react)\b/i,
];

const DEEP_WORK_PATTERNS = [
  /\b(don('|')?t interrupt|heads down|quiet hours|focus block|do not disturb|dnd)\b/i,
];

const PATTERN_TABLE: { mode: Mode; patterns: RegExp[] }[] = [
  { mode: "crisis", patterns: CRISIS_PATTERNS },
  { mode: "tactical", patterns: TACTICAL_PATTERNS },
  { mode: "war_room", patterns: WAR_ROOM_PATTERNS },
  { mode: "recovery", patterns: RECOVERY_PATTERNS },
  { mode: "deep_work", patterns: DEEP_WORK_PATTERNS },
  { mode: "counsel", patterns: COUNSEL_PATTERNS },
  { mode: "workshop", patterns: WORKSHOP_PATTERNS },
];

const STICKY_TURNS: Record<Mode, number> = {
  crisis: 6,
  tactical: 4,
  war_room: 5,
  recovery: 6,
  counsel: 4,
  workshop: 3,
  deep_work: 8,
  standard: 0,
};

export function detectMode(input: DetectInput, prior: Mode): DetectResult {
  for (const { mode, patterns } of PATTERN_TABLE) {
    if (patterns.some(p => p.test(input.text))) {
      return { mode, sticky: false };
    }
  }

  const sticky = input.stickyMode ?? prior;
  const turns = input.turnsSinceModeChange ?? 0;
  if (sticky !== "standard" && turns < STICKY_TURNS[sticky]) {
    return { mode: sticky, sticky: true };
  }
  return { mode: "standard", sticky: false };
}

export function modeLabel(mode: Mode): string {
  return {
    standard: "STANDARD",
    deep_work: "DEEP WORK",
    war_room: "WAR ROOM",
    recovery: "RECOVERY",
    tactical: "TACTICAL",
    workshop: "WORKSHOP",
    counsel: "COUNSEL",
    crisis: "CRISIS",
  }[mode];
}

export function modeColor(mode: Mode): string {
  return {
    standard: "text-nox-accent",
    deep_work: "text-nox-dim",
    war_room: "text-nox-warn",
    recovery: "text-nox-ok",
    tactical: "text-nox-warn",
    workshop: "text-nox-accent",
    counsel: "text-nox-ok",
    crisis: "text-nox-alert",
  }[mode];
}
