'use client'

import React, { useState, useRef, useCallback } from 'react'
import { GitService } from '../lib/git-service'
import { IRawDiff, DiffLineType } from '../lib/models/diff'
import { createDemoDiffs } from '../lib/demo-diff'
import './GitHubDesktopSidebar.css'

// Types
export enum RepositorySectionTab {
  Changes = 'changes',
  History = 'history'
}

export interface WorkingDirectoryFile {
  path: string
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked'
  included: boolean
  selected: boolean
  diff?: IRawDiff
}

export interface CommitMessage {
  summary: string
  description: string
  coAuthors: string[]
}

export interface CompareState {
  filterText: string
  showBranchList: boolean
  formState: {
    kind: 'history' | 'compare'
    selectedBranch?: string
  }
}

interface GitHubDesktopSidebarProps {
  repositoryPath?: string
  sidebarWidth?: number
  onSidebarResize?: (width: number) => void
}

export const GitHubDesktopSidebar: React.FC<GitHubDesktopSidebarProps> = ({
  repositoryPath = '.',
  sidebarWidth = 250,
  onSidebarResize
}) => {
  const [selectedTab, setSelectedTab] = useState<RepositorySectionTab>(RepositorySectionTab.Changes)
  const [sidebarWidthInternal, setSidebarWidthInternal] = useState(sidebarWidth)
  const [isResizing, setIsResizing] = useState(false)
  const [workingDirectory, setWorkingDirectory] = useState<WorkingDirectoryFile[]>([])
  const [commitMessage, setCommitMessage] = useState<CommitMessage>({
    summary: '',
    description: '',
    coAuthors: []
  })
  const [compareState, setCompareState] = useState<CompareState>({
    filterText: '',
    showBranchList: true,
    formState: { kind: 'history' }
  })
  const [isCommitting, setIsCommitting] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set())

  const gitService = new GitService()
  const resizeRef = useRef<HTMLDivElement>(null)

  // Load initial data
  React.useEffect(() => {
    loadWorkingDirectory()
  }, [repositoryPath])

  const loadWorkingDirectory = async () => {
    try {
      const diffs = await gitService.getAllDiffs(repositoryPath)
      const files: WorkingDirectoryFile[] = diffs.map((diff, index) => {
        const fileName = extractFileName(diff.header)
        return {
          path: fileName,
          status: getFileStatus(diff),
          included: true,
          selected: false,
          diff
        }
      })

      // If no real diffs, use demo data
      if (files.length === 0) {
        const demoDiffs = createDemoDiffs()
        const demoFiles: WorkingDirectoryFile[] = demoDiffs.map((diff, index) => ({
          path: extractFileName(diff.header),
          status: 'modified',
          included: true,
          selected: false,
          diff
        }))
        setWorkingDirectory(demoFiles)
      } else {
        setWorkingDirectory(files)
      }
    } catch (error) {
      // Fallback to demo data
      const demoDiffs = createDemoDiffs()
      const demoFiles: WorkingDirectoryFile[] = demoDiffs.map((diff, index) => ({
        path: extractFileName(diff.header),
        status: 'modified',
        included: true,
        selected: false,
        diff
      }))
      setWorkingDirectory(demoFiles)
    }
  }

  const handleTabClick = (tab: RepositorySectionTab) => {
    setSelectedTab(tab)
  }

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = e.clientX
      if (newWidth >= 200 && newWidth <= 400) {
        setSidebarWidthInternal(newWidth)
        onSidebarResize?.(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [onSidebarResize])

  const handleFileSelectionChanged = (selectedRows: Set<number>) => {
    setSelectedFiles(selectedRows)
  }

  const handleIncludeChanged = (fileIndex: number, included: boolean) => {
    setWorkingDirectory(prev => {
      const updated = [...prev]
      updated[fileIndex] = { ...updated[fileIndex], included }
      return updated
    })
  }

  const handleSelectAll = (included: boolean) => {
    setWorkingDirectory(prev => prev.map(file => ({ ...file, included })))
  }

  const handleCommit = async () => {
    if (!commitMessage.summary.trim()) return
    
    setIsCommitting(true)
    try {
      // In a real implementation, this would create an actual commit
      console.log('Committing:', commitMessage)
      
      // Simulate commit delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Reset form
      setCommitMessage({ summary: '', description: '', coAuthors: [] })
      setWorkingDirectory(prev => prev.map(file => ({ ...file, included: false })))
    } catch (error) {
      console.error('Commit failed:', error)
    } finally {
      setIsCommitting(false)
    }
  }

  const includedFilesCount = workingDirectory.filter(f => f.included).length
  const selectedFilesCount = selectedFiles.size

  return (
    <div className="repository">
      <div 
        className="repository-sidebar"
        style={{ width: `${sidebarWidthInternal}px` }}
      >
        {renderTabs()}
        {renderSidebarContents()}
      </div>
      
      <div 
        className="resize-handle"
        onMouseDown={handleResizeStart}
      />
      
      <div className="repository-content">
        {selectedTab === RepositorySectionTab.Changes && renderDiffContent()}
        {selectedTab === RepositorySectionTab.History && renderHistoryContent()}
      </div>
    </div>
  )

  function renderTabs() {
    return (
      <div className="tab-bar">
        <div 
          className={`tab ${selectedTab === RepositorySectionTab.Changes ? 'active' : ''}`}
          onClick={() => handleTabClick(RepositorySectionTab.Changes)}
        >
          <span>Changes</span>
          {includedFilesCount > 0 && (
            <span className="badge">{includedFilesCount}</span>
          )}
        </div>
        <div 
          className={`tab ${selectedTab === RepositorySectionTab.History ? 'active' : ''}`}
          onClick={() => handleTabClick(RepositorySectionTab.History)}
        >
          <span>History</span>
        </div>
      </div>
    )
  }

  function renderSidebarContents() {
    if (selectedTab === RepositorySectionTab.Changes) {
      return (
        <ChangesSidebar
          workingDirectory={workingDirectory}
          commitMessage={commitMessage}
          onCommitMessageChange={setCommitMessage}
          onFileSelectionChanged={handleFileSelectionChanged}
          onIncludeChanged={handleIncludeChanged}
          onSelectAll={handleSelectAll}
          onCommit={handleCommit}
          isCommitting={isCommitting}
          selectedFilesCount={selectedFilesCount}
        />
      )
    } else if (selectedTab === RepositorySectionTab.History) {
      return (
        <CompareSidebar
          compareState={compareState}
          onCompareStateChange={setCompareState}
        />
      )
    }
    return null
  }

  function renderDiffContent() {
    const selectedDiff = workingDirectory.find(f => f.selected)?.diff
    if (!selectedDiff) {
      return (
        <div className="diff-placeholder">
          <p>Select a file to view changes</p>
        </div>
      )
    }
    return (
      <div className="diff-content">
        <div className="diff-header">
          <h3>{extractFileName(selectedDiff.header)}</h3>
        </div>
        <div className="diff-view">
          {selectedDiff.hunks.map((hunk, hunkIndex) => (
            <div key={hunkIndex} className="diff-hunk">
              {hunk.lines.map((line, lineIndex) => (
                <div key={lineIndex} className={`diff-line ${getLineClassName(line.type)}`}>
                  <div className="line-numbers">
                    <span className="old-line">{line.oldLineNumber || ''}</span>
                    <span className="new-line">{line.newLineNumber || ''}</span>
                  </div>
                  <div className="line-content">
                    <pre>{getLineContent(line)}</pre>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  function renderHistoryContent() {
    return (
      <div className="history-content">
        <p>History view would go here</p>
      </div>
    )
  }
}

// Changes Sidebar Component
interface ChangesSidebarProps {
  workingDirectory: WorkingDirectoryFile[]
  commitMessage: CommitMessage
  onCommitMessageChange: (message: CommitMessage) => void
  onFileSelectionChanged: (selectedRows: Set<number>) => void
  onIncludeChanged: (fileIndex: number, included: boolean) => void
  onSelectAll: (included: boolean) => void
  onCommit: () => void
  isCommitting: boolean
  selectedFilesCount: number
}

const ChangesSidebar: React.FC<ChangesSidebarProps> = ({
  workingDirectory,
  commitMessage,
  onCommitMessageChange,
  onFileSelectionChanged,
  onIncludeChanged,
  onSelectAll,
  onCommit,
  isCommitting,
  selectedFilesCount
}) => {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())

  const handleRowClick = (index: number) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedRows(newSelected)
    onFileSelectionChanged(newSelected)
  }

  const handleIncludeAllChanged = (included: boolean) => {
    onSelectAll(included)
  }

  const includeAllValue = workingDirectory.length > 0 && workingDirectory.every(f => f.included)

  return (
    <div className="panel changes-panel">
      <div className="changes-list-container file-list">
        <div className="header">
          <div className="changes-list-check-all">
            <input
              type="checkbox"
              checked={includeAllValue}
              onChange={(e) => handleIncludeAllChanged(e.target.checked)}
              disabled={workingDirectory.length === 0}
            />
            <label>
              {selectedFilesCount > 0 
                ? `${selectedFilesCount} selected` 
                : `${workingDirectory.length} changed files`
              }
            </label>
          </div>
        </div>
        <div className="file-list">
          {workingDirectory.map((file, index) => (
            <div
              key={index}
              className={`file-item ${file.selected ? 'selected' : ''}`}
              onClick={() => handleRowClick(index)}
            >
              <div className="file-checkbox">
                <input
                  type="checkbox"
                  checked={file.included}
                  onChange={(e) => {
                    e.stopPropagation()
                    onIncludeChanged(index, e.target.checked)
                  }}
                />
              </div>
              <div className="file-info">
                <div className="file-name">{file.path}</div>
                <div className={`file-status ${file.status}`}>{file.status}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <CommitMessageForm
        commitMessage={commitMessage}
        onChange={onCommitMessageChange}
        onCommit={onCommit}
        isCommitting={isCommitting}
        disabled={workingDirectory.filter(f => f.included).length === 0}
      />
    </div>
  )
}

// Compare Sidebar Component
interface CompareSidebarProps {
  compareState: CompareState
  onCompareStateChange: (state: CompareState) => void
}

const CompareSidebar: React.FC<CompareSidebarProps> = ({
  compareState,
  onCompareStateChange
}) => {
  const handleFilterChange = (value: string) => {
    onCompareStateChange({ ...compareState, filterText: value })
  }

  return (
    <div id="compare-view" className="panel">
      <div className="compare-form">
        <input
          type="text"
          className="branch-filter"
          placeholder="Filter branches"
          value={compareState.filterText}
          onChange={(e) => handleFilterChange(e.target.value)}
        />
      </div>
      {compareState.showBranchList ? (
        <div className="branch-list">
          <div className="branch-item">main</div>
          <div className="branch-item">develop</div>
          <div className="branch-item">feature/new-feature</div>
        </div>
      ) : (
        <div className="compare-commit-list">
          <div className="commit-item">
            <div className="commit-message">Latest commit message</div>
            <div className="commit-author">Author Name</div>
          </div>
        </div>
      )}
    </div>
  )
}

// Commit Message Form Component
interface CommitMessageFormProps {
  commitMessage: CommitMessage
  onChange: (message: CommitMessage) => void
  onCommit: () => void
  isCommitting: boolean
  disabled: boolean
}

const CommitMessageForm: React.FC<CommitMessageFormProps> = ({
  commitMessage,
  onChange,
  onCommit,
  isCommitting,
  disabled
}) => {
  const handleSummaryChange = (summary: string) => {
    onChange({ ...commitMessage, summary })
  }

  const handleDescriptionChange = (description: string) => {
    onChange({ ...commitMessage, description })
  }

  return (
    <div className="commit-message">
      <div className="commit-avatar">
        <div className="avatar">U</div>
      </div>
      <div className="commit-form">
        <input
          type="text"
          className="summary-input"
          placeholder="Summary"
          value={commitMessage.summary}
          onChange={(e) => handleSummaryChange(e.target.value)}
          disabled={disabled}
        />
        <textarea
          className="description-input"
          placeholder="Description"
          value={commitMessage.description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          rows={3}
          disabled={disabled}
        />
        <div className="action-bar">
          <button className="co-author-toggle">Co-authors</button>
          <button className="copilot-button">Copilot</button>
        </div>
        <button
          className="commit-button"
          onClick={onCommit}
          disabled={disabled || isCommitting || !commitMessage.summary.trim()}
        >
          {isCommitting ? 'Committing...' : 'Commit'}
        </button>
      </div>
    </div>
  )
}

// Utility functions
function extractFileName(header: string): string {
  const match = header.match(/\+\+\+ b\/(.+)/)
  return match ? match[1] : 'Unknown file'
}

function getFileStatus(diff: IRawDiff): WorkingDirectoryFile['status'] {
  if (diff.hunks.length === 0) return 'untracked'
  
  const hasAdditions = diff.hunks.some(hunk => 
    hunk.lines.some(line => line.type === DiffLineType.Add)
  )
  const hasDeletions = diff.hunks.some(hunk => 
    hunk.lines.some(line => line.type === DiffLineType.Delete)
  )
  
  if (hasAdditions && hasDeletions) return 'modified'
  if (hasAdditions) return 'added'
  if (hasDeletions) return 'deleted'
  return 'modified'
}

function getLineClassName(type: DiffLineType): string {
  switch (type) {
    case DiffLineType.Hunk: return 'hunk'
    case DiffLineType.Add: return 'add'
    case DiffLineType.Delete: return 'delete'
    case DiffLineType.Context: return 'context'
    default: return ''
  }
}

function getLineContent(line: any): string {
  if (line.type === DiffLineType.Hunk) return line.text
  return line.text.length > 1 ? line.text.substring(1) : line.text
}
