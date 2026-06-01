# Wetter pro Spieltag + Spieltags-Auszeichnungen — Design

**Datum:** 2026-06-01
**Status:** Approved (Design-Phase)

Zwei unabhängige Dashboard-Features. Beide lesen vorhandene Daten/externe API, keine Scoring-Logik betroffen.

---

## Feature 1 — Wetter pro Spieltag

### Ziel
Im Dashboard-Hero (`HeroNextGameDay`) für den nächsten/heutigen Spieltag eine kompakte Wetter-Pill: Tagesfenster-Min–Max-Temperatur (8–18 Uhr) + Wetter-Icon + Regenwahrscheinlichkeit. Nice-to-have — darf nie blockieren.

### Datenquelle
- **Open-Meteo** (gratis, kein API-Key, kein Account).
  - Geocoding-API: location-String → Koordinaten.
  - Forecast-API: Koordinaten + Datum → stündliche Werte, Horizont ~16 Tage.
- `location` am GameDay ist Freitext → **Auto-Geocode** des Strings. Keine neuen Felder, keine DB-Migration.

### Architektur (Onion)
- **Domain**
  - `domain/model/Coordinates` (record: lat, lon)
  - `domain/model/DayForecast` (record: `tempMin`, `tempMax` über Fenster 8–18 Uhr, `wmoCode` int, `precipitationProbabilityPct` int)
  - `domain/port/out/GeocodingPort` — `Optional<Coordinates> geocode(String location)`
  - `domain/port/out/WeatherForecastPort` — `Optional<DayForecast> forecast(Coordinates coords, LocalDate date)`
- **Adapter out** (`adapter/out/weather/`)
  - `OpenMeteoGeocodingAdapter implements GeocodingPort` (RestClient)
  - `OpenMeteoWeatherAdapter implements WeatherForecastPort` (RestClient)
  - Beide `@ConditionalOnProperty("feature.weather.enabled")`
- **Application**
  - `WeatherService` — orchestriert `geocode(location)` → `forecast(coords, date)`.
  - In-Memory-Cache: Geocode-Ergebnis dauerhaft je location-String (location ändert sich selten); Forecast TTL ~2h je (coords, date). Simpler `ConcurrentHashMap` mit Zeitstempel, kein zusätzliches Framework.
- **Adapter in/web**
  - `GET /api/gamedays/{id}/weather` → `WeatherResponse` (DTO: tempMin, tempMax, wmoCode, precipitationProbabilityPct) **oder HTTP 204** wenn: Feature aus, Geocode scheitert, Datum > Horizont, Datum in Vergangenheit, API-Fehler.
- **Config**
  - `feature.weather.enabled=${WEATHER_ENABLED:true}` in `application.properties` (gratis → default an). Service liefert leer wenn aus.

### Frontend
- Neue Mini-Komponente `WeatherPill`.
- `HeroNextGameDay` ruft `GET /api/gamedays/{id}/weather` **nur** wenn variant ∈ {`today`, `upcoming`} **und** Datum ≤ 14 Tage entfernt. Bei `past` kein Call.
- Pill-Inhalt: WMO-Code → lucide-Icon + `14–22°` + Regen `🌧`/`30%` (Regen-Text auch lucide `CloudRain`, kein Emoji).
- WMO→lucide-Mapping: 0 klar → `Sun`; 1–3 bewölkt → `Cloud`/`CloudSun`; 45/48 Nebel → `CloudFog`; 51–67/80–82 Regen → `CloudRain`; 71–77/85–86 Schnee → `CloudSnow`; 95–99 Gewitter → `CloudLightning`.
- Fehlende/leere Antwort (204) → Pill rendert nichts. Kein Fehler-Toast.

### Edge-Cases
| Fall | Verhalten |
|------|-----------|
| Geocode scheitert (vager String) | 204 → keine Pill |
| Datum > ~16 Tage | 204 → keine Pill |
| Datum in Vergangenheit | kein Call (Frontend) bzw. 204 |
| Open-Meteo down/timeout | 204 → keine Pill, still |
| Feature-Flag aus | 204 → keine Pill |

---

## Feature 2 — Spieltags-Auszeichnungen (Awards)

### Ziel
Für fertige Spieltage automatisch Titel vergeben aus den Batting-Stats des Spieltags. Headline-MVP + Themen-Titel. Engagement + umgeht Small-Sample-Verzerrung eines einzelnen OPS-MVP (~9–12 PA/Spieler/Spieltag).

### Datenquelle
- Bestehender Endpoint `GET /api/gamedays/{id}/batting-stats` → `List<PlayerBattingStatsResponse>`. Keine neue Scoring-Logik.

### Titel & Regeln
| Titel | Icon (lucide) | Kriterium | Schwelle |
|-------|---------------|-----------|----------|
| MVP des Spieltags | `Trophy` | höchster Composite `TB + RBI + BB + SB` | ≥2 PA; Tiebreak OPS → PA |
| Power | `Flame` | meiste Total Bases **unter Spielern mit Extra-Base-Hit** | ≥2 PA; nur Spieler mit ≥1 XBH & TB>0 (Pre-Filter, damit nicht der Singles-Leader den Titel blockiert) |
| Speed | `Wind` | meiste Stolen Bases | nur wenn ≥1 SB |
| On-Base | `Target` | beste OBP | ≥2 PA; **nur wenn ≠ MVP-Spieler** (sonst weglassen, kein Doppel) |

- Headline-MVP wird immer vergeben, sofern überhaupt ABs existieren.
- Themen-Titel fallen weg, wenn Datenlage leer/uneindeutig (kein qualifizierter Spieler).
- Ein Spieler darf mehrere Titel halten (außer On-Base-Dedup gegen MVP).

### Architektur (Onion)
- **Domain**
  - `domain/model/Award` (record: `type` enum, `playerId`, `playerName`, `displayValue` String)
  - `domain/model/AwardType` enum: `MVP`, `POWER`, `SPEED`, `ON_BASE`
  - `domain/service/GamedayAwardCalculator` — **pur**, kein Spring. Input `List<BattingStats>`, Output `List<Award>`. Enthält gesamte Logik: Composite-Formel, Schwellen, Tiebreaks, Dedup.
- **Application**
  - `AwardService` — ruft `BattingStatsService.getGameDayStats(id)`, übergibt an `GamedayAwardCalculator`. SRP getrennt von Stats-Aggregation.
- **Adapter in/web**
  - `GET /api/gamedays/{id}/awards` → `List<AwardResponse>` (DTO: type, playerId, playerName, displayValue).

### Frontend
- Neue Komponente `AwardBadges`.
- Anzeige nur für **fertige** Spieltage (Awards-Liste nicht leer).
- Badge-Reihe: lucide-Icon + Titel + Spielername (+ optional displayValue).
- Platz: past-Variante im `HeroNextGameDay` + auf `GameDayCard`/Detail-Sheet.
- Leere Awards-Liste → Komponente rendert nichts.

### Edge-Cases
| Fall | Verhalten |
|------|-----------|
| Keine ABs am Spieltag | leere Liste → keine Badges |
| Niemand erreicht Schwelle für Themen-Titel | Titel entfällt, MVP bleibt |
| On-Base-Sieger == MVP | On-Base entfällt |

---

## Nicht-Ziele (bewusst raus)
- Calendar-Export (.ics) — vom User gestrichen.
- Abstimmung/Verfügbarkeits-Polling.
- Eigene Spieler-Accounts.
- Lat/Lon-Felder am GameDay (Auto-Geocode reicht).
- Saison-/All-Time-Award-Aggregation (erst Spieltag-Ebene).
