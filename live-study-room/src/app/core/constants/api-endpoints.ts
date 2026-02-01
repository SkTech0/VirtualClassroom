/**
 * API endpoint paths (relative to apiUrl base, e.g. /api/v1).
 * Must match backend: VirtualClassroom.Backend Controllers.
 */
export const API_ENDPOINTS = {
  auth: {
    login: 'auth/login',
    register: 'auth/register',
    refresh: 'auth/refresh',
    me: 'auth/me',
  },
  rooms: {
    create: 'rooms/create',
    join: 'rooms/join',
    leave: 'rooms/leave',
    mine: 'rooms/mine',
    byCode: (code: string) => `rooms/${code}`,
    participants: (code: string) => `rooms/${code}/participants`,
  },
  pomodoro: {
    start: 'pomodoro/start',
    end: 'pomodoro/end',
    bySession: (sessionId: string) => `pomodoro/session/${sessionId}`,
  },
  video: {
    livekitToken: 'video/livekit-token',
  },
} as const;
