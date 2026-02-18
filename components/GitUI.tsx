'use client'

import React, { useState, useEffect } from 'react'
import { DiffView } from './DiffView'
import { GitService } from '../lib/git-service'
import { IRawDiff } from '../lib/models/diff'
import { createDemoDiffs } from '../lib/demo-diff'
import './GitUI.css'

interface GitUIProps {
  repositoryPath?: string
}

export const GitUI: React.FC<GitUIProps> = ({ repositoryPath = '.' }) => {
  const [diffs, setDiffs] = useState<IRawDiff[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentFile, setCurrentFile] = useState<string | null>(null)
  const [gitStatus, setGitStatus] = useState<string>('')
  const [demoMode, setDemoMode] = useState(false)

  const gitService = new GitService()

  useEffect(() => {
    loadGitStatus()
  }, [repositoryPath])

  const loadGitStatus = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Try to get real git status
      const statusResult = await gitService.getStatus(repositoryPath)
      setGitStatus(statusResult)
      
      // Get all diffs for modified files
      const newDiffs = await gitService.getAllDiffs(repositoryPath)
      
      setDiffs(newDiffs)
      setDemoMode(false)
      
      if (newDiffs.length > 0 && !currentFile) {
        setCurrentFile(newDiffs[0].header)
      }
    } catch (err) {
      // Fall back to demo data if Git operations fail
      console.log('Git operations not available, using demo data')
      const demoDiffs = createDemoDiffs()
      setDiffs(demoDiffs)
      setGitStatus(' M src/components/DiffView.tsx\n M src/lib/diff-parser.ts\n?? demo-file.txt')
      setDemoMode(true)
      
      if (demoDiffs.length > 0 && !currentFile) {
        setCurrentFile(demoDiffs[0].header)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (diff: IRawDiff) => {
    setCurrentFile(diff.header)
  }

  const handleRefresh = () => {
    loadGitStatus()
  }

  if (loading) {
    return (
      <div className="git-ui loading">
        <div className="loading-spinner">Loading Git status...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="git-ui error">
        <div className="error-message">Error: {error}</div>
        <button onClick={handleRefresh} className="retry-button">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="git-ui">
      <div className="git-header">
        <h2>Git Changes</h2>
        <div className="header-actions">
          {demoMode && <span className="demo-badge">Demo Mode</span>}
          <button onClick={handleRefresh} className="refresh-button">
            Refresh
          </button>
        </div>
      </div>
      
      {gitStatus && (
        <div className="git-status">
          <h3>Status</h3>
          <pre className="status-text">{gitStatus}</pre>
        </div>
      )}
      
      {diffs.length > 0 && (
        <div className="git-diffs">
          <div className="file-list">
            <h3>Modified Files</h3>
            <ul className="file-list-items">
              {diffs.map((diff, index) => (
                <li key={index}>
                  <button
                    className={`file-item ${currentFile === diff.header ? 'active' : ''}`}
                    onClick={() => handleFileSelect(diff)}
                  >
                    {extractFileName(diff.header)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="diff-viewer">
            {currentFile && (
              <div className="current-diff">
                {diffs
                  .filter(diff => diff.header === currentFile)
                  .map((diff, index) => (
                    <DiffView key={index} diff={diff} />
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {diffs.length === 0 && !loading && (
        <div className="no-changes">
          <p>No changes to display</p>
        </div>
      )}
    </div>
  )
}

const extractFileName = (header: string): string => {
  // Extract filename from git diff header
  // Example: "+++ b/app/src/components/DiffView.tsx"
  const match = header.match(/\+\+\+ b\/(.+)/)
  return match ? match[1] : 'Unknown file'
}
