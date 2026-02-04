export const environment = {
  production: true,
  apiUrl: '/api/v1',
  hubUrl: '/hubs/room',
  /** LiveKit server URL (set via build env, e.g. wss://your-livekit.livekit.cloud) */
  livekitServerUrl: '',
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ] as RTCIceServer[],
};
