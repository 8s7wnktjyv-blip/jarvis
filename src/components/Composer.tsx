"use client";

import { useEffect, useRef, type FormEvent, type KeyboardEvent } from "react";
import { assistant } from "@/config/assistant";
import { MicIcon, SendIcon, StopIcon } from "./Icons";

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  busy: boolean;
  voice: {
    supported: boolean;
    listening: boolean;
    interim: string;
    start: () => void;
    stop: () => void;
  };
}

export function Composer({ value, onChange, onSubmit, onStop, busy, voice }: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const shown = voice.listening ? voice.interim : value;

  // Höhe automatisch an den Inhalt anpassen (max. ~6 Zeilen).
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [shown]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (busy) onStop();
    else onSubmit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Desktop: Enter sendet, Shift+Enter = neue Zeile. Touch-Geräte nutzen den Senden-Button.
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (event.key === "Enter" && !event.shiftKey && !isTouch && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (!busy) onSubmit();
    }
  };

  const canSend = value.trim().length > 0;

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <div className={`composer__field ${voice.listening ? "composer__field--listening" : ""}`}>
        {voice.supported && (
          <button
            type="button"
            className={`icon-btn mic-btn ${voice.listening ? "mic-btn--active" : ""}`}
            onClick={voice.listening ? voice.stop : voice.start}
            disabled={busy}
            aria-label={voice.listening ? "Spracheingabe beenden" : "Spracheingabe starten"}
            aria-pressed={voice.listening}
          >
            <MicIcon />
          </button>
        )}
        <textarea
          ref={textareaRef}
          className="composer__input"
          rows={1}
          value={shown}
          placeholder={voice.listening ? "Ich höre zu …" : `Nachricht an ${assistant.name}`}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          readOnly={voice.listening}
          enterKeyHint="send"
          aria-label="Nachricht"
        />
        <button
          type="submit"
          className={`icon-btn send-btn ${busy ? "send-btn--stop" : ""}`}
          disabled={!busy && !canSend}
          aria-label={busy ? "Antwort stoppen" : "Senden"}
        >
          {busy ? <StopIcon /> : <SendIcon />}
        </button>
      </div>
    </form>
  );
}
