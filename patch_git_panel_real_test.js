const fs = require('fs');

let content = fs.readFileSync('lib/__tests__/gitPanelReal.test.ts', 'utf8');

content = `import { describe, it, expect, beforeEach, vi } from "vitest";\n` + content;

content = content.replace(/jest\.fn/g, 'vi.fn');
content = content.replace(/jest\.clearAllMocks/g, 'vi.clearAllMocks');

fs.writeFileSync('lib/__tests__/gitPanelReal.test.ts', content, 'utf8');
