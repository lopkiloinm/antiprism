"use client";

import { useEffect, useCallback } from "react";

interface KeyboardShortcutOptions {
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  key: string;
  action: () => void;
  preventDefault?: boolean;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcutOptions[]) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    for (const shortcut of shortcuts) {
      const {
        ctrlKey = false,
        metaKey = false,
        shiftKey = false,
        altKey = false,
        key,
        action,
        preventDefault = true,
      } = shortcut;

      if (
        event.ctrlKey === ctrlKey &&
        event.metaKey === metaKey &&
        event.shiftKey === shiftKey &&
        event.altKey === altKey &&
        event.key.toLowerCase() === key.toLowerCase()
      ) {
        if (preventDefault) {
          event.preventDefault();
        }
        action();
        break;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);
}
