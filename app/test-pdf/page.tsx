'use client';

import React, { useState, useEffect } from 'react';

export default function TestPdfPage() {
  const [latexSource, setLatexSource] = useState(
`\\documentclass{article}
\\begin{document}
\\section{Test PDF Generation}
This is a \\textbf{real} PDF generated entirely in the browser using the WASM compiler!

\\begin{itemize}
  \\item No server-side rendering
  \\item Uses CacheStorage for data files
  \\item Completely offline capable
\\end{itemize}

\\end{document}`
  );
  
  const [isCompiling, setIsCompiling] = useState(false);
  const [logs, setLogs] = useState<string>('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cacheEntries, setCacheEntries] = useState<string[]>([]);

  const inspectCache = async () => {
    try {
      if (!('caches' in window)) {
        setLogs(prev => prev + 'Cache Storage API not available in this browser context.\n');
        return;
      }

      const cache = await caches.open('EM_PRELOAD_CACHE');
      const requests = await cache.keys();
      const urls = requests.map((request) => request.url);
      setCacheEntries(urls);
      setLogs(prev => prev + `Cache inspection found ${urls.length} entries.\n`);
    } catch (err: any) {
      setLogs(prev => prev + `Cache inspection failed: ${err.message || 'Unknown error'}\n`);
    }
  };

  const handleCompile = async () => {
    setIsCompiling(true);
    setLogs('Initializing compiler...\n');
    setError(null);
    setCacheEntries([]);
    
    try {
      // Dynamically import the compiler to ensure it only loads on the client side
      const { compileLatexToPdf } = await import('../../lib/latexCompiler');
      
      setLogs(prev => prev + 'Running compilation...\n');
      
      const startTime = performance.now();
      const pdfBlob = await compileLatexToPdf(latexSource);
      const endTime = performance.now();
      
      setLogs(prev => prev + `Compilation finished in ${Math.round(endTime - startTime)}ms\n`);
      
      if (pdfBlob) {
        // Create an object URL for the resulting blob
        const url = URL.createObjectURL(pdfBlob);
        setPdfUrl(url);
        setLogs(prev => prev + `PDF generated successfully! Size: ${(pdfBlob.size / 1024).toFixed(2)} KB\n`);
      } else {
        throw new Error('Compilation returned empty or null blob');
      }
    } catch (err: any) {
      console.error('Compilation failed:', err);
      setError(err.message || 'Unknown error occurred during compilation');
      setLogs(prev => prev + `\nERROR: ${err.message || 'Unknown error'}\n`);
    } finally {
      setIsCompiling(false);
    }
  };

  // Clean up object URL when component unmounts
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  return (
    <div className="flex flex-col h-screen p-4 bg-zinc-950 text-white font-mono">
      <h1 className="text-2xl font-bold mb-4">WASM PDF Compilation Test</h1>
      
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Editor and Logs Column */}
        <div className="flex flex-col flex-1 gap-4 w-1/2 min-w-0">
          <div className="flex-1 flex flex-col bg-zinc-900 border border-zinc-800 rounded-lg p-2">
            <h2 className="text-sm font-semibold text-zinc-400 mb-2 uppercase tracking-wider">LaTeX Source</h2>
            <textarea 
              className="flex-1 w-full bg-black text-zinc-300 p-3 rounded font-mono text-sm border border-zinc-800 focus:border-zinc-600 focus:outline-none resize-none"
              value={latexSource}
              onChange={(e) => setLatexSource(e.target.value)}
              spellCheck={false}
            />
          </div>
          
          <button 
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleCompile}
            disabled={isCompiling}
          >
            {isCompiling ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Compiling...
              </>
            ) : 'Compile to PDF'}
          </button>

          <button
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold py-3 px-4 rounded transition-colors"
            onClick={inspectCache}
            disabled={isCompiling}
          >
            Inspect Cache
          </button>
          
          <div className="h-48 bg-zinc-900 border border-zinc-800 rounded-lg p-2 flex flex-col">
            <h2 className="text-sm font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Console Logs</h2>
            <pre className="flex-1 w-full bg-black text-zinc-400 p-3 rounded font-mono text-xs overflow-auto border border-zinc-800 whitespace-pre-wrap">
              {logs || 'No logs yet.'}
            </pre>
          </div>

          <div className="h-48 bg-zinc-900 border border-zinc-800 rounded-lg p-2 flex flex-col">
            <h2 className="text-sm font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Cache Entries</h2>
            <div className="flex-1 w-full bg-black text-zinc-400 p-3 rounded font-mono text-xs overflow-auto border border-zinc-800 whitespace-pre-wrap">
              {cacheEntries.length === 0 ? 'No cache entries found.' : cacheEntries.join('\n')}
            </div>
          </div>
        </div>
        
        {/* PDF Preview Column */}
        <div className="flex-1 flex flex-col bg-zinc-900 border border-zinc-800 rounded-lg p-2 w-1/2 min-w-0">
          <h2 className="text-sm font-semibold text-zinc-400 mb-2 uppercase tracking-wider flex justify-between items-center">
            <span>PDF Output</span>
            {error && <span className="text-red-500 font-normal normal-case">Compilation failed</span>}
          </h2>
          
          <div className="flex-1 bg-black rounded border border-zinc-800 overflow-hidden relative flex items-center justify-center">
            {isCompiling && !pdfUrl && (
              <div className="text-zinc-500 absolute animate-pulse">Compiling document...</div>
            )}
            
            {error && (
              <div className="text-red-500 absolute p-4 text-center max-w-md">{error}</div>
            )}
            
            {!isCompiling && !pdfUrl && !error && (
              <div className="text-zinc-600 absolute">Click compile to preview PDF</div>
            )}
            
            {pdfUrl && (
              <iframe 
                src={pdfUrl} 
                className="w-full h-full border-none bg-white"
                title="PDF Preview"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
