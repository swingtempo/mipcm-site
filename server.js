const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT || 8080;

// Live MIPC gateway the real site serves the app from. /ccm/*, /cmipcgw/*,
// /ccms/*, /cpms/*, and /dcm/* requests are proxied here so login/camera API
// calls actually reach the backend, exactly like visiting www.mipcm.com.
// Set MIPC_GW='' to disable. Use ovca22.mipcm.com:7443 for HTTPS gateway.
const GATEWAY = process.env.MIPC_GW || 'https://ovca22.mipcm.com:7443';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.map': 'application/json',
};

function safeJoin(base, target) {
  const resolved = path.resolve(base, '.' + target);
  const basePath = path.resolve(base);
  if (resolved !== basePath && !resolved.startsWith(basePath + path.sep)) {
    return null;
  }
  return resolved;
}

function backendUnavailable(res) {
  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ result: 'server_unreachable', msg: 'Local copy: gateway unreachable.' }));
}

function proxy(req, res) {
  const gw = new URL(GATEWAY);
  const reqUrl = req.url || '/';
  const headers = Object.assign({}, req.headers);
  delete headers.host;
  delete headers.connection;

  const lib = gw.protocol === 'https:' ? https : http;
  const out = lib.request({
    protocol: gw.protocol,
    hostname: gw.hostname,
    port: gw.port || (gw.protocol === 'https:' ? 443 : 80),
    method: req.method,
    path: reqUrl,
    headers,
  }, (up) => {
    res.writeHead(up.statusCode || 200, up.headers);
    up.pipe(res);
  });

  out.on('error', () => backendUnavailable(res));
  req.pipe(out);
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);

  // Backend API + OEM asset requests: proxy to the live gateway.
  if (GATEWAY && (urlPath.startsWith('/ccm/') || urlPath.startsWith('/cmipcgw/') || urlPath.startsWith('/oem/') ||
                  urlPath.startsWith('/ccms/') || urlPath.startsWith('/cpms/') || urlPath.startsWith('/dcm/'))) {
    proxy(req, res);
    return;
  }

  let filePath = safeJoin(ROOT, urlPath);
  if (!filePath) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (urlPath.endsWith('/') || fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('MIPC local site running:  http://localhost:' + PORT + '/');
  if (GATEWAY) {
    console.log('Proxying /ccm/