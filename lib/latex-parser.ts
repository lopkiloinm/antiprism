"use client";

import { 
  LaTeXToJSONAST, 
  AccurateLaTeXParser, 
  JSONToLaTeX,
  LaTeXAST,
  SectionNode,
  AccurateStatistics,
  SectionStatistics
} from '@bottxrnif/latex-json-ast-converter';
import { latexLogger } from '@/lib/logger';

// Re-export types from the package for convenience
export type {
  LaTeXAST,
  SectionNode,
  AccurateStatistics,
  SectionStatistics
} from '@bottxrnif/latex-json-ast-converter';

/**
 * Enhanced LaTeX parser with additional features for Antiprism
 */
export class EnhancedLaTeXParser {
  private static instance: EnhancedLaTeXParser;

  static getInstance(): EnhancedLaTeXParser {
    if (!EnhancedLaTeXParser.instance) {
      EnhancedLaTeXParser.instance = new EnhancedLaTeXParser();
    }
    return EnhancedLaTeXParser.instance;
  }

  /**
   * Parse LaTeX document and extract structure with statistics
   */
  async parseDocument(latex: string): Promise<{
    ast: LaTeXAST;
    stats: AccurateStatistics;
    metadata: DocumentMetadata;
  }> {
    try {
      latexLogger.info("Parsing LaTeX document...");
      
      // Pre-process to handle starred sections
      const processedLatex = this.preprocessStarredSections(latex);
      
      const result = AccurateLaTeXParser.parseWithStatistics(processedLatex);
      const metadata = this.extractMetadata(result.ast, result.stats);
      
      latexLogger.info(`Successfully parsed LaTeX document: ${result.stats.numberOfHeaders} sections, ${result.stats.wordsInText} words`);
      
      return {
        ast: result.ast,
        stats: result.stats,
        metadata
      };
    } catch (error) {
      latexLogger.error("Failed to parse LaTeX document", error);
      throw new Error(`LaTeX parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Preprocess LaTeX to convert starred sections to regular sections for parsing
   */
  private preprocessStarredSections(latex: string): string {
    // Replace \section*{...} with \section{...} for parsing
    // Keep track of starred sections for metadata
    return latex
      .replace(/\\section\*\{([^}]+)\}/g, '\\section{$1}')
      .replace(/\\subsection\*\{([^}]+)\}/g, '\\subsection{$1}')
      .replace(/\\subsubsection\*\{([^}]+)\}/g, '\\subsubsection{$1}')
      .replace(/\\paragraph\*\{([^}]+)\}/g, '\\paragraph{$1}')
      .replace(/\\subparagraph\*\{([^}]+)\}/g, '\\subparagraph{$1}');
  }

  /**
   * Parse LaTeX document structure only (faster, no statistics)
   */
  async parseStructure(latex: string): Promise<LaTeXAST> {
    try {
      latexLogger.info("Parsing LaTeX structure...");
      const processedLatex = this.preprocessStarredSections(latex);
      const ast = LaTeXToJSONAST.convert(processedLatex);
      latexLogger.info(`Successfully parsed LaTeX structure: ${ast.sections.length} top-level sections`);
      return ast;
    } catch (error) {
      latexLogger.error("Failed to parse LaTeX structure", error);
      throw new Error(`LaTeX structure parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get comprehensive document statistics
   */
  async getStatistics(latex: string): Promise<AccurateStatistics> {
    try {
      latexLogger.info("Analyzing LaTeX statistics...");
      const result = AccurateLaTeXParser.parseWithStatistics(latex);
      latexLogger.info(`Statistics analysis complete: ${result.stats.wordsInText} words, ${result.stats.mathInlines} inline math`);
      return result.stats;
    } catch (error) {
      latexLogger.error("Failed to analyze LaTeX statistics", error);
      throw new Error(`LaTeX statistics analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract section hierarchy as a flat list for navigation
   */
  extractSectionHierarchy(ast: LaTeXAST): SectionNavigationItem[] {
    const items: SectionNavigationItem[] = [];
    
    const extractFromNode = (node: SectionNode, parentPath: string = ''): void => {
      const path = parentPath ? `${parentPath}/${node.title}` : node.title;
      items.push({
        title: node.title,
        type: node.type,
        level: node.level,
        path,
        children: node.children.length,
        hasContent: !!node.content
      });
      
      node.children.forEach(child => extractFromNode(child, path));
    };
    
    ast.sections.forEach(section => extractFromNode(section));
    return items;
  }

  /**
   * Find sections by type or title pattern
   */
  findSections(ast: LaTeXAST, criteria: {
    type?: 'section' | 'subsection' | 'subsubsection';
    titlePattern?: RegExp;
    level?: number;
  }): SectionNode[] {
    const matches: SectionNode[] = [];
    
    const searchNode = (node: SectionNode): void => {
      // Check if node matches criteria
      let isMatch = true;
      
      if (criteria.type && node.type !== criteria.type) isMatch = false;
      if (criteria.level && node.level !== criteria.level) isMatch = false;
      if (criteria.titlePattern && !criteria.titlePattern.test(node.title)) isMatch = false;
      
      if (isMatch) matches.push(node);
      
      // Search children
      node.children.forEach(searchNode);
    };
    
    ast.sections.forEach(searchNode);
    return matches;
  }

  /**
   * Extract document metadata beyond basic statistics
   */
  private extractMetadata(ast: LaTeXAST, stats: AccurateStatistics): DocumentMetadata {
    const hierarchy = this.extractSectionHierarchy(ast);
    const maxDepth = Math.max(...hierarchy.map(item => item.level));
    const sectionsByType = this.groupSectionsByType(ast);
    
    return {
      title: ast.title,
      totalSections: ast.metadata.totalSections,
      totalSubsections: ast.metadata.totalSubsections,
      totalSubsubsections: ast.metadata.totalSubsubsections,
      maxDepth,
      sectionCount: stats.numberOfHeaders,
      wordCount: stats.wordsInText + stats.wordsInHeaders,
      mathInlineCount: stats.mathInlines,
      mathDisplayedCount: stats.mathDisplayed,
      floatCount: stats.numberOfFloats,
      sectionsByType,
      hasMath: stats.mathInlines > 0 || stats.mathDisplayed > 0,
      hasFloats: stats.numberOfFloats > 0,
      complexity: this.calculateComplexity(stats, maxDepth)
    };
  }

  /**
   * Group sections by type for analysis
   */
  private groupSectionsByType(ast: LaTeXAST): Record<string, number> {
    const groups: Record<string, number> = {
      section: 0,
      subsection: 0,
      subsubsection: 0
    };
    
    const countByType = (node: SectionNode): void => {
      groups[node.type] = (groups[node.type] || 0) + 1;
      node.children.forEach(countByType);
    };
    
    ast.sections.forEach(countByType);
    return groups;
  }

  /**
   * Calculate document complexity score
   */
  private calculateComplexity(stats: AccurateStatistics, maxDepth: number): number {
    let score = 0;
    
    // Base score from word count
    score += Math.log10(stats.wordsInText + 1) * 10;
    
    // Math content adds complexity
    score += (stats.mathInlines + stats.mathDisplayed * 3) * 2;
    
    // Section depth adds complexity
    score += maxDepth * 15;
    
    // Number of sections adds complexity
    score += stats.numberOfHeaders * 5;
    
    // Floats add complexity
    score += stats.numberOfFloats * 10;
    
    return Math.round(score);
  }

  /**
   * Convert JSON AST back to LaTeX
   */
  astToLatex(ast: LaTeXAST): string {
    try {
      latexLogger.info("Converting AST back to LaTeX...");
      const latex = JSONToLaTeX.convert(ast);
      latexLogger.info("Successfully converted AST to LaTeX");
      return latex;
    } catch (error) {
      latexLogger.error("Failed to convert AST to LaTeX", error);
      throw new Error(`AST to LaTeX conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate LaTeX syntax without full parsing
   */
  validateSyntax(latex: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      // Try basic parsing
      LaTeXToJSONAST.convert(latex);
      return { isValid: true, errors };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown parsing error');
      return { isValid: false, errors };
    }
  }

  /**
   * Extract bibliography information
   */
  extractBibliography(latex: string): BibliographyInfo {
    const bibItems: string[] = [];
    const citations: string[] = [];
    
    // Simple regex-based extraction (can be enhanced)
    const bibItemRegex = /\\bibitem\{([^}]+)\}/g;
    const citeRegex = /\\cite\{([^}]+)\}/g;
    
    let match;
    while ((match = bibItemRegex.exec(latex)) !== null) {
      bibItems.push(match[1]);
    }
    
    while ((match = citeRegex.exec(latex)) !== null) {
      citations.push(match[1]);
    }
    
    return {
      itemCount: bibItems.length,
      citationCount: citations.length,
      items: bibItems,
      citations,
      uncitedCitations: citations.filter(cite => !bibItems.includes(cite))
    };
  }
}

// Type definitions for enhanced features
export interface SectionNavigationItem {
  title: string;
  type: 'section' | 'subsection' | 'subsubsection';
  level: number;
  path: string;
  children: number;
  hasContent: boolean;
}

export interface DocumentMetadata {
  title?: string;
  totalSections: number;
  totalSubsections: number;
  totalSubsubsections: number;
  maxDepth: number;
  sectionCount: number;
  wordCount: number;
  mathInlineCount: number;
  mathDisplayedCount: number;
  floatCount: number;
  sectionsByType: Record<string, number>;
  hasMath: boolean;
  hasFloats: boolean;
  complexity: number;
}

export interface BibliographyInfo {
  itemCount: number;
  citationCount: number;
  items: string[];
  citations: string[];
  uncitedCitations: string[];
}

// Export singleton instance
export const latexParser = EnhancedLaTeXParser.getInstance();
