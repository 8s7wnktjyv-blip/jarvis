/**
 * Serverseitiger Zugriff auf Environment Variables.
 *
 * Diese Datei darf NUR in Server-Code (API-Routen, Provider) importiert werden.
 * Geheimnisse werden ausschließlich hier gelesen – niemals hart codiert und
 * niemals mit dem Präfix NEXT_PUBLIC_ versehen.
 */

export type ProviderId = "demo" | "anthropic";

const EFFORT_LEVELS = ["low", "medium", "high", "xhigh", "max"] as const;
export type EffortLevel = (typeof EFFORT_LEVELS)[number];

function read(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export const serverEnv = {
  get anthropicApiKey() {
    return read("ANTHROPIC_API_KEY");
  },
  get model() {
    return read("AI_MODEL") ?? "claude-opus-5-5";
  },
  get effort(): EffortLevel {
    const value = read("AI_EFFORT");
    return EFFORT_LEVELS.includes(value as EffortLevel) ? (value as EffortLevel) : "medium";
  },
  /** Gewählter Anbieter; "auto" nutzt Claude, sobald ein Schlüssel hinterlegt ist. */
  get provider(): ProviderId {
    const value = (read("AI_PROVIDER") ?? "auto").toLowerCase();
    if (value === "demo" || value === "anthropic") return value;
    return this.anthropicApiKey ? "anthropic" : "demo";
  },
};
