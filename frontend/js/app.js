(function () {
  const STORAGE_USER_ID = 'privisee.userId';
  const STORAGE_ACTIVE_SHARE = 'privisee.activeShare';

  const DURATION_STEPS = [15, 30, 60, 120, 240, 480, 1440];
  const DURATION_LABELS = ['15m', '30m', '1h', '2h', '4h', '8h', '24h'];

  const form = document.getElementById('start-form');
  const durationSlider = document.getElementById('duration-slider');
  const durationValue = document.getElementById('duration-value');
  const startSection = document.getElementById('start-section');
  const activeSection = document.getElementById('active-section');
  const copyBtn = document.getElementById('copy-btn');
  const stopBtn = document.getElementById('stop-btn');
  const statusEl = document.getElementById('status');

  const radarPulses = document.getElementById('radar-pulses');
  const radarCaptionIdle = document.getElementById('radar-caption-idle');
  const radarCaptionLive = document.getElementById('radar-caption-live');

  const howToggleOpen = document.getElementById('how-toggle-open');
  const howToggleClose = document.getElementById('how-toggle-close');
  const howPanel = document.getElementById('how-panel');

  const countdownValue = document.getElementById('countdown-value');
  const updatesSentEl = document.getElementById('updates-sent');
  const gpsAccuracyEl = document.getElementById('gps-accuracy');
  const cipherTextEl = document.getElementById('cipher-text');

  let watchId = null;
  let watchingViaNativePlugin = null; // the Geolocation plugin instance used for the active watch, if any
  let countdownInterval = null;
  let updatesSent = 0;
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
    statusEl.textContent = text || '';
  }

  function buildShareUrl(shareId, keyB64) {
    const origin = (window.PRIVISEE_CONFIG && window.PRIVISEE_CONFIG.publicShareOrigin) || location.origin;
    return `${origin}/s/${shareId}#key=${keyB64}`;
  }

  function durationIndexToMinutes(index) {
    return DURATION_STEPS[index];
  }

  function updateDurationLabel() {
    durationValue.textContent = DURATION_LABELS[Number(durationSlider.value)];
  }

  durationSlider.addEventListener('input', updateDurationLabel);
  updateDurationLabel();

  howToggleOpen.addEventListener('click', () => {
    howPanel.hidden = false;
    howToggleOpen.hidden = true;
  });

  howToggleClose.addEventListener('click', () => {
    howPanel.hidden = true;
    howToggleOpen.hidden = false;
  });

  async function publishPosition(position) {
    if (!session) return;
    const { latitude, longitude, accuracy } = position.coords;
    try {
      const { payload, iv } = await encryptLocation(session.key.key, latitude, longitude);
      await Api.updateLocation(session.shareId, session.ownerToken, payload, iv);
      updatesSent += 1;
      updatesSentEl.textContent = String(updatesSent);
      if (accuracy != null) {
        gpsAccuracyEl.textContent = `±${Math.round(accuracy)} m`;
      }
      cipherTextEl.textContent = payload;
      setStatus('');
    } catch (err) {
      setStatus('Could not update location, retrying...');
    }
  }

  // In the native app (mobile/), the @capacitor/geolocation plugin is used for both
  // requesting permission *and* watching position, end to end through CLLocationManager.
  // That keeps the OS permission prompt showing our Info.plist text and the app name.
  // If we requested permission natively but then watched via navigator.geolocation,
  // WKWebView would additionally show its own "'localhost' would like to use your
  // current location" prompt, since the web geolocation API is handled by WebKit and
  // tied to the page's origin rather than the app. On the plain website window.Capacitor
  // is undefined, so this falls through to navigator.geolocation unchanged.
  function getNativeGeolocationPlugin() {
    return (window.Capacitor && window.Capacitor.isNativePlatform() && window.Capacitor.Plugins.Geolocation) || null;
  }

  async function requestNativeLocationPermission() {
    const nativeGeo = getNativeGeolocationPlugin();
    if (!nativeGeo) return true;
    try {
      const status = await nativeGeo.requestPermissions();
      return status.location === 'granted' || status.coarseLocation === 'granted';
    } catch (_) {
      return false;
    }
  }

  async function startWatching() {
    const nativeGeo = getNativeGeolocationPlugin();
    if (!nativeGeo && !('geolocation' in navigator)) {
      setStatus('Geolocation is not supported by this browser.');
      return;
    }
    if (!(await requestNativeLocationPermission())) {
      setStatus('Location permission denied.');
      return;
    }
    const options = {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 20000,
    };
    if (nativeGeo) {
      watchingViaNativePlugin = nativeGeo;
      watchId = await nativeGeo.watchPosition(options, (position, err) => {
        if (err) {
          setStatus(`Location error: ${err.message}`);
          return;
        }
        publishPosition(position);
      });
    } else {
      watchingViaNativePlugin = null;
      watchId = navigator.geolocation.watchPosition(publishPosition, (err) => {
        setStatus(`Location error: ${err.message}`);
      }, options);
    }
  }

  function stopWatching() {
    if (watchId === null) return;
    if (watchingViaNativePlugin) {
      watchingViaNativePlugin.clearWatch({ id: watchId });
    } else {
      navigator.geolocation.clearWatch(watchId);
    }
    watchId = null;
    watchingViaNativePlugin = null;
  }

  function formatCountdown(msRemaining) {
    const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  function startCountdown() {
    stopCountdown();
    const tick = () => {
      const remaining = new Date(session.expiresAt).getTime() - Date.now();
      if (remaining <= 0) {
        countdownValue.textContent = formatCountdown(0);
        stopSharing();
        return;
      }
      countdownValue.textContent = formatCountdown(remaining);
    };
    tick();
    countdownInterval = setInterval(tick, 1000);
  }

  function stopCountdown() {
    if (countdownInterval !== null) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }

  function showActive() {
    startSection.hidden = true;
    activeSection.hidden = false;
    radarPulses.hidden = false;
    radarCaptionIdle.hidden = true;
    radarCaptionLive.hidden = false;
    startCountdown();
  }

  function showStart() {
    startSection.hidden = false;
    activeSection.hidden = true;
    radarPulses.hidden = true;
    radarCaptionIdle.hidden = false;
    radarCaptionLive.hidden = true;
    stopCountdown();
    updatesSent = 0;
    updatesSentEl.textContent = '0';
    gpsAccuracyEl.textContent = '—';
    cipherTextEl.textContent = '—';
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

  async function stopSharing() {
    if (!session) return;
    stopWatching();
    try {
      await Api.stopShare(session.shareId, session.ownerToken);
    } catch (_) { /* best effort */ }
    localStorage.removeItem(STORAGE_ACTIVE_SHARE);
    session = null;
    showStart();
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const minutes = durationIndexToMinutes(Number(durationSlider.value));

    setStatus('Starting...');
    try {
      await beginSharing(minutes);
    } catch (err) {
      setStatus(`Could not start sharing: ${err.message}`);
    }
  });

  copyBtn.addEventListener('click', async () => {
    if (!session) return;
    const url = buildShareUrl(session.shareId, session.key.exported);
    // Inside the native iOS/Android app (mobile/), Capacitor injects window.Capacitor
    // with native Share/Clipboard plugins that are more reliable than the web APIs
    // running in a WebView. On the plain website, window.Capacitor is undefined and
    // the code below falls through to navigator.share/clipboard unchanged.
    const nativePlugins = window.Capacitor && window.Capacitor.isNativePlatform() ? window.Capacitor.Plugins : null;

    if (nativePlugins) {
      try {
        await nativePlugins.Share.share({ title: 'privIsee', url });
        return;
      } catch (_) {
        // user cancelled or share sheet failed, fall back to clipboard
      }
    } else if (navigator.share) {
      try {
        await navigator.share({ title: 'privIsee', url });
        return;
      } catch (_) {
        // user cancelled or share failed, fall back to clipboard
      }
    }

    if (nativePlugins) {
      await nativePlugins.Clipboard.write({ string: url });
    } else {
      await navigator.clipboard.writeText(url);
    }
    const original = copyBtn.textContent;
    copyBtn.textContent = 'Copied';
    setTimeout(() => { copyBtn.textContent = original; }, 1800);
  });

  stopBtn.addEventListener('click', () => {
    stopSharing();
  });

  resumeSharing();
})();
