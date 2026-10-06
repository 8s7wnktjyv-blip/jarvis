/**
 * Anbieter-unabhängige Typen für den Chat.
 * Frontend und Backend sprechen nur über diese Strukturen miteinander –
 * so lässt sich der KI-Anbieter austauschen, ohne die Oberfläche anzufassen.
 */

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

/** Body von POST /api/chat */
export interface ChatRequestBody {
  messages: ChatMessage[];
}

export interface ProviderRequest {
  system: string;
  messages: ChatMessage[];
  signal?: AbortSignal;
}

/**
 * Ein KI-Anbieter liefert die Antwort als Strom von Text-Stücken.
 * Neue Anbieter (andere Modelle, lokale LLMs, …) implementieren nur dieses Interface
 * und werden in `providers/index.ts` registriert.
 */
export interface AIProvider {
  readonly id: string;
  readonly label: string;
  streamReply(request: ProviderRequest): AsyncIterable<string>;
}

/** Fehler, die dem Nutzer mit passendem HTTP-Status angezeigt werden dürfen. */
export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status: number = 500,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
