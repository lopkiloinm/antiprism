'use client'

import React, { useState } from 'react'
import { documentParser } from '@/lib/document-parser'
import DocumentStatistics from '@/components/DocumentStatistics'
import './page.css'

const sampleLatex = `\\documentclass{article}
\\usepackage{amsmath}
\\usepackage{graphicx}

\\title{Sample LaTeX Document}
\\author{John Doe}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}
This is the introduction section with some inline math: $E = mc^2$.
We also have displayed math:
\\begin{equation}
\\int_0^1 x^2 dx = \\frac{1}{3}
\\end{equation}

\\subsection{Background}
Some background information with more math: $\\alpha + \\beta = \\gamma$.

\\section{Main Content}
This section contains the main content of the document.

\\subsection{Analysis}
Detailed analysis with equations:
\\begin{align}
f(x) &= x^2 + 2x + 1 \\\\
g(x) &= \\frac{d}{dx}f(x) = 2x + 2
\\end{align}

\\subsubsection{Results}
The results are shown in Table~\\ref{tab:results}.

\\begin{table}[h]
\\centering
\\begin{tabular}{|c|c|}
\\hline
Method & Accuracy \\\\
\\hline
Method A & 95\\% \\\\
Method B & 97\\% \\\\
\\hline
\\end{tabular}
\\caption{Comparison of methods}
\\label{tab:results}
\\end{table}

\\section{Conclusion}
The conclusion summarizes our findings.

\\end{document}`

const sampleTypst = `#set page(margin: 2.5cm)
#set text(font: "New Computer Modern", 11pt)

#align(center)[
  = Sample Typst Document
  
  *John Doe* \
  #datetime.today().display("[month repr:long] [day], [year]")
]

= Introduction

This is the introduction section with some inline math: $E = mc^2$.
We also have displayed math:
$
  integral_0^1 x^2 dx = 1/3
$

== Background

Some background information with more math: $alpha + beta = gamma$.

= Main Content

This section contains the main content of the document.

=== Analysis

Detailed analysis with equations:
$
  f(x) = x^2 + 2x + 1 \
  g(x) = d/dx f(x) = 2x + 2
$

==== Results

The results are shown in the table below.

#table(
  columns: 2,
  [Method, Accuracy],
  [Method A, 95%],
  [Method B, 97%],
)

= Conclusion

The conclusion summarizes our findings.`

export default function DocumentParserPage() {
  const [activeTab, setActiveTab] = useState<'latex' | 'typst'>('latex')
  const [input, setInput] = useState(sampleLatex)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleParse = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const parseResult = await documentParser.parseDocumentWithType(input, activeTab)
      setResult(parseResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleAutoDetect = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const parseResult = await documentParser.parseDocument(input)
      setResult(parseResult)
      setActiveTab(parseResult.type)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (tab: 'latex' | 'typst') => {
    setActiveTab(tab)
    setInput(tab === 'latex' ? sampleLatex : sampleTypst)
    setResult(null)
    setError(null)
  }

  return (
    <div className="document-parser-page">
      <div className="parser-header">
        <h1>Document Parser</h1>
        <p>Analyze LaTeX and Typst documents with comprehensive statistics</p>
      </div>

      <div className="parser-tabs">
        <button
          className={`tab-button ${activeTab === 'latex' ? 'active' : ''}`}
          onClick={() => handleTabChange('latex')}
        >
          LaTeX
        </button>
        <button
          className={`tab-button ${activeTab === 'typst' ? 'active' : ''}`}
          onClick={() => handleTabChange('typst')}
        >
          Typst
        </button>
      </div>

      <div className="parser-content">
        <div className="input-section">
          <div className="input-header">
            <h3>{activeTab === 'latex' ? 'LaTeX' : 'Typst'} Input</h3>
            <div className="input-actions">
              <button onClick={handleParse} disabled={loading}>
                {loading ? 'Parsing...' : `Parse ${activeTab.toUpperCase()}`}
              </button>
              <button onClick={handleAutoDetect} disabled={loading}>
                Auto-Detect & Parse
              </button>
            </div>
          </div>
          
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="code-input"
            placeholder={`Enter your ${activeTab} code here...`}
            spellCheck={false}
          />

          {error && (
            <div className="error-message">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        {result && (
          <div className="results-section">
            <div className="results-header">
              <h3>Analysis Results</h3>
              <div className="result-info">
                <span className="document-type-badge">{result.type.toUpperCase()}</span>
                <span className="processing-time">
                  {result.metadata.processingTime}ms
                </span>
              </div>
            </div>
            
            <DocumentStatistics result={result} />
          </div>
        )}
      </div>

      <div className="features-section">
        <h2>Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <h3>📊 Comprehensive Statistics</h3>
            <p>Word counts, math detection, section analysis, and complexity scoring</p>
          </div>
          <div className="feature-card">
            <h3>🔍 Structure Parsing</h3>
            <p>Extract document hierarchy, sections, and navigation structure</p>
          </div>
          <div className="feature-card">
            <h3>⚡ Fast Processing</h3>
            <p>Optimized parsers for both LaTeX and Typst with sub-second performance</p>
          </div>
          <div className="feature-card">
            <h3>🎯 Auto-Detection</h3>
            <p>Automatically detect document type and parse accordingly</p>
          </div>
          <div className="feature-card">
            <h3>📐 Math Analysis</h3>
            <p>Distinguish between inline and displayed math expressions</p>
          </div>
          <div className="feature-card">
            <h3>📚 Bibliography Support</h3>
            <p>Extract bibliography items and citation information</p>
          </div>
        </div>
      </div>
    </div>
  )
}
