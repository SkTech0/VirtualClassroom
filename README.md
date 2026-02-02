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

3. Run database migrations:
   ```bash
   dotnet ef database update
   ```

4. Start the backend server:
   ```bash
   dotnet run
   ```

The backend will be available at `https://localhost:7001` (or the port specified in `launchSettings.json`).

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

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 