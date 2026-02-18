"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getTheme, setTheme, type Theme } from "@/lib/settings";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => getTheme());

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    setThemeState(newTheme);
  };

  useEffect(() => {
    // Apply theme class to document
    const root = document.documentElement;
    root.classList.remove("theme-light", "theme-dark", "theme-dark-purple", "theme-sepia");
    root.classList.add(`theme-${theme}`);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleThemeChange }}>
      {children}
    </ThemeContext.Provider>
  );
}
