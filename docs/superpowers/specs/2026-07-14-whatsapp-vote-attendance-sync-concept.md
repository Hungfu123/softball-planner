# Konzept: WhatsApp-Poll-Stimmen → Trainings-Anwesenheit synchronisieren

**Datum:** 2026-07-14
**Status:** Idee / Machbarkeits-Konzept (noch nicht umgesetzt)
**Bezug:** Erweiterung des WhatsApp-Umfragen-Features ([[project-whatsapp-polls]]). Ursprünglich bewusst „fire-and-forget" (kein Rücklauf). Dieses Dokument beschreibt einen späteren Rücklauf in die Trainings-Anwesenheit.

## Ziel

Wenn Spieler in der WhatsApp-Umfrage („Wer kommt morgen zum Training?") abstimmen, sollen die „Ja"-Stimmen automatisch als **anwesend** in die Trainings-Anwesenheit geschrieben werden — statt manuell einzutragen.

## Machbarkeit

**Grundsätzlich möglich.** whatsapp-web.js bietet `vote_update` — liefert bei jeder Stimme:
- den Wähler (WhatsApp-Push-Name + Nummer)
- die gewählte(n) Option(en)

Der Sidecar schreibt die Stimmen mit, das Backend mappt sie auf Spieler und schreibt Anwesenheit.

## Zuordnung Wähler → Spieler: über den WhatsApp-**Namen** (nicht Nummer)

**Bewusste Entscheidung: keine Telefonnummern speichern** (Datenschutz/Aufwand). Zuordnung erfolgt über den **WhatsApp-Push-Namen** des Wählers.

- Jeder Spieler hat einen (oder mehrere) hinterlegte(n) **WhatsApp-Namen** als Alias.
- Stimme kommt rein → Push-Name gegen die Aliase matchen → Spieler gefunden → Anwesenheit setzen.
- **Namensänderung:** Ändert ein Spieler seinen WhatsApp-Namen, taucht beim Sync ein **unbekannter Wähler** auf → man ordnet ihn einem Spieler zu und **überschreibt/ergänzt** dessen hinterlegten Namen. Danach wieder automatisch erkannt.

### Alias: einer oder mehrere?
- **Einfach:** genau **ein** aktueller WhatsApp-Name pro Spieler, bei Änderung überschreiben. Alte Stimmen unter altem Namen matchen dann nicht mehr — für den Anwesenheits-Zweck (immer die aktuelle Umfrage) reicht das meist.
- **Robuster:** kleine **Alias-Liste** pro Spieler (mehrere bekannte Namen). Namensänderung = neuen Alias ergänzen, alte bleiben gültig. Empfohlen, kaum mehr Aufwand.

## Wo verwaltet man die Namen?

**Bevorzugt auf der Spieler-Seite** (jeder Spieler zeigt/editiert seine WhatsApp-Namen). Zusätzlich ein **Zuordnungs-Schritt beim Sync** für unbekannte Wähler:
> „Wähler ‚Max ⚾' ist unbekannt → welchem Spieler zuordnen?" → Auswahl → wird als Alias gespeichert (überschreibt/ergänzt).

So pflegt man es entweder proaktiv (Spieler-Seite) oder reaktiv (beim Übernehmen der Stimmen).

## Voraussetzungen (zusätzlich nötig)

1. **Spieler ↔ WhatsApp-Name(n):** neues Feld am `Player`, z.B. `whatsappNames: List<String>` (Alias-Liste). Migration + UI auf der Spieler-Seite + Zuordnungs-Dialog beim Sync.
2. **Poll ↔ Training-Verknüpfung:** Poll hat aktuell nur Wochentag+Uhrzeit, keine Verbindung zu einem konkreten `Training`. Für die Anwesenheit muss klar sein, **welches** Training gemeint ist (Training am/nach Sendetag auflösen, oder Poll explizit koppeln).
3. **Sidecar-Vote-Tracking:** `vote_update` abonnieren, Stimmen pro Poll-Message-ID halten (letzter Stand bei Umwählen). Neue API `GET /poll-votes/:msgId` → `[{ voterName, options[] }]` (Nummer nicht nötig/nicht speichern).
4. **Poll-Message-ID speichern:** whatsapp-web.js gibt beim Senden eine Message-ID zurück → am Poll speichern, um später die Stimmen dazu abzufragen.

## Grobe Architektur (falls umgesetzt)

- **Sidecar:** `vote_update`-Listener → Store `{ msgId → [{ voterName, options[] }] }`; Route `GET /poll-votes/:msgId`. `send-poll` liefert die Message-ID zurück. (Nummer wird nicht persistiert.)
- **Backend:**
  - `Player.whatsappNames` (Alias-Liste; Migration + DTO + UI Spieler-Seite).
  - `WhatsappPoll.lastSentMessageId` speichern (Migration).
  - Poll optional an `Training`/Datum koppeln.
  - `PollVoteSyncService`: Stimmen vom Sidecar holen → Push-Name → Spieler (per Alias) → „Ja"-Wähler `TrainingAttendance.present = true` am Ziel-Training. Unbekannte Namen sammeln → Zuordnungs-Dialog.
  - Auslöser: manueller Button „Stimmen übernehmen" (Vorschau + Abgleich) — sicherer als Auto.
- **Frontend:**
  - Spieler-Seite: pro Spieler WhatsApp-Name(n) pflegen.
  - Übernehmen-Flow: Vorschau „diese Spieler → anwesend", unbekannte Wähler zuordnen.

## Risiken / offene Punkte

- **Unofficial-Client-Risiko:** Vote-Reading hängt an whatsapp-web.js (bricht ggf. bei WhatsApp-Web-Änderungen).
- **Umwählen:** nur letzter Stand zählt; Zeitpunkt „wann gilt Anwesenheit" definieren.
- **Namensgleichheit:** zwei Leute mit gleichem Push-Namen → Zuordnung mehrdeutig (selten, Zuordnungs-Dialog fängt's ab).
- **Nicht-Spieler-Wähler:** in der Gruppe, aber kein Spieler → ignorieren (bleiben unbekannt/unzugeordnet).
- **Anonyme Polls:** anonym gesendet → keine Wähler-Infos → Sync unmöglich. Poll muss nicht-anonym sein.

## Aufwand / schrittweise

1. `Player.whatsappNames` (Feld + UI auf Spieler-Seite).
2. Poll speichert `lastSentMessageId` (+ optionale Training-Kopplung).
3. Sidecar `vote_update` + `GET /poll-votes/:msgId`.
4. `PollVoteSyncService` + „Übernehmen"-Flow mit Zuordnungs-Dialog für Unbekannte.

## Fazit

Machbar. Zuordnung über **WhatsApp-Namen** (keine Nummern), gepflegt auf der Spieler-Seite + Zuordnungs-Dialog beim Sync für neue/geänderte Namen. Kein Schnellschuss (Sidecar-Vote-Tracking + Player-Alias + Poll↔Training + Übernehmen-UI), aber gut schrittweise machbar. Bis dahin: fire-and-forget + manuelle Anwesenheit.
