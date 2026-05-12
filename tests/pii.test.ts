import { describe, expect, it } from "vitest";
import { checkFactSafety } from "@/lib/pii";

describe("checkFactSafety", () => {
  it("accepts ordinary values", () => {
    expect(checkFactSafety("Marcus, head of design").ok).toBe(true);
    expect(checkFactSafety("prefers tea, no sugar").ok).toBe(true);
  });

  it("blocks AWS access keys", () => {
    expect(checkFactSafety("AKIAIOSFODNN7EXAMPLE").ok).toBe(false);
  });

  it("blocks GitHub tokens", () => {
    expect(checkFactSafety("ghp_abcdefghijklmnopqrstuvwxyz0123").ok).toBe(false);
  });

  it("blocks OpenAI and Anthropic keys", () => {
    expect(checkFactSafety("sk-abcdefghijklmnopqrstuvwxyz").ok).toBe(false);
    expect(checkFactSafety("sk-ant-abcdefghijklmnopqrstuvwxyz").ok).toBe(false);
  });

  it("blocks private key blocks", () => {
    expect(checkFactSafety("-----BEGIN RSA PRIVATE KEY-----\nfoo").ok).toBe(false);
  });

  it("blocks SSN format", () => {
    expect(checkFactSafety("ssn 123-45-6789").ok).toBe(false);
  });
});
