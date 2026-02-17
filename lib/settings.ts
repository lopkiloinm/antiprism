"use client";

const PREFIX = "antiprism.";

// --- LaTeX engine ---
export type LaTeXEngine = "xetex" | "luatex" | "pdftex";

const DEFAULT_ENGINE: LaTeXEngine = "xetex";

export function getLatexEngine(): LaTeXEngine {
  return get("latexEngine", DEFAULT_ENGINE, (v) =>
    v === "xetex" || v === "luatex" || v === "pdftex" ? v : null
  );
}

export function setLatexEngine(engine: LaTeXEngine): void {
  set("latexEngine", engine);
}

export const LATEX_ENGINE_LABELS: Record<LaTeXEngine, string> = {
  xetex: "XeTeX",
  luatex: "LuaTeX",
  pdftex: "pdfTeX",
};

// --- Editor ---
const DEFAULT_FONT_SIZE = 14;
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 24;

export function getEditorFontSize(): number {
  const n = get("editorFontSize", String(DEFAULT_FONT_SIZE), (v) => {
    const x = parseInt(v, 10);
    return !Number.isNaN(x) && x >= MIN_FONT_SIZE && x <= MAX_FONT_SIZE ? String(x) : null;
  });
  return parseInt(n, 10);
}

export function setEditorFontSize(size: number): void {
  const n = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, Math.round(size)));
  set("editorFontSize", String(n));
}

export const EDITOR_FONT_SIZE_LIMITS = { min: MIN_FONT_SIZE, max: MAX_FONT_SIZE } as const;

const DEFAULT_TAB_SIZE = 4;
const MIN_TAB_SIZE = 2;
const MAX_TAB_SIZE = 8;

export function getEditorTabSize(): number {
  const n = get("editorTabSize", String(DEFAULT_TAB_SIZE), (v) => {
    const x = parseInt(v, 10);
    return !Number.isNaN(x) && x >= MIN_TAB_SIZE && x <= MAX_TAB_SIZE ? String(x) : null;
  });
  return parseInt(n, 10);
}

export function setEditorTabSize(size: number): void {
  const n = Math.max(MIN_TAB_SIZE, Math.min(MAX_TAB_SIZE, Math.round(size)));
  set("editorTabSize", String(n));
}

export const EDITOR_TAB_SIZE_LIMITS = { min: MIN_TAB_SIZE, max: MAX_TAB_SIZE } as const;

export function getEditorLineWrapping(): boolean {
  return get("editorLineWrapping", "true", (v) => (v === "true" || v === "false" ? v : null)) === "true";
}

export function setEditorLineWrapping(on: boolean): void {
  set("editorLineWrapping", on ? "true" : "false");
}

// --- Build / Compile ---
// Auto-compile on load is always on (no setting).
// Auto-compile on change: recompile when the document changes (debounced).
export function getAutoCompileOnChange(): boolean {
  const v = get("autoCompileOnChange", "false", (x) => (x === "true" || x === "false" ? x : null));
  return (v as string) === "true";
}

export function setAutoCompileOnChange(on: boolean): void {
  set("autoCompileOnChange", on ? "true" : "false");
}

// --- AI (chat / generation) ---
const AI_MAX_NEW_TOKENS_MIN = 256;
const AI_MAX_NEW_TOKENS_MAX = 2048;
const AI_MAX_NEW_TOKENS_DEFAULT = 1024;

export function getAiMaxNewTokens(): number {
  const n = get(
    "aiMaxNewTokens",
    String(AI_MAX_NEW_TOKENS_DEFAULT),
    (v) => {
      const x = parseInt(v, 10);
      return !Number.isNaN(x) && x >= AI_MAX_NEW_TOKENS_MIN && x <= AI_MAX_NEW_TOKENS_MAX
        ? String(x)
        : null;
    }
  );
  return parseInt(n, 10);
}

export function setAiMaxNewTokens(value: number): void {
  const n = Math.max(
    AI_MAX_NEW_TOKENS_MIN,
    Math.min(AI_MAX_NEW_TOKENS_MAX, Math.round(value))
  );
  set("aiMaxNewTokens", String(n));
}

export const AI_MAX_NEW_TOKENS_LIMITS = {
  min: AI_MAX_NEW_TOKENS_MIN,
  max: AI_MAX_NEW_TOKENS_MAX,
} as const;

const AI_TEMPERATURE_MIN = 0;
const AI_TEMPERATURE_MAX = 2;
const AI_TEMPERATURE_DEFAULT = "0.7";

export function getAiTemperature(): number {
  const v = get("aiTemperature", AI_TEMPERATURE_DEFAULT, (s) => {
    const n = parseFloat(s);
    return !Number.isNaN(n) && n >= AI_TEMPERATURE_MIN && n <= AI_TEMPERATURE_MAX ? s : null;
  });
  return parseFloat(v);
}

export function setAiTemperature(value: number): void {
  const n = Math.max(AI_TEMPERATURE_MIN, Math.min(AI_TEMPERATURE_MAX, Math.round(value * 100) / 100));
  set("aiTemperature", String(n));
}

export const AI_TEMPERATURE_LIMITS = { min: AI_TEMPERATURE_MIN, max: AI_TEMPERATURE_MAX } as const;

const AI_TOP_P_MIN = 0;
const AI_TOP_P_MAX = 1;
const AI_TOP_P_DEFAULT = "0.9";

export function getAiTopP(): number {
  const v = get("aiTopP", AI_TOP_P_DEFAULT, (s) => {
    const n = parseFloat(s);
    return !Number.isNaN(n) && n >= AI_TOP_P_MIN && n <= AI_TOP_P_MAX ? s : null;
  });
  return parseFloat(v);
}

export function setAiTopP(value: number): void {
  const n = Math.max(AI_TOP_P_MIN, Math.min(AI_TOP_P_MAX, Math.round(value * 100) / 100));
  set("aiTopP", String(n));
}

export const AI_TOP_P_LIMITS = { min: AI_TOP_P_MIN, max: AI_TOP_P_MAX } as const;

// --- AI system prompts (empty = use built-in default) ---
const PROMPT_ASK_KEY = "promptAsk";
const PROMPT_CREATE_KEY = "promptCreate";

export function getPromptAsk(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(PREFIX + PROMPT_ASK_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setPromptAsk(value: string): void {
  if (typeof window === "undefined") return;
  try {
    if (value.trim()) localStorage.setItem(PREFIX + PROMPT_ASK_KEY, value);
    else localStorage.removeItem(PREFIX + PROMPT_ASK_KEY);
  } catch {
    /* ignore */
  }
}

export function getPromptCreate(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(PREFIX + PROMPT_CREATE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setPromptCreate(value: string): void {
  if (typeof window === "undefined") return;
  try {
    if (value.trim()) localStorage.setItem(PREFIX + PROMPT_CREATE_KEY, value);
    else localStorage.removeItem(PREFIX + PROMPT_CREATE_KEY);
  } catch {
    /* ignore */
  }
}

// --- Build: auto-compile debounce ---
const AUTO_COMPILE_DEBOUNCE_MIN = 300;
const AUTO_COMPILE_DEBOUNCE_MAX = 5000;
const AUTO_COMPILE_DEBOUNCE_DEFAULT = 1500;

export function getAutoCompileDebounceMs(): number {
  const n = get(
    "autoCompileDebounceMs",
    String(AUTO_COMPILE_DEBOUNCE_DEFAULT),
    (v) => {
      const x = parseInt(v, 10);
      return !Number.isNaN(x) && x >= AUTO_COMPILE_DEBOUNCE_MIN && x <= AUTO_COMPILE_DEBOUNCE_MAX
        ? String(x)
        : null;
    }
  );
  return parseInt(n, 10);
}

export function setAutoCompileDebounceMs(value: number): void {
  const n = Math.max(
    AUTO_COMPILE_DEBOUNCE_MIN,
    Math.min(AUTO_COMPILE_DEBOUNCE_MAX, Math.round(value))
  );
  set("autoCompileDebounceMs", String(n));
}

export const AUTO_COMPILE_DEBOUNCE_LIMITS = {
  min: AUTO_COMPILE_DEBOUNCE_MIN,
  max: AUTO_COMPILE_DEBOUNCE_MAX,
  default: AUTO_COMPILE_DEBOUNCE_DEFAULT,
} as const;

// --- Reset all to defaults ---
export function resetAllSettingsToDefaults(): void {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

// --- Persistence helpers ---
function get<T extends string>(key: string, defaultValue: T, validate: (v: string) => string | null): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const v = localStorage.getItem(PREFIX + key);
    if (v === null) return defaultValue;
    const parsed = validate(v);
    return (parsed ?? defaultValue) as T;
  } catch {
    return defaultValue;
  }
}

function set(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFIX + key, value);
  } catch {
    /* ignore */
  }
}
