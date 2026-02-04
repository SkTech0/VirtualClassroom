/** ICE servers for WebRTC (STUN/TURN). Add TURN URLs for strict NATs. */
export const defaultIceServers: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export const environment = {
  production: false,
  apiUrl: 'http://localhost:5275/api/v1',
  hubUrl: 'http://localhost:5275/hubs/room',
  /** LiveKit server URL for video (e.g. ws://localhost:7880 for local livekit-server) */
  livekitServerUrl: 'ws://localhost:7880',
  iceServers: defaultIceServers,
};
