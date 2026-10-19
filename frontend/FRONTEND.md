# Frontend — Softball Lineup Planner

React SPA fuer den Softball Lineup Planner.

## Tech Stack

- React 18, TypeScript, Vite
- Tailwind CSS v4 (CSS-basierte Konfiguration)
- React Router DOM (Client-Side Routing)
- @dnd-kit/core + @dnd-kit/sortable (Drag & Drop)
- Eigene SVG-Icons (keine Icon-Library)

## Starten

```bash
cd frontend
npm install
npm run dev
```

Laeuft auf `http://localhost:5173`. Vite proxied `/api` automatisch auf `http://localhost:8080`.

## Routen

| Route | Komponente | Beschreibung |
|-------|-----------|-------------|
| `/` | Dashboard | Saisons, Spieltage, Statistiken |
| `/players` | PlayerManager | Spieler CRUD |
| `/gameday/:id` | GameDayPlanner | Lineup-Planung |
| `/gameday/:id/export` | LineupSheet | Druckansicht |

## Projektstruktur

```
src/
├── api/client.ts              # API-Client (alle Endpoints)
├── types/index.ts             # TypeScript Interfaces + Konstanten
├── styles/index.css           # Tailwind Config, Theme, Animationen
├── icons/                     # SVG-Icon-Komponenten
│   ├── index.tsx              # Alle Icons (CrossBones, Pencil, etc.)
│   └── SkullLogo.tsx          # Team-Logo SVG
├── hooks/                     # Custom React Hooks
│   ├── useSeasons.ts          # Saison CRUD
│   ├── usePlayers.ts          # Spieler CRUD
│   ├── useGameDay.ts          # Spieltag laden + State
│   ├── useLineup.ts           # Lineup State + DnD + Save
│   ├── useStaff.ts            # Coach-Zuordnung
│   └── useToast.ts            # Toast-Benachrichtigungen
├── components/
│   ├── layout/
│   │   ├── Layout.tsx         # App-Shell (Header, Navigation, Toast)
│   │   └── Toast.tsx          # Toast-Anzeige
│   ├── dashboard/
│   │   ├── Dashboard.tsx      # Saison + Spieltage + Stats
│   │   ├── SeasonSelector.tsx # Dropdown + Create/Edit/Delete
│   │   ├── GameDayCard.tsx    # Spieltag-Karte mit Edit/Delete
│   │   ├── EditGameDayModal.tsx # Spieltag bearbeiten
│   │   └── SeasonStats.tsx    # Saison-Statistik-Tabelle
│   ├── planner/
│   │   ├── GameDayPlanner.tsx # Hauptcontainer
│   │   ├── GameTabs.tsx       # Spiel-Tabs + Gegner + Swap + Dots
│   │   ├── LineupEditor.tsx   # DnD Lineup-Liste
│   │   ├── LineupRow.tsx      # Einzelne Lineup-Zeile + DH
│   │   ├── PlayerPool.tsx     # Spieler-Pool (Liste)
│   │   ├── FieldView.tsx      # SVG Baseball-Feld
│   │   ├── CoachSlots.tsx     # 1st/3rd Base Coach
│   │   ├── BenchDisplay.tsx   # Bank-Anzeige
│   │   ├── SaveButton.tsx     # Speichern-Button
│   │   ├── AvailablePlayersModal.tsx # Spieler-Auswahl
│   │   └── CopyLineupModal.tsx # Lineup von anderem Spiel kopieren
│   ├── players/
│   │   └── PlayerManager.tsx  # Spieler verwalten
│   ├── export/
│   │   └── LineupSheet.tsx    # Druck-Export
│   └── shared/
│       └── ConfirmModal.tsx   # Wiederverwendbarer Loeschen-Dialog
├── App.tsx                    # Router-Setup
└── main.tsx                   # Entry Point
```

## Design

- **Farben:** Navy (#111B6B) als Primary, Softball-Red (#CC2936) als Akzent
- **Logo:** DeadSox als Vektor (deadsox.svg) für Favicon + Navigation; deadsox.png nur für das Einladungs-PDF
- **Icons:** Eigene SVGs (CrossBones fuer Empty States, Pencil, TrashBin, etc.)
- **Modals:** Dark Backdrop fuer alle Create/Edit/Delete-Aktionen
- **Cursor:** Custom Pencil-Cursor fuer editierbare Textfelder
- **Hover:** Edit/Delete-Buttons erscheinen on hover
- **Responsive:** Desktop 3-Spalten Grid, Mobile single column
