# James

Mein persönlicher KI-Assistent – eine moderne Web-App im futuristischen Look,
optimiert fürs iPhone und als PWA auf dem Home-Bildschirm installierbar.

## Funktionen (Grundversion)

- Chat-Oberfläche mit gestreamten Antworten (Text erscheint live)
- Animierter „Arc Reactor“-Kern, der den Zustand zeigt (bereit, hört zu, denkt, antwortet)
- Spracheingabe per Mikrofon (Web Speech API, Safari/Chrome) und optionale Sprachausgabe
- Responsive Layout für iPhone inkl. Notch/Dynamic Island und Home-Indikator (Safe Areas)
- PWA: Manifest, App-Icons, Service Worker, Vollbild-Start vom Home-Bildschirm
- Gesprächsverlauf bleibt lokal im Browser gespeichert
- **Demo-Modus** ohne API-Schlüssel – oder echte KI über Claude (Anthropic), sobald ein Schlüssel hinterlegt ist

## Schnellstart

```bash
npm install
cp .env.example .env.local   # optional: Schlüssel eintragen
npm run dev                  # http://localhost:3000
```

Production-Build: `npm run build && npm start`. Typprüfung: `npm run lint`.

## Environment Variables

Alle Geheimnisse werden **nur** über Environment Variables gesetzt und ausschließlich
auf dem Server gelesen (`src/lib/env.ts`). Im Code stehen keine Schlüssel.

| Variable            | Bedeutung                                                        |
| ------------------- | ---------------------------------------------------------------- |
| `AI_PROVIDER`       | `auto` (Standard), `demo` oder `anthropic`                       |
| `ANTHROPIC_API_KEY` | API-Schlüssel für Claude – geheim, nie mit `NEXT_PUBLIC_` benennen |
| `AI_MODEL`          | Modell, Standard `claude-opus-5-5`                               |
| `AI_EFFORT`         | Denk-Aufwand: `low`, `medium` (Standard), `high`, `xhigh`, `max` |

Lokal: `.env.local` (wird nicht committet). In Produktion, z. B. auf Vercel:
*Project → Settings → Environment Variables*.

## Aufs iPhone bringen

1. App mit HTTPS deployen (z. B. Repository bei [Vercel](https://vercel.com) importieren und Variablen setzen).
2. Die URL in **Safari** öffnen.
3. **Teilen** → **Zum Home-Bildschirm**. James startet danach im Vollbild wie eine native App.

## Projektstruktur

```
src/
├── app/
│   ├── api/chat/route.ts      # POST /api/chat – streamt die KI-Antwort
│   ├── api/health/route.ts    # GET  /api/health – Status & aktiver Anbieter
│   ├── icons/[size]/route.tsx # PNG-App-Icons (192/512) für das Manifest
│   ├── apple-icon.tsx         # Apple Touch Icon (Home-Bildschirm)
│   ├── icon.svg               # Favicon
│   ├── manifest.ts            # PWA-Manifest
│   ├── layout.tsx             # HTML-Gerüst, iOS-Meta-Tags, Viewport
│   ├── page.tsx               # Startseite
│   └── globals.css            # Design-System & Animationen
├── components/                # UI: Chat, Composer, ArcReactor, Nachrichten …
├── hooks/                     # useSpeechRecognition, useSpeechSynthesis
├── config/assistant.ts        # Name, Begrüßung, System-Prompt, Vorschläge
└── lib/
    ├── ai/types.ts            # Anbieter-neutrale Chat-Typen & AIProvider-Interface
    ├── ai/providers/          # demo.ts, anthropic.ts, index.ts (Registry)
    ├── tools/registry.ts      # Werkzeug-Registry für künftige Fähigkeiten
    ├── chat-client.ts         # Browser → /api/chat (Streaming)
    ├── brand-icon.tsx         # Icon-Grafik
    └── env.ts                 # Einziger Ort, an dem Secrets gelesen werden
public/sw.js                   # Service Worker (Offline-Hülle, API nie gecacht)
```

## Erweitern

- **Neuer KI-Anbieter:** Datei in `src/lib/ai/providers/` anlegen, die `AIProvider` implementiert, und in `providers/index.ts` registrieren.
- **Werkzeuge** (Gedächtnis, Websuche, GitHub, Automationen): als `AssistantTool` in `src/lib/tools/registry.ts` registrieren und im Provider als Tool-Definitionen an das Modell geben.
- **Sprache:** Die Hooks in `src/hooks/` kapseln Ein- und Ausgabe – dort lässt sich später eine hochwertige Speech-API anbinden, ohne die Oberfläche zu ändern.
- **Persönlichkeit:** `src/config/assistant.ts` anpassen.
