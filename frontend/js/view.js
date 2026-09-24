(function () {
  const statusEl = document.getElementById('status');
  const mapEl = document.getElementById('map');

  let map = null;
  let marker = null;

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function getShareId() {
    const match = location.pathname.match(/\/s\/([^/]+)/);
    return match ? match[1] : null;
  }

  function getKeyParam() {
    const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
    return hash.get('key');
  }

  function ensureMap(lat, lon) {
    if (map) return;
    map = L.map(mapEl).setView([lat, lon], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    marker = L.circleMarker([lat, lon], {
      radius: 10,
      color: '#1a73e8',
      fillColor: '#4285f4',
      fillOpacity: 0.9,
      weight: 3,
    }).addTo(map);
  }

  function updateMarker(lat, lon) {
    ensureMap(lat, lon);
    marker.setLatLng([lat, lon]);
    map.panTo([lat, lon]);
  }

  async function main() {
    const shareId = getShareId();
    const keyB64 = getKeyParam();

    if (!shareId || !keyB64) {
      setStatus('Invalid share link.');
      return;
    }

    let key;
    try {
      key = await importShareKey(keyB64);
    } catch (e) {
      setStatus('Invalid decryption key in link.');
      return;
    }

    let share;
    try {
      share = await Api.getShare(shareId);
    } catch (e) {
      setStatus('This share does not exist.');
      return;
    }

    if (!share.active) {
      setStatus('This location share has ended or expired.');
    }

    if (share.payload && share.iv) {
      try {
        const { lat, lon } = await decryptLocation(key, share.payload, share.iv);
        updateMarker(lat, lon);
        setStatus(share.active ? `Live — last updated ${new Date(share.updatedAt + 'Z').toLocaleTimeString()}` : 'Last known location (sharing ended).');
      } catch (e) {
        setStatus('Could not decrypt location (wrong key).');
        return;
      }
    } else if (share.active) {
      setStatus('Waiting for the first location update...');
    }

    if (!share.active) return;

    const socket = new WebSocket(Api.wsUrl());
    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({ type: 'subscribe', shareId }));
    });
    socket.addEventListener('message', async (event) => {
      const data = JSON.parse(event.data);
      if (data.type !== 'update' || data.shareId !== shareId) return;
      try {
        const { lat, lon } = await decryptLocation(key, data.payload, data.iv);
        updateMarker(lat, lon);
        setStatus(`Live — last updated ${new Date().toLocaleTimeString()}`);
      } catch (e) {
        // ignore malformed/undecryptable update
      }
    });
    socket.addEventListener('close', () => setStatus('Connection lost, refresh to reconnect.'));
  }

  main();
})();
