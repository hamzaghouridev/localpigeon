import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { WebSocketServer } from 'ws';
import { PeerRegistry } from './lib/registry.js';

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

const MAX_CONTROL_BYTES = 4096;

function sendJson(ws, msg) {
  if (ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify(msg));
}

function broadcastPeerList(registry, wss) {
  const peers = registry.list();
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      sendJson(client, { type: 'peer-list', peers });
    }
  }
}

export function createWsServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer });
  const registry = new PeerRegistry();

  wss.on('connection', (ws) => {
    const peer = registry.add(ws);
    sendJson(ws, {
      type: 'hello',
      peerId: peer.peerId,
      name: peer.name,
      peers: registry.list().filter(p => p.peerId !== peer.peerId)
    });
    broadcastPeerList(registry, wss);

    ws.on('close', () => {
      registry.remove(ws);
      broadcastPeerList(registry, wss);
    });

    ws.on('message', (data, isBinary) => {
      if (!isBinary) {
        if (data.length > MAX_CONTROL_BYTES) {
          ws.close();
          return;
        }
        // routing handled in Task 7
      }
    });
  });

  return { wss, registry };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createHttpServer();
  createWsServer(server);
  const port = Number(process.env.PORT) || 8080;
  server.listen(port, '0.0.0.0', () => {
    console.log(`HTTP server listening on http://localhost:${port}`);
  });
}
