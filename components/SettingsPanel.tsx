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
  getAiContextWindow,
  setAiContextWindow,
  getAiVisionEnabled,
  setAiVisionEnabled,
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
import { type ModelDef } from "@/lib/modelConfig";
import { Select } from "./Select";

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
  aiContextWindow: string;
  aiVisionEnabled: boolean;
  settingsModelId: string;
  settingsModel: ModelDef;
  availableModels: ModelDef[];
  promptAsk: string;
  promptCreate: string;
  theme: Theme;
  webrtcConfig: WebRTCSignalingConfig;
  showHiddenYjsDocs: boolean;
  onLatexEngineChange: (v: LaTeXEngine) => void;
  onEditorFontSizeChange: (v: number) => void;
  onEditorTabSizeChange: (v: number) => void;
  onEditorLineWrappingChange: (v: boolean) => void;
  onAutoCompileOnChangeChange: (v: boolean) => void;
  onAutoCompileDebounceMsChange: (v: number) => void;
  onAiMaxNewTokensChange: (v: number) => void;
  onAiTemperatureChange: (v: number) => void;
  onAiTopPChange: (v: number) => void;
  onAiContextWindowChange: (v: string) => void;
  onAiVisionEnabledChange: (v: boolean) => void;
  onSettingsModelChange: (modelId: string) => void;
  onPromptAskChange: (v: string) => void;
  onPromptCreateChange: (v: string) => void;
  onThemeChange: (v: Theme) => void;
  onWebRTCSignalingConfigChange: (v: WebRTCSignalingConfig) => void;
  onShowHiddenYjsDocsChange: (v: boolean) => void;
  /** Called after reset so parent can re-read all settings into state */
  onResetRequested: () => void;
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--border)_8%,transparent)] shadow-sm">
      <div className="border-b border-[color-mix(in_srgb,var(--border)_70%,transparent)] px-5 py-4">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
        {description ? <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{description}</p> : null}
      </div>
      <div className="space-y-4 px-5 py-5">{children}</div>
    </section>
  );
}

function Label({ id, label, hint }: { id: string; label: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-sm font-medium text-[var(--foreground)]">
        {label}
      </label>
      {hint && <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{hint}</span>}
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
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className={`relative h-7 w-12 rounded-full border transition-all shrink-0 ${
        checked
          ? "border-[color-mix(in_srgb,var(--accent)_45%,transparent)] bg-[color-mix(in_srgb,var(--accent)_70%,transparent)]"
          : "border-[var(--border)] bg-[color-mix(in_srgb,var(--border)_55%,transparent)]"
      }`}
    >
      <span
        className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
          checked ? "left-6" : "left-[3px]"
        }`}
      />
    </button>
  );
}

function Field({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-[color-mix(in_srgb,var(--border)_70%,transparent)] bg-[var(--background)]/70 px-3.5 py-3">{children}</div>;
}

function ToggleRow({
  id,
  label,
  hint,
  checked,
  onToggle,
  disabled = false,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <Field>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Label id={id} label={label} hint={hint} />
        </div>
        <div className={`flex shrink-0 items-center gap-3 ${disabled ? "opacity-50" : ""}`}>
          <span className="text-xs font-medium text-[var(--muted)]">{checked ? "On" : "Off"}</span>
          <Toggle id={id} checked={checked} onToggle={onToggle} />
        </div>
      </div>
    </Field>
  );
}

function SliderField({
  id,
  label,
  hint,
  value,
  displayValue,
  min,
  max,
  step,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  value: number;
  displayValue?: string;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Label id={id} label={label} hint={hint} />
        </div>
        <div className="rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--border)_20%,transparent)] px-2.5 py-1 text-xs font-medium tabular-nums text-[var(--foreground)]">
          {displayValue ?? String(value)}
        </div>
      </div>
      <div className="mt-3">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="h-2 w-full cursor-pointer accent-[var(--accent)]"
        />
        <div className="mt-1.5 flex items-center justify-between text-[11px] tabular-nums text-[var(--muted)]">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </div>
    </Field>
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
  aiContextWindow,
  aiVisionEnabled,
  settingsModelId,
  settingsModel,
  availableModels,
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
  onAiContextWindowChange,
  onAiVisionEnabledChange,
  onSettingsModelChange,
  onPromptAskChange,
  onPromptCreateChange,
  onWebRTCSignalingConfigChange,
  showHiddenYjsDocs,
  onShowHiddenYjsDocsChange,
  onResetRequested,
}: SettingsPanelProps) {
  const [webrtcConfig, setWebrtcConfig] = useState<WebRTCSignalingConfig>(getWebRTCSignalingConfig());
  const aiMaxTokensUiMax = Math.max(AI_MAX_NEW_TOKENS_LIMITS.max, settingsModel.maxNewTokens);
  const aiMaxTokensUiMin = AI_MAX_NEW_TOKENS_LIMITS.min;
  const contextOptions = settingsModel.maxContextTokens > 32768
    ? [
        { value: "32768", label: "32K" },
        { value: String(settingsModel.maxContextTokens), label: `${Math.round(settingsModel.maxContextTokens / 1024)}K` },
      ]
    : [
        { value: String(settingsModel.maxContextTokens), label: `${Math.round(settingsModel.maxContextTokens / 1024)}K` },
      ];

  const handleResetAll = () => {
    resetAllSettingsToDefaults();
    onResetRequested();
  };

  return (
    <div className="h-full min-h-0 overflow-auto bg-[var(--background)] text-left">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-5 md:px-6 md:py-6">
        <div className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--border)_10%,transparent)] px-5 py-5">
          <div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">Settings</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                Adjust appearance, editing, AI, and collaboration preferences for your workspace.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <Section title="Appearance" description="Theme and editor presentation settings that affect day-to-day readability.">
        <Field>
          <Label id="settings-theme" label="Color theme" hint="Choose your preferred color scheme." />
          <Select
            id="settings-theme"
            value={theme}
            onChange={(value) => {
              const newTheme = value as Theme;
              setTheme(newTheme);
              onThemeChange(newTheme);
            }}
            options={Object.entries(THEME_LABELS).map(([value, label]) => ({ value, label }))}
            className="mt-3 !px-3 !py-2.5 !text-sm"
          />
        </Field>
      </Section>

      <Section title="Compiler" description="Control the document engine used when compiling LaTeX sources.">
        <Field>
          <Label id="settings-latex-engine" label="LaTeX engine" hint="Engine used to compile .tex to PDF." />
          <Select
            id="settings-latex-engine"
            value={latexEngine}
            onChange={(value) => {
              const newEngine = value as LaTeXEngine;
              setLatexEngine(newEngine);
              onLatexEngineChange(newEngine);
            }}
            options={Object.entries(LATEX_ENGINE_LABELS).map(([value, label]) => ({ value, label }))}
            className="mt-3 !px-3 !py-2.5 !text-sm"
          />
        </Field>
      </Section>

      <Section title="Editor" description="Keep editing controls large, readable, and easy to scan.">
        <SliderField
          id="settings-font-size"
          label="Font size"
          hint={`${EDITOR_FONT_SIZE_LIMITS.min}–${EDITOR_FONT_SIZE_LIMITS.max} px.`}
          value={editorFontSize}
          displayValue={`${editorFontSize}px`}
          min={EDITOR_FONT_SIZE_LIMITS.min}
          max={EDITOR_FONT_SIZE_LIMITS.max}
          onChange={(v) => {
            setEditorFontSize(v);
            onEditorFontSizeChange(v);
          }}
        />
        <SliderField
          id="settings-tab-size"
          label="Tab size"
          hint={`${EDITOR_TAB_SIZE_LIMITS.min}–${EDITOR_TAB_SIZE_LIMITS.max} spaces inserted on Tab.`}
          value={editorTabSize}
          displayValue={`${editorTabSize} spaces`}
          min={EDITOR_TAB_SIZE_LIMITS.min}
          max={EDITOR_TAB_SIZE_LIMITS.max}
          onChange={(v) => {
            setEditorTabSize(v);
            onEditorTabSizeChange(v);
          }}
        />
        <ToggleRow
          id="settings-line-wrapping"
          label="Line wrapping"
          hint="Wrap long lines instead of forcing horizontal scrolling."
          checked={editorLineWrapping}
          onToggle={() => {
            const next = !editorLineWrapping;
            setEditorLineWrapping(next);
            onEditorLineWrappingChange(next);
          }}
        />
      </Section>

      <Section title="Build" description="Choose how aggressively the preview recompiles while you work.">
        <ToggleRow
          id="settings-auto-compile-change"
          label="Auto-compile on change"
          hint="Recompile after edits using a debounce delay."
          checked={autoCompileOnChange}
          onToggle={() => {
            const next = !autoCompileOnChange;
            setAutoCompileOnChange(next);
            onAutoCompileOnChangeChange(next);
          }}
        />
        <SliderField
          id="settings-debounce"
          label="Auto-compile delay"
          hint={`${AUTO_COMPILE_DEBOUNCE_LIMITS.min}–${AUTO_COMPILE_DEBOUNCE_LIMITS.max} ms.`}
          value={autoCompileDebounceMs}
          displayValue={`${autoCompileDebounceMs} ms`}
          min={AUTO_COMPILE_DEBOUNCE_LIMITS.min}
          max={AUTO_COMPILE_DEBOUNCE_LIMITS.max}
          step={100}
          onChange={(v) => {
            setAutoCompileDebounceMs(v);
            onAutoCompileDebounceMsChange(v);
          }}
        />
      </Section>
        </div>

        <Section title="AI" description="Model-specific behavior, generation limits, and prompt customizations.">
        <Field>
          <Label
            id="settings-ai-model"
            label="Model"
            hint="Choose which model's AI settings to edit. This does not change the active chat model."
          />
          <Select
            id="settings-ai-model"
            value={settingsModelId}
            onChange={(value) => onSettingsModelChange(value)}
            options={availableModels.map((model) => ({ value: model.id, label: model.label }))}
            className="mt-3 !px-3 !py-2.5 !text-sm"
          />
          <div className="mt-3 rounded-xl border border-[color-mix(in_srgb,var(--accent)_18%,transparent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] px-3 py-2 text-xs text-[var(--muted)]">
            Editing stored AI settings for <span className="font-medium text-[var(--foreground)]">{settingsModel.label}</span>
          </div>
        </Field>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SliderField
          id="settings-ai-max-tokens"
          label="Max new tokens"
          hint={`Optional safeguard for ${settingsModel.label}. Default is no app cap; set a value only if you want to limit responses.`}
          value={aiMaxNewTokens}
          displayValue={aiMaxNewTokens === 0 ? "No cap" : String(aiMaxNewTokens)}
          min={aiMaxTokensUiMin}
          max={aiMaxTokensUiMax}
          step={128}
          onChange={(v) => onAiMaxNewTokensChange(v)}
        />
        <SliderField
          id="settings-ai-temperature"
          label="Temperature"
          hint="Higher values produce more varied output."
          value={Math.round(aiTemperature * 100)}
          displayValue={aiTemperature.toFixed(2)}
          min={AI_TEMPERATURE_LIMITS.min * 100}
          max={AI_TEMPERATURE_LIMITS.max * 100}
          step={5}
          onChange={(v) => {
            const next = v / 100;
            setAiTemperature(next);
            onAiTemperatureChange(next);
          }}
        />
        <SliderField
          id="settings-ai-top-p"
          label="Top-p"
          hint="Nucleus sampling threshold."
          value={Math.round(aiTopP * 100)}
          displayValue={aiTopP.toFixed(2)}
          min={AI_TOP_P_LIMITS.min * 100}
          max={AI_TOP_P_LIMITS.max * 100}
          step={5}
          onChange={(v) => {
            const next = v / 100;
            setAiTopP(next);
            onAiTopPChange(next);
          }}
        />
        <Field>
          <Label 
            id="settings-context-window" 
            label="Context window" 
            hint={`Context budget for ${settingsModel.label}. Model max: ${Math.round(settingsModel.maxContextTokens / 1024)}K tokens.`} 
          />
          <Select
            id="settings-context-window"
            value={String(aiContextWindow)}
            onChange={(value) => {
              onAiContextWindowChange(value);
            }}
            options={contextOptions}
            className="mt-3 !px-3 !py-2.5 !text-sm"
          />
        </Field>
        </div>
        <ToggleRow
          id="settings-ai-vision"
          label="Vision processing"
          hint={settingsModel.vision ? `Allow image analysis with ${settingsModel.label}.` : `${settingsModel.label} does not support vision input.`}
          checked={aiVisionEnabled}
          disabled={!settingsModel.vision}
          onToggle={() => {
            if (!settingsModel.vision) return;
            const next = !aiVisionEnabled;
            setAiVisionEnabled(next);
            onAiVisionEnabledChange(next);
          }}
        />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Field>
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
            className="mt-3 min-h-[120px] w-full resize-y rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--border)_18%,transparent)] px-3 py-2.5 text-sm leading-6 text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[color-mix(in_srgb,var(--accent)_55%,transparent)]"
          />
          <button
            type="button"
            onClick={() => {
              setPromptAsk("");
              onPromptAskChange("");
            }}
            className="mt-3 inline-flex rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--muted)] transition-colors hover:bg-[color-mix(in_srgb,var(--border)_35%,transparent)] hover:text-[var(--foreground)]"
          >
            Restore default
          </button>
        </Field>
        <Field>
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
            className="mt-3 min-h-[120px] w-full resize-y rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--border)_18%,transparent)] px-3 py-2.5 text-sm leading-6 text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[color-mix(in_srgb,var(--accent)_55%,transparent)]"
          />
          <button
            type="button"
            onClick={() => {
              setPromptCreate("");
              onPromptCreateChange("");
            }}
            className="mt-3 inline-flex rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--muted)] transition-colors hover:bg-[color-mix(in_srgb,var(--border)_35%,transparent)] hover:text-[var(--foreground)]"
          >
            Restore default
          </button>
        </Field>
        </div>
      </Section>

      <Section title="WebRTC Collaboration" description="Keep collaboration setup clear and separated from day-to-day editor preferences.">
        <ToggleRow
          id="settings-webrtc-enabled"
          label="Enable real-time collaboration"
          hint="Allow other users to edit documents with you via WebRTC."
          checked={webrtcConfig.enabled}
          onToggle={() => {
            const newConfig = { ...webrtcConfig, enabled: !webrtcConfig.enabled };
            setWebrtcConfig(newConfig);
            setWebRTCSignalingConfig(newConfig);
            onWebRTCSignalingConfigChange(newConfig);
          }}
        />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Field>
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
            className="mt-3 min-h-[120px] w-full resize-y rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--border)_18%,transparent)] px-3 py-2.5 font-mono text-sm leading-6 text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[color-mix(in_srgb,var(--accent)_55%,transparent)]"
          />
        </Field>

        <Field>
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
            className="mt-3 w-full rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--border)_18%,transparent)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[color-mix(in_srgb,var(--accent)_55%,transparent)]"
          />
        </Field>

        <Field>
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
            className="mt-3 w-full rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--border)_18%,transparent)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[color-mix(in_srgb,var(--accent)_55%,transparent)]"
          />
        </Field>

        <Field>
          <div className="text-xs text-[var(--muted)]">
            <p className="mb-2 text-sm font-medium text-[var(--foreground)]">Collaboration tips</p>
            <ul className="space-y-2 leading-5">
              <li>Share the project URL with collaborators to connect.</li>
              <li>WebRTC works best with small groups, usually 2-10 users.</li>
              <li>Custom servers improve privacy and reliability.</li>
              <li>Password protects signaling traffic, not the documents themselves.</li>
            </ul>
          </div>
        </Field>
        </div>
      </Section>

      <Section title="Filetree" description="Advanced visibility controls for internal project data.">
        <ToggleRow
          id="settings-show-hidden-yjs-docs"
          label="Show hidden Y.js documents"
          hint="Display internal Y.js documents in the filetree for advanced debugging."
          checked={showHiddenYjsDocs}
          onToggle={() => {
            const next = !showHiddenYjsDocs;
            onShowHiddenYjsDocsChange(next);
          }}
        />
      </Section>

      <Section title="Reset" description="Restore the default app configuration if you want a clean baseline.">
        <Field>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="max-w-xl text-sm leading-6 text-[var(--muted)]">
              Restore all settings to their default values. This affects editor, AI, collaboration, and appearance preferences.
            </p>
            <button
              type="button"
              onClick={handleResetAll}
              className="inline-flex shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--border)_22%,transparent)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)]"
            >
              Reset all to defaults
            </button>
          </div>
        </Field>
      </Section>
      </div>
    </div>
  );
}
