# James

Mein persönlicher KI-Assistent – eine moderne Web-App im futuristischen Look,
optimiert fürs iPhone und als PWA auf dem Home-Bildschirm installierbar.

**James läuft komplett kostenlos:** KI über den kostenlosen Plan von Groq, Hosting über
Vercel Hobby. Bitte nur diese kostenlosen Pläne nutzen, keine Kreditkarte hinterlegen
und keine Upgrades (Groq „Developer“, Vercel „Pro“) abschließen.

## Funktionen

- Chat-Oberfläche mit gestreamten Antworten (Text erscheint live)
- Animierter „Arc Reactor“-Kern, der den Zustand zeigt (bereit, hört zu, denkt, antwortet)
- Spracheingabe per Mikrofon (Web Speech API, Safari/Chrome) und optionale Sprachausgabe
- Responsive Layout für iPhone inkl. Notch/Dynamic Island und Home-Indikator (Safe Areas)
- PWA: Manifest, App-Icons, Service Worker, Vollbild-Start vom Home-Bildschirm
- Gesprächsverlauf bleibt lokal im Browser gespeichert
- **KI über Groq** (kostenloser Plan, Modell `openai/gpt-oss-120b`) – ohne Schlüssel läuft ein **Demo-Modus**
- **Zugangsschutz:** Nur wer den Zugangscode kennt, kann chatten

## Schnellstart (Computer)

```bash
npm install
cp .env.example .env.local   # Werte eintragen (optional)
npm run dev                  # http://localhost:3000
```

| Befehl          | Zweck                       |
| --------------- | --------------------------- |
| `npm run dev`   | Entwicklungsserver          |
| `npm run lint`  | TypeScript-Prüfung          |
| `npm test`      | Tests (Vitest)              |
| `npm run build` | Production-Build            |

## Environment Variables

Alle Geheimnisse werden **nur** über Environment Variables gesetzt und ausschließlich
auf dem Server gelesen (`src/lib/env.ts`). Im Code stehen keine Schlüssel.

| Variable          | Bedeutung                                                                  |
| ----------------- | -------------------------------------------------------------------------- |
| `APP_ACCESS_CODE` | Zugangscode für die App – **mindestens 20 zufällige Zeichen**, geheim       |
| `GROQ_API_KEY`    | API-Schlüssel aus dem kostenlosen Groq-Plan – geheim                        |
| `AI_PROVIDER`     | `auto` (Standard: Groq, wenn Schlüssel vorhanden, sonst Demo), `groq`, `demo` |
| `GROQ_MODEL`      | Optional, Standard `openai/gpt-oss-120b`                                    |

Geheimnisse nie mit dem Präfix `NEXT_PUBLIC_` benennen – sonst landen sie im Browser.

### Zugangsschutz – so funktioniert er

- Beim ersten Öffnen fragt James nach dem Zugangscode. Danach setzt der Server ein
  `httpOnly`-, `Secure`-, `SameSite=Strict`-Cookie mit einem signierten Token (30 Tage gültig).
  Der Code selbst wird nie im Browser gespeichert.
- Wird `APP_ACCESS_CODE` geändert, sind alle bisherigen Anmeldungen sofort ungültig.
- Max. 5 Code-Versuche und 20 Chat-Anfragen pro Minute und IP-Adresse. Das Limit liegt im
  Arbeitsspeicher und gilt bei Vercel pro Server-Instanz – deshalb ist ein langer, zufälliger
  Code wichtig.
- Ohne `APP_ACCESS_CODE` ist der Chat **in Produktion gesperrt**; lokal läuft er mit Warnhinweis.

### Groq-Limits

Im kostenlosen Plan begrenzt Groq Anfragen pro Minute und pro Tag. Ist ein Limit erreicht,
zeigt James eine Meldung, wann es weitergeht. Deine genauen Limits stehen in der
[Groq Console](https://console.groq.com) unter *Settings → Limits*.

Modellwahl (Stand Oktober 2026, bitte bei Bedarf prüfen): `openai/gpt-oss-120b` ist laut
[Groq-Modellübersicht](https://console.groq.com/docs/models) ein Produktionsmodell und steht
nicht auf der [Abschaltliste](https://console.groq.com/docs/deprecations). Ein anderes Modell
lässt sich jederzeit über `GROQ_MODEL` wählen, ohne Code zu ändern.

## Einrichtung vom iPhone aus (Schritt für Schritt)

Alles hier geht in Safari auf dem iPhone, ein Computer ist nicht nötig.

### 1. Zugangscode erzeugen

Du brauchst eine Zeichenkette aus **mindestens 20 zufälligen Zeichen**. Am iPhone geht das
z. B. mit der **Passwörter-App** (oder deinem Passwort-Manager): neuen Eintrag anlegen
(Name z. B. „James Zugangscode“) und das vorgeschlagene starke Passwort übernehmen. Hat der
Vorschlag weniger als 20 Zeichen (Bindestriche nicht mitgezählt), hänge einen zweiten Vorschlag
an. Den Code dort gespeichert lassen – du brauchst ihn gleich zweimal.

### 2. Kostenlosen Groq-Schlüssel holen

1. [console.groq.com](https://console.groq.com) öffnen und kostenlos registrieren.
2. Links im Menü **API Keys** → **Create API Key**, Namen „James“ vergeben.
3. Den Schlüssel sofort kopieren (er wird nur einmal angezeigt) und z. B. ebenfalls in der
   Passwörter-App speichern.
4. Keine Zahlungsdaten hinterlegen und nicht auf einen kostenpflichtigen Plan upgraden.

### 3. Projekt bei Vercel (Hobby, kostenlos) anlegen

1. [vercel.com](https://vercel.com) öffnen → **Sign Up** → Plan **Hobby** → mit GitHub anmelden.
2. **Add New… → Project** → das Repository `jarvis` auswählen → **Import**.
3. Vor dem Klick auf **Deploy** den Bereich **Environment Variables** aufklappen und eintragen
   (jeweils *Key* und *Value*, dann **Add**):
   - `APP_ACCESS_CODE` → dein Zugangscode aus Schritt 1
   - `GROQ_API_KEY` → dein Schlüssel aus Schritt 2
   - optional `AI_PROVIDER` → `auto`
4. **Deploy** tippen und warten, bis „Congratulations“ erscheint.

**Wichtig – Branch:** Vercel veröffentlicht als Produktion standardmäßig den Haupt-Branch
(`main`). Liegt James' aktueller Stand noch auf einem anderen Branch, gibt es zwei Wege:
den Branch auf GitHub per Pull Request in `main` mergen (geht im GitHub-Web am iPhone),
oder in Vercel unter **Settings → Git → Production Branch** den Branch-Namen eintragen.

### 4. Variablen später ändern

1. In Vercel das Projekt öffnen → **Settings** → **Environment Variables**.
2. Wert über das **…**-Menü → **Edit** ändern und speichern.
3. Änderungen wirken erst nach einem neuen Deployment: **Deployments** → beim obersten
   Eintrag **…** → **Redeploy**.

### 5. James auf den Home-Bildschirm

1. Die Vercel-URL (z. B. `https://jarvis-xyz.vercel.app`) in **Safari** öffnen.
2. Zugangscode eingeben → **Entsperren**.
3. **Teilen** → **Zum Home-Bildschirm**. James startet danach im Vollbild wie eine App.

> Hinweis: Eine PWA vom Home-Bildschirm hat in iOS einen eigenen Speicher. Den Code dort
> einmal erneut eingeben.

## Projektstruktur

```
src/
├── app/
│   ├── api/auth/route.ts      # GET Status · POST Code prüfen · DELETE abmelden
│   ├── api/chat/route.ts      # POST /api/chat – geschützt, streamt die KI-Antwort
│   ├── api/health/route.ts    # GET  /api/health – Status (Anbieter nur nach Anmeldung)
│   ├── icons/[size]/route.tsx # PNG-App-Icons (192/512) für das Manifest
│   ├── apple-icon.tsx         # Apple Touch Icon (Home-Bildschirm)
│   ├── icon.svg               # Favicon
│   ├── manifest.ts            # PWA-Manifest
│   ├── layout.tsx             # HTML-Gerüst, iOS-Meta-Tags, Viewport
│   ├── page.tsx               # Startseite (Zugangsschutz → Chat)
│   └── globals.css            # Design-System & Animationen
├── components/                # UI: AccessGate, LockScreen, Chat, Composer, ArcReactor …
├── hooks/                     # useSpeechRecognition, useSpeechSynthesis
├── config/assistant.ts        # Name, Begrüßung, System-Prompt, Vorschläge
└── lib/
    ├── ai/types.ts            # Anbieter-neutrale Chat-Typen & AIProvider-Interface
    ├── ai/validate.ts         # Prüfung der Nachrichtenliste
    ├── ai/providers/          # groq.ts, demo.ts, index.ts (Auswahl)
    ├── auth/session.ts        # Zugangscode, signiertes Token, Cookie
    ├── rate-limit.ts          # Anfragelimit pro Minute
    ├── tools/registry.ts      # Werkzeug-Registry für künftige Fähigkeiten
    ├── chat-client.ts         # Browser → /api/chat (Streaming)
    ├── auth-client.ts         # Browser → /api/auth
    ├── brand-icon.tsx         # Icon-Grafik
    └── env.ts                 # Einziger Ort, an dem Secrets gelesen werden
tests/                         # Vitest-Tests (nur Platzhalter-Werte, keine echten Schlüssel)
public/sw.js                   # Service Worker (Offline-Hülle, API nie gecacht)
```

## Erweitern

- **Neuer KI-Anbieter:** Datei in `src/lib/ai/providers/` anlegen, die `AIProvider` implementiert, und in `providers/index.ts` registrieren. Nur kostenlose Anbieter verwenden.
- **Werkzeuge** (Gedächtnis, Websuche, GitHub, Automationen): als `AssistantTool` in `src/lib/tools/registry.ts` registrieren.
- **Sprache:** Die Hooks in `src/hooks/` kapseln Ein- und Ausgabe.
- **Persönlichkeit:** `src/config/assistant.ts` anpassen.
