import { beforeEach, describe, expect, it, vi } from "vitest";
import { GROQ_CHAT_URL, groqProvider, rateLimitMessage } from "@/lib/ai/providers/groq";
import { ProviderError } from "@/lib/ai/types";
import { TEST_GROQ_KEY } from "./helpers";

const request = { system: "System", messages: [{ role: "user" as const, content: "Hallo" }] };

async function collect() {
  let text = "";
  for await (const chunk of groqProvider.streamReply(request)) text += chunk;
  return text;
}

async function expectProviderError(status: number) {
  const error = await collect().then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ProviderError);
  expect((error as ProviderError).status).toBe(status);
  return error as ProviderError;
}

function sseResponse(events: string[]) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      // absichtlich zerstückelt, um das Zeilen-Puffern zu prüfen
      const raw = events.map((e) => `data: ${e}\n\n`).join("");
      for (let i = 0; i < raw.length; i += 7) controller.enqueue(encoder.encode(raw.slice(i, i + 7)));
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

const delta = (content: string) => JSON.stringify({ choices: [{ delta: { content } }] });

beforeEach(() => {
  vi.stubEnv("GROQ_API_KEY", TEST_GROQ_KEY);
  vi.stubEnv("GROQ_MODEL", "");
});

describe("Groq-Provider", () => {
  it("streamt Text und sendet die richtige Anfrage", async () => {
    const fetchMock = vi.fn(async () =>
      sseResponse([delta("Guten "), JSON.stringify({ choices: [{ delta: { reasoning: "intern" } }] }), delta("Tag!"), "[DONE]"]),
    );
    vi.stubGlobal("fetch", fetchMock);

    expect(await collect()).toBe("Guten Tag!");

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(GROQ_CHAT_URL);
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TEST_GROQ_KEY}`);
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      model: "openai/gpt-oss-120b",
      stream: true,
      max_completion_tokens: 2000,
      reasoning_effort: "low",
    });
    expect(body.messages[0]).toEqual({ role: "system", content: "System" });
  });

  it("ohne Schlüssel → 503", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubGlobal("fetch", vi.fn());
    await expectProviderError(503);
  });

  it("ungültiger Schlüssel (401) → verständliche Meldung", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response('{"error":{"message":"Invalid API Key"}}', { status: 401 })));
    const error = await expectProviderError(502);
    expect(error.message).toBe("Der hinterlegte Groq-API-Schlüssel ist ungültig.");
  });

  it("Tageslimit (429 mit langer Wartezeit) → Meldung mit Uhrzeit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 429, headers: { "retry-after": "7200" } })),
    );
    const error = await expectProviderError(429);
    expect(error.message).toMatch(/Tageslimit bei Groq ist erreicht\. Weiter geht's (heute|morgen) ab ca\. \d\d:\d\d Uhr\./);
  });

  it("Serverfehler (503) → Groq nicht erreichbar", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 503 })));
    const error = await expectProviderError(503);
    expect(error.message).toContain("Groq ist gerade nicht erreichbar");
  });

  it("unbekanntes Modell (404) → Hinweis auf GROQ_MODEL", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 404 })));
    const error = await expectProviderError(502);
    expect(error.message).toContain("GROQ_MODEL");
  });

  it("Netzwerkfehler → 503", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );
    await expectProviderError(503);
  });

  it("Fehler mitten im Stream → 502", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => sseResponse([delta("Teil"), JSON.stringify({ error: { message: "boom" } })])));
    await expectProviderError(502);
  });

  it("andere Modelle bekommen kein reasoning_effort", async () => {
    vi.stubEnv("GROQ_MODEL", "anderes/modell");
    const fetchMock = vi.fn(async () => sseResponse(["[DONE]"]));
    vi.stubGlobal("fetch", fetchMock);
    await collect();
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).not.toHaveProperty("reasoning_effort");
  });
});

describe("rateLimitMessage", () => {
  // 9. Oktober 2026, 10:00 Uhr in Berlin (MESZ = UTC+2)
  const now = new Date("2026-10-09T08:00:00Z");

  it("kurze Wartezeit → Minutenlimit in Sekunden", () => {
    expect(rateLimitMessage("20", now)).toBe(
      "Kurz durchatmen: Das kostenlose Minutenlimit bei Groq ist erreicht. In etwa 20 Sekunden geht es weiter.",
    );
  });

  it("mittlere Wartezeit → Minuten", () => {
    expect(rateLimitMessage("150", now)).toContain("In etwa 3 Minuten");
  });

  it("lange Wartezeit am selben Tag → heute mit Uhrzeit", () => {
    expect(rateLimitMessage(String(3 * 3600), now)).toBe(
      "Das kostenlose Tageslimit bei Groq ist erreicht. Weiter geht's heute ab ca. 13:00 Uhr.",
    );
  });

  it("Wartezeit über Mitternacht → morgen", () => {
    expect(rateLimitMessage(String(16 * 3600), now)).toBe(
      "Das kostenlose Tageslimit bei Groq ist erreicht. Weiter geht's morgen ab ca. 02:00 Uhr.",
    );
  });

  it("ohne Retry-After → allgemeine Tageslimit-Meldung", () => {
    expect(rateLimitMessage(null, now)).toBe(
      "Das kostenlose Tageslimit bei Groq ist erreicht. Bitte versuchen Sie es später noch einmal.",
    );
  });
});
