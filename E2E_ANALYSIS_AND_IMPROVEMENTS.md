# Virtual Classroom – E2E Analysis & Improvements

## Project overview

- **Frontend**: Angular 17 (live-study-room) – landing, auth, rooms, chat, Pomodoro, leaderboard, video conference.
- **Backend**: .NET 8 API + SignalR (VirtualClassroom.Backend) – auth, rooms, Pomodoro, video (WebRTC/LiveKit).
- **E2E**: `test-meeting-e2e.sh` for API-level checks; `MEETING_E2E_CHECKLIST.md` for manual browser flow.

---

## Issues fixed (this pass)

### 1. Backend – auth errors returned 500 instead of 401

- **Problem**: `LoginCommandHandler` throws `UnauthorizedAccessException` for invalid credentials; global exception handler did not handle it, so responses were 500.
- **Fix**: In `Program.cs`, added handling for `UnauthorizedAccessException` and return **401** with a JSON body `{ type, status, title, message }`. Login/register now get proper 401 and the frontend can show the message.

### 2. Frontend – inconsistent error messages on login/register

- **Problem**: Login and register used `err.error?.error`; backend returns `message` (and sometimes `errors` for validation). Users often saw a generic “Login failed” instead of the server message.
- **Fix**: Both components now use `ApiService.getApiErrorMessage(err, fallback)` so they show `message`, `detail`, `error`, or first validation error, with a sensible fallback.

### 3. E2E test script – wrong GET room URL

- **Problem**: Script called `GET $BASE/rooms/code/$CODE`; API route is `GET rooms/{code}` (no `code/` segment).
- **Fix**: Updated to `GET $BASE/rooms/$CODE`. GET room by code now passes when the script runs with a fresh DB.

### 4. Room – SignalR “Knock Knock” not working

- **Problem**: Frontend invoked `KnockKnock(roomCode, 'all')` but the hub method is `SendKnockKnock(roomCode, targetUserId, fromUserId)`.
- **Fix**: Room component now invokes `SendKnockKnock(roomCode, 'all', username)` with the current user’s username so the hub receives all three arguments.

### 5. Header – tooltip not working

- **Problem**: Template used `matTooltip="Account"` but `MatTooltipModule` was not imported.
- **Fix**: Added `MatTooltipModule` to the header component imports.

### 6. Login – return URL after 401

- **Problem**: Unauthorized interceptor redirects to login with `returnUrl` set to the **API** URL; login always navigated to `/room`.
- **Fix**: Login reads `returnUrl`; if it is present and not an absolute URL (e.g. not an API URL), it navigates there after login; otherwise it goes to `/room`. This allows future use of a frontend return path (e.g. from an interceptor that stores the current route).

---

## Recommendations for best user experience

### Auth & security

1. **Return URL after 401**: Consider storing the **current frontend route** (e.g. in a service or `Router.url`) before redirecting to login in the unauthorized interceptor, and pass that as `returnUrl` so users land back on the page they were trying to access.
2. **Token refresh**: If refresh token is implemented, ensure the interceptor or auth service retries the failed request after refresh so users don’t lose work on expiry.
3. **Password strength**: Add a simple strength indicator and/or rules on the register form (e.g. match backend validation) to reduce failed registrations.

### Rooms & real-time

4. **Room list refresh**: After creating/joining a room in another tab or device, consider refreshing the room list (e.g. on window focus or via SignalR) so “Recent Rooms” stays in sync.
5. **Leaderboard in room**: `loadLeaderboard()` in the room component uses hardcoded data. Replace with an API call (e.g. Pomodoro/leaderboard by room or user) so the tab shows real data.
6. **Pomodoro persistence**: Room Pomodoro is client-only (timer in memory). For shared sessions, consider syncing start/pause/reset via SignalR (hub already has `StartTimer`, `PauseTimer`, etc.) so all participants see the same timer.

### Video

7. **Video E2E**: Follow `MEETING_E2E_CHECKLIST.md` in two browsers (normal + incognito or two devices) to validate: join, see self, see other, mute/unmute, screen share, leave/rejoin, and that there are no console errors (e.g. “videotoggle/audiotoggle” or HubConnection state issues).
8. **ICE/connectivity**: For production, add TURN servers in `environment.ts` (`iceServers`) when STUN is not enough (e.g. strict NATs).

### UX & accessibility

9. **Loading and errors**: Ensure all API calls (rooms, participants, Pomodoro, video token) show a loading state and use `ApiService.getApiErrorMessage()` for errors so messages are consistent and actionable.
10. **Landing “Watch Demo”**: Currently shows a snackbar “Demo video coming soon!”. Either add a short demo video or replace with a short “How it works” or product tour.
11. **Footer links**: “Help Center”, “Contact Us”, “Privacy Policy”, “Terms of Service” are static; add routes or external links so they are usable.
12. **Mobile**: Header nav uses `d-none d-md-flex`; ensure a mobile menu (e.g. mat-sidenav or hamburger) so small screens can access Rooms, Leaderboard, Sign In, etc.

### DevOps & testing

13. **E2E script and DB**: `test-meeting-e2e.sh` fails if the same users already exist. For CI, use unique emails (e.g. `meet-$(date +%s)@test.com`) or a dedicated test DB that is reset before the run.
14. **Backend profile**: For local E2E without PostgreSQL/Redis, use the **InMemory** profile (`dotnet run --launch-profile InMemory`) so the script and frontend work with in-memory store only.

---

## How to run E2E

1. **Backend**:  
   `cd VirtualClassroom.Backend && dotnet run`  
   (Or `dotnet run --launch-profile InMemory` if you don’t have PostgreSQL/Redis.)
2. **Frontend**:  
   `cd live-study-room && ng serve`
3. **API-only**:  
   `./test-meeting-e2e.sh`  
   (Uses fresh users; if it fails on register, use different emails or reset DB.)
4. **Full meeting flow**:  
   Open the app in two browsers, log in as two users, create/join the same room, then follow `MEETING_E2E_CHECKLIST.md` for video and real-time behavior.

---

## Summary

Fixes applied in this pass:

- Backend returns **401** for invalid login/unauthorized cases.
- Login/register show **consistent, server-driven error messages**.
- E2E script **GET room by code** URL corrected.
- **Knock Knock** uses the correct SignalR method and parameters.
- **Header tooltip** works via `MatTooltipModule`.
- **Login** supports a safe use of `returnUrl` (ready for a frontend return path).

Implementing the recommendations above will further improve reliability, clarity, and end-to-end experience for users.
