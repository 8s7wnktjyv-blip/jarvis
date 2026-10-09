import { serverEnv } from "@/lib/env";
import { ProviderError, type AIProvider, type ProviderRequest } from "../types";

/**
 * Groq (kostenloser Plan) über die OpenAI-kompatible Chat-Completions-API.
 * Bewusst ohne SDK: ein einfacher fetch-Aufruf mit Server-Sent-Events-Streaming.
 * Der API-Schlüssel kommt ausschließlich aus GROQ_API_KEY und verlässt nie den Server.
 */

export const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const MAX_COMPLETION_TOKENS = 2000;

/** Ab dieser Wartezeit sprechen wir vom Tageslimit statt von einem kurzen Minutenlimit. */
const DAILY_LIMIT_THRESHOLD_SECONDS = 10 * 60;

/** Liest `retry-after` (Sekunden oder HTTP-Datum) und liefert die Wartezeit in Sekunden. */
function parseRetryAfter(value: string | null, now: Date): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);
  const date = Date.parse(value);
  if (Number.isNaN(date)) return null;
  return Math.max(0, Math.ceil((date - now.getTime()) / 1000));
}

/** Freundliche deutsche Meldung, wenn das Groq-Limit erreicht ist. */
export function rateLimitMessage(retryAfter: string | null, now = new Date()): string {
  const waitSeconds = parseRetryAfter(retryAfter, now);

  if (waitSeconds === null) {
    return "Das kostenlose Tageslimit bei Groq ist erreicht. Bitte versuchen Sie es später noch einmal.";
  }

  if (waitSeconds < DAILY_LIMIT_THRESHOLD_SECONDS) {
    const wait =
      waitSeconds < 60 ? `${Math.max(1, waitSeconds)} Sekunden` : `${Math.ceil(waitSeconds / 60)} Minuten`;
    return `Kurz durchatmen: Das kostenlose Minutenlimit bei Groq ist erreicht. In etwa ${wait} geht es weiter.`;
  }

  const resume = new Date(now.getTime() + waitSeconds * 1000);
  const zone = "Europe/Berlin";
  const day = (d: Date) => d.toLocaleDateString("de-DE", { timeZone: zone });
  const time = resume.toLocaleTimeString("de-DE", { timeZone: zone, hour: "2-digit", minute: "2-digit" });
  const when = day(resume) === day(now) ? `heute ab ca. ${time} Uhr` : `morgen ab ca. ${time} Uhr`;
  return `Das kostenlose Tageslimit bei Groq ist erreicht. Weiter geht's ${when}.`;
}

function errorForStatus(response: Response): ProviderError {
  switch (response.status) {
    case 401:
    case 403:
      return new ProviderError("Der hinterlegte Groq-API-Schlüssel ist ungültig.", 502);
    case 404:
      return new ProviderError(
        `Das Modell „${serverEnv.groqModel}“ ist bei Groq nicht verfügbar. Bitte GROQ_MODEL prüfen.`,
        502,
      );
    case 413:
      return new ProviderError("Die Unterhaltung ist zu lang. Bitte ein neues Gespräch beginnen.", 413);
    case 429:
      return new ProviderError(rateLimitMessage(response.headers.get("retry-after")), 429);
    default:
      if (response.status >= 500) {
        return new ProviderError("Groq ist gerade nicht erreichbar. Bitte gleich noch einmal versuchen.", 503);
      }
      return new ProviderError("Die Anfrage wurde von Groq abgelehnt.", 502);
  }
}

interface GroqChunk {
  choices?: { delta?: { content?: string | null } }[];
  error?: { message?: string };
}

export const groqProvider: AIProvider = {
  id: "groq",
  label: "Groq",
  async *streamReply({ system, messages, signal }: ProviderRequest) {
    const apiKey = serverEnv.groqApiKey;
    if (!apiKey) throw new ProviderError("Kein GROQ_API_KEY konfiguriert.", 503);

    const model = serverEnv.groqModel;
    let response: Response;
    try {
      response = await fetch(GROQ_CHAT_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: system }, ...messages],
          stream: true,
          max_completion_tokens: MAX_COMPLETION_TOKENS,
          // gpt-oss denkt vor der Antwort nach; "low" hält Antworten schnell und spart Tokens.
          ...(model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" } : {}),
        }),
        signal,
      });
    } catch (error) {
      if (signal?.aborted) return;
      console.error("[groq] Verbindung fehlgeschlagen:", error instanceof Error ? error.message : error);
      throw new ProviderError("Groq ist gerade nicht erreichbar. Bitte gleich noch einmal versuchen.", 503);
    }

    if (!response.ok || !response.body) {
      const providerError = errorForStatus(response);
      console.error(`[groq] HTTP ${response.status}`);
      throw providerError;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE: jedes Ereignis steht in einer Zeile "data: {...}", Ende mit "data: [DONE]".
        let newline: number;
        while ((newline = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          if (!line.startsWith("data:")) continue;

          const data = line.slice(5).trim();
          if (data === "[DONE]") return;

          let chunk: GroqChunk;
          try {
            chunk = JSON.parse(data) as GroqChunk;
          } catch {
            continue;
          }
          if (chunk.error) {
            console.error("[groq] Fehler im Stream:", chunk.error.message);
            throw new ProviderError("Groq hat die Antwort abgebrochen.", 502);
          }
          const text = chunk.choices?.[0]?.delta?.content;
          if (text) yield text;
        }
      }
    } catch (error) {
      if (signal?.aborted) return;
      if (error instanceof ProviderError) throw error;
      throw new ProviderError("Die Verbindung zu Groq wurde unterbrochen.", 502);
    } finally {
      // Stream schließen, auch wenn der Nutzer die Antwort vorzeitig stoppt.
      await reader.cancel().catch(() => {});
    }
  },
};
