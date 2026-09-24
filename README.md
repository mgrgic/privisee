# privIsee

Share your live GPS location via a link — end-to-end encrypted, so the backend and its
database never see your real coordinates, only ciphertext.

## How it works

1. Open the app, pick how long you want to be locatable, and hit **Start sharing**.
2. Your browser generates a random AES-256-GCM key and a share link:
   `https://.../s/{shareId}#key={key}`. The key lives in the URL **fragment**, which browsers
   never transmit to any server — so only someone holding the full link can decrypt your
   position.
3. As your device moves, the browser encrypts each `{lat, lon}` update with that key and pushes
   it to the backend over a WebSocket. The backend stores/relays ciphertext only.
4. Anyone opening your share link fetches the latest ciphertext, decrypts it locally, and sees
   a live blue marker on an OpenStreetMap map — updated in real time over the same WebSocket.
5. Shares expire after the duration you chose. A housekeeping job permanently deletes share
   records once they've been expired for more than a month.

Someone with direct database access sees only ciphertext, an IV, a random share id and a random
owner token — never a decryptable position.

## Running locally

```sh
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:8000
- REST API: http://localhost:8080/api
- WebSocket: ws://localhost:8081

## Project layout

- `backend/` — PHP REST API (`public/index.php`), WebSocket relay (`bin/websocket-server.php`,
  built on Ratchet), and the housekeeping cleanup script (`bin/housekeeping.php`).
- `frontend/` — static, mobile-first HTML/CSS/JS. `index.html` starts a share, `share.html`
  (served at `/s/{shareId}`) views one. `js/crypto.js` holds the shared AES-GCM helpers.
- `docker-compose.yml` — MySQL, backend REST API, WebSocket server, housekeeping loop, and the
  nginx-served frontend.
