const fs = require('fs');

const content = fs.readFileSync('public/core/busytex/texlive-basic.js', 'utf8');
if (content.includes('EM_PRELOAD_CACHE')) {
    console.log('Cache modifications found');
} else {
    console.log('No cache modifications found');
}
