"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getTheme, setTheme, getEffectiveTheme, type Theme } from "@/lib/settings";

interface ThemeContextType {
  theme: Theme;
  effectiveTheme: "light" | "dark";
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
  const [effectiveTheme, setEffectiveTheme] = useState<"light" | "dark">(() => getEffectiveTheme());

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    setThemeState(newTheme);
    setEffectiveTheme(getEffectiveTheme());
  };

  // Listen for system theme changes when using "system" theme
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      setEffectiveTheme(getEffectiveTheme());
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  useEffect(() => {
    // Apply theme class to document
    const root = document.documentElement;
    root.classList.remove("theme-light", "theme-dark");
    root.classList.add(`theme-${effectiveTheme}`);
  }, [effectiveTheme]);

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, setTheme: handleThemeChange }}>
      {children}
    </ThemeContext.Provider>
  );
}
