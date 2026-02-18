#!/usr/bin/env node

/**
 * Quick test to verify WASM LaTeX tools work in the built site
 */

console.log('🧪 Testing WASM LaTeX Tools...');

async function testWasmLatexTools() {
  try {
    // Import the WASM LaTeX tools
    const { formatLaTeX, countLaTeXWords } = await import('./lib/wasmLatexTools.ts');
    
    console.log('✅ Successfully imported WASM LaTeX tools');
    
    // Test word counting
    const testContent = 'This is a test document with some words to count.';
    const wordResult = await countLaTeXWords(testContent);
    console.log('✅ Word counting works:', wordResult.result);
    
    // Test formatting
    const formatResult = await formatLaTeX(testContent);
    console.log('✅ Formatting works:', formatResult.length, 'characters');
    
    console.log('🎉 All WASM LaTeX tools are working correctly!');
    return true;
  } catch (error) {
    console.error('❌ WASM LaTeX tools failed:', error.message);
    return false;
  }
}

// Run the test
testWasmLatexTools().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
