# privIsee mobile (iOS + Android)

Native shell around `../frontend/` using [Capacitor](https://capacitorjs.com). The
web UI, crypto, and API code are reused as-is — `mobile/www` is a **generated**
copy of `frontend/` (see `scripts/sync-web.mjs`), not a separate codebase. Edit
`frontend/`, then re-sync; never edit `mobile/www` directly, it's gitignored and
gets wiped on every sync.

## What's native vs. reused

- Reused unchanged: `index.html`, `share.html`, all of `css/`, `js/crypto.js`,
  `js/view.js`, most of `js/app.js`, `img/`.
- `js/api.js` and `js/app.js` gained a small `window.Capacitor` feature-detect
  (native Share/Clipboard/Geolocation plugins when running in the app, the
  original web APIs when running as the plain website — see `frontend/js/config.js`).
- Everything under `ios/` and `android/` is a real, buildable native project
  Capacitor generated (`npx cap add`), committed to this repo like normal native
  app source.

## Prerequisites

- Node.js (already required by the rest of this repo's tooling)
- Xcode, with a paid Apple Developer Program membership for device/TestFlight/App
  Store builds (simulator builds work without one)
- Android Studio + Android SDK, and a Google Play Console developer account for
  Play Store builds
- **Gradle needs a JDK ≤ 21** — a system JDK 25 install fails with `Unsupported
  class file major version 69`. Use Android Studio's bundled JBR instead:
  ```
  export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
  ```

## Setup

```
cd mobile
npm install
```

## Configuring the backend URL

The web deployment (`frontend/nginx.conf`) proxies `/api` on the same origin, so
`frontend/js/config.js` ships with empty defaults. The native apps load these
files from local storage, not from the backend's origin, so they need absolute
URLs. Set them when syncing:

```
PRIVISEE_API_BASE_URL=https://privisee.seleven.de \
  npm run sync-web
```

This copies `frontend/` into `www/` and rewrites `www/js/config.js` with:
- `apiBaseUrl` — prefixed onto every `/api/...` call in `js/api.js`
- `publicShareOrigin` — the origin used to build `Copy link` share URLs (falls
  back to `apiBaseUrl` if unset). This **must** be the public web origin
  (`https://privisee.seleven.de`), not `apiBaseUrl` with an `/api` suffix —
  recipients open this link in their own browser via `frontend/share.html`.

`npm run sync` runs `sync-web` and then `npx cap sync` (copies `www/` into both
native projects and updates their plugin registrations). Re-run it after any
change under `frontend/`.

## Building

```
npm run open:ios       # syncs, then opens ios/App/App.xcworkspace-equivalent in Xcode
npm run open:android   # syncs, then opens android/ in Android Studio
```

Before your first real build:

1. **Bundle ID.** `capacitor.config.json`'s `appId` is a placeholder
   (`com.privisee.app`). Pick your real reverse-DNS ID, matching what you
   register in App Store Connect / Play Console, then update it in three
   places (Capacitor doesn't rename an already-added platform for you):
   - `mobile/capacitor.config.json` → `appId`
   - Xcode → target **App** → Signing & Capabilities → Bundle Identifier
   - `android/app/build.gradle` → `applicationId` (and `android/app/src/main/AndroidManifest.xml`'s package attribute if present)
2. **Signing.** In Xcode, Signing & Capabilities → select your Team (Automatically
   manage signing is fine for dev). In Android Studio, Build → Generate Signed
   Bundle/APK to create a release keystore for Play Store uploads.
3. **App icon / splash.** Capacitor's defaults are placeholders — replace
   `ios/App/App/Assets.xcassets/AppIcon.appiconset` and
   `android/app/src/main/res/mipmap-*` (a tool like `npx @capacitor/assets
   generate` can regenerate all sizes from one source image).

Both platforms have been verified to build clean in this environment:
`./gradlew assembleDebug` (Android) and `xcodebuild ... -sdk iphonesimulator
build` (iOS).

## Location permissions

- Android: `ACCESS_COARSE_LOCATION` + `ACCESS_FINE_LOCATION` are declared in
  `AndroidManifest.xml`; `@capacitor/geolocation` requests them at runtime the
  first time a share starts.
- iOS: `NSLocationWhenInUseUsageDescription` is set in `Info.plist`.

## Known limitation: foreground-only tracking (MVP scope)

Like the website, `js/app.js` uses `navigator.geolocation.watchPosition`, which
stops delivering updates once the app is backgrounded — for a "share my live
location for the next N hours" app, that's the main thing worth fixing before
a real release. This wasn't tackled in this pass; recommended next step:

- Add a background-geolocation plugin (e.g.
  `@capacitor-community/background-geolocation` or the commercial
  Transistor Software one) that keeps reporting via a foreground service +
  persistent notification on Android, and `UIBackgroundModes: [location]` +
  "Always" authorization on iOS. Both require additional user-facing
  disclosure text and (for background location on Android 10+) a Play Console
  policy declaration form.

## Known limitation: shared links still open on the web, not in the app

Opening someone's `https://.../s/<id>#key=...` link currently opens
`frontend/share.html` in the recipient's browser (unchanged, works fine — no
native code needed for viewing). Making that link open directly in the native
app (if installed) needs iOS Associated Domains (`apple-app-site-association`
hosted at the backend origin) and Android App Links (`assetlinks.json`) —
not set up here since it requires control over the production domain's TLS
hosting, which is out of scope for this pass.
