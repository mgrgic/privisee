// Runtime configuration shared by the web build and the native iOS/Android apps
// (see mobile/). The web deployment (frontend/nginx.conf) proxies /api and /ws
// on the same origin, so it can leave both values empty and rely on
// location.origin. The native apps load these files from local storage, not
// from the backend's origin, so they need absolute values here.
// mobile/scripts/sync-web.mjs overwrites both at sync time from
// PRIVISEE_API_BASE_URL / PRIVISEE_PUBLIC_SHARE_ORIGIN.
window.PRIVISEE_CONFIG = {
  // Origin of the deployed backend, e.g. "https://privisee.example.com".
  apiBaseUrl: '',
  // Public origin recipients' browsers should open share links on, e.g.
  // "https://privisee.example.com". Native builds must set this — location.origin
  // inside the app is the local webview root, not a URL anyone else can open.
  publicShareOrigin: '',
};
