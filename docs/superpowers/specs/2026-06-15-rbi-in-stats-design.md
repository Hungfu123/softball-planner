# RBI in Stats — Design

**Datum:** 2026-06-15
**Status:** Approved

## Ziel

RBIs (Runs Batted In) in der Stats-Seite sichtbar machen:
1. **RBI gesamt** pro Spieler (aggregierte Scopes).
2. **RBI Ø pro Game** pro Spieler.
3. **RBI am jeweiligen Spiel** (Scope „Spiel").

## Datenlage (bereits vorhanden)

- `PlayerBattingStatsResponse.runsBattedIn` — wird vom `BattingStatsCalculator` aus
  `AtBat.rbi` summiert, für **jeden** Scope (Saison/Jahr/Alle Zeit/Spieltag/Spiel).
- `SeasonPlayerStats.totalGames` — gewichteter Game-Zähler (Field=1.0, EH/DH=0.5),
  geladen in `StatsPage` für aggregierte Scopes (`gamesStats`).

→ **Kein neuer Endpoint, keine Migration, keine Backend-Änderung.** RBI/G wird im
Frontend aus vorhandenen Daten berechnet.

## Frontend

### `BattingStatsTable.tsx`
- Zwei neue, **immer sichtbare** Spalten:
  - **RBI** = `runsBattedIn` (sortierbar via vorhandenem `sortTh`).
  - **RBI/G** = `runsBattedIn / totalGames`, 2 Nachkommastellen (sortierbar).
    `totalGames === 0` → Anzeige `—` (keine Division durch 0).
- Neue Prop `gamesByPlayerId?: Map<number, number>` (playerId → totalGames).
- Scope-Verhalten:
  - **Aggregierte Scopes** (Saison/Jahr/Alle Zeit): RBI **und** RBI/G sichtbar.
  - **Spiel / Spieltag**: nur **RBI** (das ist „RBI am jeweiligen Game"); RBI/G
    ausgeblendet, da `totalGames` fehlt bzw. Nenner = 1.
  - Sichtbarkeit via neue Prop `showPerGame: boolean` (von `StatsPage` gesteuert).

### `StatsPage.tsx`
- Baut `gamesByPlayerId` aus `gamesStats` (`SeasonPlayerStats[]`).
- Übergibt `gamesByPlayerId` + `showPerGame = isAggregatedScope(scopeKind)` an
  `BattingStatsTable`.

### `StatsGlossarySheet.tsx`
- Kurzerklärung: **RBI** = Runs Batted In (Läufe durch eigenen Schlag ermöglicht),
  **RBI/G** = RBI pro Spiel (gewichteter Game-Zähler als Nenner).

## Out of Scope
- Dashboard-Kachel / Top-Hitter-Banner (nur Stats-Seite).
- Einfacher (ungewichteter) Game-Zähler — bewusst gewichtete `totalGames` genutzt
  (konsistent mit übrigen Stats).

## Datenfluss-Check
- RBI bleibt korrekt vom Steal-of-Home-Fix unberührt: Steals erzeugen keine RBI
  (korrekt), `AtBat.rbi` unverändert.

## Verifikation
- `npm run build` (tsc Typecheck + Build).
- Manuell: Playwright-Screenshot der Scopes Saison + Spiel (RBI sichtbar, RBI/G nur
  aggregiert).
