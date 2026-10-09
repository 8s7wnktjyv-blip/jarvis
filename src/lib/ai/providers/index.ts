import { serverEnv, type ProviderId } from "@/lib/env";
import type { AIProvider } from "../types";
import { demoProvider } from "./demo";
import { groqProvider } from "./groq";

/**
 * Registry aller KI-Anbieter.
 * Einen neuen Anbieter hinzufügen:
 *   1. Datei in diesem Ordner anlegen, die `AIProvider` implementiert
 *   2. hier eintragen und `ProviderId` in `lib/env.ts` erweitern
 */
const providers: Record<ProviderId, AIProvider> = {
  demo: demoProvider,
  groq: groqProvider,
};

export function getActiveProvider(): AIProvider {
  return providers[serverEnv.provider];
}
