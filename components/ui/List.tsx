'use client'

import React from 'react'

interface ListProps {
  id: string
  rowCount: number
  rowHeight: number
  rowRenderer: (index: number) => React.ReactNode
  selectedRows?: Set<number>
  selectionMode?: 'single' | 'multi'
  onSelectionChanged?: (selectedRows: Set<number>) => void
  onRowClick?: (index: number) => void
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void
  height?: number
}

export const List: React.FC<ListProps> = ({
  id,
  rowCount,
  rowHeight,
  rowRenderer,
  selectedRows = new Set(),
  selectionMode = 'multi',
  onSelectionChanged,
  onRowClick,
  onScroll,
  height = 400
}) => {
  const handleRowClick = (index: number) => {
    if (onRowClick) {
      onRowClick(index)
    }

    if (onSelectionChanged) {
      const newSelected = new Set(selectedRows)
      
      if (selectionMode === 'single') {
        newSelected.clear()
        newSelected.add(index)
      } else {
        if (newSelected.has(index)) {
          newSelected.delete(index)
        } else {
          newSelected.add(index)
        }
      }
      
      onSelectionChanged(newSelected)
    }
  }

  return (
    <div
      className="virtual-list"
      style={{ height: `${height}px` }}
      onScroll={onScroll}
    >
      <div
        className="virtual-list-content"
        style={{ height: `${rowCount * rowHeight}px` }}
      >
        {Array.from({ length: rowCount }, (_, index) => (
          <div
            key={index}
            className={`virtual-list-row ${selectedRows.has(index) ? 'selected' : ''}`}
            style={{ height: `${rowHeight}px` }}
            onClick={() => handleRowClick(index)}
          >
            {rowRenderer(index)}
          </div>
        ))}
      </div>
    </div>
  )
}
