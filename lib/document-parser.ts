"use client";

import { latexParser, LaTeXAST, AccurateStatistics } from './latex-parser';
import { typstParser, TypstAST, TypstStatistics } from './typst-parser';
import { systemLogger } from '@/lib/logger';

// Union types for both document types
export type DocumentAST = LaTeXAST | TypstAST;
export type DocumentStatistics = AccurateStatistics | TypstStatistics;

export interface DocumentParseResult {
  type: 'latex' | 'typst';
  ast: DocumentAST;
  stats: DocumentStatistics;
  metadata: DocumentMetadata;
}

export interface DocumentMetadata {
  title?: string;
  totalSections: number;
  totalHeadings: number;
  maxDepth: number;
  wordCount: number;
  mathInlineCount: number;
  mathDisplayedCount: number;
  floatCount: number;
  figureCount: number;
  tableCount: number;
  hasMath: boolean;
  hasFloats: boolean;
  hasFigures: boolean;
  hasTables: boolean;
  complexity: number;
  processingTime: number;
}

export interface DocumentNavigationItem {
  title: string;
  type: 'section' | 'subsection' | 'subsubsection' | 'heading';
  level: number;
  path: string;
  children: number;
  hasContent: boolean;
  lineNumber?: number;
}

/**
 * Unified document parser supporting both LaTeX and Typst
 */
export class UnifiedDocumentParser {
  private static instance: UnifiedDocumentParser;

  static getInstance(): UnifiedDocumentParser {
    if (!UnifiedDocumentParser.instance) {
      UnifiedDocumentParser.instance = new UnifiedDocumentParser();
    }
    return UnifiedDocumentParser.instance;
  }

  /**
   * Auto-detect document type and parse
   */
  async parseDocument(content: string): Promise<DocumentParseResult> {
    const startTime = Date.now();
    const documentType = this.detectDocumentType(content);
    
    systemLogger.info(`Detected document type: ${documentType}`);
    
    try {
      let result: DocumentParseResult;
      
      if (documentType === 'latex') {
        const latexResult = await latexParser.parseDocument(content);
        result = {
          type: 'latex',
          ast: latexResult.ast,
          stats: latexResult.stats,
          metadata: this.normalizeMetadata(latexResult.metadata, Date.now() - startTime)
        };
      } else {
        const typstResult = await typstParser.parseDocument(content);
        result = {
          type: 'typst',
          ast: typstResult.ast,
          stats: typstResult.stats,
          metadata: this.normalizeMetadata(typstResult.metadata, Date.now() - startTime)
        };
      }
      
      systemLogger.info(`Successfully parsed ${documentType} document in ${result.metadata.processingTime}ms`);
      return result;
      
    } catch (error) {
      systemLogger.error(`Failed to parse ${documentType} document`, error);
      throw new Error(`${documentType} parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse document with explicit type specification
   */
  async parseDocumentWithType(content: string, type: 'latex' | 'typst'): Promise<DocumentParseResult> {
    const startTime = Date.now();
    
    systemLogger.info(`Parsing document as ${type}`);
    
    try {
      let result: DocumentParseResult;
      
      if (type === 'latex') {
        const latexResult = await latexParser.parseDocument(content);
        result = {
          type: 'latex',
          ast: latexResult.ast,
          stats: latexResult.stats,
          metadata: this.normalizeMetadata(latexResult.metadata, Date.now() - startTime)
        };
      } else {
        const typstResult = await typstParser.parseDocument(content);
        result = {
          type: 'typst',
          ast: typstResult.ast,
          stats: typstResult.stats,
          metadata: this.normalizeMetadata(typstResult.metadata, Date.now() - startTime)
        };
      }
      
      systemLogger.info(`Successfully parsed ${type} document in ${result.metadata.processingTime}ms`);
      return result;
      
    } catch (error) {
      systemLogger.error(`Failed to parse ${type} document`, error);
      throw new Error(`${type} parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get document structure only (faster, no statistics)
   */
  async parseStructure(content: string, type?: 'latex' | 'typst'): Promise<DocumentAST> {
    const documentType = type || this.detectDocumentType(content);
    
    systemLogger.info(`Parsing ${documentType} structure`);
    
    try {
      if (documentType === 'latex') {
        return await latexParser.parseStructure(content);
      } else {
        return await typstParser.parseStructure(content);
      }
    } catch (error) {
      systemLogger.error(`Failed to parse ${documentType} structure`, error);
      throw new Error(`${documentType} structure parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get document statistics only
   */
  async getStatistics(content: string, type?: 'latex' | 'typst'): Promise<DocumentStatistics> {
    const documentType = type || this.detectDocumentType(content);
    
    systemLogger.info(`Analyzing ${documentType} statistics`);
    
    try {
      if (documentType === 'latex') {
        return await latexParser.getStatistics(content);
      } else {
        const ast = await typstParser.parseStructure(content);
        return typstParser.calculateStatistics(content, ast);
      }
    } catch (error) {
      systemLogger.error(`Failed to analyze ${documentType} statistics`, error);
      throw new Error(`${documentType} statistics analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract navigation hierarchy
   */
  extractNavigation(ast: DocumentAST): DocumentNavigationItem[] {
    if (ast.type === 'document') {
      // LaTeX AST
      const latexAST = ast as LaTeXAST;
      return latexParser.extractSectionHierarchy(latexAST).map(item => ({
        ...item,
        type: item.type as 'section' | 'subsection' | 'subsubsection'
      }));
    } else {
      // Typst AST
      const typstAST = ast as TypstAST;
      return typstParser.extractNavigationHierarchy(typstAST).map(item => ({
        ...item,
        type: 'heading' as const
      }));
    }
  }

  /**
   * Find sections/headings by criteria
   */
  findSections(
    ast: DocumentAST, 
    criteria: {
      type?: 'section' | 'subsection' | 'subsubsection';
      level?: number;
      titlePattern?: RegExp;
      minLevel?: number;
      maxLevel?: number;
    }
  ): any[] {
    if (ast.type === 'document') {
      // LaTeX AST
      const latexAST = ast as LaTeXAST;
      return latexParser.findSections(latexAST, criteria);
    } else {
      // Typst AST
      const typstAST = ast as TypstAST;
      return typstParser.findHeadings(typstAST, criteria);
    }
  }

  /**
   * Validate document syntax
   */
  validateSyntax(content: string, type?: 'latex' | 'typst'): { isValid: boolean; errors: string[] } {
    const documentType = type || this.detectDocumentType(content);
    
    if (documentType === 'latex') {
      return latexParser.validateSyntax(content);
    } else {
      return typstParser.validateSyntax(content);
    }
  }

  /**
   * Extract bibliography information
   */
  extractBibliography(content: string, type?: 'latex' | 'typst'): {
    itemCount: number;
    citationCount: number;
    items: string[];
    citations: string[];
    uncitedCitations?: string[];
  } {
    const documentType = type || this.detectDocumentType(content);
    
    if (documentType === 'latex') {
      return latexParser.extractBibliography(content);
    } else {
      return typstParser.extractBibliography(content);
    }
  }

  /**
   * Auto-detect document type based on content
   */
  private detectDocumentType(content: string): 'latex' | 'typst' {
    const trimmed = content.trim();
    
    // Clear indicators
    if (trimmed.includes('\\documentclass') || 
        trimmed.includes('\\begin{document}') ||
        trimmed.includes('\\section') ||
        trimmed.includes('\\subsection')) {
      return 'latex';
    }
    
    if (trimmed.includes('= ') || 
        trimmed.includes('== ') ||
        trimmed.includes('#show') ||
        trimmed.includes('#set') ||
        trimmed.includes('#let')) {
      return 'typst';
    }
    
    // Heuristic based on common patterns
    const latexCommands = ['\\usepackage', '\\begin{', '\\end{', '\\includegraphics', '\\bibliography'];
    const typstCommands = ['#figure', '#table', '#link', '#cite', '#ref'];
    
    const latexScore = latexCommands.filter(cmd => trimmed.includes(cmd)).length;
    const typstScore = typstCommands.filter(cmd => trimmed.includes(cmd)).length;
    
    return latexScore >= typstScore ? 'latex' : 'typst';
  }

  /**
   * Normalize metadata between LaTeX and Typst formats
   */
  private normalizeMetadata(
    metadata: any, 
    processingTime: number
  ): DocumentMetadata {
    return {
      title: metadata.title,
      totalSections: metadata.totalSections || metadata.totalHeadings || 0,
      totalHeadings: metadata.sectionCount || metadata.headingCount || 0,
      maxDepth: metadata.maxDepth || 0,
      wordCount: metadata.wordCount || 0,
      mathInlineCount: metadata.mathInlineCount || 0,
      mathDisplayedCount: metadata.mathDisplayedCount || 0,
      floatCount: metadata.floatCount || 0,
      figureCount: metadata.figureCount || 0,
      tableCount: metadata.tableCount || 0,
      hasMath: metadata.hasMath || false,
      hasFloats: metadata.hasFloats || false,
      hasFigures: metadata.hasFigures || false,
      hasTables: metadata.hasTables || false,
      complexity: metadata.complexity || 0,
      processingTime
    };
  }

  /**
   * Get parser statistics and capabilities
   */
  getParserInfo(): {
    supportedTypes: ('latex' | 'typst')[];
    latexFeatures: string[];
    typstFeatures: string[];
    version: string;
  } {
    return {
      supportedTypes: ['latex', 'typst'],
      latexFeatures: [
        'Section parsing',
        'Math detection',
        'Word counting',
        'Bibliography extraction',
        'Statistics analysis',
        'Structure validation'
      ],
      typstFeatures: [
        'Heading parsing',
        'Math detection',
        'Word counting',
        'Figure/table counting',
        'Statistics analysis',
        'Structure validation'
      ],
      version: '1.0.0'
    };
  }

  /**
   * Batch process multiple documents
   */
  async batchProcess(
    documents: Array<{ content: string; type?: 'latex' | 'typst' }>
  ): Promise<DocumentParseResult[]> {
    systemLogger.info(`Batch processing ${documents.length} documents`);
    
    const results: DocumentParseResult[] = [];
    const startTime = Date.now();
    
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      try {
        const result = await this.parseDocumentWithType(doc.content, doc.type || this.detectDocumentType(doc.content));
        results.push(result);
        systemLogger.info(`Processed document ${i + 1}/${documents.length}`);
      } catch (error) {
        systemLogger.error(`Failed to process document ${i + 1}`, error);
        // Continue processing other documents
      }
    }
    
    const totalTime = Date.now() - startTime;
    systemLogger.info(`Batch processing complete: ${results.length}/${documents.length} successful in ${totalTime}ms`);
    
    return results;
  }
}

// Export singleton instance
export const documentParser = UnifiedDocumentParser.getInstance();
