import { assistant } from "@/config/assistant";
import { getActiveProvider } from "@/lib/ai/providers";
import { ProviderError, type ChatMessage } from "@/lib/ai/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MESSAGES = 40;
const MAX_CHARS_PER_MESSAGE = 8000;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

/** Prüft den Request-Body und gibt eine bereinigte Nachrichtenliste zurück. */
function parseMessages(body: unknown): ChatMessage[] | null {
  if (!body || typeof body !== "object" || !Array.isArray((body as { messages?: unknown }).messages)) {
    return null;
  }
  const raw = (body as { messages: unknown[] }).messages;
  const messages: ChatMessage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const { role, content } = item as Record<string, unknown>;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
    const trimmed = content.trim();
    if (!trimmed) continue;
    messages.push({ role, content: trimmed.slice(0, MAX_CHARS_PER_MESSAGE) });
  }

  // Nur die jüngsten Nachrichten senden; der Verlauf muss mit "user" beginnen und enden.
  const recent = messages.slice(-MAX_MESSAGES);
  while (recent.length && recent[0].role !== "user") recent.shift();
  if (!recent.length || recent[recent.length - 1].role !== "user") return null;
  return recent;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Ungültiges JSON.", 400);
  }

  const messages = parseMessages(body);
  if (!messages) {
    return jsonError("Ungültige Nachrichtenliste.", 400);
  }

  const provider = getActiveProvider();
  const iterator = provider
    .streamReply({ system: assistant.systemPrompt, messages, signal: request.signal })
    [Symbol.asyncIterator]();

  // Erstes Stück vorab holen: Fehler wie ungültiger Schlüssel oder Rate-Limit
  // kommen so als sauberer HTTP-Status beim Client an statt mitten im Stream.
  let first: IteratorResult<string>;
  try {
    first = await iterator.next();
  } catch (error) {
    const status = error instanceof ProviderError ? error.status : 500;
    const message = error instanceof ProviderError ? error.message : "Interner Fehler.";
    return jsonError(message, status);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        if (!first.done) controller.enqueue(encoder.encode(first.value));
        for (let next = await iterator.next(); !next.done; next = await iterator.next()) {
          controller.enqueue(encoder.encode(next.value));
        }
      } catch (error) {
        console.error("[chat] Stream abgebrochen:", error);
        controller.enqueue(encoder.encode("\n\n_Verbindung zum KI-Dienst unterbrochen._"));
      } finally {
        controller.close();
      }
    },
    async cancel() {
      await iterator.return?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Assistant-Provider": provider.id,
    },
  });
}
