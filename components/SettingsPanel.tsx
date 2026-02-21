"use client";

import { useState } from "react";
import {
  getLatexEngine,
  setLatexEngine,
  LATEX_ENGINE_LABELS,
  type LaTeXEngine,
  getEditorFontSize,
  setEditorFontSize,
  EDITOR_FONT_SIZE_LIMITS,
  getEditorTabSize,
  setEditorTabSize,
  EDITOR_TAB_SIZE_LIMITS,
  getEditorLineWrapping,
  setEditorLineWrapping,
  getAutoCompileOnChange,
  setAutoCompileOnChange,
  getAutoCompileDebounceMs,
  setAutoCompileDebounceMs,
  AUTO_COMPILE_DEBOUNCE_LIMITS,
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
  getTheme,
  setTheme,
  THEME_LABELS,
  type Theme,
  resetAllSettingsToDefaults,
  getWebRTCSignalingConfig,
  setWebRTCSignalingConfig,
  type WebRTCSignalingConfig,
} from "@/lib/settings";
import { DEFAULT_PROMPT_ASK } from "@/lib/agent/ask";
import { DEFAULT_PROMPT_CREATE } from "@/lib/agent/create";

interface SettingsPanelProps {
  latexEngine: LaTeXEngine;
  editorFontSize: number;
  editorTabSize: number;
  editorLineWrapping: boolean;
  autoCompileOnChange: boolean;
  autoCompileDebounceMs: number;
  aiMaxNewTokens: number;
  aiTemperature: number;
  aiTopP: number;
  promptAsk: string;
  promptCreate: string;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onLatexEngineChange: (v: LaTeXEngine) => void;
  onEditorFontSizeChange: (v: number) => void;
  onEditorTabSizeChange: (v: number) => void;
  onEditorLineWrappingChange: (v: boolean) => void;
  onAutoCompileOnChangeChange: (v: boolean) => void;
  onAutoCompileDebounceMsChange: (v: number) => void;
  onAiMaxNewTokensChange: (v: number) => void;
  onAiTemperatureChange: (v: number) => void;
  onAiTopPChange: (v: number) => void;
  onPromptAskChange: (v: string) => void;
  onPromptCreateChange: (v: string) => void;
  onWebRTCSignalingConfigChange: (v: WebRTCSignalingConfig) => void;
  /** Called after reset so parent can re-read all settings into state */
  onResetRequested: () => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Label({ id, label, hint }: { id: string; label: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <label htmlFor={id} className="text-sm text-[var(--foreground)]">
        {label}
      </label>
      {hint && <span className="text-xs text-[var(--muted)]">{hint}</span>}
    </div>
  );
}

function Toggle({
  id,
  checked,
  onToggle,
}: {
  id: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
        checked
          ? "bg-[color-mix(in_srgb,var(--accent)_60%,transparent)]"
          : "bg-[color-mix(in_srgb,var(--border)_70%,transparent)]"
      }`}
    >
      <span
        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
          checked ? "left-[22px]" : "left-1"
        }`}
      />
    </button>
  );
}

export function SettingsPanel({
  latexEngine,
  editorFontSize,
  editorTabSize,
  editorLineWrapping,
  autoCompileOnChange,
  autoCompileDebounceMs,
  aiMaxNewTokens,
  aiTemperature,
  aiTopP,
  promptAsk,
  promptCreate,
  theme,
  onThemeChange,
  onLatexEngineChange,
  onEditorFontSizeChange,
  onEditorTabSizeChange,
  onEditorLineWrappingChange,
  onAutoCompileOnChangeChange,
  onAutoCompileDebounceMsChange,
  onAiMaxNewTokensChange,
  onAiTemperatureChange,
  onAiTopPChange,
  onPromptAskChange,
  onPromptCreateChange,
  onWebRTCSignalingConfigChange,
  onResetRequested,
}: SettingsPanelProps) {
  const [webrtcConfig, setWebrtcConfig] = useState<WebRTCSignalingConfig>(getWebRTCSignalingConfig());

  const handleResetAll = () => {
    resetAllSettingsToDefaults();
    onResetRequested();
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-auto p-3 text-left">
      <Section title="Theme">
        <div className="flex flex-col gap-1.5">
          <Label id="settings-theme" label="Color theme" hint="Choose your preferred color scheme." />
          <select
            id="settings-theme"
            value={theme}
            onChange={(e) => {
              const v = e.target.value as Theme;
              setTheme(v);
              onThemeChange(v);
            }}
            className="w-full text-sm rounded bg-[color-mix(in_srgb,var(--border)_18%,transparent)] border border-[var(--border)] text-[var(--foreground)] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[color-mix(in_srgb,var(--accent)_55%,transparent)] cursor-pointer"
          >
            {(Object.keys(THEME_LABELS) as Theme[]).map((t) => (
              <option key={t} value={t}>
                {THEME_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
      </Section>

      <Section title="Compiler">
        <div className="flex flex-col gap-1.5">
          <Label id="settings-latex-engine" label="LaTeX engine" hint="Engine used to compile .tex to PDF." />
          <select
            id="settings-latex-engine"
            value={latexEngine}
            onChange={(e) => {
              const v = e.target.value as LaTeXEngine;
              setLatexEngine(v);
              onLatexEngineChange(v);
            }}
            className="w-full text-sm rounded bg-[color-mix(in_srgb,var(--border)_18%,transparent)] border border-[var(--border)] text-[var(--foreground)] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[color-mix(in_srgb,var(--accent)_55%,transparent)] cursor-pointer"
          >
            {(Object.keys(LATEX_ENGINE_LABELS) as LaTeXEngine[]).map((eng) => (
              <option key={eng} value={eng}>
                {LATEX_ENGINE_LABELS[eng]}
              </option>
            ))}
          </select>
        </div>
      </Section>

      <Section title="Editor">
        <div className="flex flex-col gap-1.5">
          <Label
            id="settings-font-size"
            label="Font size"
            hint={`${EDITOR_FONT_SIZE_LIMITS.min}–${EDITOR_FONT_SIZE_LIMITS.max} px.`}
          />
          <div className="flex items-center gap-2">
            <input
              id="settings-font-size"
              type="range"
              min={EDITOR_FONT_SIZE_LIMITS.min}
              max={EDITOR_FONT_SIZE_LIMITS.max}
              value={editorFontSize}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                setEditorFontSize(v);
                onEditorFontSizeChange(v);
              }}
              className="flex-1 h-2 rounded bg-[color-mix(in_srgb,var(--border)_60%,transparent)] accent-[var(--accent)]"
            />
            <span className="text-sm text-[var(--muted)] w-8 tabular-nums">{editorFontSize}</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label
            id="settings-tab-size"
            label="Tab size"
            hint={`${EDITOR_TAB_SIZE_LIMITS.min}–${EDITOR_TAB_SIZE_LIMITS.max} spaces inserted on Tab.`}
          />
          <div className="flex items-center gap-2">
            <input
              id="settings-tab-size"
              type="range"
              min={EDITOR_TAB_SIZE_LIMITS.min}
              max={EDITOR_TAB_SIZE_LIMITS.max}
              value={editorTabSize}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                setEditorTabSize(v);
                onEditorTabSizeChange(v);
              }}
              className="flex-1 h-2 rounded bg-[color-mix(in_srgb,var(--border)_60%,transparent)] accent-[var(--accent)]"
            />
            <span className="text-sm text-[var(--muted)] w-8 tabular-nums">{editorTabSize}</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Label id="settings-line-wrapping" label="Line wrapping" />
          <Toggle
            id="settings-line-wrapping"
            checked={editorLineWrapping}
            onToggle={() => {
              const next = !editorLineWrapping;
              setEditorLineWrapping(next);
              onEditorLineWrappingChange(next);
            }}
          />
        </div>
      </Section>

      <Section title="Build">
        <div className="flex items-center justify-between gap-2">
          <Label
            id="settings-auto-compile-change"
            label="Auto-compile on change"
            hint="Recompile after edits (debounced)."
          />
          <Toggle
            id="settings-auto-compile-change"
            checked={autoCompileOnChange}
            onToggle={() => {
              const next = !autoCompileOnChange;
              setAutoCompileOnChange(next);
              onAutoCompileOnChangeChange(next);
            }}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label
            id="settings-debounce"
            label="Auto-compile delay (ms)"
            hint={`${AUTO_COMPILE_DEBOUNCE_LIMITS.min}–${AUTO_COMPILE_DEBOUNCE_LIMITS.max} ms.`}
          />
          <div className="flex items-center gap-2">
            <input
              id="settings-debounce"
              type="range"
              min={AUTO_COMPILE_DEBOUNCE_LIMITS.min}
              max={AUTO_COMPILE_DEBOUNCE_LIMITS.max}
              step={100}
              value={autoCompileDebounceMs}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                setAutoCompileDebounceMs(v);
                onAutoCompileDebounceMsChange(v);
              }}
              className="flex-1 h-2 rounded bg-[color-mix(in_srgb,var(--border)_60%,transparent)] accent-[var(--accent)]"
            />
            <span className="text-sm text-[var(--muted)] w-14 tabular-nums">{autoCompileDebounceMs}</span>
          </div>
        </div>
      </Section>

      <Section title="AI">
        <div className="flex flex-col gap-1.5">
          <Label
            id="settings-ai-max-tokens"
            label="Max new tokens"
            hint={`${AI_MAX_NEW_TOKENS_LIMITS.min}–${AI_MAX_NEW_TOKENS_LIMITS.max}.`}
          />
          <div className="flex items-center gap-2">
            <input
              id="settings-ai-max-tokens"
              type="range"
              min={AI_MAX_NEW_TOKENS_LIMITS.min}
              max={AI_MAX_NEW_TOKENS_LIMITS.max}
              step={128}
              value={aiMaxNewTokens}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                setAiMaxNewTokens(v);
                onAiMaxNewTokensChange(v);
              }}
              className="flex-1 h-2 rounded bg-[color-mix(in_srgb,var(--border)_60%,transparent)] accent-[var(--accent)]"
            />
            <span className="text-sm text-[var(--muted)] w-12 tabular-nums">{aiMaxNewTokens}</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label id="settings-ai-temperature" label="Temperature" hint="Higher = more random." />
          <div className="flex items-center gap-2">
            <input
              id="settings-ai-temperature"
              type="range"
              min={AI_TEMPERATURE_LIMITS.min * 100}
              max={AI_TEMPERATURE_LIMITS.max * 100}
              step={5}
              value={Math.round(aiTemperature * 100)}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10) / 100;
                setAiTemperature(v);
                onAiTemperatureChange(v);
              }}
              className="flex-1 h-2 rounded bg-[color-mix(in_srgb,var(--border)_60%,transparent)] accent-[var(--accent)]"
            />
            <span className="text-sm text-[var(--muted)] w-10 tabular-nums">{aiTemperature.toFixed(2)}</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label id="settings-ai-top-p" label="Top-p (nucleus)" hint="Sampling threshold." />
          <div className="flex items-center gap-2">
            <input
              id="settings-ai-top-p"
              type="range"
              min={AI_TOP_P_LIMITS.min * 100}
              max={AI_TOP_P_LIMITS.max * 100}
              step={5}
              value={Math.round(aiTopP * 100)}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10) / 100;
                setAiTopP(v);
                onAiTopPChange(v);
              }}
              className="flex-1 h-2 rounded bg-[color-mix(in_srgb,var(--border)_60%,transparent)] accent-[var(--accent)]"
            />
            <span className="text-sm text-[var(--muted)] w-10 tabular-nums">{aiTopP.toFixed(2)}</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label
            id="settings-prompt-ask"
            label="Ask mode system prompt"
            hint="Leave empty to use default. Defines how the AI behaves in Ask mode."
          />
          <textarea
            id="settings-prompt-ask"
            value={promptAsk}
            onChange={(e) => {
              setPromptAsk(e.target.value);
              onPromptAskChange(e.target.value);
            }}
            placeholder={DEFAULT_PROMPT_ASK}
            rows={4}
            className="w-full text-sm rounded bg-[color-mix(in_srgb,var(--border)_18%,transparent)] border border-[var(--border)] text-[var(--foreground)] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[color-mix(in_srgb,var(--accent)_55%,transparent)] placeholder-[var(--muted)] resize-y min-h-[80px]"
          />
          <button
            type="button"
            onClick={() => {
              setPromptAsk("");
              onPromptAskChange("");
            }}
            className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            Restore default
          </button>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label
            id="settings-prompt-create"
            label="Create mode system prompt"
            hint="Leave empty to use default. Defines how the AI writes new documents."
          />
          <textarea
            id="settings-prompt-create"
            value={promptCreate}
            onChange={(e) => {
              setPromptCreate(e.target.value);
              onPromptCreateChange(e.target.value);
            }}
            placeholder={DEFAULT_PROMPT_CREATE}
            rows={4}
            className="w-full text-sm rounded bg-[color-mix(in_srgb,var(--border)_18%,transparent)] border border-[var(--border)] text-[var(--foreground)] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[color-mix(in_srgb,var(--accent)_55%,transparent)] placeholder-[var(--muted)] resize-y min-h-[80px]"
          />
          <button
            type="button"
            onClick={() => {
              setPromptCreate("");
              onPromptCreateChange("");
            }}
            className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            Restore default
          </button>
        </div>
      </Section>

      <Section title="WebRTC Collaboration">
        <div className="flex flex-col gap-1.5">
          <Label
            id="settings-webrtc-enabled"
            label="Enable real-time collaboration"
            hint="Allow other users to edit documents with you via WebRTC."
          />
          <Toggle
            id="settings-webrtc-enabled"
            checked={webrtcConfig.enabled}
            onToggle={() => {
              const newConfig = { ...webrtcConfig, enabled: !webrtcConfig.enabled };
              setWebrtcConfig(newConfig);
              setWebRTCSignalingConfig(newConfig);
              onWebRTCSignalingConfigChange(newConfig);
            }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label
            id="settings-webrtc-servers"
            label="Custom signaling servers"
            hint="WebSocket URLs for WebRTC signaling (one per line). Leave empty to use public servers."
          />
          <textarea
            id="settings-webrtc-servers"
            value={webrtcConfig.customServers.join('\n')}
            onChange={(e) => {
              const servers = e.target.value.split('\n').filter(s => s.trim());
              const newConfig = { ...webrtcConfig, customServers: servers };
              setWebrtcConfig(newConfig);
              setWebRTCSignalingConfig(newConfig);
              onWebRTCSignalingConfigChange(newConfig);
            }}
            placeholder="wss://your-signaling-server.com:4444&#10;wss://backup-server.com"
            rows={3}
            className="w-full text-sm rounded bg-[color-mix(in_srgb,var(--border)_18%,transparent)] border border-[var(--border)] text-[var(--foreground)] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[color-mix(in_srgb,var(--accent)_55%,transparent)] placeholder-[var(--muted)] resize-y min-h-[60px] font-mono"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label
            id="settings-webrtc-password"
            label="Signaling password (optional)"
            hint="Encrypts signaling traffic. Must be the same for all collaborators."
          />
          <input
            id="settings-webrtc-password"
            type="password"
            value={webrtcConfig.password}
            onChange={(e) => {
              const newConfig = { ...webrtcConfig, password: e.target.value };
              setWebrtcConfig(newConfig);
              setWebRTCSignalingConfig(newConfig);
              onWebRTCSignalingConfigChange(newConfig);
            }}
            placeholder="Optional encryption password"
            className="w-full text-sm rounded bg-[color-mix(in_srgb,var(--border)_18%,transparent)] border border-[var(--border)] text-[var(--foreground)] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[color-mix(in_srgb,var(--accent)_55%,transparent)] placeholder-[var(--muted)]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label
            id="settings-webrtc-max-connections"
            label="Maximum peer connections"
            hint={`Maximum number of users that can connect (1-100). Default: ${webrtcConfig.maxConnections}`}
          />
          <input
            id="settings-webrtc-max-connections"
            type="number"
            min="1"
            max="100"
            value={webrtcConfig.maxConnections}
            onChange={(e) => {
              const value = Math.max(1, Math.min(100, parseInt(e.target.value) || 35));
              const newConfig = { ...webrtcConfig, maxConnections: value };
              setWebrtcConfig(newConfig);
              setWebRTCSignalingConfig(newConfig);
              onWebRTCSignalingConfigChange(newConfig);
            }}
            className="w-full text-sm rounded bg-[color-mix(in_srgb,var(--border)_18%,transparent)] border border-[var(--border)] text-[var(--foreground)] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[color-mix(in_srgb,var(--accent)_55%,transparent)] placeholder-[var(--muted)]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="text-xs text-[var(--muted)] p-2 rounded bg-[color-mix(in_srgb,var(--border)_10%,transparent)]">
            <p className="font-medium mb-1">WebRTC Collaboration Tips:</p>
            <ul className="space-y-0.5 text-xs">
              <li>Share the project URL with collaborators to connect</li>
              <li>Works best with 2-10 users per project</li>
              <li>Custom servers provide better privacy and reliability</li>
              <li>Password protects signaling traffic, not the documents themselves</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section title="Reset">
        <p className="text-xs text-[var(--muted)] mb-2">
          Restore all settings to their default values. This cannot be undone.
        </p>
        <button
          type="button"
          onClick={handleResetAll}
          className="px-3 py-2 text-sm rounded bg-[color-mix(in_srgb,var(--border)_22%,transparent)] border border-[var(--border)] text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] transition-colors"
        >
          Reset all to defaults
        </button>
      </Section>
    </div>
  );
}
