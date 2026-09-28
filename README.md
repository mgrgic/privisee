# privIsee

Share your live GPS location via a link — end-to-end encrypted, so the backend and its
database never see your real coordinates, only ciphertext.

## How it works

1. Open the app, pick how long you want to be locatable, and hit **Start sharing**.
2. Your browser generates a random AES-256-GCM key and a share link:
   `https://.../s/{shareId}#key={key}`. The key lives in the URL **fragment**, which browsers
   never transmit to any server — so only someone holding the full link can decrypt your
   position.
3. As your device moves, the browser encrypts each `{lat, lon}` update with that key and sends
   it to the backend as an encrypted `PATCH` request. The backend stores ciphertext only.
4. Anyone opening your share link fetches the latest ciphertext, decrypts it locally, and sees
   a live blue marker on an OpenStreetMap map — the page polls for updates every few seconds.
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

## Project layout

- `backend/` — PHP REST API (`public/index.php`) and the housekeeping cleanup script
  (`bin/housekeeping.php`).
- `frontend/` — static, mobile-first HTML/CSS/JS. `index.html` starts a share, `share.html`
  (served at `/s/{shareId}`) views one. `js/crypto.js` holds the shared AES-GCM helpers.
- `docker-compose.yml` — MySQL, backend REST API, housekeeping loop, and the nginx-served
  frontend.
- `deploy/` — ready-to-upload `.htaccess`/front-controller files for deploying to plain PHP
  shared hosting (see below).

## Deploying to shared PHP hosting (e.g. IONOS)

This setup assumes an Apache webspace with SSH access and cron, exposing a single `htdocs/`
document root, everything else in your home directory reachable over SSH but not by URL — and
everything served on one port (443). There's no Docker and no persistent processes, so the
WebSocket relay isn't used here; the frontend instead polls `GET /api/shares/:id` for updates.

Target layout on the server:

```
~/
  backend/            # this repo's backend/ folder, uploaded as-is, NOT web-exposed
    public/, src/, composer.json, bin/, db/, .env
  htdocs/              # the web root
    index.html, share.html, css/, js/, img/    # this repo's frontend/ folder, uploaded as-is
    .htaccess                                    # from deploy/htdocs/.htaccess
    api/
      index.php                                  # from deploy/htdocs/api/index.php
      .htaccess                                   # from deploy/htdocs/api/.htaccess
```

The backend has no third-party dependencies and uses a hand-rolled autoloader
(`backend/src/autoload.php`), so **no Composer is needed on the server** — just upload the
files.

Steps:

1. Upload the contents of `frontend/` into `htdocs/`.
2. Upload `deploy/htdocs/.htaccess` to `htdocs/.htaccess`.
3. Upload `deploy/htdocs/api/index.php` and `deploy/htdocs/api/.htaccess` into `htdocs/api/`.
4. Upload the whole `backend/` folder to `~/backend` (a sibling of `htdocs/`, outside the web
   root).
5. Create `backend/.env` (same keys as `.env.example`, minus `WS_PORT`) with the MySQL
   credentials from your IONOS database panel, and import `backend/db/schema.sql` into it.
6. Add a cron job for housekeeping (hourly, matching the local docker-compose cadence):
   `0 * * * * php ~/backend/bin/housekeeping.php >> ~/backend/housekeeping.log 2>&1`

If your account's home directory isn't a sibling of `htdocs/` the way this layout assumes,
adjust the `require` path in `htdocs/api/index.php` accordingly.
