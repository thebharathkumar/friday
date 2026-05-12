import type { Mode } from "./types";

interface DetectInput {
  text: string;
  hour: number;
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

export function detectMode(input: DetectInput, prior: Mode): Mode {
  const t = input.text;

  for (const p of CRISIS_PATTERNS) if (p.test(t)) return "crisis";
  for (const p of TACTICAL_PATTERNS) if (p.test(t)) return "tactical";
  for (const p of WAR_ROOM_PATTERNS) if (p.test(t)) return "war_room";
  for (const p of RECOVERY_PATTERNS) if (p.test(t)) return "recovery";
  for (const p of DEEP_WORK_PATTERNS) if (p.test(t)) return "deep_work";
  for (const p of COUNSEL_PATTERNS) if (p.test(t)) return "counsel";
  for (const p of WORKSHOP_PATTERNS) if (p.test(t)) return "workshop";

  if (prior === "crisis" || prior === "war_room" || prior === "tactical") {
    return "standard";
  }
  return prior;
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
