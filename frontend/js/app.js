(function () {
  const STORAGE_USER_ID = 'privisee.userId';
  const STORAGE_ACTIVE_SHARE = 'privisee.activeShare';

  const form = document.getElementById('start-form');
  const durationInput = document.getElementById('duration');
  const durationUnit = document.getElementById('duration-unit');
  const startSection = document.getElementById('start-section');
  const activeSection = document.getElementById('active-section');
  const shareUrlInput = document.getElementById('share-url');
  const copyBtn = document.getElementById('copy-btn');
  const stopBtn = document.getElementById('stop-btn');
  const statusEl = document.getElementById('status');
  const expiresEl = document.getElementById('expires-at');

  let watchId = null;
  let session = null; // { shareId, ownerToken, key, expiresAt }

  function getUserId() {
    let id = localStorage.getItem(STORAGE_USER_ID);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_USER_ID, id);
    }
    return id;
  }

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function buildShareUrl(shareId, keyB64) {
    return `${location.origin}/s/${shareId}#key=${keyB64}`;
  }

  async function publishPosition(position) {
    if (!session) return;
    const { latitude, longitude } = position.coords;
    try {
      const { payload, iv } = await encryptLocation(session.key.key, latitude, longitude);
      await Api.updateLocation(session.shareId, session.ownerToken, payload, iv);
      setStatus('Sharing your location live.');
    } catch (err) {
      setStatus('Could not update location, retrying...');
    }
  }

  function startWatching() {
    if (!('geolocation' in navigator)) {
      setStatus('Geolocation is not supported by this browser.');
      return;
    }
    watchId = navigator.geolocation.watchPosition(publishPosition, (err) => {
      setStatus(`Location error: ${err.message}`);
    }, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 20000,
    });
  }

  function stopWatching() {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
  }

  function showActive() {
    startSection.hidden = true;
    activeSection.hidden = false;
    shareUrlInput.value = buildShareUrl(session.shareId, session.key.exported);
    expiresEl.textContent = new Date(session.expiresAt).toLocaleString();
  }

  function showStart() {
    startSection.hidden = false;
    activeSection.hidden = true;
  }

  async function beginSharing(durationMinutes) {
    const userId = getUserId();
    const created = await Api.createShare(durationMinutes, userId);
    const generated = await generateShareKey();

    session = {
      shareId: created.shareId,
      ownerToken: created.ownerToken,
      expiresAt: created.expiresAt,
      key: generated,
    };

    localStorage.setItem(STORAGE_ACTIVE_SHARE, JSON.stringify({
      shareId: session.shareId,
      ownerToken: session.ownerToken,
      expiresAt: session.expiresAt,
      keyExported: session.key.exported,
    }));

    showActive();
    setStatus('Waiting for GPS fix...');
    startWatching();
  }

  async function resumeSharing() {
    const raw = localStorage.getItem(STORAGE_ACTIVE_SHARE);
    if (!raw) return;

    const stored = JSON.parse(raw);
    if (new Date(stored.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(STORAGE_ACTIVE_SHARE);
      return;
    }

    const key = await importShareKey(stored.keyExported);
    session = {
      shareId: stored.shareId,
      ownerToken: stored.ownerToken,
      expiresAt: stored.expiresAt,
      key: { key, exported: stored.keyExported },
    };

    showActive();
    setStatus('Waiting for GPS fix...');
    startWatching();
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const value = Number(durationInput.value);
    const unit = durationUnit.value;
    const minutes = unit === 'hours' ? value * 60 : value;

    if (!value || minutes <= 0) {
      setStatus('Enter a valid duration.');
      return;
    }

    setStatus('Starting...');
    try {
      await beginSharing(Math.round(minutes));
    } catch (err) {
      setStatus(`Could not start sharing: ${err.message}`);
    }
  });

  copyBtn.addEventListener('click', async () => {
    await navigator.clipboard.writeText(shareUrlInput.value);
    copyBtn.textContent = 'Copied!';
    setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
  });

  stopBtn.addEventListener('click', async () => {
    if (!session) return;
    stopWatching();
    try {
      await Api.stopShare(session.shareId, session.ownerToken);
    } catch (_) { /* best effort */ }
    localStorage.removeItem(STORAGE_ACTIVE_SHARE);
    session = null;
    showStart();
  });

  resumeSharing();
})();
