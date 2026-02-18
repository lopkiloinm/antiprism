'use client'

import React, { useState, useRef, useCallback } from 'react'

interface ResizableProps {
  id: string
  width: number
  maximumWidth: number
  minimumWidth: number
  onReset?: () => void
  onResize?: (width: number) => void
  description?: string
  children: React.ReactNode
}

export const Resizable: React.FC<ResizableProps> = ({
  id,
  width,
  maximumWidth,
  minimumWidth,
  onReset,
  onResize,
  description,
  children
}) => {
  const [isResizing, setIsResizing] = useState(false)
  const [currentWidth, setCurrentWidth] = useState(width)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    
    const startX = e.clientX
    const startWidth = currentWidth

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX
      const newWidth = Math.max(minimumWidth, Math.min(maximumWidth, startWidth + deltaX))
      setCurrentWidth(newWidth)
      onResize?.(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [currentWidth, minimumWidth, maximumWidth, onResize])

  const handleDoubleClick = useCallback(() => {
    onReset?.()
  }, [onReset])

  return (
    <div
      ref={containerRef}
      className="resizable-container"
      style={{ width: `${currentWidth}px` }}
      aria-label={description}
    >
      {children}
      <div
        className={`resize-handle ${isResizing ? 'resizing' : ''}`}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sidebar"
      />
    </div>
  )
}
