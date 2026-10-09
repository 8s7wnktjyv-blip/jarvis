/** Platzhalter-Werte nur für Tests – keine echten Schlüssel oder Codes. */
export const TEST_ACCESS_CODE = "test-code-123-placeholder";
export const TEST_GROQ_KEY = "test-groq-key-placeholder";

export function jsonRequest(url: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`http://localhost${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

/** Extrahiert "name=wert" aus einem Set-Cookie-Header. */
export function cookiePair(setCookie: string | null): string {
  if (!setCookie) throw new Error("Kein Set-Cookie-Header");
  return setCookie.split(";")[0];
}

let ipCounter = 0;
/** Eindeutige IP pro Test, damit sich die Anfragelimits nicht gegenseitig beeinflussen. */
export function uniqueIp() {
  ipCounter += 1;
  return { "x-forwarded-for": `10.0.0.${ipCounter}` };
}
