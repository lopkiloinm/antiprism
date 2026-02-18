'use client'

import React from 'react'
import { DocumentParseResult, DocumentNavigationItem } from '@/lib/document-parser'

interface DocumentStatisticsProps {
  result: DocumentParseResult
  onSectionClick?: (item: DocumentNavigationItem) => void
}

export const DocumentStatistics: React.FC<DocumentStatisticsProps> = ({ 
  result, 
  onSectionClick 
}) => {
  const { ast, stats, metadata } = result
  const navigation = extractNavigation(result)

  return (
    <div className="document-statistics">
      <div className="stats-header">
        <h3>Document Analysis</h3>
        <span className="document-type">{result.type.toUpperCase()}</span>
      </div>

      {/* Overview Statistics */}
      <div className="stats-section">
        <h4>Overview</h4>
        <div className="stats-grid">
          <StatItem label="Words" value={metadata.wordCount.toLocaleString()} />
          <StatItem label="Sections" value={metadata.totalSections} />
          <StatItem label="Max Depth" value={metadata.maxDepth} />
          <StatItem label="Complexity" value={metadata.complexity} />
        </div>
      </div>

      {/* Content Statistics */}
      <div className="stats-section">
        <h4>Content</h4>
        <div className="stats-grid">
          <StatItem 
            label="Math Inline" 
            value={metadata.mathInlineCount} 
            highlight={metadata.hasMath}
          />
          <StatItem 
            label="Math Displayed" 
            value={metadata.mathDisplayedCount} 
            highlight={metadata.hasMath}
          />
          <StatItem 
            label="Figures" 
            value={metadata.figureCount} 
            highlight={metadata.hasFigures}
          />
          <StatItem 
            label="Tables" 
            value={metadata.tableCount} 
            highlight={metadata.hasTables}
          />
        </div>
      </div>

      {/* Processing Information */}
      <div className="stats-section">
        <h4>Processing</h4>
        <div className="stats-grid">
          <StatItem label="Processing Time" value={`${metadata.processingTime}ms`} />
          <StatItem label="Parser Version" value="1.0.0" />
        </div>
      </div>

      {/* Document Structure */}
      <div className="stats-section">
        <h4>Document Structure</h4>
        <div className="navigation-tree">
          {navigation.map((item, index) => (
            <NavigationItem 
              key={index} 
              item={item} 
              onClick={onSectionClick}
            />
          ))}
        </div>
      </div>

      {/* Detailed Statistics */}
      <DetailedStatistics result={result} />
    </div>
  )
}

interface StatItemProps {
  label: string
  value: string | number
  highlight?: boolean
}

const StatItem: React.FC<StatItemProps> = ({ label, value, highlight }) => (
  <div className={`stat-item ${highlight ? 'highlight' : ''}`}>
    <div className="stat-label">{label}</div>
    <div className="stat-value">{value}</div>
  </div>
)

interface NavigationItemProps {
  item: DocumentNavigationItem
  onClick?: (item: DocumentNavigationItem) => void
}

const NavigationItem: React.FC<NavigationItemProps> = ({ item, onClick }) => {
  const handleClick = () => {
    if (onClick) onClick(item)
  }

  return (
    <div 
      className={`navigation-item level-${item.level}`}
      onClick={handleClick}
    >
      <div className="nav-content">
        <span className="nav-title">{item.title}</span>
        <span className="nav-type">{item.type}</span>
      </div>
      {item.children > 0 && (
        <span className="nav-children">{item.children} children</span>
      )}
    </div>
  )
}

interface DetailedStatisticsProps {
  result: DocumentParseResult
}

const DetailedStatistics: React.FC<DetailedStatisticsProps> = ({ result }) => {
  if (result.type === 'latex') {
    return <LaTeXDetailedStats stats={result.stats} />
  } else {
    return <TypstDetailedStats stats={result.stats} />
  }
}

const LaTeXDetailedStats: React.FC<{ stats: any }> = ({ stats }) => (
  <div className="stats-section">
    <h4>LaTeX Statistics</h4>
    <div className="detailed-stats">
      <div className="stats-row">
        <span>Words in Text:</span>
        <span>{stats.wordsInText.toLocaleString()}</span>
      </div>
      <div className="stats-row">
        <span>Words in Headers:</span>
        <span>{stats.wordsInHeaders.toLocaleString()}</span>
      </div>
      <div className="stats-row">
        <span>Words Outside Text:</span>
        <span>{stats.wordsOutsideText.toLocaleString()}</span>
      </div>
      <div className="stats-row">
        <span>Floats:</span>
        <span>{stats.numberOfFloats}</span>
      </div>
      
      {stats.sectionStats && stats.sectionStats.length > 0 && (
        <div className="section-stats">
          <h5>Section Details</h5>
          {stats.sectionStats.map((section: any, index: number) => (
            <div key={index} className="section-stat-item">
              <div className="section-title">{section.title}</div>
              <div className="section-details">
                <span>Level {section.level}</span>
                <span>Words: {section.wordsInText + section.wordsInHeaders}</span>
                <span>Math: {section.mathInlines} inline, {section.mathDisplayed} displayed</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
)

const TypstDetailedStats: React.FC<{ stats: any }> = ({ stats }) => (
  <div className="stats-section">
    <h4>Typst Statistics</h4>
    <div className="detailed-stats">
      <div className="stats-row">
        <span>Words in Text:</span>
        <span>{stats.wordsInText.toLocaleString()}</span>
      </div>
      <div className="stats-row">
        <span>Words in Headings:</span>
        <span>{stats.wordsInHeadings.toLocaleString()}</span>
      </div>
      <div className="stats-row">
        <span>Words in Markup:</span>
        <span>{stats.wordsInMarkup.toLocaleString()}</span>
      </div>
      
      {stats.headingStats && stats.headingStats.length > 0 && (
        <div className="section-stats">
          <h5>Heading Details</h5>
          {stats.headingStats.map((heading: any, index: number) => (
            <div key={index} className="section-stat-item">
              <div className="section-title">{heading.title}</div>
              <div className="section-details">
                <span>Level {heading.level}</span>
                <span>Words: {heading.wordsInText + heading.wordsInHeadings}</span>
                <span>Math: {heading.mathInlines} inline, {heading.mathDisplayed} displayed</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
)

// Helper function to extract navigation from result
function extractNavigation(result: DocumentParseResult): DocumentNavigationItem[] {
  if (result.type === 'latex') {
    // For LaTeX, we'd need to extract from the AST
    // This is a simplified version
    return []
  } else {
    // For Typst, we'd extract from the AST
    return []
  }
}

export default DocumentStatistics
