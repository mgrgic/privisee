(function () {
  const POLL_INTERVAL_MS = 4000;

  const mapSection = document.getElementById('map-section');
  const expiredSection = document.getElementById('expired-section');
  const mapEl = document.getElementById('map');
  const decryptingOverlay = document.getElementById('decrypting-overlay');
  const decryptingCipher = document.getElementById('decrypting-cipher');
  const bottomSheet = document.getElementById('bottom-sheet');
  const sheetCoords = document.getElementById('sheet-coords');
  const updatedAgoEl = document.getElementById('updated-ago');
  const linkExpiresEl = document.getElementById('link-expires');
  const directionsLink = document.getElementById('directions-link');

  let map = null;
  let marker = null;
  let lastUpdateReceivedAt = null;
  let expiresAtMs = null;
  let tickInterval = null;

  function getShareId() {
    const match = location.pathname.match(/\/s\/([^/]+)/);
    return match ? match[1] : null;
  }

  function getKeyParam() {
    const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
    return hash.get('key');
  }

  function formatCoord(value, positiveSuffix, negativeSuffix) {
    const suffix = value >= 0 ? positiveSuffix : negativeSuffix;
    return `${Math.abs(value).toFixed(4)}° ${suffix}`;
  }

  function formatShort(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    if (totalSeconds < 60) return `${totalSeconds}s`;
    const totalMinutes = Math.floor(totalSeconds / 60);
    if (totalMinutes < 60) return `${totalMinutes}m`;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }

  function updateDirectionsLink(lat, lon) {
    const isAndroid = /android/i.test(navigator.userAgent);
    directionsLink.href = isAndroid
      ? `geo:${lat},${lon}?q=${lat},${lon}`
      //: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
      : `https://www.openstreetmap.org/directions?to=${lat}%2C${lon}`;
  }

  function tick() {
    if (lastUpdateReceivedAt !== null) {
      updatedAgoEl.textContent = formatShort(Date.now() - lastUpdateReceivedAt);
    }
    if (expiresAtMs !== null) {
      const remaining = expiresAtMs - Date.now();
      linkExpiresEl.textContent = remaining > 0 ? formatShort(remaining) : '0s';
    }
  }

  function startTicking() {
    if (tickInterval !== null) return;
    tick();
    tickInterval = setInterval(tick, 1000);
  }

  function ensureMap(lat, lon) {
    if (map) return;
    map = L.map(mapEl, { attributionControl: false, zoomControl: true }).setView([lat, lon], 16);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      attribution: '© Esri',
      maxZoom: 19,
      maxNativeZoom: 16,
    }).addTo(map);

    const icon = L.divIcon({
      className: '',
      html: '<div class="viewer-marker"><div class="viewer-marker-ring"></div><div class="viewer-marker-halo"></div><div class="viewer-marker-dot"></div></div>',
      iconSize: [120, 120],
      iconAnchor: [60, 60],
    });
    marker = L.marker([lat, lon], { icon }).addTo(map);
  }

  function updateMarker(lat, lon) {
    ensureMap(lat, lon);
    marker.setLatLng([lat, lon]);
    map.panTo([lat, lon]);
    sheetCoords.textContent = `${formatCoord(lat, 'N', 'S')} · ${formatCoord(lon, 'E', 'W')}`;
    updateDirectionsLink(lat, lon);
    lastUpdateReceivedAt = Date.now();
    startTicking();
  }

  function revealMap() {
    decryptingOverlay.hidden = true;
    bottomSheet.hidden = false;
  }

  function showExpired() {
    if (tickInterval !== null) {
      clearInterval(tickInterval);
      tickInterval = null;
    }
    mapSection.hidden = true;
    expiredSection.hidden = false;
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
        clearInterval(intervalId);
        showExpired();
        return;
      }

      if (share.payload && share.iv && share.updatedAt !== lastUpdatedAt) {
        lastUpdatedAt = share.updatedAt;
        try {
          const { lat, lon } = await decryptLocation(key, share.payload, share.iv);
          updateMarker(lat, lon);
          revealMap();
        } catch (e) {
          // ignore malformed/undecryptable update
        }
      }
    }, POLL_INTERVAL_MS);
  }

  async function main() {
    mapSection.hidden = false;

    const shareId = getShareId();
    const keyB64 = getKeyParam();

    if (!shareId || !keyB64) {
      showExpired();
      return;
    }

    let key;
    try {
      key = await importShareKey(keyB64);
    } catch (e) {
      showExpired();
      return;
    }

    let share;
    try {
      share = await Api.getShare(shareId);
    } catch (e) {
      showExpired();
      return;
    }

    if (!share.active) {
      showExpired();
      return;
    }

    expiresAtMs = new Date(share.expiresAt).getTime();

    if (share.payload && share.iv) {
      decryptingCipher.textContent = share.payload;
      try {
        const { lat, lon } = await decryptLocation(key, share.payload, share.iv);
        updateMarker(lat, lon);
        revealMap();
      } catch (e) {
        showExpired();
        return;
      }
    } else {
      decryptingCipher.textContent = 'Waiting for the first location update…';
    }

    startPolling(shareId, key, share.updatedAt);
  }

  main();
})();
