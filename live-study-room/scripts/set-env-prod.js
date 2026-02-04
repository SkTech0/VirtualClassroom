/**
 * Writes src/environments/environment.prod.ts from env vars (API_URL, HUB_URL, LIVEKIT_SERVER_URL).
 * Used for Railway / Docker builds so the frontend points to the deployed backend.
 * Defaults: /api/v1, /hubs/room (same-origin). LiveKit URL must be set for video.
 */
const fs = require('fs');
const path = require('path');

const apiUrl = process.env.API_URL || '/api/v1';
const hubUrl = process.env.HUB_URL || '/hubs/room';
const livekitServerUrl = process.env.LIVEKIT_SERVER_URL || '';

const content = `export const environment = {
  production: true,
  apiUrl: '${String(apiUrl).replace(/'/g, "\\'")}',
  hubUrl: '${String(hubUrl).replace(/'/g, "\\'")}',
  livekitServerUrl: '${String(livekitServerUrl).replace(/'/g, "\\'")}',
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ] as RTCIceServer[],
};
`;

const outPath = path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts');
fs.writeFileSync(outPath, content);
console.log('Wrote environment.prod.ts with apiUrl=%s hubUrl=%s livekitServerUrl=%s', apiUrl, hubUrl, livekitServerUrl || '(none)');
