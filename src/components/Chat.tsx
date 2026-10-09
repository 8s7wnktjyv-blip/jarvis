"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { assistant } from "@/config/assistant";
import { streamChat } from "@/lib/chat-client";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { ArcReactor, type ReactorState } from "./ArcReactor";
import { Composer } from "./Composer";
import { PlusIcon, SpeakerIcon } from "./Icons";
import { InstallHint } from "./InstallHint";
import { MessageBubble, type UiMessage } from "./MessageBubble";

const STORAGE_KEY = "james.conversation.v1";
const VOICE_KEY = "james.voiceOutput";

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function loadConversation(): UiMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as UiMessage[]) : [];
    return Array.isArray(parsed) ? parsed.filter((m) => m && typeof m.content === "string") : [];
  } catch {
    return [];
  }
}

export function Chat() {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [voiceOutput, setVoiceOutput] = useState(false);
  const [providerLabel, setProviderLabel] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const tts = useSpeechSynthesis(assistant.language);

  // Verlauf und Einstellungen aus dem lokalen Speicher laden.
  useEffect(() => {
    setMessages(loadConversation());
    try {
      setVoiceOutput(localStorage.getItem(VOICE_KEY) === "1");
    } catch {
      /* ignorieren */
    }
    setHydrated(true);

    fetch("/api/health")
      .then((r) => r.json())
      .then((data: { provider?: { label?: string } }) => setProviderLabel(data.provider?.label ?? null))
      .catch(() => setProviderLabel("Offline"));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.filter((m) => !m.error).slice(-100)));
    } catch {
      /* Speicher voll oder gesperrt */
    }
  }, [messages, hydrated]);

  // Automatisch nach unten scrollen, wenn neue Inhalte kommen.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: busy ? "auto" : "smooth" });
  }, [messages, busy]);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || busy) return;

      tts.cancel();
      const userMessage: UiMessage = { id: createId(), role: "user", content };
      const replyId = createId();
      const history = [...messagesRef.current.filter((m) => !m.error), userMessage];

      setMessages([...history, { id: replyId, role: "assistant", content: "" }]);
      setInput("");
      setBusy(true);
      setStreamingId(replyId);

      const controller = new AbortController();
      abortRef.current = controller;
      let reply = "";

      try {
        await streamChat(
          history.map(({ role, content }) => ({ role, content })),
          {
            signal: controller.signal,
            onToken: (token) => {
              reply += token;
              setMessages((prev) => prev.map((m) => (m.id === replyId ? { ...m, content: reply } : m)));
            },
          },
        );
        if (voiceOutput && reply) tts.speak(reply);
      } catch (error) {
        if (controller.signal.aborted) {
          if (!reply) setMessages((prev) => prev.filter((m) => m.id !== replyId));
        } else {
          const message = error instanceof Error ? error.message : "Unbekannter Fehler.";
          setMessages((prev) =>
            prev.map((m) =>
              m.id === replyId ? { ...m, content: `Systemfehler: ${message}`, error: true } : m,
            ),
          );
        }
      } finally {
        abortRef.current = null;
        setBusy(false);
        setStreamingId(null);
      }
    },
    [busy, tts, voiceOutput],
  );

  const voice = useSpeechRecognition({
    lang: assistant.language,
    onFinalTranscript: (text) => void send(text),
  });

  const stop = () => abortRef.current?.abort();

  const newConversation = () => {
    stop();
    tts.cancel();
    setMessages([]);
  };

  const toggleVoiceOutput = () => {
    const next = !voiceOutput;
    setVoiceOutput(next);
    if (!next) tts.cancel();
    try {
      localStorage.setItem(VOICE_KEY, next ? "1" : "0");
    } catch {
      /* ignorieren */
    }
  };

  const reactorState: ReactorState = voice.listening
    ? "listening"
    : busy
      ? streamingId && messages.find((m) => m.id === streamingId)?.content
        ? "speaking"
        : "thinking"
      : tts.speaking
        ? "speaking"
        : "idle";

  const statusText = {
    idle: "Bereit",
    listening: "Höre zu …",
    thinking: "Analysiere …",
    speaking: "Antworte …",
  }[reactorState];

  const empty = hydrated && messages.length === 0;

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__brand">
          <ArcReactor state={reactorState} size={38} />
          <div>
            <h1 className="topbar__title">{assistant.name}</h1>
            <p className="topbar__status">
              <span className={`dot dot--${reactorState}`} />
              {statusText}
              {providerLabel && <span className="topbar__provider"> · {providerLabel}</span>}
            </p>
          </div>
        </div>
        <div className="topbar__actions">
          {tts.supported && (
            <button
              type="button"
              className={`icon-btn ${voiceOutput ? "icon-btn--on" : ""}`}
              onClick={toggleVoiceOutput}
              aria-label={voiceOutput ? "Sprachausgabe ausschalten" : "Sprachausgabe einschalten"}
              aria-pressed={voiceOutput}
            >
              <SpeakerIcon muted={!voiceOutput} />
            </button>
          )}
          <button type="button" className="icon-btn" onClick={newConversation} aria-label="Neues Gespräch">
            <PlusIcon />
          </button>
        </div>
      </header>

      <main className="conversation" ref={scrollRef} aria-live="polite">
        {empty ? (
          <section className="welcome">
            <ArcReactor state={reactorState} size={168} />
            <p className="welcome__eyebrow">{assistant.tagline}</p>
            <h2 className="welcome__title">{assistant.greeting}</h2>
            <div className="suggestions">
              {assistant.suggestions.map((s) => (
                <button key={s} type="button" className="chip" onClick={() => void send(s)}>
                  {s}
                </button>
              ))}
            </div>
            <InstallHint />
          </section>
        ) : (
          <div className="messages">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} streaming={m.id === streamingId} />
            ))}
          </div>
        )}
      </main>

      <footer className="dock">
        {voice.error && <p className="dock__error">{voice.error}</p>}
        <Composer
          value={input}
          onChange={setInput}
          onSubmit={() => void send(input)}
          onStop={stop}
          busy={busy}
          voice={voice}
        />
      </footer>
    </div>
  );
}
