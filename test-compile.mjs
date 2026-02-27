import { compileLatexToPdf } from './lib/latexCompiler.ts';
import fs from 'fs';
import { JSDOM } from 'jsdom';

// Set up DOM for Node.js environment
const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.fetch = (await import('node-fetch')).default;

async function testCompile() {
  try {
    console.log('Reading beamer template...');
    const source = fs.readFileSync('./public/templates/beamer/main.tex', 'utf8');
    
    console.log('Starting multi-pass compilation...');
    const pdfBlob = await compileLatexToPdf(source, [], 'pdftex');
    
    console.log('Saving PDF...');
    const buffer = await pdfBlob.arrayBuffer();
    fs.writeFileSync('./beamer-output.pdf', Buffer.from(buffer));
    
    console.log('✅ Compilation successful! Output saved to beamer-output.pdf');
  } catch (error) {
    console.error('❌ Compilation failed:', error.message);
    console.error(error.stack);
  }
}

testCompile();
