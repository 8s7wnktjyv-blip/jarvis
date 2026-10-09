import type { ChatMessage } from "@/lib/ai/types";

/**
 * Browser-Client für die Chat-API.
 * Die Oberfläche spricht nur mit dem eigenen Backend (/api/chat) –
 * nie direkt mit einem KI-Anbieter. So bleiben API-Schlüssel auf dem Server.
 */
/** Fehler aus der Chat-API inklusive HTTP-Status (z. B. 401 = Anmeldung nötig). */
export class ChatError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ChatError";
  }
}

export async function streamChat(
  messages: ChatMessage[],
  { onToken, signal }: { onToken: (text: string) => void; signal?: AbortSignal },
): Promise<void> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
    signal,
  });

  if (!response.ok || !response.body) {
    let message = `Fehler ${response.status}`;
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      /* Antwort war kein JSON */
    }
    throw new ChatError(message, response.status);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    onToken(decoder.decode(value, { stream: true }));
  }
}
