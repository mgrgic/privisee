// AES-GCM end-to-end encryption helpers. The AES key never leaves the browser:
// it is generated client-side and carried only in the URL fragment (#key=...),
// which is never sent to the server.

function bufToBase64url(buf) {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToBuf(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(str.length + (4 - (str.length % 4)) % 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function generateShareKey() {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const raw = await crypto.subtle.exportKey('raw', key);
  return { key, exported: bufToBase64url(raw) };
}

async function importShareKey(base64url) {
  const raw = base64urlToBuf(base64url);
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function encryptLocation(key, lat, lon) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify({ lat, lon }));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  return { payload: bufToBase64url(ciphertext), iv: bufToBase64url(iv) };
}

async function decryptLocation(key, payloadB64, ivB64) {
  const ciphertext = base64urlToBuf(payloadB64);
  const iv = base64urlToBuf(ivB64);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv) }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(plaintext));
}
