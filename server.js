import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

async function serveStatic(req, res) {
  const url = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.join(PUBLIC_DIR, url);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const body = await fs.readFile(filePath);
    const type = MIME[path.extname(filePath)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': body.length });
    res.end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
}

export function createHttpServer() {
  return http.createServer((req, res) => {
    serveStatic(req, res);
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createHttpServer();
  const port = Number(process.env.PORT) || 8080;
  server.listen(port, '0.0.0.0', () => {
    console.log(`HTTP server listening on http://localhost:${port}`);
  });
}
