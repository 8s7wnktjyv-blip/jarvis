import { getActiveProvider } from "@/lib/ai/providers";
import { checkAccess } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** Statusabfrage – den aktiven Anbieter sehen nur angemeldete Nutzer. */
export function GET(request: Request) {
  const access = checkAccess(request);
  const provider = access.ok ? getActiveProvider() : null;
  return Response.json(
    {
      status: "online",
      provider: provider ? { id: provider.id, label: provider.label } : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
