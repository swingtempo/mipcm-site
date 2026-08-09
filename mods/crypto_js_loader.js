// Loads the bundled crypto-js (module "d6fa" in app.420d1150.js) into Node,
// exactly as the browser app uses it. Polyfill dependencies are stubbed.
'use strict';
const fs = require('fs');
const path = require('path');

const APP_JS = path.join(__dirname, '..', 'app', 'js', 'app.420d1150.js');

function extractModule(id) {
  const code = fs.readFileSync(APP_JS, 'utf8');
  const idx = code.indexOf(id + ':function');
  if (idx < 0) throw new Error('module ' + id + ' not found');
  const braceStart = code.indexOf('{', idx);
  let depth = 0, i = braceStart;
  for (; i < code.length; i++) {
    if (code[i] === '{') depth++;
    else if (code[i] === '}') { depth--; if (depth === 0) break; }
  }
  // strip the "<id>:function" prefix, keep the function body
  const fnStart = code.indexOf('function', idx);
  return code.substring(fnStart, i + 1);
}

// d6fa requires these webpack ids — pure polyfills, safe to stub in Node.
const POLYFILLS = ['99af', 'c975', 'fb6a', 'a434', 'd3b7', '25f0', '5319'];

function loadCryptoJS() {
  const src = extractModule('d6fa');
  const module = { exports: {} };
  const requireStub = (id) => ({});
  // webpack module is function(module, exports, require){...}; call it directly.
  const fn = new Function('module', 'exports', 'require', 'return (' + src + ')(module, module.exports, require);');
  fn(module, module.exports, requireStub);
  return module.exports.a; // module exports { a: CryptoJS }
}

module.exports = { loadCryptoJS, extractModule };
