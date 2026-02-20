"use client";

interface SummaryViewProps {
  summaryContent?: string;
  summaryData?: {
    type: string;
    ast: any;
    stats?: any;
    metadata?: any;
    [key: string]: any;
  };
}

function StatCard({ title, value, category }: { title: string; value: string | number; category?: string }) {
  return (
    <div className="bg-[color-mix(in_srgb,var(--border)_10%,transparent)] border border-[var(--border)] rounded-lg p-3">
      {category && (
        <div className="text-xs text-[var(--muted)] uppercase tracking-wide mb-1 opacity-70">{category}</div>
      )}
      <div className="text-xs text-[var(--muted)] uppercase tracking-wide mb-1">{title}</div>
      <div className="text-lg font-semibold text-[var(--foreground)]">{value}</div>
    </div>
  );
}

export function SummaryView({ summaryContent, summaryData }: SummaryViewProps) {
  if (!summaryData) {
    return (
      <div className="text-sm text-[var(--muted)] whitespace-pre-wrap">
        {summaryContent}
      </div>
    );
  }

  const stats = summaryData.stats || summaryData.ast || {};
  const metadata = summaryData.metadata || {};

  // Organize cards by category
  const organizedCards: { category: string; cards: { title: string; value: string | number }[] }[] = [];

  // Document Overview
  const overviewCards: { title: string; value: string | number }[] = [];
  overviewCards.push({
    title: 'Type',
    value: summaryData.type?.toUpperCase() || 'Unknown'
  });

  // Add file size (essential for all file types)
  if (stats.fileSize) {
    const fileSizeKB = (stats.fileSize / 1024).toFixed(1);
    const fileSizeBytes = stats.fileSize.toLocaleString();
    overviewCards.push({
      title: 'File Size',
      value: `${fileSizeKB}KB (${fileSizeBytes} bytes)`
    });
  } else if (summaryContent) {
    // Calculate file size from content if not provided
    const contentSize = new Blob([summaryContent]).size;
    const fileSizeKB = (contentSize / 1024).toFixed(1);
    const fileSizeBytes = contentSize.toLocaleString();
    overviewCards.push({
      title: 'File Size',
      value: `${fileSizeKB}KB (${fileSizeBytes} bytes)`
    });
  }

  if (metadata.wordCount) {
    overviewCards.push({
      title: 'Total Words',
      value: metadata.wordCount.toLocaleString()
    });
  }

  // Don't show sections if it conflicts with headings count
  // Remove redundant section count - Document Outline shows the real count

  if (overviewCards.length > 0) {
    organizedCards.push({ category: 'Document Overview', cards: overviewCards });
  }

  // Content Statistics
  const contentCards: { title: string; value: string | number }[] = [];
  
  // Add character count first (most basic stat)
  if (stats.characterCount) {
    contentCards.push({
      title: 'Characters',
      value: stats.characterCount.toLocaleString()
    });
  } else if (summaryContent) {
    // Calculate character count from content
    const charCount = summaryContent.length;
    contentCards.push({
      title: 'Characters',
      value: charCount.toLocaleString()
    });
  }

  // Add character count excluding spaces
  if (stats.characterCountExcludingSpaces) {
    contentCards.push({
      title: 'Characters (no spaces)',
      value: stats.characterCountExcludingSpaces.toLocaleString()
    });
  } else if (summaryContent) {
    // Calculate characters excluding spaces from content
    const charsNoSpaces = summaryContent.replace(/\s/g, '').length;
    contentCards.push({
      title: 'Characters (no spaces)',
      value: charsNoSpaces.toLocaleString()
    });
  }

  // Add line count
  if (stats.numberOfLines) {
    contentCards.push({
      title: 'Lines',
      value: stats.numberOfLines.toLocaleString()
    });
  } else if (summaryContent) {
    // Calculate lines from content
    const lines = summaryContent.split('\n').length;
    contentCards.push({
      title: 'Lines',
      value: lines.toLocaleString()
    });
  }

  // Image-specific content stats
  if (summaryData.type === 'image') {
    if (stats.fileName) {
      contentCards.push({
        title: 'File Name',
        value: stats.fileName
      });
    }

    if (stats.fileExtension) {
      contentCards.push({
        title: 'File Type',
        value: stats.fileExtension
      });
    }

    if (stats.resolution) {
      contentCards.push({
        title: 'Resolution',
        value: stats.resolution
      });
    }
  }

  if (contentCards.length > 0) {
    organizedCards.push({ category: 'Content Statistics', cards: contentCards });
  }

  // Document Outline (most important!)
  const outlineCards: { title: string; value: string | number }[] = [];
  
  // Show section/heading details for documents
  if (stats.sectionStats && stats.sectionStats.length > 0) {
    // Add hierarchy counts first - calculate from section stats
    const hierarchyCards: { title: string; value: string | number }[] = [];
    
    // Count sections by level
    const levelCounts = stats.sectionStats.reduce((acc: any, section: any) => {
      acc[section.level] = (acc[section.level] || 0) + 1;
      return acc;
    }, {});
    
    // Sections are Level 1
    hierarchyCards.push({
      title: 'Sections',
      value: (levelCounts[1] || 0).toLocaleString()
    });

    // Subsections are Level 2
    if (levelCounts[2] > 0) {
      hierarchyCards.push({
        title: 'Subsections',
        value: levelCounts[2].toLocaleString()
      });
    }

    // Subsubsections are Level 3
    if (levelCounts[3] > 0) {
      hierarchyCards.push({
        title: 'Subsubsections',
        value: levelCounts[3].toLocaleString()
      });
    }

    if (hierarchyCards.length > 0) {
      organizedCards.push({ category: 'Document Outline', cards: hierarchyCards });
    }
    
    // Add detailed outline as a separate section
    const outlineDetails = stats.sectionStats.map((section: any, index: number) => 
      `${index + 1}. ${section.title} (Level ${section.level}, ${section.wordsInText + section.wordsInHeaders} words)`
    ).join('\n');
    
    organizedCards.push({
      category: 'Section Details',
      cards: [{
        title: 'Full Outline',
        value: outlineDetails
      }]
    });
  } else if (stats.headingStats && stats.headingStats.length > 0) {
    // Add hierarchy counts first - calculate from heading stats
    const hierarchyCards: { title: string; value: string | number }[] = [];
    
    // Count headings by level
    const levelCounts = stats.headingStats.reduce((acc: any, heading: any) => {
      acc[heading.level] = (acc[heading.level] || 0) + 1;
      return acc;
    }, {});
    
    hierarchyCards.push({
      title: 'Sections',
      value: (levelCounts[1] || 0).toLocaleString()
    });

    if (levelCounts[2] > 0) {
      hierarchyCards.push({
        title: 'Subsections',
        value: levelCounts[2].toLocaleString()
      });
    }

    if (levelCounts[3] > 0) {
      hierarchyCards.push({
        title: 'Subsubsections',
        value: levelCounts[3].toLocaleString()
      });
    }

    if (hierarchyCards.length > 0) {
      organizedCards.push({ category: 'Document Outline', cards: hierarchyCards });
    }
    
    // Add detailed outline as a separate section
    const outlineDetails = stats.headingStats.map((heading: any, index: number) => 
      `${index + 1}. ${heading.title} (Level ${heading.level}, ${heading.wordsInText + heading.wordsInHeadings} words)`
    ).join('\n');
    
    organizedCards.push({
      category: 'Heading Details',
      cards: [{
        title: 'Full Outline',
        value: outlineDetails
      }]
    });
  }

  // Camera Information (for images)
  const cameraCards: { title: string; value: string | number }[] = [];
  
  if (summaryData.type === 'image') {
    if (stats.cameraMake) {
      cameraCards.push({
        title: 'Camera Make',
        value: stats.cameraMake
      });
    }

    if (stats.cameraModel) {
      cameraCards.push({
        title: 'Camera Model',
        value: stats.cameraModel
      });
    }

    if (stats.dateTaken) {
      cameraCards.push({
        title: 'Date Taken',
        value: stats.dateTaken
      });
    }

    if (stats.iso) {
      cameraCards.push({
        title: 'ISO',
        value: stats.iso
      });
    }

    if (stats.focalLength) {
      cameraCards.push({
        title: 'Focal Length',
        value: stats.focalLength
      });
    }

    if (stats.flash) {
      cameraCards.push({
        title: 'Flash',
        value: stats.flash
      });
    }
  }

  if (cameraCards.length > 0) {
    organizedCards.push({ category: 'Camera Information', cards: cameraCards });
  }

  // Mathematical Content
  const mathCards: { title: string; value: string | number }[] = [];
  
  if (stats.mathInlines) {
    mathCards.push({
      title: 'Inline Math',
      value: stats.mathInlines.toLocaleString()
    });
  }

  if (stats.mathDisplayed) {
    mathCards.push({
      title: 'Displayed Math',
      value: stats.mathDisplayed.toLocaleString()
    });
  }

  if (metadata.hasMath !== undefined) {
    mathCards.push({
      title: 'Has Math',
      value: metadata.hasMath ? 'Yes' : 'No'
    });
  }

  if (mathCards.length > 0) {
    organizedCards.push({ category: 'Mathematical Content', cards: mathCards });
  }

  // Elements & Media
  const elementsCards: { title: string; value: string | number }[] = [];
  
  if (stats.numberOfFloats) {
    elementsCards.push({
      title: 'Floats',
      value: stats.numberOfFloats.toLocaleString()
    });
  }

  if (metadata.figureCount !== undefined && metadata.figureCount > 0) {
    elementsCards.push({
      title: 'Figures',
      value: metadata.figureCount.toLocaleString()
    });
  }

  if (metadata.tableCount !== undefined && metadata.tableCount > 0) {
    elementsCards.push({
      title: 'Tables',
      value: metadata.tableCount.toLocaleString()
    });
  }

  if (elementsCards.length > 0) {
    organizedCards.push({ category: 'Elements & Media', cards: elementsCards });
  }

  // Performance Metrics
  const performanceCards: { title: string; value: string | number }[] = [];
  
  if (metadata.processingTime) {
    performanceCards.push({
      title: 'Processing Time',
      value: `${metadata.processingTime}ms`
    });
  }

  if (performanceCards.length > 0) {
    organizedCards.push({ category: 'Performance Metrics', cards: performanceCards });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">
          {summaryData.type?.toUpperCase() || 'Unknown'} File Analysis
        </h3>
        <div className="text-xs text-[var(--muted)]">
          {organizedCards.reduce((acc, cat) => acc + cat.cards.length, 0) - 1} metrics
        </div>
      </div>

      {/* Organized Sections */}
      {organizedCards.map((section, sectionIndex) => (
        <div key={sectionIndex} className="space-y-3">
          <div className="text-xs font-medium text-[var(--foreground)] uppercase tracking-wide">
            {section.category}
          </div>
          
          {/* Special handling for outline sections */}
          {(section.category === 'Section Details' || section.category === 'Heading Details') ? (
            <div className="bg-[color-mix(in_srgb,var(--border)_10%,transparent)] border border-[var(--border)] rounded-lg p-3">
              <div className="text-sm text-[var(--muted)] whitespace-pre-line font-mono">
                {section.cards[0].value}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {section.cards.map((card, cardIndex) => (
                <StatCard
                  key={cardIndex}
                  title={card.title}
                  value={card.value}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
