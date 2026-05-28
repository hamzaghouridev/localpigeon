# LocalPigeon

Share files between devices on the same WiFi, straight from your browser. One machine runs a small Node server; every device opens the same URL. Files stream from sender to receiver through a WebSocket without ever touching the cloud.

## Requirements

- Node.js 20+
- Two or more devices on the same WiFi

## Run

```bash
npm install
npm start
```

The server prints two URLs on startup:

- `http://localhost:8080` for the host machine itself
- `http://<your-lan-ip>:8080` for any other device on the same WiFi

Open the LAN URL on each device. Each one gets a friendly name (e.g. *Calm Falcon*). To send a file: pick a recipient from the peer list, drop the file in the box, and wait for them to accept.

## How it works

- One Node process serves the static frontend and runs a `ws` WebSocket server.
- Every browser connects to the same WebSocket endpoint.
- JSON control messages set up the transfer; binary frames (prefixed with a 16-byte transfer ID) carry file chunks through the server to the recipient.
- No file is ever stored on disk on the server — chunks are forwarded as they arrive.

See `TESTING.md` for the manual test checklist.

## License

MIT
