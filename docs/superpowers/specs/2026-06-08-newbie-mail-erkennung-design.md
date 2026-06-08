# Newbie-Mail-Erkennung im Orga-Bereich — Design

**Datum:** 2026-06-08
**Status:** Geplant (noch nicht implementiert — Gmail-Konto-Zugangsdaten liegen noch nicht vor)

## Problem & Ziel

Interessenten ("Newbies"), die per Email beim Training mitmachen wollen, gehen im allgemeinen Spam-Aufkommen des Vereins-Postfachs unter und werden übersehen. Ziel: Das Backend liest das Gmail-Postfach regelmäßig aus, erkennt Newbie-Anfragen per Keyword-Heuristik (auch im Spam-Ordner), speichert sie in einer DB-Tabelle und zeigt sie im bestehenden **Orga**-Bereich der App als Liste plus rotem Badge am Nav-Tab.

**Bewusst NICHT Teil dieser Lösung:**
- KI-Klassifikation (Kostenwunsch des Users → reine Keyword-Heuristik).
- Öffentliches Anmeldeformular statt Email (verworfen: keine Info-Seite/Orga-Struktur dafür vorhanden).
- Automatisches Antworten auf Anfragen.

## Überblick / Datenfluss

```
Gmail-Postfach                 Backend (Scheduled, alle ~15 min)        App-UI (Orga)
┌──────────────┐   IMAP-Pull   ┌─────────────────────────────┐  REST   ┌──────────────┐
│ INBOX        │ ────────────► │ 1. Mails holen (INBOX+Spam) │ ──────► │ Newbie-Liste │
│ [Gmail]/Spam │               │ 2. Keyword-Klassifikation   │         │ + Badge (3)  │
└──────────────┘               │ 3. Dedup per Message-ID     │         └──────────────┘
                               │ 4. Neue als NEU speichern   │
                               └─────────────────────────────┘
                                            │
                                       PostgreSQL
                                  (Tabelle newbie_anfrage,
                                   Tabelle mail_config)
```

Pull-Modell: Backend pollt selbst, kein Webhook, keine offene Verbindung. Bei Downtime wird beim nächsten Lauf nachgeholt.

## Architektur — Onion-Einordnung

Fügt sich in die bestehende Onion/Hexagonal-Struktur ein. Dependency-Regel bleibt gewahrt (Domain kennt kein IMAP/JPA).

```
domain/
  model/NewbieAnfrage.java                POJO (Status-Enum NEU/ERLEDIGT/KEIN_NEWBIE)
  model/MailConfig.java                   POJO (nicht-geheime Mail-Konfiguration)
  port/out/NewbieAnfrageRepository.java    Interface
  port/out/MailConfigRepository.java       Interface
  port/out/MailboxPort.java                Interface "hol mir Mails seit X aus Ordnern Y"
  service/NewbieClassifier.java            reine Keyword-Logik (kein Spring, kein State)

application/
  NewbieAnfrageService.java                Orchestrierung: poll → classify → dedup → save; Status-Updates; Count
  MailPollingScheduler.java                @Scheduled, ruft NewbieAnfrageService.pollAndStore()
  MailConfigService.java                   liest/schreibt MailConfig (Settings-UI)

adapter/
  in/web/NewbieAnfrageController.java       REST: Liste, Status-Update, Count
  in/web/MailConfigController.java          REST: Settings lesen/schreiben
  dto/...                                   NewbieAnfrageResponse, StatusUpdateRequest, MailConfigRequest/Response
  out/persistence/entity/NewbieAnfrageEntity.java + MailConfigEntity.java
  out/persistence/repository/SpringNewbieAnfrageRepository.java + SpringMailConfigRepository.java
  out/persistence/mapper/...                Entity ↔ Model
  out/persistence/adapter/NewbieAnfrageRepositoryAdapter.java + MailConfigRepositoryAdapter.java
  out/mail/ImapMailboxAdapter.java          implementiert MailboxPort, Jakarta Mail (angus-mail)

db/migration/
  V{n}__newbie_anfrage.sql
  V{n+1}__mail_config.sql
```

`MailboxPort` als Domain-Interface → `ImapMailboxAdapter` implementiert es im äußeren Ring. Klassifikation testbar mit Fake-Mailbox; kein echtes Postfach für Tests nötig.

## Datenmodell

### Tabelle `newbie_anfrage`

| Spalte | Typ | Inhalt |
|--------|-----|--------|
| id | BIGSERIAL PK | |
| message_id | TEXT UNIQUE NOT NULL | Mail-`Message-ID` vom Server — Dedup-Schlüssel |
| absender_name | TEXT | Anzeigename des Absenders (nullable) |
| absender_email | TEXT NOT NULL | Absender-Adresse |
| betreff | TEXT | Betreff |
| snippet | TEXT | erste ~300 Zeichen des Bodys (Plaintext) |
| empfangen_am | TIMESTAMP NOT NULL | Mail-Datum |
| gefunden_in | TEXT NOT NULL | `INBOX` oder `SPAM` |
| matched_keyword | TEXT | welches Keyword traf (zur Nachvollziehbarkeit) |
| status | TEXT NOT NULL DEFAULT 'NEU' | `NEU` / `ERLEDIGT` / `KEIN_NEWBIE` |
| erstellt_am | TIMESTAMP NOT NULL DEFAULT now() | |

Voller Mail-Body wird **nicht** gespeichert — bei Bedarf "Im Gmail öffnen"-Verweis (Message-ID / Web-Link).

### Tabelle `mail_config` (Single-Row-Config)

| Spalte | Typ | Inhalt |
|--------|-----|--------|
| id | BIGINT PK (immer 1) | Single-Row |
| imap_host | TEXT | z.B. `imap.gmail.com` |
| imap_user | TEXT | Email-Adresse / IMAP-User |
| poll_enabled | BOOLEAN DEFAULT false | An/Aus-Schalter |
| poll_interval_minutes | INT DEFAULT 15 | Poll-Frequenz |
| lookback_days | INT DEFAULT 14 | wie weit zurück Mails geholt werden |
| keywords | TEXT | kommagetrennte Keyword-Liste |
| scan_spam | BOOLEAN DEFAULT true | Spam-Ordner mitlesen |

Das **Passwort steht NICHT in dieser Tabelle** — siehe Sicherheit.

## Mail-Zugriff (IMAP)

- Lib: Jakarta Mail (`org.eclipse.angus:angus-mail`). Standard-Java-IMAP-Client.
- Verbindung: `imap.gmail.com:993` über SSL.
- Auth: Gmail-**App-Passwort** (16-Zeichen-Code, im Google-Account unter Sicherheit → App-Passwörter erzeugt; jederzeit ohne Haupt-Passwort-Wechsel widerrufbar). Normale Passwörter funktionieren bei aktivem 2FA nicht für Programme.
- Gelesene Ordner: `INBOX` **und** `[Gmail]/Spam`. Das Mitlesen des Spam-Ordners ist der Kern gegen das "geht im Spam unter"-Problem — kein manueller Gmail-Filter nötig.
- Read-only: App setzt **keine** Flags und verschiebt nichts im Postfach (kein `\Seen`, kein Label). Der Zustand liegt ausschließlich in der App-DB.

## Klassifikation (Keyword-Heuristik)

Reine Domain-Logik in `NewbieClassifier`, keine KI, keine Kosten.

- Suchtext = `Betreff + Body`, lowercase, Umlaute normalisiert.
- Treffer, wenn mindestens ein Keyword als Teilstring vorkommt. Erstes Treffer-Keyword wird als `matched_keyword` gespeichert.
- Startliste (in `mail_config.keywords`, über Settings-UI editierbar): `training, mitmachen, mitspielen, probetraining, schnuppern, vorbeischauen, mitkommen, anfänger, einsteiger, interesse, dabei sein, beitreten, ausprobieren`.
- Keyword **highlightet**, filtert nicht hart: Treffer wird als Kandidat gespeichert, Mensch bestätigt final in der UI. Fehlalarm (Spam mit "training") → "Kein Newbie"-Klick.
- Kein Match → Mail wird ignoriert (nicht gespeichert).

## Polling & Dedup

- `MailPollingScheduler` mit `@Scheduled(fixedDelayString = ...)` (Intervall aus `mail_config`, Default 15 min). Läuft nur wenn `poll_enabled = true`.
- Pro Lauf: verbinde IMAP → öffne INBOX + ggf. Spam → hole Mails der letzten `lookback_days` → klassifiziere → für jeden Treffer Dedup-Check → neue Zeilen anlegen → Verbindung schließen.
- **Dedup:** vor Insert "existiert `message_id` schon?" → ja: skip, nein: neu als `status = NEU`. So entstehen bei wiederholtem Poll keine Duplikate; auch ein als `KEIN_NEWBIE`/`ERLEDIGT` markierter Eintrag taucht nicht erneut als NEU auf.

## Status-Workflow

- **NEU** — frisch erkannt, ungesehen → zählt für den Badge.
- **ERLEDIGT** — abgehandelt (kontaktiert/eingeladen).
- **KEIN_NEWBIE** — Fehlalarm, weggeklickt.

UI zeigt die Liste (Default-Filter: NEU + ERLEDIGT, oder Tabs/Filter), pro Eintrag Status-Buttons. Status-Wechsel = `PATCH`/`PUT` auf den Eintrag.

## Badge & UI

- **Endpoint:** `GET /api/newbie-anfragen/count?status=NEU` → Zahl.
- **Nav:** Layout (`frontend/src/components/layout/Layout.tsx`, `TABS`-Array) zeigt rote Zahl am Orga-Tab, wenn Count > 0. Tab nutzt bereits `Mail`-Icon.
- **Refresh:** Frontend pollt Count in moderatem Intervall (z.B. alle paar Minuten) bzw. bei Navigation/Fokus.
- **Liste:** neuer Abschnitt im Orga-Bereich (heute `InvitationListPage` = Einladungen). Optionen für die Plan-Phase: eigener Unter-Tab/Abschnitt unter `/orga` oder eigene Route `/orga/anfragen`. Wiederverwendung der vorhandenen `EmptyState` (CrossBones) für "keine Anfragen".
- React-State über neuen Hook `useNewbieAnfragen` (Liste + Count + Status-Mutationen), passend zur bestehenden Hook-Konvention.

## Konfiguration & Credentials (Hybrid)

Secret von Config trennen:

- **Passwort = Env-Var** `MAIL_IMAP_PASSWORD` auf dem VPS (analog `APP_AUTH_PASSWORD`, `GEMINI_API_KEY`). Nie in DB, nie in Git. Wechsel = Env-Var auf VPS ändern + Backend-Neustart (~2 min, SSH nötig; App-Passwort wechselt man praktisch nie).
- **Rest in App-Settings-UI** (`mail_config`-Tabelle, editierbar ohne Redeploy): IMAP-Host, User/Email, Poll-Intervall, Lookback, **Keyword-Liste**, Spam-Scan an/aus, Poll an/aus. Größter Gewinn: Keywords über die Zeit anpassbar.
- `application.properties` (Fallback/Defaults, falls DB-Config leer):
  ```
  mail.imap.password=${MAIL_IMAP_PASSWORD:}
  ```
- Default `poll_enabled = false` → lokal und in Tests läuft kein Poll ohne echtes Postfach.

## Sicherheit

- IMAP-Passwort ausschließlich als Env-Var, nicht in DB, nicht in der UI sichtbar. Vermeidet Klartext-in-Postgres und Verschlüsselungs-Key-Management.
- App-Login ist ein geteiltes Basic-Auth (`admin`). Da das Passwort nie in der UI erscheint, wächst die Angriffsfläche durch das Feature nicht um das Mail-Secret.
- App arbeitet read-only auf dem Postfach (keine Schreibrechte nötig — App-Passwort kann auf IMAP beschränkt werden).
- Snippet statt Volltext in der DB hält gespeicherte personenbezogene Daten klein.

## Testing

- `NewbieClassifier`: reine Unit-Tests (Keyword-Treffer, Umlaut-Normalisierung, Negativfälle).
- `NewbieAnfrageService`: Test mit Fake-`MailboxPort` (liefert vorgefertigte Mails) → prüft Dedup, Status-Default NEU, Ignorieren von Nicht-Treffern.
- `ImapMailboxAdapter`: nicht gegen echtes Gmail testen; ggf. GreenMail (In-Memory-IMAP) für einen Integrationstest, sonst manuell verifiziert sobald Konto vorliegt.
- Controller-Tests für Liste/Count/Status-Update (Testcontainers-Postgres wie im Rest des Projekts).
- Build-Gate vor Commit: `cd frontend && npm run build`, `cd backend && ./mvnw test -s .mvn/local-settings.xml`.

## Offene Punkte (für Plan/Implementierung)

1. **Konto-Zugangsdaten liegen noch nicht vor** → IMAP-Adapter erst gegen echtes Postfach verifizierbar, wenn das Vereins-Gmail + App-Passwort bereitstehen. Implementierung kann bis dahin mit Fake-Mailbox vollständig gebaut + getestet werden; nur der echte End-to-End-Lauf wartet.
2. Body-Parsing: multipart/HTML-Mails → Plaintext extrahieren für Snippet + Keyword-Suche.
3. UI-Verortung final entscheiden: Unter-Abschnitt in `InvitationListPage` vs. eigene Route `/orga/anfragen`.

## YAGNI / bewusst weggelassen

- Keine KI-Klassifikation.
- Kein Schreiben ins Postfach (keine Auto-Labels, kein Als-gelesen-Markieren).
- Keine Push-Notification (Badge reicht laut User "erstmal").
- Kein Multi-Postfach / Multi-Team (App ist Single-Team).
- Kein verschlüsseltes Passwort-Feld in der UI (Hybrid-Entscheidung).
