"use client";

import { useEffect, useState } from "react";
import { ShareIcon } from "./Icons";

/** Zeigt iPhone-Nutzern in Safari, wie J.A.V.I.S. zum Home-Bildschirm hinzugefügt wird. */
export function InstallHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Mac") && navigator.maxTouchPoints > 1);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem("javis.installHint.dismissed") === "1";
    } catch {
      /* Speicher nicht verfügbar */
    }
    setVisible(isIOS && !standalone && !dismissed);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem("javis.installHint.dismissed", "1");
    } catch {
      /* ignorieren */
    }
  };

  return (
    <div className="install-hint" role="note">
      <span>
        Als App installieren: <ShareIcon /> <strong>Teilen</strong> → <strong>Zum Home-Bildschirm</strong>
      </span>
      <button type="button" onClick={dismiss} aria-label="Hinweis schließen">
        ×
      </button>
    </div>
  );
}
