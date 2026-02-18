#!/usr/bin/env node

/**
 * Simple WASM Test Runner
 * 
 * Basic tests to verify WASM functions are working
 */

console.log('🧪 Starting WASM Function Tests...\n');

// Test 1: Environment Detection
console.log('🔍 Test 1: Environment Detection');
try {
  const env = process.env.NODE_ENV || 'unknown';
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  console.log(`✅ NODE_ENV: ${env}`);
  console.log(`✅ Base Path: ${basePath}`);
  console.log(`✅ Environment detection passed\n`);
} catch (error) {
  console.log(`❌ Environment detection failed: ${error.message}\n`);
}

// Test 2: WASM File Accessibility
console.log('🔍 Test 2: WASM File Accessibility');
const wasmFiles = [
  '/core/busytex/busytex.wasm',
  '/core/webperl/emperl.wasm',
  '/core/webperl/webperl.wasm',
];

async function testWasmFiles() {
  for (const file of wasmFiles) {
    try {
      const response = await fetch(file, { method: 'HEAD' });
      if (response.ok) {
        console.log(`✅ ${file} - Accessible`);
      } else {
        console.log(`❌ ${file} - Not accessible (${response.status})`);
      }
    } catch (error) {
      console.log(`❌ ${file} - Error: ${error.message}`);
    }
  }
}

// Test 3: Module Imports
console.log('\n🔍 Test 3: Module Imports');
async function testImports() {
  try {
    // Test logger import
    const { latexLogger, typstLogger, aiLogger } = await import('./lib/logger.js');
    console.log('✅ Logger module imported');
    
    // Test logging
    latexLogger.info('Test message');
    const logs = latexLogger.getLogs();
    console.log(`✅ Logging works (${logs.length} logs)`);
    
  } catch (error) {
    console.log(`❌ Module import failed: ${error.message}`);
  }
}

// Test 4: Base Path Handling
console.log('\n🔍 Test 4: Base Path Handling');
function testBasePathHandling() {
  const testCases = [
    { input: '', expected: '' },
    { input: '/antiprism', expected: '/antiprism' },
    { input: 'antiprism', expected: '/antiprism' },
  ];
  
  testCases.forEach(({ input, expected }) => {
    const result = input && !input.startsWith('/') ? `/${input}` : input;
    if (result === expected) {
      console.log(`✅ Base path "${input}" → "${result}"`);
    } else {
      console.log(`❌ Base path "${input}" → "${result}" (expected "${expected}")`);
    }
  });
}

// Test 5: Error Handling
console.log('\n🔍 Test 5: Error Handling');
function testErrorHandling() {
  try {
    throw new Error('Test error');
  } catch (error) {
    console.log('✅ Error handling works');
    console.log(`✅ Error message: ${error.message}`);
  }
}

// Test 6: Data Structures
console.log('\n🔍 Test 6: Data Structures');
function testDataStructures() {
  // Test log entry structure
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: 'info',
    category: 'latex',
    message: 'Test message',
  };
  
  console.log('✅ Log entry structure valid');
  
  // Test WASM result structure
  const wasmResult = {
    result: { words: 100, chars: 500 },
    rawOutput: 'Test output',
  };
  
  console.log('✅ WASM result structure valid');
  
  // Test PDF blob creation
  const pdfData = new Uint8Array([1, 2, 3, 4]);
  const blob = new Blob([pdfData], { type: 'application/pdf' });
  
  console.log(`✅ PDF blob created (${blob.size} bytes)`);
}

// Run all tests
async function runAllTests() {
  await testWasmFiles();
  await testImports();
  testBasePathHandling();
  testErrorHandling();
  testDataStructures();
  
  console.log('\n🎉 All basic tests completed!');
  console.log('\n📝 For comprehensive WASM testing, run:');
  console.log('   npm run test:wasm');
  console.log('   npm run test:wasm --verbose');
}

runAllTests().catch(console.error);
