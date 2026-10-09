/**
 * Serverseitiger Zugriff auf Environment Variables.
 *
 * Diese Datei darf NUR in Server-Code (API-Routen, Provider) importiert werden.
 * Geheimnisse werden ausschließlich hier gelesen – niemals hart codiert und
 * niemals mit dem Präfix NEXT_PUBLIC_ versehen.
 */

export type ProviderId = "demo" | "groq";

/** Standardmodell im kostenlosen Groq-Plan (siehe README → Quellen). */
export const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";

function read(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export const serverEnv = {
  get groqApiKey() {
    return read("GROQ_API_KEY");
  },
  get groqModel() {
    return read("GROQ_MODEL") ?? DEFAULT_GROQ_MODEL;
  },
  /** Zugangscode für die App; ohne ihn ist der Chat in Produktion gesperrt. */
  get accessCode() {
    return read("APP_ACCESS_CODE");
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
  /** Gewählter Anbieter; "auto" nutzt Groq, sobald ein Schlüssel hinterlegt ist. */
  get provider(): ProviderId {
    const value = (read("AI_PROVIDER") ?? "auto").toLowerCase();
    if (value === "demo" || value === "groq") return value;
    return this.groqApiKey ? "groq" : "demo";
  },
};
