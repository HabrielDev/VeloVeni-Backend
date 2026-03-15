# VeloVeni — Backend

REST-API für VeloVeni, ein Strava-basiertes Geolocation-Spiel. Radfahrer erkunden Deutschland kachelweise (0,01°×0,01°-Raster) und konkurrieren miteinander um Territorium.

## Tech Stack

- [NestJS](https://nestjs.com) + [TypeScript](https://www.typescriptlang.org)
- [TypeORM](https://typeorm.io) — Datenbankabstraktion
- [PostgreSQL](https://www.postgresql.org) — Datenbank
- [JWT](https://jwt.io) — Authentifizierung
- [Strava API v3](https://developers.strava.com) — OAuth & Aktivitätsdaten

## Features

- **Strava OAuth** — Token-Austausch, automatische Token-Erneuerung
- **Aktivitätssynchronisation** — Abruf und Speicherung von Strava-Aktivitäten
- **Territoriumsberechnung** — Tile-Ownership-Algorithmus (Wer hat eine Kachel am häufigsten überquert?)
- **Freunde-Endpoints** — Territorien und Aktivitäten gefiltert nach Strava-Following
- **Privatsphäre-Einstellungen** — `shareZones` / `shareRides` pro User konfigurierbar
- **Leaderboard** — Global und Freunde-basiert mit Tile-Crossing-Rangliste
- **Rate Limiting** — 60 Requests/Minute via Throttler
- **Seed-Script** — Demo-Daten mit 8 fiktiven Fahrern für Entwicklung und Tests
- **DSGVO** — Datenexport und Account-Löschung

## Projektstruktur

```
src/
├── auth/           # Strava OAuth, JWT-Strategie, Token-Refresh
├── users/          # User-Entity, Profil, Privatsphäre-Einstellungen
├── activities/     # Aktivitäts-Sync, Routen, Freunde-Aktivitäten
├── territories/    # Tile-Berechnung, Ownership-Algorithmus, Crossing-Tracking
├── leaderboard/    # Ranglisten-Endpoints (global + Freunde)
├── common/         # Guards, Decorators
└── seed/           # Demo-Daten-Script
```
