# VeloVeni | Backend

## Workflow Orchestration

### 1. Plan Mode Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just build
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy

- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop

- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done

- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests - then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Manager

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain changes**: High-Level summary at each step
5. **Document Results**: Add review selection to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after correction

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what´s necessary. Avoid introducing bug.

## Git Workflow

- **Feature Branches**: Für jedes neue Feature IMMER einen neuen Branch erstellen — niemals direkt auf `main` arbeiten.
- **Namenskonvention**: `feature/<kurzer-name>` (z.B. `feature/leaderboard-friends`)
- **Gilt für Frontend UND Backend**: Beide Repos bekommen parallele Feature-Branches.
- **Merge nach Abschluss**: Wenn das Feature fertig und getestet ist, in `main` mergen.

```bash
# Neues Feature starten
git checkout -b feature/mein-feature

# ... entwickeln, committen ...

# Feature abschließen
git checkout main
git merge feature/mein-feature
```

## Deploy-Workflow

- **Nur Gitea** wird für Entwicklung und eigene Tests verwendet.
- **GitHub** ist ausschließlich für Production-Deploys (Railway ist mit GitHub verbunden).
- **IMMER fragen** bevor nach GitHub gepusht wird: "Soll ich die Änderungen jetzt deployen?"
- Deploy-Befehl (Backend): `git push github main`

## Project Overview

VeloVeni ist eine kompetitive Webanwendung, bei der Radfahrer durch ihre GPS-Tracks reale Gebiete auf einer Deutschlandkarte "erobern". Dieses Repository enthält das **Backend**: REST API, Datenbanklogik, Strava OAuth und die Gebiets-Eroberungs-Mechanik.

## Tech Stack

- **Framework:** NestJS 11
- **Datenbank:** PostgreSQL via TypeORM
- **Auth:** Strava OAuth2 + JWT
- **Sprache:** TypeScript (Strict)
- **Testing:** Jest + Supertest

## Architecture & Folder Structure

```
src/
├── auth/              # Strava OAuth2, JWT-Strategie, Guards
│   ├── auth.module.ts
│   ├── auth.controller.ts   # POST /auth/strava/callback
│   ├── auth.service.ts
│   └── jwt.strategy.ts
├── users/             # User-Entity, Profil
│   ├── users.module.ts
│   ├── users.service.ts
│   └── entities/user.entity.ts
├── activities/        # Strava-Aktivitäten, GPS-Tracks
│   ├── activities.module.ts
│   ├── activities.controller.ts
│   ├── activities.service.ts
│   └── entities/activity.entity.ts
├── territories/       # Eroberungs-Logik, Polygon-Berechnung
│   ├── territories.module.ts
│   ├── territories.controller.ts
│   ├── territories.service.ts
│   └── entities/territory.entity.ts
├── leaderboard/       # Ranglisten-Logik
│   ├── leaderboard.module.ts
│   ├── leaderboard.controller.ts
│   └── leaderboard.service.ts
└── common/            # Guards, Decorators, Interceptors, DTOs
    ├── guards/
    ├── decorators/
    └── pipes/
```

## Core Features

- **Strava OAuth2:** Code-Exchange auf dem Server (Client Secret bleibt server-side), JWT zurück ans Frontend
- **Aktivitäten-Sync:** Strava-Aktivitäten abholen, GPS-Tracks in DB speichern
- **Gebietsverwaltung:** GPS-Tracks zu Polygonen verarbeiten, Überschneidungen berechnen
- **Leaderboard:** Globale und Freunde-Ranglisten nach Fläche oder Aktivitäten

## Strava OAuth2 Flow (korrekte Architektur)

```
Frontend                    Backend                     Strava
   |-- redirect to Strava --------------------------------->|
   |<-- code ------------------------------------------------|
   |-- POST /auth/strava/callback { code } -->|
                                |-- exchange code -------->|
                                |<-- access_token + athlete|
                                |-- upsert User in DB
                                |-- generate JWT
   |<-- { access_token: JWT } --|
   |-- alle weiteren Requests mit JWT Bearer Header
```

## API Endpoints (geplant)

```
POST   /auth/strava/callback     # Code → JWT
GET    /auth/me                  # Eigenes Profil (JWT required)

GET    /activities               # Eigene Aktivitäten
POST   /activities/sync          # Strava-Aktivitäten synchronisieren
GET    /activities/:id           # Einzelne Aktivität mit GPS-Track

GET    /territories              # Alle Gebiete (eigene + andere)
GET    /territories/me           # Eigene Gebiete
POST   /territories/recalculate  # Gebiete neu berechnen

GET    /leaderboard              # Globale Rangliste
GET    /leaderboard/friends      # Freunde-Rangliste
```

## Datenbank-Entities (Übersicht)

```typescript
// User
id, stravaId, firstname, lastname, profilePicture,
stravaAccessToken, stravaRefreshToken, stravaTokenExpiresAt,
createdAt, updatedAt

// Activity
id, stravaActivityId, userId, name, distance, movingTime,
elevationGain, sportType, startDate, gpsTrack (GeoJSON), createdAt

// Territory
id, userId, polygon (GeoJSON), area (m²), color,
conqueredAt, updatedAt
```

## How to Work on This Project

### Dev-Server starten

```bash
npm run start:dev
```

### Build & Tests

```bash
npm run build          # Produktions-Build
npm run test           # Unit Tests
npm run test:e2e       # E2E Tests
npm run lint           # Linting
```

### Umgebungsvariablen (.env)

```
# Datenbank
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=yourpassword
DB_DATABASE=veloveni

# Strava
STRAVA_CLIENT_ID=your_client_id
STRAVA_CLIENT_SECRET=your_client_secret

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# App
PORT=3000
FRONTEND_URL=http://localhost:5173
```

## Coding Rules

- **NestJS Module-Architektur** – jedes Feature ist ein eigenes Modul
- **DTOs für alle Inputs** – mit `class-validator` validieren
- **TypeORM Repositories** – kein direktes `EntityManager` in Services
- **Guards für Auth** – `@UseGuards(JwtAuthGuard)` auf geschützten Routen
- **Keine Business-Logik in Controllern** – nur in Services
- **GPS/Geo-Operationen** – PostGIS oder turf.js für Polygon-Berechnungen
- **TypeScript Strict** – keine `any`-Typen

## Was Claude falsch macht (Lessons Learned)

<!-- Hier dokumentieren, wenn Claude wiederholt Fehler macht -->

- TypeORM-Relations falsch konfigurieren (eager/lazy verwechseln)
- JWT-Guard vergessen auf geschützten Endpoints
- Strava Token-Refresh nicht im Service behandeln
