# Einladungs-Generator (Orga) — Design

**Datum:** 2026-06-05
**Status:** Approved (Brainstorming)
**Kontext:** Dead Sox geben für Heimturniere (Indoor Series / College Series "Cose") jährlich eine Einladung als PDF heraus, die per WhatsApp geteilt wird. Bisher manuell in Word. Feature: in der App speicherbare Einladungs-Vorlagen anlegen, dynamisch befüllen und als PDF generieren.

## Analyse der Beispiel-PDFs

Beide (Indoor 2026, Cose 2024) folgen demselben Brief-Template:
- Briefkopf: „Düsseldorf Dead Sox / Heinrich-Heine-Universität Düsseldorf / Düsseldorf, <Briefdatum>" + DeadSox-Logo oben rechts.
- „Einladung" + Untertitel „Zum <Titel> in Düsseldorf am Samstag, den <Turnierdatum>".
- Begrüßung „Hallo <T1>, <T2> und <T3>," (die 3 Gastteams).
- Intro „wir laden euch herzlich zum <Titel> am <Turnierdatum> in Düsseldorf ein."
- Spielplan-Tabelle: Zeit | Heim/Team1 | Gast/Team2 | Ump (~6 Spiele).
- Anfahrt-Text (Ort-spezifisch), „Für das leibliche Wohl ist wie immer gesorgt.", Schluss „Wir freuen uns auf euch / Eure Düsseldorf Dead Sox".
- Kontakt: Trainer + Obfrau (Name, E-Mail, Telefon).

Unterschiede: Titel, Ort (Sporthalle vs Rasenplatz), Datum, 3 Gastteams, Spielplan, Kontakte. **Spalten-Modus:** Indoor entscheidet Heim/Gast per Münzwurf → „Team 1 / Team 2"; Cose hat feste „Heim / Gast".

## Entscheidungen (Brainstorming)

1. **Speichern:** Backend, mehrere Vorlagen (Liste, bearbeiten, duplizieren, löschen, PDF).
2. **Ump:** je Spiel wählbar (Spalte im Spielplan).
3. **Teams:** Freitext je Einladung (3 Gäste); „Dead Sox" fix als 4. Team. Spielplan-Dropdowns aus diesen 4.
4. **Spalten-Modus:** pro Einladung `HEIM_GAST` (Cose) oder `TEAM_1_2` (Indoor/Münzwurf).
5. **Boilerplate-Text** (Anfahrt/Schluss): vorbefüllte, editierbare Textfelder.

## Datenmodell

Neue Entity `Invitation` (Tabelle `invitations`, Migration **V35**):

| Feld | Typ | Bedeutung |
|------|-----|-----------|
| `id` | BIGSERIAL | PK |
| `title` | VARCHAR | z.B. „Indoor Series Turnier" |
| `letterDate` | DATE | Briefdatum (default heute) |
| `eventDate` | DATE | Turnierdatum |
| `venue` | VARCHAR | z.B. „Sporthalle der HHU Düsseldorf" |
| `pairingMode` | VARCHAR(10) | `HEIM_GAST` \| `TEAM_1_2` |
| `bodyText` | TEXT | Anfahrt + Schluss-Boilerplate (vorbefüllt, editierbar) |
| `guestTeams` | JSONB | `string[]` (3 Gastteams) |
| `games` | JSONB | `[{ time, teamA, teamB, ump }]` |
| `contacts` | JSONB | `[{ role, name, email, phone }]` |
| `createdAt`/`updatedAt` | TIMESTAMP | |

Eigenes Team „Dead Sox" ist nicht gespeichert (Konstante, vgl. ownTeam-Pattern in SeasonService).

JSONB-Mapping wie bei `TrainingPlanContent` (Jackson, `@JdbcTypeCode(SqlTypes.JSON)`).

## Architektur (Onion)

- **domain/model:** `Invitation`, `InvitationGame` (time, teamA, teamB, ump), `InvitationContact` (role, name, email, phone), enum `PairingMode`.
- **domain/port/out:** `InvitationRepository`.
- **application:** `InvitationService` — CRUD + `duplicate(id)` (Kopie mit „(Kopie)"-Titel). Keine spezielle Domain-Logik.
- **adapter/out/persistence:** `InvitationEntity` (Skalar + JSONB-Strings), Mapper (Jackson), `InvitationRepositoryAdapter`, `SpringInvitationRepository`.
- **adapter/in/web:** `InvitationController` — `GET /api/invitations`, `GET /{id}`, `POST`, `PUT /{id}`, `POST /{id}/duplicate`, `DELETE /{id}`.
- **adapter/dto:** `InvitationResponse`, `InvitationRequest` (+ nested game/contact records), Bean Validation.

## Frontend

- **Nav:** neuer Top-Level-Bereich „Orga" (in `Layout`-Nav). Route-Gruppe `/orga/einladungen`.
- **`useInvitations`-Hook:** Liste + CRUD + duplicate (API-Client `src/api/client.ts`).
- **`InvitationListPage`:** Karten (Titel + eventDate), Aktionen Neu/Bearbeiten/Duplizieren/Löschen (ConfirmModal)/PDF.
- **`InvitationEditor`:** Kopf-Felder (Titel, Brief-/Turnierdatum, Ort, Spalten-Modus, 3 Gastteams, Body-Text) + **`GameScheduleEditor`** (Zeilen: Zeit, TeamA, TeamB, Ump — Dropdowns aus {Dead Sox + Gäste}, add/remove/sort) + **`ContactEditor`** (Zeilen Rolle/Name/Mail/Tel, add/remove). Speichern via Hook.
- Konventionen: dark-navy Hover, Hover-Reveal, Modals statt confirm(), deutsche Labels.

## PDF

`src/utils/invitationPdf.ts` (jsPDF, Muster wie `pdfExport.ts`):
- Briefkopf + DeadSox-Logo (`deadsox.jpeg`).
- „Einladung" + Untertitel + Begrüßung (Gästeliste join „, "/„ und ") + Intro (aus `eventDate` formatiert, deutsches Datum).
- Spielplan-Tabelle: Header je `pairingMode` („Heim/Gast" oder „Team 1/Team 2") + „Ump".
- `bodyText` (Anfahrt/Schluss) + Kontakt-Block (Rolle: Name, Mail, Tel).
- Download als `Einladung_<Titel>_<Jahr>.pdf`. Teilen macht der User (WhatsApp).

## Datenfluss

Editor → `useInvitations.save()` → `PUT/POST /api/invitations` → DB. PDF: Liste/Editor → `generateInvitationPdf(invitation)` rein clientseitig aus dem geladenen Objekt.

## Nicht im Scope (YAGNI)

- Automatischer Round-Robin-Spielplan-Generator (Spielplan manuell).
- E-Mail-Versand / direkte WhatsApp-Integration (nur PDF-Download).
- Teams aus Liga-Tabelle verknüpfen (Freitext).
- Mehrsprachigkeit.

## Verifikation

- Backend: `./mvnw test -s .mvn/local-settings.xml` — Invitation-CRUD + JSONB-Roundtrip + duplicate.
- Frontend: `npm run build`, `npm run lint`, ggf. Vitest für PDF-Datenaufbereitung (Begrüßungs-/Datums-Helfer).
- Manuell: Einladung anlegen (Indoor + Cose), PDF generieren, mit Beispiel-PDFs vergleichen; duplizieren + Datum ändern.
