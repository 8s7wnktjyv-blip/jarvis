import { getActiveProvider } from "@/lib/ai/providers";

export const dynamic = "force-dynamic";

/** Statusabfrage für die Oberfläche – verrät keine Geheimnisse, nur den aktiven Modus. */
export function GET() {
  const provider = getActiveProvider();
  return Response.json(
    { status: "online", provider: { id: provider.id, label: provider.label } },
    { headers: { "Cache-Control": "no-store" } },
  );
}
