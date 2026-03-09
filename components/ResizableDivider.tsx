"use client";

import { useCallback, useRef, useEffect, useState } from "react";

interface ResizableDividerProps {
  /** "horizontal" splits left/right, "vertical" splits top/bottom */
  direction?: "horizontal" | "vertical";
  onResize: (delta: number) => void;
  onResizeEnd?: () => void;
  /** Called on double-click – typically used to collapse/expand a panel */
  onDoubleClick?: () => void;
  /** Called when dragging left past skinny sidebar - should collapse the panel */
  onCollapse?: () => void;
  /** Called when dragging right past certain point - should expand the panel */
  onExpand?: () => void;
  /** Current panel size for conditional styling */
  currentSize?: number;
  /** Threshold below which panel is considered collapsed */
  collapsedThreshold?: number;
}

export function ResizableDivider({ 
  direction = "horizontal", 
  onResize, 
  onResizeEnd, 
  onDoubleClick,
  onCollapse,
  onExpand,
  currentSize,
  collapsedThreshold
}: ResizableDividerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const lastPosRef = useRef(0);
  const dividerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      lastPosRef.current = direction === "horizontal" ? e.clientX : e.clientY;
    },
    [direction]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // No alternative collapse functionality
    },
    []
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const current = direction === "horizontal" ? e.clientX : e.clientY;
      const delta = current - lastPosRef.current;
      lastPosRef.current = current;
      
      // Check if mouse is to the left of the skinny vertical sidebar (icon bar) and collapse if so
      if (direction === "horizontal" && e.clientX < 48) { // Exact width of skinny sidebar (w-12)
        onCollapse?.();
        setIsDragging(false);
        onResizeEnd?.();
        return;
      }
      
      // Check if mouse is far to the right and expand if sidebar is collapsed
      if (direction === "horizontal" && dividerRef.current && 
          e.clientX > dividerRef.current.getBoundingClientRect().right + 100 && 
          (currentSize ?? 0) <= (collapsedThreshold ?? 0)) {
        onExpand?.();
        setIsDragging(false);
        onResizeEnd?.();
        return;
      }
      
      // Only allow normal resizing if sidebar is not collapsed
      if ((currentSize ?? 0) > (collapsedThreshold ?? 0)) {
        onResize(delta);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onResizeEnd?.();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, direction, onResize, onResizeEnd, onCollapse, onExpand]);

  const isHorizontal = direction === "horizontal";
  const isCollapsed = (currentSize ?? 0) <= (collapsedThreshold ?? 0);

  return (
    <div
      ref={dividerRef}
      className={`
        ${isHorizontal ? "w-1 cursor-col-resize hover:w-1.5" : "h-1 cursor-row-resize hover:h-1.5"}
        shrink-0 transition-colors duration-100 group relative
        ${isDragging ? "bg-[var(--accent)]" : "bg-transparent hover:bg-[color-mix(in_srgb,var(--accent)_40%,transparent)]"}
        ${isCollapsed ? "border-l border-r border-transparent" : ""}
      `}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onDoubleClick={onDoubleClick}
      title="Drag to resize · Double-click to collapse"
    >
      <div
        className={`absolute ${
          isHorizontal
            ? "inset-y-0 -left-1 -right-1"
            : "inset-x-0 -top-1 -bottom-1"
        }`}
      />
    </div>
  );
}
