"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchAuthStatus, type AuthStatus } from "@/lib/auth-client";
import { Chat } from "./Chat";
import { LockScreen } from "./LockScreen";

/** Zeigt den Chat nur nach erfolgreicher Anmeldung, sonst den Sperrbildschirm. */
export function AccessGate() {
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [loadError, setLoadError] = useState(false);

  const refresh = useCallback(() => {
    fetchAuthStatus()
      .then((s) => {
        setStatus(s);
        setLoadError(false);
      })
      .catch(() => setLoadError(true));
  }, []);

  useEffect(refresh, [refresh]);

  if (loadError) {
    return <LockScreen notice="Server nicht erreichbar. Bitte Verbindung prüfen und neu laden." onUnlocked={refresh} />;
  }
  if (!status) return <div className="app" aria-busy="true" />;

  if (!status.authenticated) {
    // In Produktion ohne APP_ACCESS_CODE ist keine Anmeldung möglich.
    const notice = !status.configured ? status.error : undefined;
    return <LockScreen notice={notice} onUnlocked={refresh} />;
  }

  return (
    <Chat
      unprotected={status.unprotected}
      onUnauthorized={() => setStatus({ ...status, authenticated: false })}
    />
  );
}
