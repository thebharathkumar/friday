import { describe, expect, it } from "vitest";
import { detectMode } from "@/lib/modes";
import type { Mode } from "@/lib/types";

function detect(text: string, prior: Mode = "standard", sticky: Mode = "standard", turns = 0) {
  return detectMode(
    { text, hour: 12, stickyMode: sticky, turnsSinceModeChange: turns },
    prior,
  );
}

describe("detectMode: crisis triggers", () => {
  it.each([
    "help me i'm bleeding",
    "I think there's an intruder",
    "call 911 now",
    "chest pain since this morning",
    "I can't breathe",
  ])("detects crisis on %s", (text) => {
    expect(detect(text).mode).toBe("crisis");
  });
});

describe("detectMode: tactical triggers", () => {
  it("detects tactical on urgent verbs", () => {
    expect(detect("pull over and stop the car").mode).toBe("tactical");
    expect(detect("we need this done ASAP").mode).toBe("tactical");
    expect(detect("lock the door").mode).toBe("tactical");
  });
});

describe("detectMode: war_room triggers", () => {
  it("detects war_room on outage and deal language", () => {
    expect(detect("production is down").mode).toBe("war_room");
    expect(detect("we have a sev-0 breach").mode).toBe("war_room");
    expect(detect("review the term sheet before the board call").mode).toBe("war_room");
  });
});

describe("detectMode: recovery triggers", () => {
  it("detects recovery on depletion language", () => {
    expect(detect("I'm exhausted and haven't slept").mode).toBe("recovery");
    expect(detect("rough day, I have a migraine").mode).toBe("recovery");
  });
});

describe("detectMode: workshop triggers", () => {
  it("detects workshop on engineering language", () => {
    expect(detect("refactor this typescript module").mode).toBe("workshop");
    expect(detect("here's the stack trace").mode).toBe("workshop");
    expect(detect("```ts\nfoo();\n```").mode).toBe("workshop");
  });
});

describe("detectMode: counsel triggers", () => {
  it("detects counsel on personal-question language", () => {
    expect(detect("should I take the offer").mode).toBe("counsel");
    expect(detect("honest take on this please").mode).toBe("counsel");
    expect(detect("had an argument with my partner").mode).toBe("counsel");
  });
});

describe("detectMode: deep_work triggers", () => {
  it("detects deep_work on focus language", () => {
    expect(detect("heads down for the next two hours").mode).toBe("deep_work");
    expect(detect("DND please").mode).toBe("deep_work");
  });
});

describe("detectMode: stickiness", () => {
  it("stays in war_room for a few neutral follow-ups", () => {
    const r = detect("what about the indemnity clause", "war_room", "war_room", 1);
    expect(r.mode).toBe("war_room");
    expect(r.sticky).toBe(true);
  });

  it("decays to standard after sticky window expires", () => {
    const r = detect("what about the indemnity clause", "war_room", "war_room", 99);
    expect(r.mode).toBe("standard");
  });

  it("does not stick on standard", () => {
    const r = detect("just chatting", "standard", "standard", 0);
    expect(r.mode).toBe("standard");
    expect(r.sticky).toBe(false);
  });
});

describe("detectMode: priority ordering", () => {
  it("crisis beats workshop", () => {
    expect(detect("help me i'm bleeding and the typescript build is broken").mode).toBe("crisis");
  });
  it("tactical beats counsel", () => {
    expect(detect("should I lock the door right now").mode).toBe("tactical");
  });
});
