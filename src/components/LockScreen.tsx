"use client";

import { useState, type FormEvent } from "react";
import { assistant } from "@/config/assistant";
import { login } from "@/lib/auth-client";
import { ArcReactor } from "./ArcReactor";

/** Sperrbildschirm: einmal den Zugangscode eingeben, danach merkt sich der Server die Anmeldung. */
export function LockScreen({ notice, onUnlocked }: { notice?: string; onUnlocked: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!code.trim() || pending) return;
    setPending(true);
    setError(null);
    try {
      await login(code.trim());
      setCode("");
      onUnlocked();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Anmeldung fehlgeschlagen.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="app">
      <main className="lock">
        <ArcReactor state={pending ? "thinking" : "idle"} size={132} />
        <p className="welcome__eyebrow">Zugang gesichert</p>
        <h1 className="lock__title">{assistant.name}</h1>
        {notice ? (
          <p className="lock__notice">{notice}</p>
        ) : (
          <form className="lock__form" onSubmit={submit}>
            <label htmlFor="access-code" className="lock__label">
              Bitte Zugangscode eingeben
            </label>
            <input
              id="access-code"
              className="lock__input"
              type="password"
              autoComplete="current-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={pending}
              autoFocus
            />
            {error && (
              <p className="lock__error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="lock__button" disabled={pending || !code.trim()}>
              {pending ? "Prüfe …" : "Entsperren"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
