/** Browser-Seite des Zugangsschutzes – spricht nur mit /api/auth. */

export interface AuthStatus {
  configured: boolean;
  authenticated: boolean;
  unprotected: boolean;
  error?: string;
}

export async function fetchAuthStatus(): Promise<AuthStatus> {
  const response = await fetch("/api/auth", { cache: "no-store" });
  if (!response.ok) throw new Error(`Fehler ${response.status}`);
  return (await response.json()) as AuthStatus;
}

export async function login(code: string): Promise<void> {
  const response = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Fehler ${response.status}`);
  }
}

export async function logout(): Promise<void> {
  await fetch("/api/auth", { method: "DELETE" });
}
