interface PiiCheck {
  ok: boolean;
  reason?: string;
}

const PATTERNS: { name: string; re: RegExp }[] = [
  { name: "AWS access key", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "AWS secret", re: /\b[A-Za-z0-9/+=]{40}\b/ },
  { name: "GitHub token", re: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/ },
  { name: "OpenAI key", re: /\bsk-[A-Za-z0-9]{20,}\b/ },
  { name: "Anthropic key", re: /\bsk-ant-[A-Za-z0-9-_]{20,}\b/ },
  { name: "Slack token", re: /\bxox[bpoa]-[A-Za-z0-9-]{10,}\b/ },
  { name: "Google API key", re: /\bAIza[0-9A-Za-z-_]{35}\b/ },
  { name: "private key", re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/ },
  { name: "JWT", re: /\beyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\b/ },
  { name: "credit card", re: /\b(?:\d[ -]*?){13,16}\b/ },
  { name: "SSN", re: /\b\d{3}-\d{2}-\d{4}\b/ },
];

export function checkFactSafety(value: string): PiiCheck {
  for (const { name, re } of PATTERNS) {
    if (re.test(value)) return { ok: false, reason: `Looks like ${name}. Memory is injected into every prompt.` };
  }
  return { ok: true };
}
