const fs = require('fs');
let content = fs.readFileSync('lib/gitStore.ts', 'utf8');

const oldCode = `    const commitsInRange = repo.commits.slice(fromIndex, headIndex + 1);`;
const newCode = `    // headIndex (newer) is smaller than fromIndex (older)
    const startIndex = Math.min(headIndex, fromIndex);
    const endIndex = Math.max(headIndex, fromIndex);
    const commitsInRange = repo.commits.slice(startIndex, endIndex + 1);`;

content = content.replace(oldCode, newCode);
fs.writeFileSync('lib/gitStore.ts', content);
