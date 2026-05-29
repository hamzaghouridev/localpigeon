# 🕊️ LocalPigeon

**Send files between your devices over local WiFi — straight from the browser. No cloud, no account, no app to install.**

LocalPigeon is a tiny, self-hosted, peer-to-peer file transfer tool. Run one small Node server on any machine on your network, open the same URL on your laptop and your phone, and drag a file across. Chunks stream directly from sender to receiver and are **never stored anywhere** — not on a server, not in the cloud.

Think of it as a self-hosted **AirDrop alternative that works across every platform** — macOS, Windows, Linux, Android, iOS — as long as the devices share a WiFi network.

```bash
npm install && npm start
```

That's the whole setup.

---

## Why LocalPigeon?

- 🔒 **Private by design.** Files never leave your local network. Nothing touches a third-party server, gets uploaded to the cloud, or lands in someone's analytics.
- 🚀 **No account, no app, no limits.** Open a URL. No sign-up, no 2 GB cap, no "upgrade to Pro."
- 🐘 **Handles huge files.** A 500 MB (or multi-GB) file streams straight to disk on the receiving end, so the browser tab's memory stays flat no matter the size.
- 🌐 **Cross-platform.** Any device with a modern browser on the same WiFi can join — Mac to Windows, phone to laptop, whatever.
- 🪶 **Tiny and auditable.** One dependency (`ws`), a few hundred lines of code. You can read the whole thing in a sitting.

## How it compares

| | LocalPigeon | AirDrop | WeTransfer / cloud | USB drive |
|---|---|---|---|---|
| Cross-platform | ✅ | ❌ Apple only | ✅ | ✅ |
| Files leave your network | ❌ Never | ❌ Never | ⚠️ Uploaded to cloud | ❌ Never |
| Account required | ❌ | ❌ | ⚠️ Often | ❌ |
| File size limit | None | None | Capped on free tiers | Drive size |
| Setup | One command | Built-in (Apple) | None | Physical |

## Requirements

- **Node.js 20+** on the host machine
- **`openssl`** on the host (used once to generate a self-signed certificate — preinstalled on macOS/Linux, bundled with Git on Windows)
- Two or more devices on the **same WiFi / LAN**
- **Chrome or Edge** on any device that will *receive* files (other browsers can still send)

## Quick start

```bash
git clone https://github.com/hamzaghouridev/localpigeon.git
cd localpigeon
npm install
npm start
```

The server prints two URLs on startup:

```
On this device:   https://localhost:8080
Other devices:    https://192.168.x.x:8080
```

Open the **`https://<lan-ip>`** URL on each device. The first time, your browser shows a certificate warning (because the cert is self-signed) — click **Advanced → proceed**. It only asks once per device.

Each device gets a friendly name (e.g. *Calm Falcon*). To send a file: **pick a recipient from the peer list, drop the file in the box, and wait for them to accept.**

## How it works

- One Node process serves the static frontend and runs a [`ws`](https://github.com/websockets/ws) WebSocket server.
- Every browser connects to the same WebSocket endpoint and gets a randomly assigned name.
- JSON control messages negotiate the transfer (offer → accept/reject); binary frames, each prefixed with a 16-byte transfer ID, carry the file chunks through the server to the recipient.
- **No file is ever written to disk on the server** — chunks are forwarded the instant they arrive.
- The **receiver streams chunks straight to a file** it picks on accept (via the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API)), so memory usage stays flat regardless of file size.
- Everything runs over **HTTPS** with a self-signed cert. Browsers only expose the APIs LocalPigeon needs (streaming saves, secure random IDs) in a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts), which plain `http://<lan-ip>` is not. The cert is generated once and cached under `.cert/`.

## FAQ

**Does my data go through the cloud?**
No. The server is something *you* run on your own network. Files travel device → your server → device, all on the LAN, and are never persisted.

**Why HTTPS with a scary warning?**
The browser features LocalPigeon relies on are only available over HTTPS or `localhost`. Since there's no public domain to get a real cert for, it self-signs. The warning is expected and one-time per device.

**Why does receiving need Chrome or Edge?**
Receiving uses the File System Access API to stream large files to disk without buffering them in memory. Firefox and Safari don't support it yet. Sending works in any modern browser.

**Can I use it over the public internet?**
It's designed for a trusted LAN. There's no authentication, so don't expose the port to the internet.

## Limitations

- Receiving requires a Chromium-based browser (Chrome/Edge).
- Devices must be on the same network (no relay/NAT traversal — by design).
- No authentication; intended for trusted local networks only.

## Development

```bash
npm test   # runs the protocol + transfer test suite
```

See [`TESTING.md`](TESTING.md) for the manual test checklist (LAN reachability, large-file round-trips, cancellation paths).

## Contributing

Issues and pull requests are welcome. If you hit a bug, please include your OS, browser, and the file size you were transferring.

## License

[MIT](LICENSE) © Hamza Ghouri
