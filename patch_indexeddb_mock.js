const fs = require('fs');
let content = fs.readFileSync('lib/__tests__/gitPanelReal.test.ts', 'utf8');

// Replace the mock IndexedDB setup
const mockDbSetup = `import "fake-indexeddb/auto";\n`;

// Remove the old mock completely
const mockStart = content.indexOf('// Mock IndexedDB for testing');
const mockEnd = content.indexOf("describe('GitPanelReal Integration Tests', () => {");
if (mockStart !== -1 && mockEnd !== -1) {
    content = content.substring(0, mockStart) + mockDbSetup + content.substring(mockEnd);
}

fs.writeFileSync('lib/__tests__/gitPanelReal.test.ts', content);
