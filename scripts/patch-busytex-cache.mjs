import fs from 'fs';
import path from 'path';

function patchFile(filePath) {
    if (!fs.existsSync(filePath)) {
        console.log(`Skipping ${filePath} - file not found.`);
        return;
    }
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if it has the Emscripten IndexedDB caching
    if (!content.includes('var indexedDB;')) {
        console.log(`Skipping ${filePath} - IndexedDB caching not found.`);
        return;
    }

    const startIndex = content.indexOf("        var indexedDB;");
    const endIndex = content.indexOf("        openDatabase(", startIndex);
    
    if (startIndex === -1 || endIndex === -1) {
        console.log(`Could not find full replacement bounds in ${filePath}.`);
        return;
    }

    const replacement = `        var CACHE_NAME = "EM_PRELOAD_CACHE";
        function openDatabase(callback, errback) {
            if (typeof caches === 'undefined') return errback(new Error('caches API not available'));
            caches.open(CACHE_NAME).then(callback).catch(errback);
        }
        function cacheRemotePackage(db, packageName, packageData, packageMeta, callback, errback) {
            var metaBlob = new Blob([JSON.stringify({uuid: packageMeta.uuid, chunkCount: 1})], {type: 'application/json'});
            var dataBlob = new Blob([packageData], {type: 'application/octet-stream'});
            Promise.all([
                db.put('metadata/' + packageName, new Response(metaBlob)),
                db.put('package/' + packageName + '/0', new Response(dataBlob))
            ]).then(() => callback(packageData)).catch(errback);
        }
        function checkCachedPackage(db, packageName, callback, errback) {
            db.match('metadata/' + packageName).then(res => {
                if (!res) return callback(false, null);
                return res.json().then(metadata => {
                    callback(PACKAGE_UUID === metadata.uuid, metadata);
                });
            }).catch(errback);
        }
        function fetchCachedPackage(db, packageName, metadata, callback, errback) {
            db.match('package/' + packageName + '/0').then(res => {
                if (!res) return errback(new Error('package not found in cache'));
                return res.arrayBuffer().then(buffer => callback(buffer));
            }).catch(errback);
        }
`;

    content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Patched ${filePath}`);
}

const files = [
    'public/core/busytex/texlive-basic.js',
    'public/core/busytex/texlive-extra.js',
    'public/core/busytex/texlive-latex-base_texlive-latex-recommended_texlive-science_texlive-fonts-recommended.js',
    'public/core/busytex/texlive-latex-extra.js'
];

files.forEach(f => patchFile(path.resolve(process.cwd(), f)));
