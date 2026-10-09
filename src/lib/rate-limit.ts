/**
 * Einfaches Anfragelimit im Arbeitsspeicher (feste Zeitfenster pro Schlüssel, z. B. IP-Adresse).
 *
 * Einschränkung: Auf Serverless-Plattformen wie Vercel kann es mehrere Instanzen geben,
 * das Limit gilt dann pro Instanz. Gegen Durchprobieren eines langen Zugangscodes reicht das;
 * ein geteilter Zähler bräuchte einen zusätzlichen Dienst.
 */
export interface RateLimiter {
  check(key: string, now?: number): { allowed: boolean; retryAfterSeconds: number };
  reset(): void;
}

export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }): RateLimiter {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return {
    check(key, now = Date.now()) {
      // Abgelaufene Einträge gelegentlich aufräumen, damit die Map nicht wächst.
      if (hits.size > 5000) {
        for (const [k, entry] of hits) if (entry.resetAt <= now) hits.delete(k);
      }

      let entry = hits.get(key);
      if (!entry || entry.resetAt <= now) {
        entry = { count: 0, resetAt: now + windowMs };
        hits.set(key, entry);
      }
      entry.count += 1;

      const allowed = entry.count <= limit;
      return { allowed, retryAfterSeconds: allowed ? 0 : Math.ceil((entry.resetAt - now) / 1000) };
    },
    reset() {
      hits.clear();
    },
  };
}

/** IP-Adresse des Aufrufers (Vercel setzt x-forwarded-for selbst). */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

/** 5 Code-Eingaben pro Minute und IP – bremst das Durchprobieren. */
export const loginLimiter = createRateLimiter({ limit: 5, windowMs: 60_000 });

/** 20 Chat-Anfragen pro Minute und IP – schützt das kostenlose Groq-Kontingent. */
export const chatLimiter = createRateLimiter({ limit: 20, windowMs: 60_000 });
