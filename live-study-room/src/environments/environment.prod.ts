export const environment = {
  production: true,
  apiUrl: '/api/v1',
  hubUrl: '/hubs/room',
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ] as RTCIceServer[],
};
