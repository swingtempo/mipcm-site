const fs = require('fs');
const files = fs.readdirSync('app/js').filter(f => f.endsWith('.js'));
for (const file of files) {
    const content = fs.readFileSync('app/js/' + file, 'utf8');
    if (content.includes('$mount') || content.includes('Vue.use')) {
        console.log(file, '- has mount/use');
    }
}
