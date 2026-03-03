// Test script to verify VLM model selection logic
const { getModelById } = require('./lib/modelConfig.ts');

console.log('Testing VLM model selection logic...');

// Test 1: Active model is Qwen3.5 (omnimodal) - should fallback to Liquid VLM
const activeQwen = getModelById('qwen3.5-0.8b-instruct');
console.log('Qwen3.5 model:', {
  id: activeQwen.id,
  vision: activeQwen.vision,
  isDedicatedVLM: activeQwen.isDedicatedVLM
});

// Test 2: Active model is Liquid VLM (dedicated VLM) - should use itself
const activeVLM = getModelById('lfm25-vl-1.6b');
console.log('Liquid VLM model:', {
  id: activeVLM.id,
  vision: activeVLM.vision,
  isDedicatedVLM: activeVLM.isDedicatedVLM
});

// Test 3: Active model is regular instruct (no vision) - should fallback to Liquid VLM
const activeInstruct = getModelById('lfm25-1.2b-instruct');
console.log('Regular instruct model:', {
  id: activeInstruct.id,
  vision: activeInstruct.vision,
  isDedicatedVLM: activeInstruct.isDedicatedVLM
});

console.log('\nVLM selection logic test completed!');
