import { assistant } from "@/config/assistant";
import { getActiveProvider } from "@/lib/ai/providers";
import { ProviderError } from "@/lib/ai/types";
import { parseMessages } from "@/lib/ai/validate";
import { checkAccess } from "@/lib/auth/session";
import { chatLimiter, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const access = checkAccess(request);
  if (!access.ok) {
    return jsonError(access.error, access.status);
  }

  const limit = chatLimiter.check(clientKey(request));
  if (!limit.allowed) {
    return Response.json(
      { error: `Zu viele Anfragen. Bitte in ${limit.retryAfterSeconds} Sekunden erneut versuchen.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

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
