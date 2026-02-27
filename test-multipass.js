const { compileLatexToPdf } = require('./lib/latexCompiler');
const fs = require('fs');

async function testMultipass() {
  try {
    console.log('Testing multi-pass compilation with beamer template...');
    
    // Read the beamer template
    const source = fs.readFileSync('./public/templates/beamer/main.tex', 'utf8');
    
    // Compile with multi-pass enabled
    const pdfBlob = await compileLatexToPdf(source, [], 'pdftex');
    
    // Save the result
    const buffer = await pdfBlob.arrayBuffer();
    fs.writeFileSync('./test-output.pdf', Buffer.from(buffer));
    
    console.log('✅ Multi-pass compilation successful! Output saved to test-output.pdf');
  } catch (error) {
    console.error('❌ Multi-pass compilation failed:', error.message);
  }
}

testMultipass();
