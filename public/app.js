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

function onControl(_msg) {
  // wired up in later tasks
}

function onBinary(_buf) {
  // wired up in Task 16
}

connect();
