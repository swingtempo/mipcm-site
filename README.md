# mipcm.com — local copy of the web code

A downloaded copy of the frontend of https://www.mipcm.com/ (MIPC / Vimtag cloud
camera web portal), set up to run locally.

## How to run

    node server.js

Then open http://localhost:8080/ in a browser.

Or double-click `start.bat` (starts the server and opens the page).

## What was downloaded

The real site is a 3-layer chain, all saved here:

1. **Entry shell** — `index.html` (simplified local version of the original,
   which is kept in `originals/mipcm.com-shell.html`).
2. **Version control / host chooser** — `originals/version_control_v2/`
   (`index.htm` + `host_choose.js`). On the live site this asks a "signal
   server" which app package to serve.
3. **The actual app** — `app/` = package `pkg-website-v9.10.1.2210121414`
   (a Vue.js single-page app: `index.html`, `js/`, `img/`). This is what the
   real site loads at the end of the chain.

Other originals: `originals/mipcm-pkgs.rls.json` (the version list returned by
the signal server) and the captured gateway reply `originals/cmipcgw-reply.js`.

## What works locally

- The full frontend loads and renders (HTML, JS, CSS, images).
- `server.js` **proxies** `/ccm/*`, `/cmipcgw/*` and `/oem/*` to the live MIPC
  gateway (`http://54.39.107.85:7080` — the same origin the real site serves
  the app from). With a real MIPC account you can log in, see your devices,
  view snapshots, etc., exactly like visiting www.mipcm.com.

## What does NOT work locally

MIPC is a cloud camera platform. The web app is a thin client for the vendor's
backend. Over HTTP everything goes through the proxy above, but:

- **Live/history video streaming** uses a binary P2P/signal protocol
  (`binnet://`, WebSocket) that the web proxy cannot tunnel, so video may not
  play. Snapshots, device list, and most settings still work.
- **Device discovery / Wi-Fi setup** of cameras is not part of the web app at all.

## Configuration

- `PORT` — change the port (default 8080).
- `MIPC_GW` — change the gateway, or set to empty to disable the proxy:

      node server.js                       # proxy to live gateway (default)
      set MIPC_GW= && node server.js       # static only, no backend
