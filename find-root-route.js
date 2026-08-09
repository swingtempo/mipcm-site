const fs = require('fs');
const content = fs.readFileSync('app/js/app.420d1150.js', 'utf8');
const idx = content.indexOf('path:"/"');
if (idx > -1) {
    console.log(content.substring(Math.max(0, idx-1000), idx+1000));
}
