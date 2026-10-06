import Anthropic from "@anthropic-ai/sdk";
import { serverEnv } from "@/lib/env";
import { ProviderError, type AIProvider, type ProviderRequest } from "../types";

/**
 * Claude über die offizielle Anthropic SDK.
 * Der API-Schlüssel kommt ausschließlich aus der Environment Variable
 * ANTHROPIC_API_KEY und verlässt nie den Server.
 */

let client: Anthropic | null = null;

function getClient(): Anthropic {
  const apiKey = serverEnv.anthropicApiKey;
  if (!apiKey) {
    throw new ProviderError("Kein ANTHROPIC_API_KEY konfiguriert.", 503);
  }
  client ??= new Anthropic({ apiKey });
  return client;
}

function toProviderError(error: unknown): ProviderError {
  if (error instanceof Anthropic.AuthenticationError) {
    return new ProviderError("Der hinterlegte API-Schlüssel ist ungültig.", 502);
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new ProviderError("Zu viele Anfragen – bitte gleich noch einmal versuchen.", 429);
  }
  if (error instanceof Anthropic.BadRequestError) {
    return new ProviderError("Die Anfrage wurde vom KI-Dienst abgelehnt.", 400);
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return new ProviderError("Der KI-Dienst ist gerade nicht erreichbar.", 503);
  }
  if (error instanceof Anthropic.APIError) {
    return new ProviderError("Der KI-Dienst hat einen Fehler gemeldet.", 502);
  }
  return new ProviderError("Unbekannter Fehler beim KI-Dienst.", 500);
}

export const anthropicProvider: AIProvider = {
  id: "anthropic",
  label: "Claude",
  async *streamReply({ system, messages, signal }: ProviderRequest) {
    try {
      const stream = getClient().beta.messages.stream(
        {
          model: serverEnv.model,
          max_tokens: 16000,
          system,
          messages,
          output_config: { effort: serverEnv.effort },
          // Lehnt das Modell eine Anfrage aus Sicherheitsgründen ab, springt
          // serverseitig automatisch ein passendes Ersatzmodell ein.
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
        },
        { signal },
      );

      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          yield event.delta.text;
        }
      }

      const final = await stream.finalMessage();
      if (final.stop_reason === "refusal") {
        yield "\n\n_Diese Anfrage kann ich leider nicht beantworten._";
      } else if (final.stop_reason === "max_tokens") {
        yield "\n\n_(Antwort wurde wegen Längenbegrenzung gekürzt.)_";
      }
    } catch (error) {
      if (signal?.aborted) return;
      if (error instanceof ProviderError) throw error;
      console.error("[anthropic] Anfrage fehlgeschlagen:", error);
      throw toProviderError(error);
    }
  },
};
