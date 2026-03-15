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

## Lokale Entwicklung

### Voraussetzungen

- Node.js 18+
- PostgreSQL (lokal oder Docker)
- Strava API App (Client ID + Secret)

### Installation

```bash
npm install
```

### Umgebungsvariablen

Erstelle eine `.env` Datei:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=<passwort>
DB_DATABASE=veloveni_db

JWT_SECRET=<zufälliger_string>
JWT_EXPIRES_IN=30d

STRAVA_CLIENT_ID=<strava_client_id>
STRAVA_CLIENT_SECRET=<strava_client_secret>
STRAVA_REDIRECT_URI=http://localhost:5173/strava/callback
```

### Starten

```bash
# Entwicklung (watch mode)
npm run start:dev

# Produktion
npm run start:prod
```

Die API läuft unter `http://localhost:3000`.

### Demo-Daten einspielen

```bash
npm run seed
```

Erstellt 8 fiktive Radfahrer mit Aktivitäten und Territorien quer durch Deutschland.

## API-Übersicht

| Methode | Endpoint | Beschreibung |
|---|---|---|
| `POST` | `/auth/strava/callback` | Strava OAuth abschließen |
| `GET` | `/auth/me` | Eigenes Profil |
| `POST` | `/activities/sync` | Aktivitäten von Strava synchronisieren |
| `GET` | `/activities` | Eigene Aktivitäten |
| `GET` | `/activities/friends` | Aktivitäten von Strava-Freunden |
| `POST` | `/activities/recalculate` | Territorien neu berechnen |
| `GET` | `/territories/all` | Alle sichtbaren Territorien |
| `GET` | `/territories/friends` | Territorien eigener Strava-Kontakte |
| `GET` | `/territories/me` | Eigenes Territorium |
| `GET` | `/territories/tiles/crossings` | Tile-Crossing-Statistiken |
| `GET` | `/leaderboard` | Globale Rangliste |
| `GET` | `/leaderboard/friends` | Freunde-Rangliste |
| `GET` | `/user/me/privacy` | Privatsphäre-Einstellungen abrufen |
| `PATCH` | `/user/me/privacy` | Privatsphäre-Einstellungen aktualisieren |
| `GET` | `/auth/export` | Eigene Daten exportieren (DSGVO) |
| `DELETE` | `/auth/account` | Account löschen (DSGVO) |
