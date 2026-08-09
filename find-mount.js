const fs = require('fs');
const content = fs.readFileSync('app/js/app.420d1150.js', 'utf8');
let idx = 0;
while ((idx = content.indexOf('$mount', idx)) !== -1) {
    console.log('Found at:', idx);
    console.log('Context:', content.substring(Math.max(0, idx-200), idx+200));
    console.log('---');
    idx += 6;
}
