import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CERT_DIR = path.join(__dirname, '..', '.cert');
const KEY_PATH = path.join(CERT_DIR, 'key.pem');
const CRT_PATH = path.join(CERT_DIR, 'cert.pem');

// A self-signed cert lets browsers expose secure-context APIs (showSaveFilePicker,
// crypto.randomUUID) over https://<lan-ip>. The cert is generated once with openssl
// and cached under .cert/. The LAN IP is baked in as a SubjectAltName so the cert
// matches the address other devices actually connect to.
export function ensureCert(lanIp) {
  const sans = ['DNS:localhost', 'IP:127.0.0.1'];
  if (lanIp) sans.push(`IP:${lanIp}`);
  const sanList = sans.join(',');

  if (fs.existsSync(KEY_PATH) && fs.existsSync(CRT_PATH)) {
    const existing = fs.readFileSync(CRT_PATH, 'utf8');
    // Regenerate if the cached cert predates the current LAN IP.
    if (!lanIp || certCoversIp(CRT_PATH, lanIp)) {
      return { key: fs.readFileSync(KEY_PATH), cert: Buffer.from(existing) };
    }
  }

  fs.mkdirSync(CERT_DIR, { recursive: true });
  execFileSync('openssl', [
    'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
    '-keyout', KEY_PATH,
    '-out', CRT_PATH,
    '-days', '3650',
    '-subj', '/CN=LocalPigeon',
    '-addext', `subjectAltName=${sanList}`
  ], { stdio: 'ignore' });

  return { key: fs.readFileSync(KEY_PATH), cert: fs.readFileSync(CRT_PATH) };
}

function certCoversIp(crtPath, ip) {
  try {
    const text = execFileSync('openssl', ['x509', '-in', crtPath, '-noout', '-text'], {
      encoding: 'utf8'
    });
    return text.includes(`IP Address:${ip}`);
  } catch {
    return false;
  }
}
