"use client";

import { useCallback, useRef, useEffect, useState } from "react";

interface ResizableDividerProps {
  /** "horizontal" splits left/right, "vertical" splits top/bottom */
  direction?: "horizontal" | "vertical";
  onResize: (delta: number) => void;
  onResizeEnd?: () => void;
  /** Called on double-click – typically used to collapse/expand a panel */
  onDoubleClick?: () => void;
}

export function ResizableDivider({ direction = "horizontal", onResize, onResizeEnd, onDoubleClick }: ResizableDividerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const lastPosRef = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      lastPosRef.current = direction === "horizontal" ? e.clientX : e.clientY;
    },
    [direction]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const current = direction === "horizontal" ? e.clientX : e.clientY;
      const delta = current - lastPosRef.current;
      lastPosRef.current = current;
      onResize(delta);
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
  }, [isDragging, direction, onResize, onResizeEnd]);

  const isHorizontal = direction === "horizontal";

  return (
    <div
      className={`
        ${isHorizontal ? "w-1 cursor-col-resize hover:w-1.5" : "h-1 cursor-row-resize hover:h-1.5"}
        shrink-0 transition-colors duration-100 group relative
        ${isDragging ? "bg-[var(--accent)]" : "bg-transparent hover:bg-[color-mix(in_srgb,var(--accent)_40%,transparent)]"}
      `}
      onMouseDown={handleMouseDown}
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
