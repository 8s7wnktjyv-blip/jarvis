"use client";

import { useEffect } from "react";

/** Registriert den Service Worker (nur im Production-Build, damit Dev-Reloads nicht gecacht werden). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
      console.warn("Service Worker konnte nicht registriert werden:", error);
    });
  }, []);
  return null;
}
