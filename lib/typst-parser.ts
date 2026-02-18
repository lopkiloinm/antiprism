"use client";

import { typstLogger } from '@/lib/logger';

/**
 * Typst document structure and statistics parser
 * Since there's no direct equivalent package for Typst, we'll implement a comprehensive parser
 */

export interface TypstAST {
  type: 'document';
  title?: string;
  headings: TypstHeading[];
  metadata: {
    totalHeadings: number;
    maxDepth: number;
  };
}

export interface TypstHeading {
  type: 'heading';
  level: number;
  title: string;
  children: TypstHeading[];
  content?: string;
  lineNumber: number;
}

export interface TypstStatistics {
  wordsInText: number;
  wordsInHeadings: number;
  wordsInMarkup: number;
  mathInlines: number;
  mathDisplayed: number;
  numberOfHeadings: number;
  numberOfFigures: number;
  numberOfTables: number;
  headingStats: TypstHeadingStatistics[];
}

export interface TypstHeadingStatistics {
  title: string;
  level: number;
  wordsInText: number;
  wordsInHeadings: number;
  mathInlines: number;
  mathDisplayed: number;
  subcounts: string;
}

export interface TypstNavigationItem {
  title: string;
  level: number;
  path: string;
  children: number;
  hasContent: boolean;
  lineNumber: number;
}

export interface TypstDocumentMetadata {
  title?: string;
  totalHeadings: number;
  maxDepth: number;
  headingCount: number;
  wordCount: number;
  mathInlineCount: number;
  mathDisplayedCount: number;
  figureCount: number;
  tableCount: number;
  headingsByLevel: Record<number, number>;
  hasMath: boolean;
  hasFigures: boolean;
  hasTables: boolean;
  complexity: number;
}

/**
 * Enhanced Typst parser with comprehensive analysis
 */
export class EnhancedTypstParser {
  private static instance: EnhancedTypstParser;

  static getInstance(): EnhancedTypstParser {
    if (!EnhancedTypstParser.instance) {
      EnhancedTypstParser.instance = new EnhancedTypstParser();
    }
    return EnhancedTypstParser.instance;
  }

  /**
   * Parse Typst document and extract structure with statistics
   */
  async parseDocument(typst: string): Promise<{
    ast: TypstAST;
    stats: TypstStatistics;
    metadata: TypstDocumentMetadata;
  }> {
    try {
      typstLogger.info("Parsing Typst document...");
      
      const ast = this.parseStructure(typst);
      const stats = this.calculateStatistics(typst, ast);
      const metadata = this.extractMetadata(ast, stats);
      
      typstLogger.info(`Successfully parsed Typst document: ${stats.numberOfHeadings} headings, ${stats.wordsInText} words`);
      
      return {
        ast,
        stats,
        metadata
      };
    } catch (error) {
      typstLogger.error("Failed to parse Typst document", error);
      throw new Error(`Typst parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse Typst document structure
   */
  parseStructure(typst: string): TypstAST {
    const lines = typst.split('\n');
    const headings: TypstHeading[] = [];
    const stack: TypstHeading[] = [];
    
    let title: string | undefined;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Extract title (first heading or metadata)
      if (!title && (line.startsWith('= ') || line.includes('title:'))) {
        if (line.startsWith('= ')) {
          title = line.substring(2).trim();
        } else {
          const match = line.match(/title:\s*"([^"]+)"/);
          if (match) title = match[1];
        }
      }
      
      // Parse headings (=, ==, ===, ====, etc.)
      const headingMatch = line.match(/^(=+)\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const title = headingMatch[2].trim();
        
        const heading: TypstHeading = {
          type: 'heading',
          level,
          title,
          children: [],
          lineNumber: i + 1
        };
        
        // Maintain hierarchy
        while (stack.length > 0 && stack[stack.length - 1].level >= level) {
          stack.pop();
        }
        
        if (stack.length === 0) {
          headings.push(heading);
        } else {
          stack[stack.length - 1].children.push(heading);
        }
        
        stack.push(heading);
      }
    }
    
    const maxDepth = Math.max(...headings.map(h => this.getMaxDepth(h)), 0);
    
    return {
      type: 'document',
      title,
      headings,
      metadata: {
        totalHeadings: headings.length,
        maxDepth
      }
    };
  }

  /**
   * Calculate comprehensive statistics
   */
  calculateStatistics(typst: string, ast: TypstAST): TypstStatistics {
    const lines = typst.split('\n');
    
    // Count different types of content
    let wordsInText = 0;
    let wordsInHeadings = 0;
    let wordsInMarkup = 0;
    let mathInlines = 0;
    let mathDisplayed = 0;
    let numberOfFigures = 0;
    let numberOfTables = 0;
    
    let inMath = false;
    let inCodeBlock = false;
    let inMarkupBlock = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip comments
      if (trimmed.startsWith('//')) continue;
      
      // Code blocks
      if (trimmed.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
      if (inCodeBlock) continue;
      
      // Markup blocks
      if (trimmed.startsWith('#[') || trimmed.startsWith('#let')) {
        inMarkupBlock = true;
      }
      if (inMarkupBlock && trimmed.endsWith(']')) {
        inMarkupBlock = false;
      }
      
      // Math content
      if (trimmed.includes('$')) {
        // Inline math: $...$
        const inlineMatches = trimmed.match(/\$[^$]+\$/g);
        if (inlineMatches) {
          mathInlines += inlineMatches.length;
          wordsInText += this.countWords(inlineMatches.join(' ').replace(/\$/g, ''));
        }
        
        // Display math: $$...$$ or block math
        if (trimmed.includes('$$')) {
          const blockMatches = trimmed.match(/\$\$[^$]+\$\$/g);
          if (blockMatches) {
            mathDisplayed += blockMatches.length;
            wordsInText += this.countWords(blockMatches.join(' ').replace(/\$\$/g, ''));
          }
        }
      }
      
      // Figures
      if (trimmed.includes('#figure') || trimmed.includes('#image')) {
        numberOfFigures++;
      }
      
      // Tables
      if (trimmed.includes('#table') || trimmed.includes('#grid')) {
        numberOfTables++;
      }
      
      // Count words in headings
      const headingMatch = trimmed.match(/^(=+)\s+(.+)$/);
      if (headingMatch) {
        wordsInHeadings += this.countWords(headingMatch[2]);
        continue;
      }
      
      // Count words in regular text
      if (!inMarkupBlock && trimmed && !headingMatch) {
        if (inMarkupBlock) {
          wordsInMarkup += this.countWords(trimmed);
        } else {
          wordsInText += this.countWords(trimmed);
        }
      }
    }
    
    const headingStats = this.calculateHeadingStats(typst, ast);
    
    return {
      wordsInText,
      wordsInHeadings,
      wordsInMarkup,
      mathInlines,
      mathDisplayed,
      numberOfHeadings: ast.metadata.totalHeadings,
      numberOfFigures,
      numberOfTables,
      headingStats
    };
  }

  /**
   * Extract navigation hierarchy
   */
  extractNavigationHierarchy(ast: TypstAST): TypstNavigationItem[] {
    const items: TypstNavigationItem[] = [];
    
    const extractFromNode = (node: TypstHeading, parentPath: string = ''): void => {
      const path = parentPath ? `${parentPath}/${node.title}` : node.title;
      items.push({
        title: node.title,
        level: node.level,
        path,
        children: node.children.length,
        hasContent: !!node.content,
        lineNumber: node.lineNumber
      });
      
      node.children.forEach(child => extractFromNode(child, path));
    };
    
    ast.headings.forEach(heading => extractFromNode(heading));
    return items;
  }

  /**
   * Find headings by criteria
   */
  findHeadings(ast: TypstAST, criteria: {
    level?: number;
    titlePattern?: RegExp;
    minLevel?: number;
    maxLevel?: number;
  }): TypstHeading[] {
    const matches: TypstHeading[] = [];
    
    const searchNode = (node: TypstHeading): void => {
      let isMatch = true;
      
      if (criteria.level && node.level !== criteria.level) isMatch = false;
      if (criteria.minLevel && node.level < criteria.minLevel) isMatch = false;
      if (criteria.maxLevel && node.level > criteria.maxLevel) isMatch = false;
      if (criteria.titlePattern && !criteria.titlePattern.test(node.title)) isMatch = false;
      
      if (isMatch) matches.push(node);
      
      node.children.forEach(searchNode);
    };
    
    ast.headings.forEach(searchNode);
    return matches;
  }

  /**
   * Calculate heading-specific statistics
   */
  private calculateHeadingStats(typst: string, ast: TypstAST): TypstHeadingStatistics[] {
    const stats: TypstHeadingStatistics[] = [];
    
    const calculateNodeStats = (node: TypstHeading): void => {
      // Extract content between this heading and the next
      const lines = typst.split('\n');
      const startLine = node.lineNumber - 1;
      
      // Find the next heading of same or higher level
      let endLine = lines.length;
      for (let i = startLine + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        const match = line.match(/^(=+)\s+(.+)$/);
        if (match && match[1].length <= node.level) {
          endLine = i;
          break;
        }
      }
      
      const content = lines.slice(startLine + 1, endLine).join('\n');
      
      // Count statistics for this section
      let wordsInText = 0;
      let wordsInHeadings = 0;
      let mathInlines = 0;
      let mathDisplayed = 0;
      
      // Count words in content (excluding subheadings)
      const contentLines = content.split('\n');
      for (const contentLine of contentLines) {
        const trimmed = contentLine.trim();
        
        // Skip subheadings
        const headingMatch = trimmed.match(/^(=+)\s+(.+)$/);
        if (headingMatch) {
          wordsInHeadings += this.countWords(headingMatch[2]);
          continue;
        }
        
        // Count math
        const inlineMatches = trimmed.match(/\$[^$]+\$/g);
        if (inlineMatches) {
          mathInlines += inlineMatches.length;
          wordsInText += this.countWords(inlineMatches.join(' ').replace(/\$/g, ''));
        }
        
        const blockMatches = trimmed.match(/\$\$[^$]+\$\$/g);
        if (blockMatches) {
          mathDisplayed += blockMatches.length;
          wordsInText += this.countWords(blockMatches.join(' ').replace(/\$\$/g, ''));
        }
        
        // Count regular words
        if (trimmed && !headingMatch) {
          wordsInText += this.countWords(trimmed);
        }
      }
      
      const subcounts = `${wordsInText}+${wordsInHeadings}+${mathInlines}+${mathDisplayed}`;
      
      stats.push({
        title: node.title,
        level: node.level,
        wordsInText,
        wordsInHeadings,
        mathInlines,
        mathDisplayed,
        subcounts
      });
      
      node.children.forEach(calculateNodeStats);
    };
    
    ast.headings.forEach(calculateNodeStats);
    return stats;
  }

  /**
   * Extract document metadata
   */
  private extractMetadata(ast: TypstAST, stats: TypstStatistics): TypstDocumentMetadata {
    const headingsByLevel: Record<number, number> = {};
    
    const countByLevel = (node: TypstHeading): void => {
      headingsByLevel[node.level] = (headingsByLevel[node.level] || 0) + 1;
      node.children.forEach(countByLevel);
    };
    
    ast.headings.forEach(countByLevel);
    
    return {
      title: ast.title,
      totalHeadings: ast.metadata.totalHeadings,
      maxDepth: ast.metadata.maxDepth,
      headingCount: stats.numberOfHeadings,
      wordCount: stats.wordsInText + stats.wordsInHeadings + stats.wordsInMarkup,
      mathInlineCount: stats.mathInlines,
      mathDisplayedCount: stats.mathDisplayed,
      figureCount: stats.numberOfFigures,
      tableCount: stats.numberOfTables,
      headingsByLevel,
      hasMath: stats.mathInlines > 0 || stats.mathDisplayed > 0,
      hasFigures: stats.numberOfFigures > 0,
      hasTables: stats.numberOfTables > 0,
      complexity: this.calculateComplexity(stats, ast.metadata.maxDepth)
    };
  }

  /**
   * Calculate document complexity score
   */
  private calculateComplexity(stats: TypstStatistics, maxDepth: number): number {
    let score = 0;
    
    // Base score from word count
    score += Math.log10(stats.wordsInText + 1) * 10;
    
    // Math content adds complexity
    score += (stats.mathInlines + stats.mathDisplayed * 3) * 2;
    
    // Heading depth adds complexity
    score += maxDepth * 15;
    
    // Number of headings adds complexity
    score += stats.numberOfHeadings * 5;
    
    // Figures and tables add complexity
    score += (stats.numberOfFigures + stats.numberOfTables) * 10;
    
    return Math.round(score);
  }

  /**
   * Count words in text (handles Unicode properly)
   */
  private countWords(text: string): number {
    // Remove Typst markup and count words
    const cleanText = text
      .replace(/#[a-zA-Z]+\([^)]*\)/g, '') // Remove function calls
      .replace(/[{}[\]()]/g, '') // Remove brackets
      .replace(/"[^"]*"/g, '') // Remove quoted strings
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    // Split by whitespace and filter out empty strings
    const words = cleanText.split(/\s+/).filter(word => word.length > 0);
    return words.length;
  }

  /**
   * Get maximum depth of a heading node
   */
  private getMaxDepth(node: TypstHeading): number {
    if (node.children.length === 0) return node.level;
    return Math.max(...node.children.map(child => this.getMaxDepth(child)));
  }

  /**
   * Validate Typst syntax
   */
  validateSyntax(typst: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      // Basic validation
      this.parseStructure(typst);
      return { isValid: true, errors };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown parsing error');
      return { isValid: false, errors };
    }
  }

  /**
   * Extract bibliography information
   */
  extractBibliography(typst: string): {
    itemCount: number;
    citationCount: number;
    items: string[];
    citations: string[];
  } {
    const items: string[] = [];
    const citations: string[] = [];
    
    // Extract bibliography items
    const bibItemRegex = /#bibitem\("([^"]+)"\)/g;
    const citeRegex = /#cite\("([^"]+)"\)/g;
    
    let match;
    while ((match = bibItemRegex.exec(typst)) !== null) {
      items.push(match[1]);
    }
    
    while ((match = citeRegex.exec(typst)) !== null) {
      citations.push(match[1]);
    }
    
    return {
      itemCount: items.length,
      citationCount: citations.length,
      items,
      citations
    };
  }
}

// Export singleton instance
export const typstParser = EnhancedTypstParser.getInstance();
