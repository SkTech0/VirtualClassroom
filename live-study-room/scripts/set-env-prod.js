/**
 * Writes src/environments/environment.prod.ts from env vars (API_URL, HUB_URL).
 * Used for Railway / Docker builds so the frontend points to the deployed backend.
 * Defaults: /api/v1, /hubs/room (same-origin).
 */
const fs = require('fs');
const path = require('path');

const apiUrl = process.env.API_URL || '/api/v1';
const hubUrl = process.env.HUB_URL || '/hubs/room';

const content = `export const environment = {
  production: true,
  apiUrl: '${String(apiUrl).replace(/'/g, "\\'")}',
  hubUrl: '${String(hubUrl).replace(/'/g, "\\'")}',
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ] as RTCIceServer[],
};
`;

const outPath = path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts');
fs.writeFileSync(outPath, content);
console.log('Wrote environment.prod.ts with apiUrl=%s hubUrl=%s', apiUrl, hubUrl);
