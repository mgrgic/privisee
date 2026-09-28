(function () {
  const POLL_INTERVAL_MS = 4000;

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

  function startPolling(shareId, key, lastUpdatedAt) {
    const intervalId = setInterval(async () => {
      let share;
      try {
        share = await Api.getShare(shareId);
      } catch (e) {
        return; // best effort, try again next tick
      }

      if (!share.active) {
        setStatus('This location share has ended or expired.');
        clearInterval(intervalId);
        return;
      }

      if (share.payload && share.iv && share.updatedAt !== lastUpdatedAt) {
        lastUpdatedAt = share.updatedAt;
        try {
          const { lat, lon } = await decryptLocation(key, share.payload, share.iv);
          updateMarker(lat, lon);
          setStatus(`Live — last updated ${new Date(share.updatedAt + 'Z').toLocaleTimeString()}`);
        } catch (e) {
          // ignore malformed/undecryptable update
        }
      }
    }, POLL_INTERVAL_MS);
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

    startPolling(shareId, key, share.updatedAt);
  }

  main();
})();
