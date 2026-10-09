import { describe, expect, it } from "vitest";
import { parseMessages } from "@/lib/ai/validate";

describe("parseMessages", () => {
  it("akzeptiert einen gültigen Verlauf und trimmt Inhalte", () => {
    expect(
      parseMessages({
        messages: [
          { role: "user", content: "  Hallo " },
          { role: "assistant", content: "Hi" },
          { role: "user", content: "Wie geht's?" },
        ],
      }),
    ).toEqual([
      { role: "user", content: "Hallo" },
      { role: "assistant", content: "Hi" },
      { role: "user", content: "Wie geht's?" },
    ]);
  });

  it.each([
    ["kein Objekt", null],
    ["ohne messages", {}],
    ["messages kein Array", { messages: "Hallo" }],
    ["leere Liste", { messages: [] }],
    ["unbekannte Rolle", { messages: [{ role: "system", content: "x" }] }],
    ["Inhalt kein String", { messages: [{ role: "user", content: 42 }] }],
    ["endet mit assistant", { messages: [{ role: "user", content: "a" }, { role: "assistant", content: "b" }] }],
    ["nur leere Inhalte", { messages: [{ role: "user", content: "   " }] }],
  ])("lehnt ab: %s", (_name, body) => {
    expect(parseMessages(body)).toBeNull();
  });

  it("entfernt führende assistant-Nachrichten und kürzt lange Inhalte", () => {
    const result = parseMessages({
      messages: [
        { role: "assistant", content: "Begrüßung" },
        { role: "user", content: "x".repeat(10_000) },
      ],
    });
    expect(result).toHaveLength(1);
    expect(result?.[0].content).toHaveLength(8000);
  });

  it("sendet höchstens die letzten 40 Nachrichten", () => {
    const messages = Array.from({ length: 51 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `Nachricht ${i}`,
    }));
    const result = parseMessages({ messages });
    expect(result?.length).toBeLessThanOrEqual(40);
    expect(result?.[0].role).toBe("user");
    expect(result?.at(-1)?.content).toBe("Nachricht 50");
  });
});
