import { describe, expect, it, vi } from "vitest";
import { getActiveProvider } from "@/lib/ai/providers";
import { DEFAULT_GROQ_MODEL, serverEnv } from "@/lib/env";
import { TEST_GROQ_KEY } from "./helpers";

describe("Provider-Auswahl", () => {
  it("auto ohne GROQ_API_KEY → Demo", () => {
    vi.stubEnv("AI_PROVIDER", "auto");
    vi.stubEnv("GROQ_API_KEY", "");
    expect(getActiveProvider().id).toBe("demo");
  });

  it("auto mit GROQ_API_KEY → Groq", () => {
    vi.stubEnv("AI_PROVIDER", "auto");
    vi.stubEnv("GROQ_API_KEY", TEST_GROQ_KEY);
    expect(getActiveProvider().id).toBe("groq");
  });

  it("ohne AI_PROVIDER verhält es sich wie auto", () => {
    vi.stubEnv("AI_PROVIDER", "");
    vi.stubEnv("GROQ_API_KEY", TEST_GROQ_KEY);
    expect(getActiveProvider().id).toBe("groq");
  });

  it("AI_PROVIDER=demo erzwingt Demo, auch mit Schlüssel", () => {
    vi.stubEnv("AI_PROVIDER", "demo");
    vi.stubEnv("GROQ_API_KEY", TEST_GROQ_KEY);
    expect(getActiveProvider().id).toBe("demo");
  });

  it("unbekannter Wert fällt auf auto zurück", () => {
    vi.stubEnv("AI_PROVIDER", "anthropic");
    vi.stubEnv("GROQ_API_KEY", "");
    expect(getActiveProvider().id).toBe("demo");
  });

  it("Standardmodell ist openai/gpt-oss-120b, GROQ_MODEL überschreibt es", () => {
    vi.stubEnv("GROQ_MODEL", "");
    expect(serverEnv.groqModel).toBe(DEFAULT_GROQ_MODEL);
    expect(DEFAULT_GROQ_MODEL).toBe("openai/gpt-oss-120b");
    vi.stubEnv("GROQ_MODEL", "anderes/modell");
    expect(serverEnv.groqModel).toBe("anderes/modell");
  });
});
