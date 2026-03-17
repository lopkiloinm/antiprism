import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { cjk } from "@streamdown/cjk";
import { BundledTheme } from "shiki";

// Shared Streamdown configuration for both big and small chat
export const streamdownPlugins = {
  code,
  math,
  mermaid,
  cjk,
};

// Shared styling classes for both chat interfaces - using Tailwind utilities
export const chatStreamdownClasses = [
  // Base styling with proper width constraints
  "max-w-full",
  "prose-headings:text-[var(--foreground)]",
  "prose-p:text-[var(--foreground)]", 
  "prose-li:text-[var(--foreground)]",
  "prose-strong:text-[var(--foreground)]",
  "prose-code:text-[var(--foreground)]",
  "prose-pre:bg-[var(--streamdown-code-bg)]",
  "prose-pre:text-[var(--foreground)]",
  "prose-a:text-[var(--accent)]",
  "[&_p]:my-1",
  "[&_ul]:my-1", 
  "[&_ol]:my-1",
  "[&_li]:my-0",
  
  // Line wrapping and overflow handling
  "[&_p]:whitespace-pre-wrap",
  "[&_p]:break-words",
  "[&_p]:overflow-wrap-break-word",
  
  // Table overflow handling
  "[&_table]:w-full",
  "[&_table]:max-w-full",
  "[&_table]:overflow-x-auto",
  "[&_table]:block",
  "[&_table_td]:whitespace-pre-wrap",
  "[&_table_td]:break-words",
  "[&_table_th]:whitespace-pre-wrap",
  "[&_table_th]:break-words",
  
  // Inline code overflow handling
  "[&_code]:whitespace-pre-wrap",
  "[&_code]:break-words",
  "[&_code]:overflow-wrap-break-word",
  
  // Enhanced code block styling using Tailwind
  "[&_pre[data-streamdown='code-block]]:bg-[var(--streamdown-code-bg)]",
  "[&_pre[data-streamdown='code-block]]:border",
  "[&_pre[data-streamdown='code-block]]:border-[var(--streamdown-border)]",
  "[&_pre[data-streamdown='code-block]]:rounded-lg",
  "[&_pre[data-streamdown='code-block]]:overflow-hidden",
  "[&_pre[data-streamdown='code-block]]:font-mono",
  "[&_pre[data-streamdown='code-block]]:text-sm",
  
  // Code block header styling
  "[&_div[data-streamdown='code-block']>div>div]:flex",
  "[&_div[data-streamdown='code-block']>div>div]:items-center",
  "[&_div[data-streamdown='code-block']>div>div]:justify-between",
  "[&_div[data-streamdown='code-block']>div>div]:px-3",
  "[&_div[data-streamdown='code-block']>div>div]:py-2",
  "[&_div[data-streamdown='code-block']>div>div]:bg-[color-mix(in_srgb,var(--border)_8%,transparent)]",
  "[&_div[data-streamdown='code-block']>div>div]:border-b",
  "[&_div[data-streamdown='code-block']>div>div]:border-[var(--streamdown-border)]",
  "[&_div[data-streamdown='code-block']>div>div]:min-h-[2.25rem]",
  
  // Language indicator
  "[&_div[data-streamdown='code-block']>div>div>span]:text-[var(--muted)]",
  "[&_div[data-streamdown='code-block']>div>div>span]:text-xs",
  "[&_div[data-streamdown='code-block']>div>div>span]:font-medium",
  "[&_div[data-streamdown='code-block']>div>div>span]:lowercase",
  
  // Controls container
  "[&_div[data-streamdown='code-block']>div>div>div]:flex",
  "[&_div[data-streamdown='code-block']>div>div>div]:gap-2",
  "[&_div[data-streamdown='code-block']>div>div>div]:items-center",
  
  // Code block buttons
  "[&_div[data-streamdown='code-block']>div>div>div>button]:bg-transparent",
  "[&_div[data-streamdown='code-block']>div>div>div>button]:border",
  "[&_div[data-streamdown='code-block']>div>div>div>button]:border-[var(--streamdown-border)]",
  "[&_div[data-streamdown='code-block']>div>div>div>button]:text-[var(--muted)]",
  "[&_div[data-streamdown='code-block']>div>div>div>button]:px-2",
  "[&_div[data-streamdown='code-block']>div>div>div>button]:py-1.5",
  "[&_div[data-streamdown='code-block']>div>div>div>button]:rounded",
  "[&_div[data-streamdown='code-block']>div>div>div>button]:text-xs",
  "[&_div[data-streamdown='code-block']>div>div>div>button]:flex",
  "[&_div[data-streamdown='code-block']>div>div>div>button]:items-center",
  "[&_div[data-streamdown='code-block']>div>div>div>button]:gap-1",
  "[&_div[data-streamdown='code-block']>div>div>div>button]:h-7",
  "[&_div[data-streamdown='code-block']>div>div>div>button]:transition-colors",
  "[&_div[data-streamdown='code-block']>div>div>div>button:hover]:bg-[var(--accent)]",
  "[&_div[data-streamdown='code-block']>div>div>div>button:hover]:text-white",
  "[&_div[data-streamdown='code-block']>div>div>div>button:hover]:border-[var(--accent)]",
  
  // Code content area
  "[&_div[data-streamdown='code-block']>div>pre]:p-3",
  "[&_div[data-streamdown='code-block']>div>pre]:max-h-[300px]",
  "[&_div[data-streamdown='code-block']>div>pre]:overflow-auto",
  "[&_div[data-streamdown='code-block']>div>pre]:text-sm",
  "[&_div[data-streamdown='code-block']>div>pre]:leading-6",
  
  // Code content
  "[&_div[data-streamdown='code-block']>div>pre>code]:block",
  "[&_div[data-streamdown='code-block']>div>pre>code]:w-full",
  
  // Syntax highlighting that matches CodeMirror exactly
  "[&_div[data-streamdown='code-block']>div>pre>code_.token.keyword]:text-blue-400",
  "[&_div[data-streamdown='code-block']>div>pre>code_.token.string]:text-red-400",
  "[&_div[data-streamdown='code-block']>div>pre>code_.token.number]:text-green-400",
  "[&_div[data-streamdown='code-block']>div>pre>code_.token.function]:text-cyan-400",
  "[&_div[data-streamdown='code-block']>div>pre>code_.token.variable]:text-gray-300",
  "[&_div[data-streamdown='code-block']>div>pre>code_.token.type]:text-yellow-400",
  "[&_div[data-streamdown='code-block']>div>pre>code_.token.comment]:text-gray-500",
  "[&_div[data-streamdown='code-block']>div>pre>code_.token.comment]:italic",
  
  // Light theme syntax highlighting
  "[&.theme-light_&[_div[data-streamdown='code-block']>div>pre>code_.token.keyword]:text-purple-700",
  "[&.theme-light_&[_div[data-streamdown='code-block']>div>pre>code_.token.string]:text-orange-700",
  "[&.theme-light_&[_div[data-streamdown='code-block']>div>pre>code_.token.number]:text-blue-700",
  "[&.theme-light_&[_div[data-streamdown='code-block']>div>pre>code_.token.function]:text-teal-700",
  "[&.theme-light_&[_div[data-streamdown='code-block']>div>pre>code_.token.variable]:text-gray-900",
  "[&.theme-light_&[_div[data-streamdown='code-block']>div>pre>code_.token.type]:text-teal-700",
  "[&.theme-light_&[_div[data-streamdown='code-block']>div>pre>code_.token.comment]:text-gray-600",
  "[&.theme-light_&[_div[data-streamdown='code-block']>div>pre>code_.token.comment]:italic",
].join(" ");

// Theme-aware syntax highlighting configuration
export const getShikiTheme = (isDarkTheme: boolean): [BundledTheme, BundledTheme] => {
  return isDarkTheme 
    ? ['github-dark', 'github-light'] 
    : ['github-light', 'github-dark'];
};

// Custom theme configuration for Streamdown
export const streamdownTheme = {
  // Custom color scheme that matches Antiprism
  colors: {
    background: 'var(--streamdown-code-bg)',
    foreground: 'var(--foreground)',
    muted: 'var(--muted)',
    accent: 'var(--accent)',
    border: 'var(--streamdown-border)',
  }
};
