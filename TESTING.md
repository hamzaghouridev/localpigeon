# Manual Test Checklist

The automated suite (`npm test`) covers the wire protocol and the in-process happy path. These manual checks confirm the parts that only matter on real hardware.

## LAN reachability

1. Start the server on the host machine: `npm start`.
2. From the printed LAN URL, open the page on a phone or second laptop on the same WiFi.
3. Verify the second device shows the host as a peer and vice versa.

## Round-trip with a large file

1. Send a file in the 200–500 MB range from device A to device B.
2. Watch the host's memory in Activity Monitor / `top`. It should not climb in step with the file size.
3. Verify the downloaded file matches: `shasum source.bin received.bin` on macOS / Linux.

## Cancellation paths

1. Start a transfer of a large file. Click "Cancel" on the sender. The receiver should see a cancelled state.
2. Repeat, but reject the incoming prompt on the receiver. The sender should see "rejected".
3. Repeat, but close the receiver's browser tab mid-transfer. The sender should see "receiver-disconnected".

## Concurrent transfers

1. From device A, send file 1 to device B and file 2 to device C in quick succession.
2. Both should complete with correct bytes.

## Multiple browsers

Verify the app works in current Chrome, Safari, and Firefox.
