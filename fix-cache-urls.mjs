import fs from 'fs';
import path from 'path';

function patchFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    
    const oldBase = 'var CACHE_BASE = "http://busytex.local/";';
    const newBase = 'var CACHE_BASE = typeof self !== "undefined" && self.location ? (self.location.origin + "/busytex-cache/") : "http://busytex.local/";';
    
    if (content.includes(oldBase)) {
        content = content.replace(oldBase, newBase);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Patched CACHE_BASE in ${filePath}`);
    }
}

const files = [
    'public/core/busytex/texlive-basic.js',
    'public/core/busytex/texlive-extra.js',
    'public/core/busytex/texlive-latex-base_texlive-latex-recommended_texlive-science_texlive-fonts-recommended.js',
    'public/core/busytex/texlive-latex-extra.js'
];

files.forEach(f => patchFile(path.resolve(process.cwd(), f)));

// Also patch the download script for future
const downloadScriptPath = path.resolve(process.cwd(), 'vendor/texlyre-busytex/scripts/download-assets.cjs');
if (fs.existsSync(downloadScriptPath)) {
    let scriptContent = fs.readFileSync(downloadScriptPath, 'utf8');
    const oldBaseScript = 'var CACHE_BASE = "http://busytex.local/";';
    const newBaseScript = 'var CACHE_BASE = typeof self !== "undefined" && self.location ? (self.location.origin + "/busytex-cache/") : "http://busytex.local/";';
    if (scriptContent.includes(oldBaseScript)) {
        scriptContent = scriptContent.replace(oldBaseScript, newBaseScript);
        fs.writeFileSync(downloadScriptPath, scriptContent, 'utf8');
        console.log(`✅ Patched CACHE_BASE in download-assets.cjs`);
    }
}
