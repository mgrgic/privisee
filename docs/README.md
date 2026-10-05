# Handoff: privIsee "Radar" redesign

## Overview
New visual design for privIsee (https://privisee.seleven.de, repo `mgrgic/privisee`). It covers three screens:
- **Sharer**: `frontend/index.html`, the start screen and then the live-sharing state.
- **Viewer**: `frontend/share.html` (`/s/{shareId}`), which decrypts and shows the live map.
- **Viewer, expired**: a new state inside `share.html`.

The encryption, WebSocket and backend logic stay exactly as they are. Only the UI changes.

## About the design files
`privIsee Proposals.dc.html` is a **design reference built in HTML**, not production code. Open it in a browser (keep `support.js` next to it). Only **turn 3 (options 3a, 3b, 3c)** is the chosen design. Turns 1 and 2 are earlier explorations; ignore them. Rebuild the design in the existing static HTML/CSS/JS frontend. Put the styles in `frontend/css`. The inline styles in the reference are for the reference only.

## Fidelity
High-fidelity. Match the colors, type, spacing and copy exactly. Design width is 390px (mobile-first). On wider screens, center a max-width 440px column for the sharer. The viewer map stays full-bleed.

## Design tokens
Colors:
- `--bg` #0B0D0C (page)
- `--surface` #141816 (stat tiles, ciphertext box)
- `--line` #1F2621 (radar rings, dividers, tile borders)
- `--line-strong` #3A4540 (secondary button border, pills)
- `--text` #E9EEE6
- `--text-2` #C4CCC5 (body copy in lists)
- `--muted` #8A948C (labels, secondary text)
- `--faint` #5C665E (ciphertext, fine print)
- `--accent` #C8F25A (lime; primary buttons, live dot, rings, numbers)
- `--accent-hover` #DBFF7A
- Text on the accent color: #0B0D0C

Fonts (Google Fonts):
- **Space Grotesk** 400/500/700: UI and headings.
- **Space Mono** 400/700: labels, numbers, countdown, ciphertext.

Type scale:
- H1: Space Grotesk 700, 34px/1.02, letter-spacing -0.035em.
- Body: Space Grotesk 400, 15px/1.45, `--muted`.
- Labels: Space Mono 400, 10–11px, letter-spacing .08em, UPPERCASE.
- Duration value: Space Mono 700, 22px, accent.
- Countdown: Space Mono 700, 56px/1, letter-spacing -0.04em.
- Stat values: Space Mono 700, 16–20px.
- Logo: "privIsee" in Space Grotesk 700 18px, letter-spacing -0.02em, followed by a lime "."

Radii and spacing:
- Radius 8px for buttons and tiles, 14px for the viewer bottom sheet, 999px for pills.
- Page padding is 22px horizontal. Gaps are 8/10/14px.
- No shadows, except the glow on the dot: `box-shadow: 0 0 24px #C8F25A`.

Buttons:
- Primary: 60px tall (56px in pairs), `--accent` background, dark text, Space Grotesk 700 17px (15px in pairs). Hover changes the background to `--accent-hover`.
- Secondary: transparent, 1px `--line-strong` border, `--text` color. Hover turns the border `--text`.
- Text links: Space Mono 12px, written in brackets, e.g. `[ + 30 min ]`.

## Screen 3a: Sharer (index.html)
**Header** (20px 22px padding): the logo on the left. `[ source ]` on the right in Space Mono 11px `--muted`, linking to GitHub.

**Radar** (260px tall, centered):
- Three concentric circles: 250, 170 and 90px diameter, 1px `--line`.
- A crosshair made of two 1px `--line` lines, 250px long.
- A center dot: 14px, `--accent`, with the glow.
- Caption 4px from the bottom: `OFF THE GRID` in `--muted` while idle, `BROADCASTING · ENCRYPTED` in `--accent` while live.
- **Live only:** two rings pulse outward. Each is a 250px circle with a 2px accent border, animated with `@keyframes ring {0%{transform:scale(.2);opacity:.9}100%{transform:scale(1);opacity:0}}` over 2.4s ease-out, looping forever. The second ring is delayed 1.2s.

**Idle state:**
- H1 "Be findable.<br>Not trackable." Under it: "Your friends see you. The server sees noise."
- Duration block: the label `DURATION` on the left and the value on the right (e.g. `1h`).
  - A native range input (0–6, step 1) with `accent-color: #C8F25A`.
  - Tick labels below: `15m 30m 1h 2h 4h 8h 24h`.
  - The steps map to 15 min, 30 min, 1 h, 2 h, 4 h, 8 h and 24 h. The default is 1 h.
- A full-width primary button, **"Go live"**. It calls the existing start-share logic with the chosen duration.
- A toggle, `[ + how the encryption works ]`. It expands three numbered rows (the numbers are Space Mono 700 12px accent, in a 36px column; the rows are separated by `--line` dividers):
  1. "Your phone makes a secret key. It's stored only after the # in the link." (Render the # in the mono font, in the accent color.)
  2. "Each GPS fix is encrypted before it leaves your phone."
  3. "Your friend's browser decrypts it. The server never holds the key."
  - A `[ − close ]` link at the end collapses it.

**Live state** (it replaces the idle content):
- Countdown H:MM:SS (or M:SS under an hour), centered. Under it: `UNTIL THE LINK GOES DARK`.
- A 2-column grid of stat tiles (`--surface`, 1px `--line`, 12px padding):
  - `UPDATES SENT`: a count of the encrypted updates actually pushed.
  - `GPS ACCURACY`: `±{coords.accuracy} m`.
- A ciphertext box. Its label is `LAST PACKET · WHAT THE SERVER GOT`. It shows the real base64/hex ciphertext of the last update in Space Mono 11px `--faint`, 2 lines, with overflow hidden. Update it with every push.
- `[ + 30 min ]` extends the expiry. This needs a backend endpoint if one doesn't exist; if you skip it, hide the link.
- Bottom-pinned 2-column buttons: primary **"Copy link"**, which shows "Copied" for 1.8s after a clipboard write, and secondary **"Go dark"**, which stops sharing and returns to idle. Use `navigator.share` too when it's available.
- When the countdown reaches 0, go back to idle.

## Screen 3b: Viewer (share.html)
- The map is full-bleed (Leaflet already renders OpenStreetMap). Switch to a dark basemap, e.g. Esri `Canvas/World_Dark_Gray_Base` (`.../MapServer/tile/{z}/{y}/{x}`) or CARTO dark_all with a key. Keep the attribution.
- The marker replaces the blue pin:
  - A 16px accent dot with a 3px #0B0D0C border and the glow.
  - A 44px halo in `rgba(200,242,90,.18)`.
  - One pulsing 120px ring (same keyframes as above).
- A top bar overlays the map: the logo on the left and an `E2E ✓` pill on the right (Space Mono 11px accent, 1px `--line-strong` border, `--bg` fill). It sits on a gradient from `--bg` to transparent.
- **Decrypting state** (from page load until the first successful decrypt): a full overlay in `rgba(11,13,12,.86)` with `backdrop-filter: blur(6px)`, centered:
  - `DECRYPTING…` in Space Mono 700 13px accent, blinking (opacity 1 → .25, 1s).
  - The raw ciphertext in `--faint`.
  - "Using the key in your link. Nothing is sent back."
- **Bottom sheet** (12px inset, `--bg`, 1px `--line`, radius 14px, 18px padding):
  - "Shared location" (Space Grotesk 700 22px) with the coordinates below it (`48.4735° N · 7.9498° E`, Space Mono 12px muted). On the right, a blinking `LIVE` label with a dot.
  - Two stat tiles: `UPDATED` ("Ns ago", counting up from the last WebSocket message) and `LINK EXPIRES` (a countdown).
  - A primary **"Get directions"** button. It opens `https://www.google.com/maps/dir/?api=1&destination=lat,lon` or `geo:` on Android.

## Screen 3c: Viewer, expired
Show this when the share has expired or can't be found.
- Dashed radar circles (250 and 170px, 1px dashed `--line`) around a 14px hollow dot (2px `--line-strong` border).
- Label `SIGNAL LOST · LINK EXPIRED`, then the H1 "This link has gone dark."
- Body: "The person who shared it chose a time limit, and it's over. Ask them to send a new link if you still need their location."
- A primary button, **"Share my own location"**, that links to `/`.
- Fine print: "Old location data is deleted within a month."

## Motion
- Pulse ring: 2.4s ease-out, infinite.
- Blink: 1.2–1.4s.
- Other transitions: 0.15s color/border.
- Respect `prefers-reduced-motion`: turn off the rings and blinking.

## Screenshots (`screenshots/`, 2x, 390px design width)
- `01-sharer-idle.png`: 3a, idle.
- `02-sharer-how-it-works.png`: 3a with the explainer expanded.
- `03-sharer-live.png`: 3a while live. The rings pulse in the real design.
- `05-viewer-live-map.png`: 3b after decryption. The decrypting overlay is described in the 3b section; open the HTML reference and click "replay" to see it.
- `06-viewer-expired.png`: 3c.

## Files
- `privIsee Proposals.dc.html`: the design reference (turn 3 = 3a, 3b, 3c).
- `support.js`: the runtime the reference needs to open in a browser.
