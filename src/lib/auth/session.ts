import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env";

/**
 * Zugangsschutz über einen gemeinsamen Code (APP_ACCESS_CODE).
 *
 * Nach richtiger Eingabe erhält der Browser ein signiertes Token als httpOnly-Cookie.
 * Das Token enthält nur ein Ablaufdatum und eine HMAC-Signatur – niemals den Code selbst.
 * Der Signaturschlüssel wird aus dem Code abgeleitet: Wird der Code geändert,
 * sind alle bisherigen Anmeldungen automatisch ungültig.
 */

export const SESSION_COOKIE = "james_session";
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const sha256 = (value: string) => createHash("sha256").update(value, "utf8").digest();

function signingKey(accessCode: string) {
  return sha256(`james-session-v1:${accessCode}`);
}

function sign(payload: string, accessCode: string) {
  return createHmac("sha256", signingKey(accessCode)).update(payload).digest("base64url");
}

/** Zeitkonstanter Vergleich – durch das Hashen verrät auch die Länge nichts. */
export function isValidAccessCode(input: string, accessCode: string): boolean {
  return timingSafeEqual(sha256(input), sha256(accessCode));
}

export function createSessionToken(accessCode: string, now = Date.now()): string {
  const expires = String(Math.floor(now / 1000) + SESSION_MAX_AGE_SECONDS);
  return `${expires}.${sign(expires, accessCode)}`;
}

export function isValidSessionToken(token: string | undefined, accessCode: string, now = Date.now()): boolean {
  if (!token) return false;
  const [expires, signature, ...rest] = token.split(".");
  if (!expires || !signature || rest.length || !/^\d+$/.test(expires)) return false;
  if (Number(expires) * 1000 <= now) return false;

  const expected = Buffer.from(sign(expires, accessCode));
  const actual = Buffer.from(signature);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return undefined;
}

function cookie(value: string, maxAge: number) {
  const attributes = [
    `${SESSION_COOKIE}=${value}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    "HttpOnly",
    "SameSite=Strict",
  ];
  // Lokal läuft die App über http – dort würde ein Secure-Cookie nicht überall gespeichert.
  if (serverEnv.isProduction) attributes.push("Secure");
  return attributes.join("; ");
}

export const sessionCookie = (token: string) => cookie(token, SESSION_MAX_AGE_SECONDS);
export const clearedSessionCookie = () => cookie("", 0);

export type AccessResult =
  | { ok: true; unprotected: boolean }
  | { ok: false; status: 401 | 503; error: string };

/** Prüft, ob eine Anfrage den Chat nutzen darf. */
export function checkAccess(request: Request): AccessResult {
  const accessCode = serverEnv.accessCode;
  if (!accessCode) {
    if (serverEnv.isProduction) {
      return {
        ok: false,
        status: 503,
        error: "Kein Zugangscode konfiguriert. Bitte APP_ACCESS_CODE auf dem Server setzen.",
      };
    }
    return { ok: true, unprotected: true };
  }
  if (isValidSessionToken(readCookie(request, SESSION_COOKIE), accessCode)) {
    return { ok: true, unprotected: false };
  }
  return { ok: false, status: 401, error: "Bitte zuerst den Zugangscode eingeben." };
}
