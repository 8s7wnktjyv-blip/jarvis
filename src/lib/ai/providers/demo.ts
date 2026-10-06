import type { AIProvider, ProviderRequest } from "../types";

/**
 * Demo-Anbieter: funktioniert komplett ohne API-Schlüssel.
 * Er simuliert eine gestreamte Antwort, damit Oberfläche, Streaming und
 * PWA sofort getestet werden können.
 */

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    });
  });

function composeReply(input: string): string {
  const text = input.toLowerCase();

  if (/^(hallo|hi|hey|guten (morgen|tag|abend)|servus|moin)\b/.test(text)) {
    return "Hallo! Schön, von Ihnen zu hören. Ich laufe gerade im **Demo-Modus** – sobald ein KI-Backend angebunden ist, kann ich richtig loslegen.";
  }
  if (["uhr", "zeit", "datum", "spät", "welcher tag"].some((w) => text.includes(w))) {
    const now = new Date().toLocaleString("de-DE", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Europe/Berlin",
    });
    return `Laut meiner Systemuhr ist es ${now}.`;
  }
  if (text.includes("was kannst du") || text.includes("hilfe") || text.includes("funktionen")) {
    return [
      "Aktuell bin ich die Grundversion von J.A.V.I.S.:",
      "",
      "• Chat mit gestreamten Antworten",
      "• Spracheingabe über das Mikrofon (sofern Ihr Browser es unterstützt)",
      "• Sprachausgabe meiner Antworten",
      "• Installierbar als App auf dem iPhone-Home-Bildschirm",
      "",
      "Geplant sind Gedächtnis, Websuche, GitHub-Anbindung und Automationen.",
    ].join("\n");
  }

  return [
    `Verstanden: „${input.trim().slice(0, 140)}“.`,
    "",
    "Ich laufe derzeit im Demo-Modus ohne echte KI. Hinterlegen Sie `ANTHROPIC_API_KEY` als Environment Variable auf dem Server, und ich antworte mit voller Intelligenz.",
  ].join("\n");
}

export const demoProvider: AIProvider = {
  id: "demo",
  label: "Demo-Modus",
  async *streamReply({ messages, signal }: ProviderRequest) {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const reply = composeReply(lastUser?.content ?? "");

    await wait(450, signal);
    // Wortweise ausgeben, um echtes Streaming zu simulieren.
    for (const token of reply.split(/(\s+)/)) {
      if (signal?.aborted) return;
      yield token;
      await wait(18, signal);
    }
  },
};
