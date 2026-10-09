import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, POST as login } from "@/app/api/auth/route";
import { POST as chat } from "@/app/api/chat/route";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  isValidAccessCode,
  isValidSessionToken,
} from "@/lib/auth/session";
import { chatLimiter, loginLimiter } from "@/lib/rate-limit";
import { TEST_ACCESS_CODE, cookiePair, jsonRequest, uniqueIp } from "./helpers";

const validChat = { messages: [{ role: "user", content: "Hallo" }] };

function chatRequest(cookie?: string, body: unknown = validChat) {
  return jsonRequest("/api/chat", body, { ...uniqueIp(), ...(cookie ? { cookie } : {}) });
}

async function loginAndGetCookie() {
  const response = await login(jsonRequest("/api/auth", { code: TEST_ACCESS_CODE }, uniqueIp()));
  expect(response.status).toBe(200);
  return cookiePair(response.headers.get("set-cookie"));
}

beforeEach(() => {
  loginLimiter.reset();
  chatLimiter.reset();
  vi.stubEnv("AI_PROVIDER", "demo");
  vi.stubEnv("APP_ACCESS_CODE", TEST_ACCESS_CODE);
});

describe("Zugangscode-Prüfung", () => {
  it("vergleicht korrekt, auch bei unterschiedlicher Länge", () => {
    expect(isValidAccessCode(TEST_ACCESS_CODE, TEST_ACCESS_CODE)).toBe(true);
    expect(isValidAccessCode("falsch", TEST_ACCESS_CODE)).toBe(false);
    expect(isValidAccessCode(`${TEST_ACCESS_CODE}x`, TEST_ACCESS_CODE)).toBe(false);
  });

  it("Token enthält nicht den Klartext-Code und läuft ab", () => {
    const now = Date.now();
    const token = createSessionToken(TEST_ACCESS_CODE, now);
    expect(token).not.toContain(TEST_ACCESS_CODE);
    expect(isValidSessionToken(token, TEST_ACCESS_CODE, now)).toBe(true);
    expect(isValidSessionToken(token, TEST_ACCESS_CODE, now + (SESSION_MAX_AGE_SECONDS + 1) * 1000)).toBe(false);
  });

  it("Token wird ungültig, wenn der Code geändert wird", () => {
    const token = createSessionToken(TEST_ACCESS_CODE);
    expect(isValidSessionToken(token, "neuer-test-code-456-placeholder")).toBe(false);
  });

  it("lehnt manipulierte Tokens ab", () => {
    const [expires, signature] = createSessionToken(TEST_ACCESS_CODE).split(".");
    const later = String(Number(expires) + 1000);
    expect(isValidSessionToken(`${later}.${signature}`, TEST_ACCESS_CODE)).toBe(false);
    expect(isValidSessionToken(`${expires}.AAAA`, TEST_ACCESS_CODE)).toBe(false);
    expect(isValidSessionToken("unsinn", TEST_ACCESS_CODE)).toBe(false);
    expect(isValidSessionToken(undefined, TEST_ACCESS_CODE)).toBe(false);
  });
});

describe("/api/chat mit Zugangsschutz", () => {
  it("ohne Cookie → 401", async () => {
    const response = await chat(chatRequest());
    expect(response.status).toBe(401);
  });

  it("mit gefälschtem Cookie → 401", async () => {
    const response = await chat(chatRequest(`${SESSION_COOKIE}=123.gefaelscht`));
    expect(response.status).toBe(401);
  });

  it("falscher Code → 401 und kein Cookie", async () => {
    const response = await login(jsonRequest("/api/auth", { code: "falscher-code" }, uniqueIp()));
    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(await response.json()).toEqual({ error: "Falscher Zugangscode." });
  });

  it("richtiger Code → sicheres Cookie, danach funktioniert der Chat", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = await login(jsonRequest("/api/auth", { code: TEST_ACCESS_CODE }, uniqueIp()));
    expect(response.status).toBe(200);

    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${SESSION_COOKIE}=`);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Strict");
    expect(setCookie).toContain("Secure");
    expect(setCookie).not.toContain(TEST_ACCESS_CODE);

    const chatResponse = await chat(chatRequest(cookiePair(setCookie)));
    expect(chatResponse.status).toBe(200);
    expect(chatResponse.headers.get("X-Assistant-Provider")).toBe("demo");
    expect((await chatResponse.text()).length).toBeGreaterThan(0);
  });

  it("GET /api/auth meldet den Anmeldestatus", async () => {
    const anonymous = await GET(new Request("http://localhost/api/auth"));
    expect(await anonymous.json()).toMatchObject({ configured: true, authenticated: false });

    const cookie = await loginAndGetCookie();
    const authed = await GET(new Request("http://localhost/api/auth", { headers: { cookie } }));
    expect(await authed.json()).toMatchObject({ configured: true, authenticated: true, unprotected: false });
  });

  it("Abmelden löscht das Cookie", async () => {
    const response = DELETE();
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("begrenzt Code-Versuche auf 5 pro Minute", async () => {
    const ip = uniqueIp();
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      statuses.push((await login(jsonRequest("/api/auth", { code: "falsch" }, ip))).status);
    }
    expect(statuses).toEqual([401, 401, 401, 401, 401, 429]);

    // Auch der richtige Code wird während der Sperre abgelehnt.
    const blocked = await login(jsonRequest("/api/auth", { code: TEST_ACCESS_CODE }, ip));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeTruthy();
  });

  it("begrenzt Chat-Anfragen auf 20 pro Minute", async () => {
    const cookie = await loginAndGetCookie();
    const ip = uniqueIp();
    let last = 0;
    for (let i = 0; i < 21; i++) {
      const response = await chat(jsonRequest("/api/chat", { messages: [] }, { ...ip, cookie }));
      last = response.status;
      if (i < 20) expect(response.status).toBe(400);
    }
    expect(last).toBe(429);
  });
});

describe("ohne APP_ACCESS_CODE", () => {
  beforeEach(() => vi.stubEnv("APP_ACCESS_CODE", ""));

  it("in Produktion gesperrt (503)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect((await chat(chatRequest())).status).toBe(503);
    expect((await login(jsonRequest("/api/auth", { code: "egal" }, uniqueIp()))).status).toBe(503);
  });

  it("lokal erlaubt, aber als ungeschützt markiert", async () => {
    vi.stubEnv("NODE_ENV", "development");
    expect((await chat(chatRequest())).status).toBe(200);
    const status = await GET(new Request("http://localhost/api/auth"));
    expect(await status.json()).toMatchObject({ configured: false, authenticated: true, unprotected: true });
  });
});

describe("/api/chat Nachrichtenprüfung", () => {
  it("ungültiges JSON → 400", async () => {
    const cookie = await loginAndGetCookie();
    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie, ...uniqueIp() },
      body: "{kaputt",
    });
    expect((await chat(request)).status).toBe(400);
  });

  it("ungültige Nachrichtenliste → 400 mit deutscher Meldung", async () => {
    const cookie = await loginAndGetCookie();
    const response = await chat(chatRequest(cookie, { messages: [{ role: "system", content: "x" }] }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Ungültige Nachrichtenliste." });
  });
});
