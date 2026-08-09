const fs = require('fs');
const content = fs.readFileSync('app/js/app.420d1150.js', 'utf8');
const routerIdx = content.indexOf('path:"/"');
if (routerIdx > -1) {
    console.log('Found root path at:', routerIdx);
    console.log('Context:', content.substring(Math.max(0, routerIdx-200), routerIdx+500));
}
