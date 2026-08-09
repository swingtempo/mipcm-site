// MIPC / Vimtag cloud login — standalone reimplementation of the browser flow.
// Replicates exactly what app/js/app.420d1150.js does for /ccm/cacs_dh_req and
// /ccm/cacs_login_req (modules e501, 7ded, 69a2, aa55, d6fa, eeb9).
'use strict';

const crypto = require('crypto');
const http = require('http');

// ---- config ---------------------------------------------------------------
const BASE = process.env.MIPC_BASE || 'http://localhost:8080'; // local proxy -> gateway
const USER = process.env.MIPC_USER || '';
const PASS = process.env.MIPC_PASS || '';

const PRIME = '791658605174853458830696113306796803';
const G = '5';

// ---- big-int helpers (replacement for Leemon in module e501) --------------
function modPow(base, exp, mod) {
  let result = 1n;
  base %= mod;
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % mod;
    exp >>= 1n;
    base = (base * base) % mod;
  }
  return result;
}

// ---- module 69a2 (mcodec) ------------------------------------------------
const S_BASE62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const S_MINING64 = S_BASE62 + '_.-';

function fn_hex2i(c) {
  if (c >= 48 && c <= 57) return c - 48;         // 0-9
  if (c >= 65 && c <= 71) return c - 55;         // A-F (note: <=71 covers G too, harmless)
  if (c >= 97 && c <= 102) return c - 87;        // a-f
  return 0;
}

function fn_i2a(e, t) {
  let o, r, n, a = '', i = '' + e;
  if (i.indexOf('0x') === 0) {
    for (o = i.length - 1; o > 1;) {
      for (n = 0, r = 0; r < 8 && o > 1; --o, r += 4)
        n += fn_hex2i(i.charCodeAt(o)) << r;
      a = String.fromCharCode(n) + a;
    }
  } else {
    for (o = 24; o >= 0; o -= 8)
      if (e >= (1 << o)) a += String.fromCharCode((e >> o) & 255);
  }
  while (a.length < (t || 0)) a = '\0' + a;
  return a;
}

function fn_str_2_b64(e, t) {
  let o, r, n, a, i = 0, l = '', s = e.length, c = t ? S_MINING64 : S_BASE62 + '+/=';
  while (i < s) {
    for (r = 0, o = 0; r < 24 && i < s; r += 8, ++i) o = (o << 8) + e.charCodeAt(i);
    for (a = 0; a < 24; a += 6, o &= (1 << (r - a)) - 1) {
      n = r - a - 6;
      l += a < r ? c.charAt(n < 0 ? o << -n : o >> n) : '';
    }
  }
  return l;
}

function fn_binary_2_b64(e, t) {
  let o, r, n, a, i = 0, l = '', s = e.length, c = t ? S_MINING64 : S_BASE62 + '+/=';
  while (i < s) {
    for (r = 0, o = 0; r < 24 && i < s; r += 8, i++) o = (o << 8) + e[i];
    for (a = 0; a < 24; a += 6, o &= (1 << (r - a)) - 1) {
      n = r - a - 6;
      l += a < r ? c.charAt(n < 0 ? o << -n : o >> n) : '';
    }
  }
  return l;
}

// nid(seq, lid|sid, shareKey, flag, null, null, md5, "hex")
function fn_nid(e, t, o, r, n, a, i, l) {
  const s = fn_i2a(e);
  const c = t ? fn_i2a(t) : '';
  const d = t ? fn_i2a(r) : '';
  const _ = a ? fn_i2a('0x' + i[l](a)) : '';
  const g = (s ? String.fromCharCode(64 + s.length) + s : '') +
            (c ? String.fromCharCode(96 + c.length) + c : '') +
            (d ? String.fromCharCode(128 + d.length) + d : '') +
            (n ? String.fromCharCode(160 + n.length) + n : '');
  const m = g + (o ? String.fromCharCode(0 + o.length) + o : '') + (_ ? String.fromCharCode(0 + _.length) + _ : '');
  const p = fn_i2a('0x' + i[l](m));
  return fn_str_2_b64(String.fromCharCode(32 + p.length) + p + g, 1);
}

// obj_2_url flattening (used by axios interceptor, module eeb9)
function obj_2_url(e) {
  const o = {};
  function r(e, t) {
    for (const n in e) {
      if (e.constructor === Array) o[t + '__x_countz_'] = e.length;
      const a = e[n];
      if (a !== void 0 && a !== null) {
        let name = n;
        if (('' + name).charAt(0) === '%') name = name.substr(1);
        const i = t + ('0' !== name ? ('' === t ? 'd' : '_') + name : '');
        if (typeof a !== 'function') {
          if (typeof a === 'object') {
            if (a.constructor === Uint8Array) o[i] = fn_bytes_2_uri_param(a);
            else { if (a.constructor !== Array) o[i] = 1; r(a, i); }
          } else o[i] = a;
        }
      }
    }
    return o;
  }
  return r(e, '');
}

function fn_bytes_2_uri_param(e) {
  let t = '';
  for (const r in e) {
    let o = e[r].toString(16);
    if (o.length <= 1) o = '0' + o;
    t += '%' + o;
  }
  return t;
}

// ---- module aa55 (md5) — use Node's crypto, identical output --------------
function md5hex(s) { return crypto.createHash('md5').update(s, 'binary').digest('hex'); }

// ---- module d6fa (crypto-js DES) — use the actual bundled crypto-js -------
const { loadCryptoJS } = require('./crypto_js_loader');
const CryptoJS = loadCryptoJS();

function desEncryptHexToHex(plainHex, keyHex) {
  const enc = CryptoJS.DES.encrypt(
    CryptoJS.enc.Hex.parse(plainHex),
    CryptoJS.enc.Hex.parse(keyHex),
    { iv: CryptoJS.enc.Hex.parse('0000000000000000'), padding: CryptoJS.pad.NoPadding }
  );
  return enc.ciphertext.toString();
}

function desCbcNoPadding(plainBuf, keyBuf) {
  // plainBuf/keyBuf are Buffers -> convert to CryptoJS WordArrays
  const words = [];
  for (let i = 0; i < plainBuf.length; i += 4) {
    words.push(plainBuf.readUInt32BE(i));
  }
  const plainWA = CryptoJS.lib.WordArray.create(words, plainBuf.length);
  const keyWords = [];
  for (let i = 0; i < keyBuf.length; i += 4) keyWords.push(keyBuf.readUInt32BE(i));
  const keyWA = CryptoJS.lib.WordArray.create(keyWords, keyBuf.length);
  const enc = CryptoJS.DES.encrypt(plainWA, keyWA, {
    iv: CryptoJS.enc.Hex.parse('0000000000000000'),
    padding: CryptoJS.pad.NoPadding,
  });
  return Buffer.from(enc.ciphertext.toString(), 'hex');
}

// ---- module 7ded login helpers -------------------------------------------
function bytes_align(str) {
  const t = [];
  for (let o = 0; o < str.length; o++) t.push(str.charCodeAt(o).toString(16));
  const r = parseInt(str.length / 8) + 1;
  const n = 8 * r - str.length;
  const a = [];
  let i = '';
  for (let l = 0; l < n; l++) {
    if (l === 0) i = '0' + n;
    else i += 'ff';
    if (i.length === 8) { a.push('0x' + i); i = ''; }
  }
  for (let s = 0; s < t.length; s++) {
    i += t[s];
    if (i.length === 8) { a.push('0x' + i); i = ''; }
  }
  return a;
}

function str_2_16bytes(hexStr) {
  const t = hexStr.length / 2;
  const o = [];
  for (let r = 0; r < t; r++) {
    const n = hexStr.charAt(2 * r), a = hexStr.charAt(2 * r + 1);
    o.push(parseInt('0x' + n + a) & 255);
  }
  return o;
}

// uctx: {"app":{}} -> DES-CBC(NoPadding) with key md5(shareKey), b64
function get_uctx(shareKey, obj) {
  const plaintext = JSON.stringify(obj);
  const keyWA = CryptoJS.MD5(shareKey);                 // WordArray (16 bytes)
  const words = bytes_align(plaintext);                 // array of 0x words
  const sigBytes = 8 * (parseInt(plaintext.length / 8) + 1);
  const plainWA = CryptoJS.lib.WordArray.create(words, sigBytes);
  const enc = CryptoJS.DES.encrypt(plainWA, keyWA, {
    iv: CryptoJS.enc.Hex.parse('0000000000000000'),
    padding: CryptoJS.pad.NoPadding,
  });
  const hex = enc.ciphertext.toString();
  const bytes = str_2_16bytes(hex);
  return 'data:application/octet-stream;base64,' + fn_binary_2_b64(bytes);
}

function desCbcNoPadding(plainBuf, keyBuf) {
  // (unused; kept for reference) same result as get_uctx via crypto-js
  const words = [];
  for (let i = 0; i < plainBuf.length; i += 4) words.push(plainBuf.readUInt32BE(i));
  const plainWA = CryptoJS.lib.WordArray.create(words, plainBuf.length);
  const keyWords = [];
  for (let i = 0; i < keyBuf.length; i += 4) keyWords.push(keyBuf.readUInt32BE(i));
  const keyWA = CryptoJS.lib.WordArray.create(keyWords, keyBuf.length);
  const enc = CryptoJS.DES.encrypt(plainWA, keyWA, {
    iv: CryptoJS.enc.Hex.parse('0000000000000000'),
    padding: CryptoJS.pad.NoPadding,
  });
  return Buffer.from(enc.ciphertext.toString(), 'hex');
}

function pwd_encrypt(shareKey, pwdHex32) {
  return desEncryptHexToHex(pwdHex32, md5hex(shareKey));
}

// ---- HTTP (through local proxy) ------------------------------------------
function request(pathAndQuery) {
  return new Promise((resolve, reject) => {
    const u = new URL(BASE + pathAndQuery);
    const req = http.request({
      hostname: u.hostname,
      port: u.port || 80,
      path: u.pathname + u.search,
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) mipc-re' },
    }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    req.end();
  });
}

// Response bodies are JS source that the app eval()s: message({...});
const vm = require('vm');
function parseBody(body) {
  const t = body.trim();
  try { return JSON.parse(t); } catch (e) {}
  if (/^message\(/m.test(t)) {
    try {
      let captured = null;
      const ctx = { message: (o) => { captured = o; } };
      vm.createContext(ctx);
      vm.runInContext(t.replace(/;\s*$/, ''), ctx);
      if (captured) return captured;
    } catch (e2) {}
  }
  return { __raw: body };
}

// ---- main ----------------------------------------------------------------
async function main() {
  if (!USER || !PASS) {
    console.error('Set MIPC_USER / MIPC_PASS environment variables.');
    process.exit(1);
  }
  const password = md5hex(PASS); // UI ALWAYS MD5-hashes password for cloud login (regardless of length)
  console.log('user:', USER, '| password-mangled:', password);

  let hfrom = Math.floor(1e4 * Math.random());
  const qid = '';

  // 1) DH key exchange
  const priv = BigInt('0x' + crypto.randomBytes(8).toString('hex'));
  const pub = modPow(5n, priv, BigInt(PRIME));
  const dhParams = {
    bnum_prime: PRIME,
    root_num: G,
    key_a2b: pub.toString(),
    tid: 0,
  };
  const flat = obj_2_url(dhParams);
  const qs = Object.entries(flat).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  const dhUrl = `/ccm/cacs_dh_req.js?hfrom_handle=${hfrom++}&hqid=${qid}&${qs}`;
  console.log('\n[1] DH request:', BASE + dhUrl.split('?')[0] + '?hfrom_handle=...');
  const dhRes = await request(dhUrl);
  console.log('    status:', dhRes.status);
  const dhWrap = parseBody(dhRes.body);
  const dh = dhWrap.data || dhWrap;
  if (dh.result) {
    console.log('    DH result:', dh.result, dhWrap);
    process.exit(1);
  }
  console.log('    tid:', dh.tid, '| lid:', dh.lid, '| did:', dh.did);
  const shareKey = modPow(BigInt(dh.key_b2a), priv, BigInt(PRIME)).toString();
  console.log('    shareKey:', shareKey);

  // 2) uctx + login
  const uctx = get_uctx(shareKey, { app: {} });
  console.log('    uctx:', uctx.slice(0, 60) + '...');
  const seq = 1;
  const nid = fn_nid(seq, dh.lid, shareKey, 2, null, null, { hex: md5hex }, 'hex');
  console.log('    nid:', nid);

  const passEnc = pwd_encrypt(shareKey, password);
  const loginParams = {
    lid: dh.lid,
    nid: nid,
    user: USER,
    pass: passEnc,
    session_req: 1,
    param: [
      { name: 'spv', value: 'v1' },
      { name: 'uctx', value: uctx },
    ],
  };
  const flatLogin = obj_2_url(loginParams);
  const qsLogin = Object.entries(flatLogin).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  const loginUrl = `/ccm/cacs_login_req.js?hfrom_handle=${hfrom++}&hqid=${qid}&${qsLogin}`;
  console.log('\n[2] login request URL params (decoded):');
  console.log('    ' + qsLogin.replace(/&/g, '\n    '));
  const loginRes = await request(loginUrl);
  console.log('\n    status:', loginRes.status, '| content-type:', loginRes.headers['content-type']);
  console.log('    body:', loginRes.body.slice(0, 600));
  const login = parseBody(loginRes.body);
  console.log('\n    parsed result:', JSON.stringify(login, null, 2).slice(0, 800));

  if (login.data && !login.data.result) {
    // ---- Post-login: get devices ----
    const sid = login.data.sid;
    const seq = login.data.seq;
    console.log('\n=== POST-LOGIN ===');
    console.log('sid:', sid, '| seq:', seq);

    // Store session state for subsequent requests
    let currentSeq = seq;
    let currentSid = sid;

    // Helper: make a request with proper nid (uses seq + sid + shareKey)
    async function apiGet(path, params) {
      const flat = obj_2_url(params);
      const qs = Object.entries(flat).map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
      const url = `/ccm/${path}.js?hfrom_handle=${hfrom++}&hqid=&${qs}`;
      const res = await request(url);
      return parseBody(res.body);
    }

    // Helper: make a request with proper nid using session state
    async function apiGetSession(path, params) {
      currentSeq++;
      const nid = fn_nid(currentSeq, sid, shareKey, 0, null, null, { hex: md5hex }, 'hex');
      // Some endpoints expect sess:{nid} wrapper; others use top-level nid
      // Try with sess wrapper first (matching UI pattern)
      const flat = obj_2_url(Object.assign({ sess: { nid } }, params));
      const qs = Object.entries(flat).map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
      const url = `/ccm/${path}.js?hfrom_handle=${hfrom++}&hqid=&${qs}`;
      console.log(`  [api] ${path} nid=${nid}`);
      const res = await request(url);
      return parseBody(res.body);
    }

    // 1) Get device list (ccm_exdev_get)
    console.log('\n[3] Getting devices...');
    let devRes = await apiGetSession('ccm_exdev_get', { start: 0, counts: 50 });
    const devs = devRes.data && devRes.data.ret ? devRes.data.ret : (devRes.data || {});
    console.log('Devices:', JSON.stringify(devs, null, 2).slice(0, 3000));

    // 2) Get device info for each device
    if (devs && devs.length > 0) {
      for (const dev of devs.slice(0, 5)) {
        console.log(`\n[4] Device: ${dev.sn} (${dev.nick || 'no nick'})`);
        const info = await apiGetSession('ccm_dev_info_get', { sn: dev.sn });
        console.log('  Info:', JSON.stringify(info, null, 2).slice(0, 1500));

        // Try snapshot
        try {
          const snapRes = await request(
            `http://${login.data.addr}/ccm/ccm_pic_get.jpg?hfrom_handle=${hfrom++}&dsess=1&dsess_nid=${currentSeq}&dsess_sn=${dev.sn}&dtoken=&dflag=2`
          );
          console.log(`  Snapshot: ${snapRes.status} (${snapRes.body.length} bytes)`);
        } catch(e) {
          console.log('  Snapshot error:', e.message);
        }
      }
    }

    // 3) Try ccm_devs_get (another device list endpoint)
    console.log('\n[5] Trying ccm_devs_get...');
    const devs2 = await apiGetSession('ccm_devs_get', {});
    console.log('devs_get:', JSON.stringify(devs2, null, 2).slice(0, 3000));

    // 4) Try ccm_info_get (server info)
    console.log('\n[6] Trying ccm_info_get...');
    const info = await apiGetSession('ccm_info_get', {});
    console.log('info:', JSON.stringify(info, null, 2).slice(0, 1500));

    // 5) Try video source list
    if (devs && devs.length > 0) {
      console.log('\n[7] Trying ccm_video_srcs_get...');
      const vs = await apiGetSession('ccm_video_srcs_get', { sn: devs[0].sn });
      console.log('video_srcs:', JSON.stringify(vs, null, 2).slice(0, 3000));
    }

    // 6) Try ccm_replay (history playback)
    if (devs && devs.length > 0) {
      console.log('\n[8] Trying ccm_replay...');
      const replay = await apiGetSession('ccm_replay', { sn: devs[0].sn, start_time: Math.floor(Date.now()/1000)-3600 });
      console.log('replay:', JSON.stringify(replay, null, 2).slice(0, 3000));
    }

    // 7) Try ccm_msg_get (messages/events)
    console.log('\n[9] Trying ccm_msg_get...');
    const msgs = await apiGetSession('ccm_msg_get', { start: 0 });
    console.log('msgs:', JSON.stringify(msgs, null, 2).slice(0, 3000));

  } else {
    console.log('\nLogin failed:', login.data ? login.data.result : 'no data');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
