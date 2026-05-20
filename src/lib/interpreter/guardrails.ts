/**
 * Minimal guardrails for Prestix personal assistant.
 * Inspired by Hermes agent: verify then fix, direct, warm, practical.
 * Non-blocking — violations are logged, not rejected.
 */

export type GuardrailSeverity = "info" | "warn" | "block";

export type GuardrailResult = {
  passed: boolean;
  severity: GuardrailSeverity;
  rule: string;
  message: string;
};

// Minimal rules that don't get in the way
const GUARDRAIL_RULES = [
  {
    id: "no-credentials",
    description: "Never output API keys, passwords, or secrets",
    check: (text: string): boolean => {
      const secretPatterns = [
        /sk-[a-zA-Z0-9]{20,}/, // OpenAI-style keys
        /[a-zA-Z0-9]{32,64}/, // Generic long tokens
        /api[_-]?key[:\s=]+["']?[a-zA-Z0-9]{16,}/i,
        /password[:\s=]+["']?[^\s"']{8,}/i,
      ];
      return !secretPatterns.some((p) => p.test(text));
    },
  },
  {
    id: "no-live-execution",
    description: "Never suggest live trading, order placement, or signed requests",
    check: (text: string): boolean => {
      const forbidden = [
        "place order",
        "execute trade",
        "sign transaction",
        "send funds",
        "live trading",
        "api key",
      ];
      const lower = text.toLowerCase();
      return !forbidden.some((f) => lower.includes(f));
    },
  },
  {
    id: "verify-before-claim",
    description: "Flag uncertain claims instead of bluffing",
    check: (text: string): boolean => {
      // Check for weasel words that indicate bluffing
      const weaselPatterns = [
        /i (definitely|certainly|absolutely) know/i,
        /trust me[,.]/i,
        /i'm (100%|completely) sure/i,
      ];
      return !weaselPatterns.some((p) => p.test(text));
    },
  },
  {
    id: "prefer-action",
    description: "Prefer doing the obvious helpful thing over listing options",
    check: (_text: string): boolean => true, // Informational only — not enforceable
  },
  {
    id: "concise-unless-asked",
    description: "Keep answers concise unless user asks for detail",
    check: (_text: string): boolean => true, // Informational only
  },
];

export function checkGuardrails(text: string): GuardrailResult[] {
  const results: GuardrailResult[] = [];

  for (const rule of GUARDRAIL_RULES) {
    const passed = rule.check(text);
    const severity: GuardrailSeverity =
      rule.id === "no-credentials" || rule.id === "no-live-execution"
        ? "block"
        : "warn";

    results.push({
      passed,
      severity,
      rule: rule.id,
      message: passed
        ? `${rule.id}: OK`
        : `${rule.id}: ${rule.description}`,
    });
  }

  return results;
}

export function formatGuardrailReport(results: GuardrailResult[]): string {
  const failed = results.filter((r) => !r.passed);
  if (failed.length === 0) return "";

  return failed
    .map((r) => `[${r.severity.toUpperCase()}] ${r.rule}: ${r.message}`)
    .join("\n");
}

// Non-blocking wrapper — logs violations but returns text with violations flagged.
// Callers SHOULD check hasBlockingViolations and refuse to surface the output.
export function applyGuardrails(text: string): {
  text: string;
  violations: GuardrailResult[];
  hasBlockingViolations: boolean;
} {
  const results = checkGuardrails(text);
  const violations = results.filter((r) => !r.passed);
  const hasBlockingViolations = violations.some((v) => v.severity === "block");

  if (violations.length > 0) {
    // ⚠️ Blocking violations: credentials, live-execution suggestions.
    // These are logged AND surfaced so the caller can refuse to return the text.
    if (hasBlockingViolations) {
      console.error("[GUARDRAILS] BLOCKING violations detected:", violations);
    } else {
      console.warn("[GUARDRAILS] Violations detected:", violations);
    }
  }

  return {
    text: hasBlockingViolations ? "" : text,  // Clear text when blocking violations found
    violations,
    hasBlockingViolations,
  };
}

/** Convenience: returns safe output or an error string if blocking violations found. */
export function safeOutput(text: string): { ok: true; text: string } | { ok: false; error: string; violations: GuardrailResult[] } {
  const result = applyGuardrails(text);
  if (result.hasBlockingViolations) {
    return {
      ok: false,
      error: `Output blocked: ${result.violations.map(v => v.message).join("; ")}`,
      violations: result.violations,
    };
  }
  return { ok: true, text: result.text };
}
