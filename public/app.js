const me = document.getElementById('me');
const peerList = document.getElementById('peer-list');
const peersEmpty = document.getElementById('peers-empty');

const state = {
  peerId: null,
  name: null,
  peers: [],
  selectedPeerId: null,
  ws: null
};

function connect() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}`);
  state.ws = ws;

  ws.binaryType = 'arraybuffer';
  ws.addEventListener('message', onMessage);
  ws.addEventListener('close', () => {
    me.textContent = 'disconnected — retrying…';
    setTimeout(connect, 1000);
  });
}

function onMessage(ev) {
  if (ev.data instanceof ArrayBuffer) {
    onBinary(ev.data);
    return;
  }
  const msg = JSON.parse(ev.data);
  switch (msg.type) {
    case 'hello':
      state.peerId = msg.peerId;
      state.name = msg.name;
      state.peers = msg.peers;
      me.textContent = msg.name;
      renderPeers();
      break;
    case 'peer-list':
      state.peers = msg.peers.filter(p => p.peerId !== state.peerId);
      renderPeers();
      break;
    default:
      onControl(msg);
  }
}

function renderPeers() {
  peerList.innerHTML = '';
  if (state.peers.length === 0) {
    peersEmpty.hidden = false;
    return;
  }
  peersEmpty.hidden = true;
  for (const p of state.peers) {
    const li = document.createElement('li');
    li.textContent = p.name;
    li.dataset.peerId = p.peerId;
    if (p.peerId === state.selectedPeerId) li.classList.add('selected');
    li.addEventListener('click', () => {
      state.selectedPeerId = state.selectedPeerId === p.peerId ? null : p.peerId;
      renderPeers();
    });
    peerList.appendChild(li);
  }
}

function onControl(msg) {
  switch (msg.type) {
    case 'accept':
      startSendLoop(msg.transferId);
      break;
    case 'reject':
      updateLog(msg.transferId, null, 'rejected', 'failed');
      outgoing.delete(msg.transferId);
      break;
    case 'cancel': {
      const entry = outgoing.get(msg.transferId);
      if (entry) entry.cancelled = true;
      updateLog(msg.transferId, null, msg.reason || 'cancelled', 'failed');
      outgoing.delete(msg.transferId);
      break;
    }
  }
}

function onBinary(_buf) {
  // wired up in Task 16
}

const drop = document.getElementById('drop');
const browseBtn = document.getElementById('browse');
const fileInput = document.getElementById('file-input');
const transferLog = document.getElementById('transfer-log');

const CHUNK_SIZE = 64 * 1024;
const HIGH_WATER = 1024 * 1024;
const HEADER_SIZE = 16;

const outgoing = new Map();

function uuid() { return crypto.randomUUID(); }

function headerBytes(transferId) {
  const hex = transferId.replace(/-/g, '');
  const out = new Uint8Array(HEADER_SIZE);
  for (let i = 0; i < HEADER_SIZE; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

function addLogRow(transferId, label) {
  const li = document.createElement('li');
  li.dataset.transferId = transferId;
  li.innerHTML = `<span class="name">${label}</span><span class="progress"><span></span></span><span class="status">…</span>`;
  transferLog.prepend(li);
  return li;
}

function updateLog(transferId, percent, status, klass) {
  const li = transferLog.querySelector(`[data-transfer-id="${transferId}"]`);
  if (!li) return;
  if (percent !== null) li.querySelector('.progress > span').style.width = `${percent}%`;
  if (status) {
    const s = li.querySelector('.status');
    s.textContent = status;
    s.className = `status ${klass || ''}`.trim();
  }
}

async function sendFile(file, toPeerId) {
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;
  const transferId = uuid();
  const dest = state.peers.find(p => p.peerId === toPeerId);
  const label = `${file.name} → ${dest ? dest.name : 'peer'}`;
  addLogRow(transferId, label);

  outgoing.set(transferId, { file, cancelled: false });

  state.ws.send(JSON.stringify({
    type: 'offer', transferId, toPeerId,
    filename: file.name, size: file.size, mime: file.type || 'application/octet-stream'
  }));
}

async function startSendLoop(transferId) {
  const entry = outgoing.get(transferId);
  if (!entry) return;
  const { file } = entry;
  const header = headerBytes(transferId);
  let sent = 0;

  for (let offset = 0; offset < file.size; offset += CHUNK_SIZE) {
    if (entry.cancelled) return;
    while (state.ws.bufferedAmount > HIGH_WATER) {
      await new Promise(r => setTimeout(r, 20));
      if (entry.cancelled) return;
    }
    const chunk = await file.slice(offset, offset + CHUNK_SIZE).arrayBuffer();
    const frame = new Uint8Array(HEADER_SIZE + chunk.byteLength);
    frame.set(header, 0);
    frame.set(new Uint8Array(chunk), HEADER_SIZE);
    state.ws.send(frame);
    sent += chunk.byteLength;
    updateLog(transferId, Math.floor((sent / file.size) * 100));
  }

  state.ws.send(JSON.stringify({ type: 'transfer-complete', transferId }));
  outgoing.delete(transferId);
  updateLog(transferId, 100, 'sent', 'done');
}

function pickFiles(files) {
  if (!state.selectedPeerId) {
    alert('Pick a recipient first.');
    return;
  }
  for (const f of files) sendFile(f, state.selectedPeerId);
}

drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
drop.addEventListener('dragleave', () => drop.classList.remove('over'));
drop.addEventListener('drop', (e) => {
  e.preventDefault();
  drop.classList.remove('over');
  pickFiles([...e.dataTransfer.files]);
});
browseBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => pickFiles([...fileInput.files]));

connect();
