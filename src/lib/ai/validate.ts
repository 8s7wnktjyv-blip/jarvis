import type { ChatMessage } from "./types";

const MAX_MESSAGES = 40;
const MAX_CHARS_PER_MESSAGE = 8000;

/** Prüft den Request-Body und gibt eine bereinigte Nachrichtenliste zurück. */
export function parseMessages(body: unknown): ChatMessage[] | null {
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
