# LocalPigeon

Share files between devices on the same WiFi, straight from your browser. One machine runs a small Node server; every device opens the same URL. Files stream from sender to receiver through a WebSocket without ever touching the cloud.

## Requirements

- Node.js 20+
- `openssl` on the host (used once to generate a self-signed cert)
- Two or more devices on the same WiFi
- Chrome or Edge on any device that will *receive* files

## Run

```bash
npm install
npm start
```

The server prints two URLs on startup:

- `https://localhost:8080` for the host machine itself
- `https://<your-lan-ip>:8080` for any other device on the same WiFi

The server runs over HTTPS with a self-signed certificate. Browsers expose the APIs LocalPigeon needs — saving large files straight to disk, secure random IDs — only over HTTPS or `localhost`; plain HTTP over a LAN IP won't do. The cert is generated once on first run and cached under `.cert/`.

The first time each device opens the URL, the browser shows a certificate warning. Click **Advanced → proceed** to continue; it asks only once per device.

Open the LAN URL on each device. Each one gets a friendly name (e.g. *Calm Falcon*). To send a file: pick a recipient from the peer list, drop the file in the box, and wait for them to accept. **Receiving requires Chrome or Edge** (the File System Access API); other browsers can still send.

## How it works

- One Node process serves the static frontend and runs a `ws` WebSocket server.
- Every browser connects to the same WebSocket endpoint.
- JSON control messages set up the transfer; binary frames (prefixed with a 16-byte transfer ID) carry file chunks through the server to the recipient.
- No file is ever stored on disk on the server — chunks are forwarded as they arrive.
- The receiver streams chunks straight to a file it picks on accept (File System Access API), so memory stays flat regardless of file size.

See `TESTING.md` for the manual test checklist.

## License

MIT
