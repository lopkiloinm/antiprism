/**
 * Custom minimap viewport calculator for centered positioning
 */

export class MinimapViewportCalculator {
  private static instance: MinimapViewportCalculator;
  private debugMode: boolean = false;
  
  static getInstance(): MinimapViewportCalculator {
    if (!MinimapViewportCalculator.instance) {
      MinimapViewportCalculator.instance = new MinimapViewportCalculator();
    }
    return MinimapViewportCalculator.instance;
  }

  /**
   * Enable debug mode to log alignment calculations
   */
  enableDebugMode(enabled: boolean = true): void {
    this.debugMode = enabled;
    if (enabled) {
      console.log('[Minimap] Debug mode enabled - alignment calculations will be logged');
    }
  }

  /**
   * Calculate precise viewport position where minimap edges align with real viewport edges
   * This ensures minimap top aligns with real viewport top and minimap bottom aligns with real viewport bottom
   */
  calculateCenteredViewport(
    scrollTop: number,
    clientHeight: number,
    scrollHeight: number,
    minimapHeight: number,
    isLineWrapping: boolean = false
  ): { top: number; height: number } {
    // Calculate the scale factor between real content and minimap
    const scaleFactor = minimapHeight / scrollHeight;
    
    // Calculate viewport height in minimap scale
    const minimapViewportHeight = clientHeight * scaleFactor;
    
    // Calculate the top position where minimap viewport aligns with real viewport top
    let minimapTop = scrollTop * scaleFactor;
    
    // For line wrapping, we need to adjust for the difference between visual and logical lines
    if (isLineWrapping) {
      // IMPORTANT: The minimap with displayText="blocks" shows LOGICAL lines (one per code line)
      // But the editor with line wrapping shows VISUAL lines (wrapped lines)
      // When editor scrolls through many visual lines, minimap should move LESS (through fewer logical lines)
      
      // Estimate how many visual lines each logical line becomes
      const avgCharsPerLogicalLine = 60; // Average characters per code line
      const avgCharWidth = 8; // Approximate character width in pixels
      const viewportWidth = clientHeight * 0.7; // Approximate viewport width (heuristic)
      const charsPerViewportLine = viewportWidth / avgCharWidth;
      
      // Calculate how many visual lines each logical line becomes
      const visualLinesPerLogicalLine = Math.max(1.2, Math.min(4.0, avgCharsPerLogicalLine / charsPerViewportLine));
      
      // Map visual scroll position to logical line position
      // When editor scrolls through many visual lines, minimap should scroll through fewer logical lines
      // So we DIVIDE the visual scroll by the wrapping factor
      const logicalScrollTop = scrollTop / visualLinesPerLogicalLine;
      
      // Recalculate minimap position based on logical scroll
      minimapTop = logicalScrollTop * scaleFactor;
      
      // Debug info for line wrapping mapping
      if (this.debugMode) {
        console.log('[Minimap Line Wrapping]', {
          avgCharsPerLogicalLine,
          charsPerViewportLine,
          visualLinesPerLogicalLine,
          visualScrollTop: scrollTop,
          logicalScrollTop,
          adjustment: `Dividing by ${visualLinesPerLogicalLine.toFixed(2)}x (minimap moves less)`
        });
      }
    }
    
    // Ensure the viewport stays within bounds
    minimapTop = Math.max(0, Math.min(minimapTop, minimapHeight - minimapViewportHeight));
    
    // Debug logging for alignment verification
    if (this.debugMode) {
      console.log('[Minimap Alignment]', {
        realViewport: { top: scrollTop, bottom: scrollTop + clientHeight, height: clientHeight },
        minimapViewport: { top: minimapTop, bottom: minimapTop + minimapViewportHeight, height: minimapViewportHeight },
        scale: scaleFactor,
        isLineWrapping,
        alignment: {
          topAligned: Math.abs(minimapTop - (scrollTop * scaleFactor)) < 1,
          bottomAligned: Math.abs((minimapTop + minimapViewportHeight) - ((scrollTop + clientHeight) * scaleFactor)) < 1
        }
      });
    }
    
    return {
      top: minimapTop,
      height: minimapViewportHeight
    };
  }

  /**
   * Update minimap viewport element with centered positioning
   */
  updateViewportElement(
    viewportElement: HTMLElement,
    scrollTop: number,
    clientHeight: number,
    scrollHeight: number,
    minimapHeight: number,
    isLineWrapping: boolean = false
  ): void {
    const { top, height } = this.calculateCenteredViewport(
      scrollTop,
      clientHeight,
      scrollHeight,
      minimapHeight,
      isLineWrapping
    );
    
    viewportElement.style.top = `${top}px`;
    viewportElement.style.height = `${height}px`;
  }

  /**
   * Setup scroll listener to keep viewport centered with line wrapping support
   */
  setupCenteredViewport(
    scrollerElement: HTMLElement,
    minimapElement: HTMLElement,
    viewportElement: HTMLElement,
    editorElement?: HTMLElement
  ): () => void {
    const updateViewport = () => {
      const scrollTop = scrollerElement.scrollTop;
      const clientHeight = scrollerElement.clientHeight;
      const scrollHeight = scrollerElement.scrollHeight;
      const minimapHeight = minimapElement.clientHeight;
      
      // Detect if line wrapping is enabled by checking for cm-wrap-line class
      const isLineWrapping = editorElement?.querySelector('.cm-wrap-line') !== null;
      
      this.updateViewportElement(
        viewportElement,
        scrollTop,
        clientHeight,
        scrollHeight,
        minimapHeight,
        isLineWrapping
      );
    };

    // Initial update
    updateViewport();
    
    // Setup scroll listener
    scrollerElement.addEventListener('scroll', updateViewport, { passive: true });
    
    // Setup resize observer for responsive updates
    const resizeObserver = new ResizeObserver(updateViewport);
    resizeObserver.observe(scrollerElement);
    resizeObserver.observe(minimapElement);
    
    // Return cleanup function
    return () => {
      scrollerElement.removeEventListener('scroll', updateViewport);
      resizeObserver.disconnect();
    };
  }
}

// Global instance
export const minimapViewportCalculator = MinimapViewportCalculator.getInstance();
