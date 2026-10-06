"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Spracheingabe über die Web Speech API.
 * Wird von Safari (iOS 14.5+) und Chrome unterstützt. Ist sie nicht vorhanden,
 * meldet der Hook `supported: false` und die Oberfläche blendet das Mikrofon aus.
 * Später kann hier z. B. ein serverseitiges Speech-to-Text eingebunden werden.
 */

interface RecognitionResultEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type RecognitionConstructor = new () => Recognition;

function getRecognitionConstructor(): RecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function useSpeechRecognition({
  lang = "de-DE",
  onFinalTranscript,
}: {
  lang?: string;
  onFinalTranscript?: (text: string) => void;
} = {}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<Recognition | null>(null);
  const finalCallback = useRef(onFinalTranscript);
  finalCallback.current = onFinalTranscript;

  useEffect(() => {
    setSupported(Boolean(getRecognitionConstructor()));
    return () => recognitionRef.current?.abort();
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionConstructor();
    if (!Ctor || recognitionRef.current) return;

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;

    let finalText = "";
    recognition.onresult = (event) => {
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interimText += result[0].transcript;
      }
      setInterim(finalText + interimText);
    };
    recognition.onerror = (event) => {
      if (event.error !== "aborted" && event.error !== "no-speech") {
        setError(
          event.error === "not-allowed"
            ? "Mikrofonzugriff wurde verweigert."
            : "Spracherkennung fehlgeschlagen.",
        );
      }
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
      setInterim("");
      const text = finalText.trim();
      if (text) finalCallback.current?.(text);
    };

    setError(null);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [lang]);

  const stop = useCallback(() => recognitionRef.current?.stop(), []);

  return { supported, listening, interim, error, start, stop };
}
