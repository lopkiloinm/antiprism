"use client";

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

interface ContextMenuState {
  x: number;
  y: number;
  items: ContextMenuItem[];
}

interface ContextMenuContextType {
  showContextMenu: (x: number, y: number, items: ContextMenuItem[]) => void;
  hideContextMenu: () => void;
  isOpen: boolean;
}

const ContextMenuContext = createContext<ContextMenuContextType | null>(null);

export const useContextMenu = () => {
  const context = useContext(ContextMenuContext);
  if (!context) {
    throw new Error('useContextMenu must be used within ContextMenuProvider');
  }
  return context;
};

export const ContextMenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const showContextMenu = useCallback((x: number, y: number, items: ContextMenuItem[]) => {
    // Close any existing context menu first
    setContextMenu(null);
    
    // Small delay to ensure the old menu is fully closed
    setTimeout(() => {
      setContextMenu({ x, y, items });
    }, 0);
  }, []);

  const hideContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Handle clicks outside the context menu
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        hideContextMenu();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        hideContextMenu();
      }
    };

    if (contextMenu) {
      document.addEventListener('mousedown', handleClick);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('mousedown', handleClick);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [contextMenu, hideContextMenu]);

  return (
    <ContextMenuContext.Provider value={{ showContextMenu, hideContextMenu, isOpen: !!contextMenu }}>
      {children}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 w-[180px] rounded border border-[var(--border)] bg-[var(--background)] shadow-xl py-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.items.map((item, index) => (
            <button
              key={index}
              className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-[var(--accent)] transition-colors ${
                item.danger ? 'text-red-500 hover:bg-red-500/10' : ''
              }`}
              onClick={() => {
                item.onClick();
                hideContextMenu();
              }}
            >
              {item.icon && <span className="shrink-0">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </ContextMenuContext.Provider>
  );
};
