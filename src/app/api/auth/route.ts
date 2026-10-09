import {
  checkAccess,
  clearedSessionCookie,
  createSessionToken,
  isValidAccessCode,
  sessionCookie,
} from "@/lib/auth/session";
import { serverEnv } from "@/lib/env";
import { clientKey, loginLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

/** Anmeldestatus für die Oberfläche. */
export function GET(request: Request) {
  const access = checkAccess(request);
  return Response.json(
    {
      configured: Boolean(serverEnv.accessCode),
      authenticated: access.ok,
      unprotected: access.ok && access.unprotected,
      error: access.ok ? undefined : access.error,
    },
    { headers: noStore },
  );
}

/** Zugangscode prüfen und bei Erfolg ein signiertes Sitzungs-Cookie setzen. */
export async function POST(request: Request) {
  const limit = loginLimiter.check(clientKey(request));
  if (!limit.allowed) {
    return Response.json(
      { error: `Zu viele Versuche. Bitte in ${limit.retryAfterSeconds} Sekunden erneut probieren.` },
      { status: 429, headers: { ...noStore, "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const accessCode = serverEnv.accessCode;
  if (!accessCode) {
    const access = checkAccess(request);
    return access.ok
      ? Response.json({ authenticated: true, unprotected: true }, { headers: noStore })
      : Response.json({ error: access.error }, { status: access.status, headers: noStore });
  }

  let code: unknown;
  try {
    code = ((await request.json()) as { code?: unknown }).code;
  } catch {
    code = undefined;
  }

  if (typeof code !== "string" || !code || code.length > 512 || !isValidAccessCode(code, accessCode)) {
    return Response.json({ error: "Falscher Zugangscode." }, { status: 401, headers: noStore });
  }

  return Response.json(
    { authenticated: true, unprotected: false },
    { headers: { ...noStore, "Set-Cookie": sessionCookie(createSessionToken(accessCode)) } },
  );
}

/** Abmelden. */
export function DELETE() {
  return Response.json(
    { authenticated: false },
    { headers: { ...noStore, "Set-Cookie": clearedSessionCookie() } },
  );
}
