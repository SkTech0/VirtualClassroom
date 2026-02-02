# Meeting E2E Test Checklist

Use this checklist to verify the video meeting flow end-to-end (Zoom/Meet-level quality).

## Prerequisites

- Backend: `cd VirtualClassroom.Backend && dotnet run` (API + SignalR on e.g. http://localhost:5275)
- Frontend: `cd live-study-room && ng serve` (e.g. http://localhost:4200)
- Two different browsers or one normal + one incognito (two users)

---

## Test 1: Join and see yourself

- [ ] Open app, log in as User A
- [ ] Create a room (or join existing), note room code
- [ ] Go to **Video Call** tab → **Start Video Call**
- [ ] Land on `/video/ROOMCODE` with pre-join screen (room code + "Join Video Call")
- [ ] Click **Join Video Call**
- [ ] See "Connecting..." then browser prompts for camera/mic → Allow
- [ ] See **your own video** in the "You" tile (camera on, no black screen)
- [ ] No console errors: no "util", no "_readableState", no "videotoggle/audiotoggle" warnings

---

## Test 2: Two participants see each other

- [ ] User A in call (as above)
- [ ] User B: second browser, log in, join same room with code
- [ ] User B: Video Call tab → Start Video Call → Join Video Call → Allow camera/mic
- [ ] User A sees User B's video in a second tile
- [ ] User B sees User A's video
- [ ] Both see themselves + the other; audio/video flow is smooth

---

## Test 3: Mute / Unmute

- [ ] In call, User A clicks **mic** (mute) → icon shows muted; User B does not hear A
- [ ] User A clicks **mic** again (unmute) → icon shows unmuted
- [ ] Same for **video** (camera on/off) → other side sees video turn off/on
- [ ] No "No client method videotoggle/audiotoggle" in console

---

## Test 4: Screen share

- [ ] User A clicks **screen share** → browser picker (window/screen) appears
- [ ] User A selects a window/screen → other participant sees shared screen (or "Screen share started" and no error)
- [ ] User A clicks **screen share** again → sharing stops; camera view returns
- [ ] If User A cancels picker: friendly message "Screen share was cancelled or permission was denied" (no raw error)

---

## Test 5: Leave and rejoin

- [ ] User A clicks **Leave Call** → returns to room view (or pre-join); call ends
- [ ] User B sees User A disappear from participants (or "User left")
- [ ] User A can click **Start Video Call** again and rejoin; User B sees A again

---

## Test 6: Navigation and SignalR

- [ ] From room, open Video Call and join (User A)
- [ ] User A navigates **Back to room** → no "Cannot start a HubConnection that is not in the 'Disconnected' state" in console
- [ ] User A starts video again → connects without error

---

## Test 7: Network / ICE

- [ ] With two users in call: verify connection works (same LAN is fine)
- [ ] Optional: Throttle network (Chrome DevTools → Network → Slow 3G); call should stay up or degrade gracefully (no hard crash)

---

## Quick script (API only)

For API-level checks (no browser), run:

```bash
./test-meeting-e2e.sh
```

This registers users, creates a room, and verifies endpoints; it does **not** test the actual video UI. Use the checklist above for full meeting flow.
