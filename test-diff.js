const fs = require('fs');

let content = fs.readFileSync('lib/__tests__/gitPanelReal.test.ts', 'utf8');

const oldCode = `      expect(diffs).toHaveLength(2); // Should show both add and modify
      expect(diffs[0].status).toBe('modified');
      expect(diffs[0].newContent).toBe('Modified');`;
      
const newCode = `      expect(diffs).toHaveLength(2); // Should show both add and modify
      const modifiedDiff = diffs.find(d => d.status === 'modified');
      const addedDiff = diffs.find(d => d.status === 'added');
      
      expect(modifiedDiff).toBeDefined();
      expect(modifiedDiff?.newContent).toBe('Modified');
      
      expect(addedDiff).toBeDefined();
      expect(addedDiff?.newContent).toBe('Initial');`;

content = content.replace(oldCode, newCode);
fs.writeFileSync('lib/__tests__/gitPanelReal.test.ts', content);
