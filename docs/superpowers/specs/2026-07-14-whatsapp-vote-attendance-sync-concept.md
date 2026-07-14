# Konzept: WhatsApp-Poll-Stimmen → Trainings-Anwesenheit synchronisieren

**Datum:** 2026-07-14
**Status:** Idee / Machbarkeits-Konzept (noch nicht umgesetzt)
**Bezug:** Erweiterung des WhatsApp-Umfragen-Features ([[project-whatsapp-polls]]). Beim ursprünglichen Brainstorming bewusst als „fire-and-forget" gebaut (kein Rücklauf). Dieses Dokument beschreibt, was ein späterer Rücklauf in die Trainings-Anwesenheit bräuchte.

## Ziel

Wenn Spieler in der WhatsApp-Umfrage („Wer kommt morgen zum Training?") abstimmen, sollen die „Ja"-Stimmen automatisch als **anwesend** in die Trainings-Anwesenheit der App geschrieben werden — statt manuell einzutragen.

## Machbarkeit

**Grundsätzlich möglich.** whatsapp-web.js bietet das Event `vote_update` — es liefert bei jeder Poll-Stimme:
- den Wähler (WhatsApp-Kontakt: Nummer + Push-Name)
- die gewählte(n) Option(en)

Der Sidecar könnte diese Stimmen mitschreiben und über die HTTP-API bereitstellen. Das Backend würde sie dann auf Spieler mappen und in die Anwesenheit schreiben.

## Der Haken: Zuordnung Wähler → Spieler

Das ist die eigentlich schwierige/fehleranfällige Stelle.

- Das `Player`-Modell hat aktuell **nur einen Namen** (`id`, `name`, `regular`, `defaultBattingOrder`) — **keine Telefonnummer / WhatsApp-ID**.
- WhatsApp liefert den **Push-Namen** des Wählers (frei gewählter Anzeigename, oft mit Emojis/Zusätzen) und die **Nummer**.
- Push-Name ↔ `player.name` matcht selten sauber („Max" vs „Max M. 🎉⚾").

Ohne verlässliches Mapping ist die Auto-Zuordnung unzuverlässig.

## Voraussetzungen (was zusätzlich nötig wäre)

1. **Spieler ↔ WhatsApp-Identität**: Telefonnummer (oder WhatsApp-Push-Name) pro Spieler hinterlegen. Neues Feld `phone` / `whatsappId` am `Player` (Migration + UI zum Pflegen).
2. **Poll ↔ Training-Verknüpfung**: Aktuell hat ein Poll nur Wochentag+Uhrzeit, keine Verbindung zu einem konkreten `Training`-Eintrag. Für die Anwesenheit muss klar sein, **welches** Training gemeint ist (z.B. das Training am/nach dem Sendetag auflösen, oder Poll explizit an ein Training koppeln).
3. **Sidecar-Vote-Tracking**: `vote_update` abonnieren, Stimmen pro Poll-Message-ID speichern (Session muss verbunden bleiben; Stimmen ändern sich, wenn jemand umwählt → letzten Stand halten). Neue API `GET /poll-votes?msgId=…`.
4. **Poll-Message-ID speichern**: Beim Senden gibt whatsapp-web.js eine Message-ID zurück — die müsste am Poll gespeichert werden, um später die Stimmen dazu abzufragen.

## Vorgeschlagene Zuordnungs-Strategien

1. **Nummer pro Spieler (zuverlässig):** Spieler bekommen ihre Telefonnummer → Matching per Nummer (WhatsApp liefert die Nummer des Wählers). Einmaliger Pflegeaufwand, danach exakt.
2. **Manueller Abgleich (pragmatisch):** App zeigt „Wähler ‚Max' hat Ja gestimmt → welcher Spieler?", User bestätigt einmalig, Zuordnung wird gemerkt (Alias-Tabelle Push-Name → Player).
3. **Namens-Fuzzy-Match (unsicher):** Push-Name gegen `player.name` matchen — nur als Vorschlag, nie automatisch übernehmen.

Empfehlung: **(1) Nummer** als Basis, **(2) manueller Abgleich** als Fallback für Unbekannte.

## Grobe Architektur (falls umgesetzt)

- **Sidecar:** `vote_update`-Listener → In-Memory/Volume-Store `{ msgId → [{ voterNumber, voterName, options[] }] }`; neue Route `GET /poll-votes/:msgId`. Beim `send-poll` die zurückgegebene Message-ID mit ausliefern.
- **Backend:**
  - `Player.phone` (Migration + DTO + UI).
  - `WhatsappPoll.lastSentMessageId` speichern (Migration).
  - `WhatsappPoll` optional an `Training`/Datum koppeln.
  - Neuer Service `PollVoteSyncService`: Stimmen vom Sidecar holen → Nummer→Player mappen → für „Ja"-Wähler `TrainingAttendance.present = true` am Ziel-Training setzen.
  - Auslöser: manueller Button „Stimmen übernehmen" (sicherer als Auto), oder Scheduler nach Poll-Ende.
- **Frontend:** Auf der Umfrage-Card / Trainings-Seite „Stimmen → Anwesenheit übernehmen" mit Vorschau + manuellem Abgleich unbekannter Wähler.

## Risiken / offene Punkte

- **Unofficial-Client-Risiko:** Vote-Reading hängt weiter an whatsapp-web.js (bricht ggf. bei WhatsApp-Web-Änderungen).
- **Umwählen:** Spieler ändern ihre Stimme → nur der letzte Stand zählt; Zeitpunkt „wann gilt die Anwesenheit" definieren.
- **Datenschutz:** Telefonnummern der Spieler in der App speichern — bewusst entscheiden.
- **Nicht-Spieler-Wähler:** Personen in der Gruppe, die keine Spieler sind → ignorieren.
- **Anonyme Polls:** Falls Poll als „anonym" gesendet wird, liefert WhatsApp keine Wähler → Sync unmöglich. Poll muss nicht-anonym sein.

## Aufwand

Deutlich größer als die bisherigen UI-Tweaks: Sidecar-Vote-Tracking + Message-ID-Persistenz + `Player.phone` + Poll↔Training-Kopplung + Mapping-Logik/-UI + Anwesenheit-Schreiben. Eigenes Projekt, am besten schrittweise:

1. `Player.phone` (Feld + UI).
2. Poll speichert `lastSentMessageId` + optionale Training-Kopplung.
3. Sidecar `vote_update` + `GET /poll-votes`.
4. `PollVoteSyncService` + manueller „Übernehmen"-Flow mit Abgleich.

## Fazit

Machbar, aber kein Schnellschuss — steht und fällt mit der zuverlässigen Zuordnung Wähler→Spieler (dafür Nummern an Spielern). Bis dahin bleibt es bei fire-and-forget + manueller Anwesenheit.
