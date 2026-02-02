# VirtualClassroom

A real-time virtual classroom application built with Angular frontend and .NET Core backend, featuring live study rooms, Pomodoro timer, chat functionality, and leaderboards.

## Project Structure

```
VirtualClassroom/
├── live-study-room/          # Angular frontend application
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/         # Core services, guards, interceptors
│   │   │   ├── features/     # Feature modules (auth, chat, room, etc.)
│   │   │   └── shared/       # Shared components, models, pipes
│   │   └── ...
│   └── ...
├── VirtualClassroom.Backend/ # .NET Core Web API backend
│   ├── Controllers/          # API controllers
│   ├── Data/                 # Entity Framework context
│   ├── DTOs/                 # Data transfer objects
│   ├── Hubs/                 # SignalR hubs for real-time communication
│   ├── Models/               # Entity models
│   ├── Services/             # Business logic services
│   └── ...
└── VirtualClassroom.sln      # Visual Studio solution file
```

## Features

- **Live Study Rooms**: Create and join virtual study rooms
- **Real-time Chat**: Communicate with other students in real-time
- **Pomodoro Timer**: Built-in productivity timer
- **Leaderboards**: Track study progress and achievements
- **User Authentication**: Secure login and registration system
- **SignalR Integration**: Real-time communication between users

## Prerequisites

- .NET 10 SDK
- Node.js 18+ and npm
- Angular CLI 19 (`npm install -g @angular/cli@19`)

## Getting Started

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd VirtualClassroom.Backend
   ```

2. Restore NuGet packages:
   ```bash
   dotnet restore
   ```

3. *(Optional)* If using PostgreSQL, run migrations: `dotnet ef database update`. With in-memory (default in Development), skip this.

4. Start the backend server:
   ```bash
   dotnet run
   ```

The backend will be available at **http://localhost:5275** (see `Properties/launchSettings.json`). Swagger at http://localhost:5275 when running.

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd live-study-room
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   ng serve
   ```

The frontend will be available at `http://localhost:4200`.

## How to test on your local system

### 1. Start the backend

Open a terminal in the project root:

```bash
cd VirtualClassroom.Backend
dotnet run
```

- Backend runs at **http://localhost:5275** (API + SignalR).
- In Development it uses **in-memory storage** by default (no PostgreSQL or Redis needed). If you see a PostgreSQL error, set `UseInMemory: true` in `appsettings.Development.json`.
- If port 5275 is already in use, run: `dotnet run --launch-profile httpAlt` (uses port 5276 — then point the frontend to that port; see step 3).

Leave this terminal running.

### 2. Start the frontend

Open a **second** terminal:

```bash
cd live-study-room
npm install
ng serve
```

- App runs at **http://localhost:4200**.
- It talks to the backend at **http://localhost:5275** (see `live-study-room/src/environments/environment.ts`). If your backend is on another port (e.g. 5276), change `apiUrl` and `hubUrl` there.

### 3. Test in the browser

1. Open **http://localhost:4200** in your browser.
2. **Sign up** (e.g. name, email, password) or **Sign in** if you already have an account.
3. **Rooms:** Create a room (e.g. subject "Math") or join with a 6-character room code.
4. **In a room:** Use **Chat**, **Pomodoro** (shared timer), and **Video Call** (allow camera/mic when prompted).
5. **Two users:** To test chat/video with two people, open a second **incognito/private** window (or another browser), sign up a different user, and join the same room with the room code.

### 4. Optional: API / health check

- **Swagger UI:** http://localhost:5275 (when backend is running).
- **Health:** http://localhost:5275/health.

## Development

### Backend Technologies
- .NET 10
- Entity Framework Core
- SignalR for real-time communication
- JWT authentication
- PostgreSQL (or InMemory for development)

### Frontend Technologies
- Angular 19
- TypeScript 5.5+
- SignalR client
- Angular Material

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Rooms
- `GET /api/rooms` - Get all rooms
- `POST /api/rooms` - Create a new room
- `POST /api/rooms/{id}/join` - Join a room

### Pomodoro
- `POST /api/pomodoro/start` - Start a Pomodoro session
- `POST /api/pomodoro/end` - End a Pomodoro session

## Deploy to Railway

The app is ready for Railway with two services: **backend** (API + SignalR) and **frontend** (Angular).

### 1. Backend service

1. In Railway, create a new project and add a service.
2. Connect the repo.
3. **Critical:** Set **Root Directory** to **empty** (clear the field). If it is set to `VirtualClassroom.Backend`, the build will fail with "Project file does not exist: VirtualClassroom.sln" because the build context must be the repo root.
4. **Build:** With root empty, Railway uses `railway.toml` at repo root and builds with `Dockerfile.backend`; the build context is the full repo so `VirtualClassroom.sln` is included. (Or set **Dockerfile Path** to `Dockerfile.backend` in service settings.)
5. **Variables** (set in Railway dashboard; use **Variables** tab):
   - `ASPNETCORE_ENVIRONMENT` = `Production`
   - `PORT` — set automatically by Railway
   - `ConnectionStrings__DefaultConnection` — **Npgsql format** (see below), not a URL
   - `ConnectionStrings__Redis` — optional; e.g. `host:6379` or `host:6379,password=xxx` if Redis has a password
   - `JwtSettings__SecretKey` — a long random secret (64+ chars; generate one, do not use a placeholder)
   - `JwtSettings__Issuer` = `VirtualClassroomIssuer`
   - `JwtSettings__Audience` = `VirtualClassroomAudience`
   - `Cors__Origins__0` = your frontend URL (e.g. `https://your-frontend.up.railway.app`)
   - `UseInMemory` = `false` (use `true` only for quick test without a database)
6. Add **PostgreSQL** (and optionally **Redis**) from Railway add-ons.
   - **PostgreSQL:** Railway gives a `DATABASE_URL` (URL). The app expects **Npgsql format**:
     `Host=hostname;Port=5432;Database=railway;Username=postgres;Password=YOUR_PASSWORD`
     Use your Postgres service variables: `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` to build this string (e.g. `Host=${{PGHOST}};Port=${{PGPORT}};Database=${{PGDATABASE}};Username=${{PGUSER}};Password=${{PGPASSWORD}}` if Railway supports variable refs, or paste the values manually).
7. Deploy. Note the backend URL (e.g. `https://your-backend.up.railway.app`). Use it for the frontend in step 2.

### 2. Frontend service

1. Add a second service in the same (or another) project.
2. **Root Directory:** `live-study-room`.
3. **Build:** Dockerfile (uses `live-study-room/Dockerfile`).
4. **Variables** (build-time; set before deploy):
   - `API_URL` = `https://YOUR-BACKEND.railway.app/api/v1` (your backend URL + `/api/v1`)
   - `HUB_URL` = `https://YOUR-BACKEND.railway.app/hubs/room` (your backend URL + `/hubs/room`)
5. Deploy. The frontend will call the backend at the URLs you set.

### 3. After deploy

- Open the frontend URL; sign up and use rooms, chat, Pomodoro, and video.
- Backend health: `https://YOUR-BACKEND.railway.app/health`
- If register/login returns 500 or 503, ensure DB connection and migrations (see Deploy section). If using PostgreSQL, run migrations once (e.g. locally with `DATABASE_URL` set to Railway Postgres, or use Railway’s shell and `dotnet ef database update`).

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 