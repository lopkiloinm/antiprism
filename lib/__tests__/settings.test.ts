/**
 * Tests for app settings (localStorage-backed).
 * Verifies get/set for compiler, editor, build, and AI settings.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getLatexEngine,
  setLatexEngine,
  LATEX_ENGINE_LABELS,
  getEditorFontSize,
  setEditorFontSize,
  EDITOR_FONT_SIZE_LIMITS,
  getEditorTabSize,
  setEditorTabSize,
  getEditorLineWrapping,
  setEditorLineWrapping,
  getAutoCompileOnChange,
  setAutoCompileOnChange,
  getAiMaxNewTokens,
  setAiMaxNewTokens,
  AI_MAX_NEW_TOKENS_LIMITS,
  getAiTemperature,
  setAiTemperature,
  AI_TEMPERATURE_LIMITS,
  getAiTopP,
  setAiTopP,
  AI_TOP_P_LIMITS,
  getPromptAsk,
  setPromptAsk,
  getPromptCreate,
  setPromptCreate,
  getAutoCompileDebounceMs,
  setAutoCompileDebounceMs,
  AUTO_COMPILE_DEBOUNCE_LIMITS,
  resetAllSettingsToDefaults,
} from "../settings";

describe("settings", () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
    const mockLocalStorage = {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        for (const k of Object.keys(storage)) delete storage[k];
      },
      get length() {
        return Object.keys(storage).length;
      },
      key: (i: number) => Object.keys(storage)[i] ?? null,
    };
    vi.stubGlobal("localStorage", mockLocalStorage);
    vi.stubGlobal("window", { localStorage: mockLocalStorage });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("LaTeX engine", () => {
    it("defaults to xetex", () => {
      expect(getLatexEngine()).toBe("xetex");
    });
    it("persists and returns set value", () => {
      setLatexEngine("luatex");
      expect(getLatexEngine()).toBe("luatex");
      setLatexEngine("pdftex");
      expect(getLatexEngine()).toBe("pdftex");
    });
    it("has labels for all engines", () => {
      expect(LATEX_ENGINE_LABELS.xetex).toBe("XeTeX");
      expect(LATEX_ENGINE_LABELS.luatex).toBe("LuaTeX");
      expect(LATEX_ENGINE_LABELS.pdftex).toBe("pdfTeX");
    });
  });

  describe("Editor font size", () => {
    it("defaults to 14 and is clamped", () => {
      expect(getEditorFontSize()).toBe(14);
      setEditorFontSize(5);
      expect(getEditorFontSize()).toBe(EDITOR_FONT_SIZE_LIMITS.min);
      setEditorFontSize(999);
      expect(getEditorFontSize()).toBe(EDITOR_FONT_SIZE_LIMITS.max);
    });
  });

  describe("Editor tab size", () => {
    it("defaults to 4 and is clamped", () => {
      expect(getEditorTabSize()).toBe(4);
      setEditorTabSize(1);
      expect(getEditorTabSize()).toBe(2);
      setEditorTabSize(10);
      expect(getEditorTabSize()).toBe(8);
    });
  });

  describe("Editor line wrapping", () => {
    it("defaults to true", () => {
      expect(getEditorLineWrapping()).toBe(true);
    });
    it("persists toggle", () => {
      setEditorLineWrapping(false);
      expect(getEditorLineWrapping()).toBe(false);
      setEditorLineWrapping(true);
      expect(getEditorLineWrapping()).toBe(true);
    });
  });

  describe("Auto-compile on change", () => {
    it("defaults to false", () => {
      expect(getAutoCompileOnChange()).toBe(false);
    });
    it("persists toggle", () => {
      setAutoCompileOnChange(true);
      expect(getAutoCompileOnChange()).toBe(true);
    });
  });

  describe("AI max new tokens", () => {
    it("defaults to 1024 and is clamped", () => {
      expect(getAiMaxNewTokens()).toBe(1024);
      setAiMaxNewTokens(100);
      expect(getAiMaxNewTokens()).toBe(AI_MAX_NEW_TOKENS_LIMITS.min);
      setAiMaxNewTokens(9999);
      expect(getAiMaxNewTokens()).toBe(AI_MAX_NEW_TOKENS_LIMITS.max);
    });
  });

  describe("AI temperature", () => {
    it("defaults to 0.7 and is clamped", () => {
      expect(getAiTemperature()).toBe(0.7);
      setAiTemperature(-1);
      expect(getAiTemperature()).toBe(AI_TEMPERATURE_LIMITS.min);
      setAiTemperature(3);
      expect(getAiTemperature()).toBe(AI_TEMPERATURE_LIMITS.max);
    });
  });

  describe("AI top-p", () => {
    it("defaults to 0.9 and is clamped", () => {
      expect(getAiTopP()).toBe(0.9);
      setAiTopP(-0.1);
      expect(getAiTopP()).toBe(AI_TOP_P_LIMITS.min);
      setAiTopP(1.5);
      expect(getAiTopP()).toBe(AI_TOP_P_LIMITS.max);
    });
  });

  describe("Prompts", () => {
    it("default to empty", () => {
      expect(getPromptAsk()).toBe("");
      expect(getPromptCreate()).toBe("");
    });
    it("persist custom prompts", () => {
      setPromptAsk("You are helpful.");
      expect(getPromptAsk()).toBe("You are helpful.");
      setPromptCreate("Write markdown.");
      expect(getPromptCreate()).toBe("Write markdown.");
    });
    it("restoring empty removes from storage", () => {
      setPromptAsk("x");
      setPromptAsk("");
      expect(getPromptAsk()).toBe("");
    });
  });

  describe("Auto-compile debounce", () => {
    it("defaults to 1500 and is clamped", () => {
      expect(getAutoCompileDebounceMs()).toBe(AUTO_COMPILE_DEBOUNCE_LIMITS.default);
      setAutoCompileDebounceMs(100);
      expect(getAutoCompileDebounceMs()).toBe(AUTO_COMPILE_DEBOUNCE_LIMITS.min);
      setAutoCompileDebounceMs(10000);
      expect(getAutoCompileDebounceMs()).toBe(AUTO_COMPILE_DEBOUNCE_LIMITS.max);
    });
  });

  describe("Reset all", () => {
    it("clears all antiprism keys", () => {
      setLatexEngine("luatex");
      setPromptAsk("custom");
      expect(getLatexEngine()).toBe("luatex");
      expect(getPromptAsk()).toBe("custom");
      resetAllSettingsToDefaults();
      expect(getLatexEngine()).toBe("xetex");
      expect(getPromptAsk()).toBe("");
    });
  });
});
