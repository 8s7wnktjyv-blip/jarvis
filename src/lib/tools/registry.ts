/**
 * Werkzeug-Registry (Vorbereitung).
 *
 * Hier werden später Fähigkeiten registriert, die J.A.V.I.S. selbstständig
 * nutzen kann – z. B. Gedächtnis, Websuche, GitHub oder Automationen.
 * Ein Werkzeug beschreibt sich selbst (Name, Beschreibung, JSON-Schema der
 * Eingabe) und führt seine Aktion serverseitig aus. Die Provider können diese
 * Beschreibungen später als Tool-Definitionen an das Modell weiterreichen.
 */

export interface ToolContext {
  signal?: AbortSignal;
}

export interface AssistantTool<Input = Record<string, unknown>> {
  name: string;
  description: string;
  /** JSON-Schema der erwarteten Eingabe */
  inputSchema: Record<string, unknown>;
  run(input: Input, context: ToolContext): Promise<string>;
}

/** Geplante Module – werden aktiviert, sobald sie implementiert sind. */
export const plannedCapabilities = [
  { id: "memory", label: "Gedächtnis" },
  { id: "web-search", label: "Websuche" },
  { id: "voice", label: "Sprache" },
  { id: "github", label: "GitHub" },
  { id: "automations", label: "Automationen" },
] as const;

const tools = new Map<string, AssistantTool>();

export function registerTool(tool: AssistantTool) {
  tools.set(tool.name, tool);
}

export function listTools(): AssistantTool[] {
  return [...tools.values()];
}

export function getTool(name: string): AssistantTool | undefined {
  return tools.get(name);
}
