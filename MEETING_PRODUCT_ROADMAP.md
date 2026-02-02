# Meeting Product Roadmap — Zoom/Google Meet Level

This document outlines what it takes to reach **production-grade meeting quality** (Zoom/Google Meet level) and the current state of VirtualClassroom.

---

## 1. Current State vs. Target

| Area | Zoom/Meet level | Current state |
|------|-----------------|---------------|
| **NAT traversal** | STUN + TURN (reliable behind corporate/symmetric NAT) | STUN added; TURN configurable |
| **ICE** | Trickle ICE (faster connect), fallback | Trickle ICE enabled |
| **Signaling** | Robust, reconnection, idempotent | SignalR, reconnection limited after intentional stop |
| **Media** | Adaptive bitrate, simulcast, recording | Single stream, no recording |
| **UX** | Lobby, host controls, mute-all, layout, reactions | Pre-join screen, basic controls |
| **Reliability** | Reconnect on drop, replace failed peer | Peer errors remove participant; no auto-replace |
| **Testing** | E2E, load, chaos, device matrix | E2E checklist + manual; unit tests minimal |
| **Security** | E2E optional, auth, permissions | JWT auth; no E2E encryption |
| **Scale** | SFU/MCU for large meetings | P2P (good for small groups only) |

---

## 2. Implemented (This Session)

- **STUN/ICE config** — Public STUN in video service; TURN URL/creds via environment for strict NATs.
- **Trickle ICE** — Enabled for faster connection establishment.
- **SignalR** — No reconnect after intentional `stopConnection`; reconnect only when connection is Disconnected.
- **E2E test** — `test-meeting-e2e.sh` + `MEETING_E2E_CHECKLIST.md` for full meeting flow.
- **Roadmap** — This doc for future work.

---

## 3. High-Priority Next Steps (Zero-Issues Path)

### 3.1 Reliability
- [ ] **TURN server** — Deploy Coturn (or use a provider); add URLs/creds to env; use when STUN fails.
- [ ] **Reconnect on drop** — If SignalR or peer drops, auto-rejoin / re-establish peers with backoff.
- [ ] **Replace failed peer** — On peer error, optionally retry one new connection before removing.

### 3.2 Media Quality
- [ ] **Constraints** — Respect device capability; reduce resolution on low bandwidth (e.g. `getUserMedia` constraints).
- [ ] **Reconnection** — When user reconnects, re-send offer/answer so streams resume.

### 3.3 UX (Meet/Zoom-like)
- [ ] **Lobby / waiting room** — Host admits participants; optional “knock” flow.
- [ ] **Host controls** — Mute all, end meeting for all, optional “request to unmute”.
- [ ] **Layouts** — Grid, speaker view, pin participant.
- [ ] **Reactions / raise hand** — Non-media signals over SignalR.
- [ ] **Leave/end** — Clear “Leave” vs “End meeting for everyone” (host only).

### 3.4 Testing
- [ ] **E2E automation** — Playwright/Cypress: join → see self → see peer → mute/unmute → leave.
- [ ] **Multi-tab / two browsers** — Two users, two devices or profiles; verify bidirectional video/audio.
- [ ] **Network tests** — Throttling, disconnect/reconnect; verify reconnection and messaging.

### 3.5 Scale Beyond P2P
- [ ] **SFU/MCU or managed service** — For 3+ participants, consider LiveKit, Twilio, or custom SFU so one peer does not send N-1 streams.
- [ ] **LiveKit** — Backend already has LiveKit references; consider migrating video to LiveKit for production scale.

---

## 4. Testing the Meeting Flow (Manual)

1. **Backend** — Run the .NET backend (e.g. `dotnet run` in `VirtualClassroom.Backend`).
2. **Frontend** — Run `ng serve` in `live-study-room`.
3. **Two clients** — Use two browsers (or one normal + one incognito), log in as two users.
4. **Room** — User A creates a room; User B joins with code.
5. **Video** — Both open “Video Call” tab → “Start Video Call” → “Join Video Call” → allow camera/mic.
6. **Verify** — Each sees self and the other; mute/unmute; leave call; leave room.

See **MEETING_E2E_CHECKLIST.md** and **test-meeting-e2e.sh** for a repeatable checklist and script.

---

## 5. Summary

- **Done now:** STUN, trickle ICE, SignalR reconnect fix, E2E test script + checklist, roadmap.
- **Next for “zero issues”:** TURN, reconnection on drop, peer retry, then UX (lobby, host controls, layouts) and automated E2E + network tests.
- **For scale:** Plan move to SFU/LiveKit when you need 3+ participants with stable quality.
