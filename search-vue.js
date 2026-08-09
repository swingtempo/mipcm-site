const fs = require('fs');
const content = fs.readFileSync('app/js/app.420d1150.js', 'utf8');
const patterns = ['new Vue', '.mount(', 'createApp', 'router.push', '$store.dispatch'];
for (const p of patterns) {
    const idx = content.indexOf(p);
    if (idx > -1) {
        console.log('Found:', p, 'at index', idx);
    } else {
        console.log('Not found:', p);
    }
}
