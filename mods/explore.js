// Explore your MIPC devices — login, list devices, snapshots, replay.
'use strict';

const crypto = require('crypto');
const http = require('http');
const vm = require('vm');
const fs = require('fs');

const BASE = process.env.MIPC_BASE || 'http://localhost:8080';
const USER = process.env.MIPC_USER;
const PASS = process.env.MIPC_PASS;

if (!USER || !PASS) { console.error('Set MIPC_USER / MIPC_PASS'); process.exit(1); }

// ---- helpers (from mipc_login.js — verified working) ----------------------
function modPow(base, exp, mod) { let r=1n;base%=mod;while(exp>0n){if(exp&1n)r=(r*base)%mod;exp>>=1n;base=(base*base)%mod;}return r; }
const PRIME='791658605174853458830696113306796803', G='5';
const S_BASE62='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const S_MINING64=S_BASE62+'_.-';
function fn_hex2i(c){if(c>=48&&c<=57)return c-48;if(c>=65&&c<=71)return c-55;if(c>=97&&c<=102)return c-87;return 0;}
function fn_i2a(e,t){let o,r,n,a='',i=''+e;if(i.indexOf('0x')===0){for(o=i.length-1;o>1;){for(n=0,r=0;r<8&&o>1;--o,r+=4)n+=fn_hex2i(i.charCodeAt(o))<<r;a=String.fromCharCode(n)+a;}}else{for(o=24;o>=0;o-=8)if(e>=(1<<o))a+=String.fromCharCode((e>>o)&255);}while(a.length<(t||0))a='\0'+a;return a;}
function fn_str_2_b64(e,t){let o,r,n,a,i=0,l='',s=e.length,c=t?S_MINING64:S_BASE62+'+/=';while(i<s){for(r=0,o=0;r<24&&i<s;r+=8,++i)o=(o<<8)+e.charCodeAt(i);for(a=0;a<24;a+=6,o&=(1<<(r-a))-1){n=r-a-6;l+=a<r?c.charAt(n<0?o<<-n:o>>n):'';}}return l;}
function fn_binary_2_b64(e,t){let o,r,n,a,i=0,l='',s=e.length,c=t?S_MINING64:S_BASE62+'+/=';while(i<s){for(r=0,o=0;r<24&&i<s;r+=8,i++)o=(o<<8)+e[i];for(a=0;a<24;a+=6,o&=(1<<(r-a))-1){n=r-a-6;l+=a<r?c.charAt(n<0?o<<-n:o>>n):'';}}return l;}
function fn_nid(e,t,o,r,n,a,i,l){const s=fn_i2a(e),c=t?fn_i2a(t):'',d=t?fn_i2a(r):'';const _=a?fn_i2a('0x'+i[l](a)):'';const g=(s?String.fromCharCode(64+s.length)+s:'')+(c?String.fromCharCode(96+c.length)+c:'')+(d?String.fromCharCode(128+d.length)+d:'')+(n?String.fromCharCode(160+n.length)+n:'');const m=g+(o?String.fromCharCode(0+o.length)+o:'')+(_?String.fromCharCode(0+_.length)+_:'');const p=fn_i2a('0x'+i[l](m));return fn_str_2_b64(String.fromCharCode(32+p.length)+p+g,1);}
function obj_2_url(e){const o={};function r(e,t){for(const n in e){if(e.constructor===Array)o[t+'__x_countz_']=e.length;const a=e[n];if(a!==void 0&&a!==null){let name=n;if((''+name).charAt(0)==='%')name=name.substr(1);const i=t+('0'!==name?(''===t?'d':'_')+name:'');if(typeof a!=='function'){if(typeof a==='object'){if(a.constructor===Uint8Array)o[i]=fn_bytes_2_uri_param(a);else{if(a.constructor!==Array)o[i]=1;r(a,i);}}else o[i]=a;}}}return o;}return r(e,'');}
function md5hex(s){return crypto.createHash('md5').update(s,'binary').digest('hex');}

// Load bundled crypto-js for DES
const { loadCryptoJS } = require('./crypto_js_loader');
const CryptoJS = loadCryptoJS();

function desEncryptHexToHex(plainHex, keyHex) { return CryptoJS.DES.encrypt(CryptoJS.enc.Hex.parse(plainHex), CryptoJS.enc.Hex.parse(keyHex), {iv:CryptoJS.enc.Hex.parse('0000000000000000'),padding:CryptoJS.pad.NoPadding}).ciphertext.toString(); }

function bytes_align(str) {
  const words = []; for (let o=0;o<str.length;o++) words.push(str.charCodeAt(o).toString(16));
  const padLen = 8*(parseInt(str.length/8)+1) - str.length;
  const parts=[]; let hexAccum='';
  for (let s=0;s<words.length;s++){hexAccum+=words[s];if(hexAccum.length===8){parts.push('0x'+hexAccum);hexAccum='';}}
  // Padding: first byte = padLen, rest = 0xff
  const padFirst = '0' + padLen.toString(16).padStart(2,'0'); let padHex=padFirst;
  for (let p=1;p<padLen;p++) padHex+='ff';
  while(padHex.length>8){parts.push('0x'+padHex.substring(0,8));padHex=padHex.substring(8);}
  if(padHex.length>0) parts.push('0x'+padHex.padEnd(8,'0'));
  return parts;
}

function str_2_16bytes(hexStr){const t=hexStr.length/2,o=[];for(let r=0;r<t;r++){o.push(parseInt('0x'+hexStr.charAt(2*r)+hexStr.charAt(2*r+1))&255);}return o;}

function get_uctx(shareKey, obj) {
  const plaintext = JSON.stringify(obj);
  const keyWA = CryptoJS.MD5(shareKey);
  const words = bytes_align(plaintext);
  const sigBytes = 8*(parseInt(plaintext.length/8)+1);
  const plainWA = CryptoJS.lib.WordArray.create(words, sigBytes);
  const enc = CryptoJS.DES.encrypt(plainWA, keyWA, {iv:CryptoJS.enc.Hex.parse('0000000000000000'),padding:CryptoJS.pad.NoPadding});
  return 'data:application/octet-stream;base64,'+fn_binary_2_b64(str_2_16bytes(enc.ciphertext.toString()));
}

function pwd_encrypt(shareKey, pwdHex32) {
  const enc = CryptoJS.DES.encrypt(CryptoJS.enc.Hex.parse(pwdHex32),
    CryptoJS.enc.Hex.parse(crypto.createHash('md5').update(shareKey,'binary').digest('hex')),
    {iv:CryptoJS.enc.Hex.parse('0000000000000000'),padding:CryptoJS.pad.NoPadding});
  return enc.ciphertext.toString();
}

// ---- HTTP -----------------------------------------------------------------
function parseBody(body) { const t=body.trim(); try{return JSON.parse(t);}catch(e){} if(/^message\(/m.test(t)){try{let captured=null;const ctx={message:(o)=>{captured=o;}};vm.createContext(ctx);vm.runInContext(t.replace(/;\s*$/,''),ctx);if(captured)return captured;}catch(e2){}} return {__raw:body};}

function request(pathAndQuery) {
  return new Promise((resolve,reject)=>{
    const u=new URL(BASE+pathAndQuery);
    http.request({hostname:u.hostname,port:u.port||80,path:u.pathname+u.search,method:'GET',headers:{'User-Agent':'Mozilla/5.0 mipc-explore'}},(res)=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>resolve({status:res.statusCode,body:d}));}).on('error',reject).end();
  });
}

function requestDirect(host, pathAndQuery) {
  return new Promise((resolve,reject)=>{
    http.request({hostname:host,port:80,path:pathAndQuery,method:'GET'},(res)=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>resolve({status:res.statusCode,body:d}));}).on('error',reject).end();
  });
}

// ---- main -----------------------------------------------------------------
async function main() {
  let hfrom = Math.floor(1e4*Math.random());

  // 1) DH exchange
  console.log('[1] DH key exchange...');
  const priv = BigInt('0x'+crypto.randomBytes(8).toString('hex'));
  const pub = modPow(BigInt(G),priv,BigInt(PRIME));
  const dhParams={bnum_prime:PRIME,root_num:G,key_a2b:pub.toString(),tid:0};
  const flat=obj_2_url(dhParams);
  const qs=Object.entries(flat).map(([k,v])=>`${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  const dhRes=await request(`/ccm/cacs_dh_req.js?hfrom_handle=${hfrom++}&hqid=&${qs}`);
  const dhWrap=parseBody(dhRes.body);
  const dh=dhWrap.data||dhWrap;
  if(dh.result){console.error('DH failed:',dh);process.exit(1);}
  console.log(`    tid:${dh.tid} lid:${dh.lid} did:${dh.did}`);
  const shareKey=modPow(BigInt(dh.key_b2a),priv,BigInt(PRIME)).toString();

  // 2) Login
  console.log('[2] Logging in...');
  const password=md5hex(PASS);
  const uctx=get_uctx(shareKey,{app:{}});
  const nid=fn_nid(1,dh.lid,shareKey,2,null,null,{hex:md5hex},'hex');
  const passEnc=pwd_encrypt(shareKey,password);
  const loginParams={lid:dh.lid,nid:nid,user:USER,pass:passEnc,session_req:1,param:[{name:'spv',value:'v1'},{name:'uctx',value:uctx}]};
  const flatLogin=obj_2_url(loginParams);
  const qsLogin=Object.entries(flatLogin).map(([k,v])=>`${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  const loginRes=await request(`/ccm/cacs_login_req.js?hfrom_handle=${hfrom++}&hqid=&${qsLogin}`);
  const loginWrap=parseBody(loginRes.body);
  const login=loginWrap.data||loginWrap;
  if(login.result){console.error('Login failed:',login.result);process.exit(1);}
  console.log(`    SUCCESS! sid:${login.sid} seq:${login.seq} addr:${login.addr}`);

  let currentSeq=login.seq, sid=login.sid;

  async function apiGet(path,params) {
    currentSeq++;
    const nid=fn_nid(currentSeq,sid,shareKey,0,null,null,{hex:md5hex},'hex');
    // UI puts sn INSIDE sess object: {sess:{nid:create_nid(),sn:e.sn}}
    // This produces dsess=1&dsess_nid=...&dsess_sn=...
    const sessParams = Object.assign({nid}, params);
    const flat=obj_2_url({sess:sessParams});
    const qs=Object.entries(flat).map(([k,v])=>`${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
    const res=await request(`/ccm/${path}.js?hfrom_handle=${hfrom++}&hqid=&${qs}`);
    return parseBody(res.body);
  }

  // 3) Get devices
  console.log('\n[3] Device list...');
  const devsRes=await apiGet('ccm_devs_get',{});
  if(!devsRes.data||!devsRes.data.devs){console.error('No devices:',JSON.stringify(devsRes,null,2).slice(0,500));process.exit(1);}
  console.log(`    Total: ${devsRes.data.total}`);
  const devices=devsRes.data.devs;

  for(let di=0;di<devices.length;di++){
    const dev=devices[di];
    console.log(`\n=== Device ${di+1}: ${dev.sn} ===`);
    console.log(`    Model: ${dev.model}`);
    console.log(`    Status: ${dev.stat}`);
    console.log(`    Nick: "${dev.nick||'(none)'}"`);

    // Raw ccm_dev_info_get response
    const infoRes=await apiGet('ccm_dev_info_get',{sn:dev.sn});
    console.log(`    dev_info raw: ${JSON.stringify(infoRes).slice(0,400)}`);

    // Video sources
    try{const vsRes=await apiGet('ccm_video_srcs_get',{sn:dev.sn});console.log(`    video_srcs: ${JSON.stringify(vsRes).slice(0,400)}`);}catch(e){}

    // ---- Snapshots via local proxy (matching UI pattern) ----------------
    // UI uses: /ccm/ccm_pic_get.jpg?hfrom_handle=887330&dsess=1&dsess_nid=<nid>&dsess_sn=<sn>&dtoken=<token>&dflag=2
    for(const token of ['p0','p1']){
      // Create fresh nid (UI calls create_nid() right before each request)
      const snapSeq = ++currentSeq;
      const snapNid = fn_nid(snapSeq, sid, shareKey, 0, null, null, {hex:md5hex}, 'hex');
      const snapUrl=`/ccm/ccm_pic_get.jpg?hfrom_handle=${hfrom++}&dsess=1&dsess_nid=${snapNid}&dsess_sn=${dev.sn}&dtoken=${token}&dflag=2`;
      try{
        const r=await request(snapUrl);
        if(r.status===200){
          fs.writeFileSync(`snapshot_${dev.sn}_${token}.jpg`,r.body);
          console.log(`    Snapshot [${token}]: SAVED (${r.body.length} bytes)`);
        }else{
          const bodyStr=typeof r.body==='string'?r.body:r.body.toString();
          console.log(`    Snapshot [${token}]: status=${r.status}, body=${bodyStr.slice(0,200)}`);
        }
      }catch(e){console.log(`  Snapshot[${token}] error:`,e.message);}
    }

    // Also try .js version (returns JSON)
    for(const token of ['p0','p1']){
      const snapSeq = ++currentSeq;
      const snapNid = fn_nid(snapSeq, sid, shareKey, 0, null, null, {hex:md5hex}, 'hex');
      const snapJsUrl=`/ccm/ccm_pic_get.js?hfrom_handle=${hfrom++}&dsess=1&dsess_nid=${snapNid}&dsess_sn=${dev.sn}&dtoken=${token}&dflag=2`;
      try{
        const r=await request(snapJsUrl);
        console.log(`    SnapshotJS [${token}]: status=${r.status}, body=${(typeof r.body==='string'?r.body:r.body.toString()).slice(0,300)}`);
      }catch(e){}
    }

    // Try ccm_pic_get with sess_nid and dsess_sn (matching UI exactly)
    for(const token of ['p0','p1']){
      const snapSeq = ++currentSeq;
      const snapNid = fn_nid(snapSeq, sid, shareKey, 0, null, null, {hex:md5hex}, 'hex');
      // UI pattern: dsess=1&dsess_nid=<nid>&dsess_sn=<sn>
      const flat=obj_2_url({sess:{nid:snapNid, sn:dev.sn}});
      const qs=Object.entries(flat).map(([k,v])=>`${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
      const snapUrl=`/ccm/ccm_pic_get.jpg?hfrom_handle=${hfrom++}&dtoken=${token}&dflag=2&${qs}`;
      try{
        const r=await request(snapUrl);
        if(r.status===200){
          fs.writeFileSync(`snapshot_${dev.sn}_${token}_v2.jpg`,r.body);
          console.log(`    Snapshot v2 [${token}]: SAVED (${r.body.length} bytes)`);
        }else{
          const bodyStr=typeof r.body==='string'?r.body:r.body.toString();
          console.log(`    Snapshot v2 [${token}]: status=${r.status}, body=${bodyStr.slice(0,200)}`);
        }
      }catch(e){console.log(`  Snapshot v2[${token}] error:`,e.message);}
    }

    // ---- Replay (history) ----------------
    try{
      const now=Math.floor(Date.now()/1000);
      const replayRes=await apiGet('ccm_replay',{sn:dev.sn,start_time:now-86400,end_time:now});
      console.log(`    Replay raw: ${JSON.stringify(replayRes).slice(0,500)}`);
    }catch(e){console.log('  Replay error:',e.message);}

    // ---- Messages ----------------
    try{const msgRes=await apiGet('ccm_msg_get',{start:0});console.log(`    Msg raw: ${JSON.stringify(msgRes).slice(0,400)}`);}catch(e){}

    // ---- Live stream (ccm_play) ----------------
    for(const proto of ['http','rtsp']){
      try{
        const playSeq = ++currentSeq;
        const playNid = fn_nid(playSeq, sid, shareKey, 0, null, null, {hex:md5hex}, 'hex');
        // UI: sess:{nid,sn}, setup:{stream:"RTP_Unicast",trans:{proto}}, token
        const flat=obj_2_url({sess:{nid:playNid,sn:dev.sn},setup:{stream:'RTP_Unicast',trans:{proto:proto}},token:'p0'});
        const qs=Object.entries(flat).map(([k,v])=>`${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
        const playRes=await request(`/ccm/ccm_play.js?hfrom_handle=${hfrom++}&hqid=&${qs}`);
        console.log(`    Play[${proto}]: ${JSON.stringify(parseBody(playRes.body)).slice(0,400)}`);
      }catch(e){console.log(`  Play[${proto}] error:`,e.message);}
    }

    // ---- ccm_ipcs_get (camera connection info) ----------------
    try{
      const ipcsSeq = ++currentSeq;
      const ipcsNid = fn_nid(ipcsSeq, sid, shareKey, 0, null, null, {hex:md5hex}, 'hex');
      const flat=obj_2_url({sess:{nid:ipcsNid,sn:dev.sn}});
      const qs=Object.entries(flat).map(([k,v])=>`${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
      const ipcsRes=await request(`/ccm/ccm_ipcs_get.js?hfrom_handle=${hfrom++}&hqid=&${qs}`);
      console.log(`    IPCS raw: ${JSON.stringify(parseBody(ipcsRes.body)).slice(0,600)}`);
    }catch(e){console.log('  IPCS error:',e.message);}

    // ---- Misc capabilities ----------------
    try{const miscRes=await apiGet('ccm_misc_get',{sn:dev.sn});console.log(`    Misc raw: ${JSON.stringify(miscRes).slice(0,500)}`);}catch(e){}

  }

  // Summary
  console.log('\n\n=== SUMMARY ===');
  console.log(`User: ${USER}`);
  console.log(`Devices: ${devices.length}`);
  for(const dev of devices) console.log(`  - ${dev.sn} (${dev.model}) [${dev.stat}] nick="${dev.nick||''}"`);
  console.log('\nKey endpoints:');
  console.log('  Login: /ccm/cacs_dh_req.js + /ccm/cacs_login_req.js (DH+DES)');
  console.log('  Devices: /ccm/ccm_devs_get.js?sess={nid}');
  console.log(`  Gateway addr: ${login.addr}`);
}

main().catch(e=>{console.error(e);process.exit(1);});
