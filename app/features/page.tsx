"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import AnimatedHero from "@/components/AnimatedHero";
import { getAssetPath } from "@/lib/assetPath";
import {
  IconArrowRight,
  IconBrain,
  IconCheckSquare,
  IconFileText,
  IconGitBranch,
  IconLock,
  IconServer,
  IconSparkles,
  IconUsers,
  IconZap,
  IconPlus,
  IconAntiprism,
  IconChevronDown,
} from "@/components/Icons";

type IconType = typeof IconUsers;
type SceneVariant = "collab" | "ai" | "proof";

const GITHUB_REPO = "https://github.com/lopkiloinm/antiprism";

const NAV_ITEMS = [
  { label: "Why Antiprism", href: "#why" },
  { label: "Product", href: "#product" },
  { label: "Included", href: "#included" },
] as const;

const VALUE_CARDS: Array<{
  title: string;
  description: string;
  Icon: IconType;
}> = [
  {
    title: "A calm workspace for technical writing",
    description:
      "Draft, compile, collaborate, and ship from a single local-first environment instead of stitching tools together.",
    Icon: IconFileText,
  },
  {
    title: "Project-aware AI, not a side chatbot",
    description:
      "Run browser-native ONNX models that can reason about the manuscript, inspect images, and help with revisions in context.",
    Icon: IconBrain,
  },
  {
    title: "Local control from first draft to export",
    description:
      "Keep files on-device, compile locally, use Git when you want it, and move projects as folders or ZIPs without lock-in.",
    Icon: IconLock,
  },
] as const;

const FEATURE_ROWS: Array<{
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
  variant: SceneVariant;
  reverse?: boolean;
}> = [
  {
    eyebrow: "Step 1: Draft",
    title: "Draft together in real time",
    description:
      "Share a secure project link and collaborate instantly. Teammates connect via peer-to-peer WebRTC, syncing documents, file trees, and presence without relying on a central backend.",
    points: [
      "Zero-configuration peer-to-peer sync via Yjs",
      "Live multi-cursor editing and presence",
      "No account or central cloud backend required",
    ],
    variant: "collab",
  },
  {
    eyebrow: "Step 2: AI Assistance",
    title: "Project-aware AI in your browser",
    description:
      "Run state-of-the-art models entirely locally. Liquid's LFM2.5-1.2B Thinking, NVIDIA's Nemotron 3 Nano 4B, and Boss Zhipin's Nanbeige4.1-3B power deep reasoning, while Alibaba's Qwen3.5-0.8B and Liquid's LFM2.5-1.6B inspect images natively without cloud APIs.",
    points: [
      "Browser-native ONNX model execution",
      "Full privacy: code and data never leave your device",
      "Context-aware suggestions based on your document",
    ],
    variant: "ai",
    reverse: true,
  },
  {
    eyebrow: "Step 3: Compile & Version",
    title: "Compile locally, version properly",
    description:
      "Generate beautiful PDFs instantly with the built-in local WASM engine. When you are ready, track your changes cleanly using the fully integrated, familiar Git version control panel.",
    points: [
      "Instant offline PDF compilation (LaTeX and Typst)",
      "Built-in Git for robust version control",
      "Clear line-by-line diffs for every tracked file",
    ],
    variant: "proof",
  },
] as const;

const INCLUDED_LEFT = [
  "Unlimited collaborators",
  "Project-wide live sync",
  "Custom signaling URLs",
  "Local compile",
  "Git built in",
] as const;

const INCLUDED_RIGHT = [
  "Browser-native ONNX AI",
  "Vision-ready models",
  "Import and export full projects",
  "Open LaTeX and Typst workflows",
  "No account required",
] as const;

const SUPPORTED_FEATURES = [
  "Local PDF Compilation",
  "Yjs Real-time Sync",
  "Browser-native LLMs",
  "Vision Models",
  "Git Versioning",
] as const;

function SurfaceChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-black/10 bg-white/72 px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-[0_8px_30px_rgba(70,110,170,0.08)] backdrop-blur">
      {label}
    </span>
  );
}

function HeroStage() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="mx-auto mt-16 max-w-5xl px-6">
      <div className="mx-auto mb-6 flex w-fit gap-2 rounded-full border border-zinc-200 bg-white/50 p-1 shadow-sm backdrop-blur-md">
        {["Editor & AI", "Collaboration", "Literature"].map((tab, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
              activeTab === i
                ? "bg-white text-zinc-900 shadow-sm border border-zinc-200"
                : "border border-transparent text-zinc-600 hover:text-zinc-900 hover:bg-white/50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-[38px] border border-white/70 bg-white/55 p-4 shadow-[0_35px_120px_rgba(103,142,196,0.16)] backdrop-blur-xl sm:p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(163,205,255,0.4),transparent_30%),radial-gradient(circle_at_82%_20%,rgba(196,228,255,0.4),transparent_32%),radial-gradient(circle_at_50%_72%,rgba(255,214,244,0.3),transparent_28%),radial-gradient(circle_at_78%_78%,rgba(126,175,255,0.3),transparent_24%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.52),rgba(255,255,255,0.08))]" />

        <div className="relative overflow-hidden rounded-[30px] border border-zinc-200 bg-white/96 shadow-[0_40px_100px_rgba(10,16,28,0.08)]">
          <div className="flex h-12 items-center gap-2 border-b border-zinc-200 px-4 text-sm text-zinc-500">
            <span className="h-3 w-3 rounded-full bg-zinc-200" />
            <span className="h-3 w-3 rounded-full bg-zinc-200" />
            <span className="h-3 w-3 rounded-full bg-zinc-200" />
            <div className="ml-4 flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-zinc-700">
              <span>main.tex</span>
            </div>
          </div>

          <div className="flex flex-col md:grid md:min-h-[420px] md:grid-cols-[0.9fr,1.7fr,1fr]">
            <div className="hidden border-r border-zinc-200 bg-zinc-50/50 p-4 md:block">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Project</div>
              <div className="mt-4 space-y-2 text-sm text-zinc-600">
                <div className="rounded-xl bg-white px-3 py-2 font-medium text-zinc-900 shadow-sm border border-zinc-200">main.tex</div>
                <div className="rounded-xl px-3 py-2 hover:bg-zinc-100">refs.bib</div>
                <div className="rounded-xl px-3 py-2 hover:bg-zinc-100">figures/</div>
                <div className="rounded-xl px-3 py-2 hover:bg-zinc-100">appendix/</div>
                <div className="rounded-xl px-3 py-2 hover:bg-zinc-100">notes.typ</div>
              </div>
            </div>

            <div className="flex-1 border-r-0 border-zinc-200 p-4 sm:p-6 overflow-hidden md:border-r">
              <div className="h-full rounded-2xl border border-zinc-200 bg-white p-4 text-left font-mono text-[11px] leading-6 text-zinc-600 shadow-sm sm:text-sm">
                <div className="font-semibold text-blue-600">\\section{"{Results}"}</div>
                <div className="mt-2 text-zinc-800">
                  This implies that black holes have no tidal deformability, while the measured signal remains
                  consistent with the conformal prediction at late times.
                </div>
                <div className="mt-2 font-semibold text-blue-600">
                  \\begin{"{figure}"}[h]
                </div>
                <div className="text-zinc-600">  \\includegraphics{"{plot-02.png}"}</div>
                <div className="text-zinc-600">  \\caption{"{Comparison against the baseline model.}"}</div>
                <div className="font-semibold text-blue-600">\\end{"{figure}"}</div>
                <div className="mt-4 h-px w-full bg-zinc-100" />
                <div className="mt-4 space-y-3">
                  <div className="h-2 rounded-full bg-zinc-100" />
                  <div className="h-2 w-5/6 rounded-full bg-zinc-100" />
                  <div className="h-2 w-3/4 rounded-full bg-zinc-100" />
                </div>
              </div>
            </div>

            <div className="hidden bg-zinc-50/30 p-4 sm:p-5 md:flex md:flex-col md:gap-4 relative">
              {activeTab === 0 && (
                <div className="absolute inset-0 p-5 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300">
                  <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between text-xs font-medium text-zinc-500">
                      <span>Assistant</span>
                      <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-zinc-700">ONNX</span>
                    </div>
                    <div className="mt-4 rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-700 border border-zinc-100">
                      Figure 2 shows a stable step-change near epoch 24. Mention convergence and cite the baseline
                      comparison in Results.
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between text-xs font-medium text-zinc-500">
                      <span>Compile</span>
                      <span className="text-zinc-700">01:14</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-zinc-100">
                      <div className="h-2 w-[76%] rounded-full bg-blue-500" />
                    </div>
                    <div className="mt-3 text-sm text-zinc-500">Local compile complete. No remote compiler queue.</div>
                  </div>
                </div>
              )}

              {activeTab === 1 && (
                <div className="absolute inset-0 p-5 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300">
                  <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between text-xs font-medium text-zinc-500">
                      <span className="flex items-center gap-2">
                        <span className="h-6 w-6 rounded-full bg-[linear-gradient(135deg,#e0e7ff,#a5b4fc)]" />
                        Justin Lubin
                      </span>
                      <span>now</span>
                    </div>
                    <p className="mt-4 text-sm text-zinc-800 leading-relaxed">
                      This reads well overall. I left a small inline suggestion where the example could land more clearly.
                    </p>
                    <div className="mt-4 border-t border-zinc-100 pt-3 text-xs text-zinc-500">
                      Share links can securely carry the server parameter for P2P setup.
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 2 && (
                <div className="absolute inset-0 p-5 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 mb-1">Literature Search</div>
                  <div className="space-y-3">
                    <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
                      <p className="text-sm font-medium text-zinc-900 leading-snug">Hidden conformal symmetry of the Kerr black hole</p>
                      <p className="mt-1.5 text-xs text-zinc-500">Phys. Rev. D 82, 024008</p>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
                      <p className="text-sm font-medium text-zinc-900 leading-snug">Perturbations of a Rotating Black Hole.</p>
                      <p className="mt-1.5 text-xs text-zinc-500">ApJ 185 (Oct., 1973)</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MockupWindow({
  children,
  className = "",
  headerCenter,
  headerRight,
}: {
  children: React.ReactNode;
  className?: string;
  headerCenter?: React.ReactNode;
  headerRight?: React.ReactNode;
}) {
  return (
    <div className={`relative z-10 w-full max-w-[420px] sm:max-w-[460px] rounded-[20px] border border-white/60 bg-white/80 shadow-[0_24px_80px_rgba(20,40,70,0.08)] backdrop-blur-xl overflow-hidden flex flex-col ${className}`}>
      {/* Window Header */}
      <div className="flex min-h-[42px] w-full items-center justify-between border-b border-white/40 bg-white/40 px-3 sm:px-4 py-2 gap-2">
        <div className="flex gap-1.5 shrink-0 items-center">
          <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f56] shadow-sm border border-black/10" />
          <div className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e] shadow-sm border border-black/10" />
          <div className="h-2.5 w-2.5 rounded-full bg-[#27c93f] shadow-sm border border-black/10" />
        </div>
        {headerCenter && (
          <div className="flex justify-center items-center shrink min-w-0">
            {headerCenter}
          </div>
        )}
        <div className="flex items-center justify-end shrink-0 min-w-[40px]">
          {headerRight}
        </div>
      </div>
      {/* Window Body */}
      <div className="flex flex-col flex-1 relative">
        {children}
      </div>
    </div>
  );
}

function FeatureScene({ variant }: { variant: SceneVariant }) {
  if (variant === "collab") {
    return (
      <div className="relative min-h-[360px] sm:min-h-[400px] py-8 sm:py-10 px-4 sm:px-8 overflow-hidden rounded-[34px] border border-[#d7e5f8] bg-[linear-gradient(135deg,#e0f2fe,#dbeafe_45%,#e0f2fe)] shadow-[0_28px_100px_rgba(108,155,213,0.12)] flex items-center justify-center">
        <div className="landing-hero-aura absolute inset-[-15%] opacity-70 bg-[radial-gradient(circle_at_20%_25%,rgba(255,255,255,0.6),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.4),transparent_40%)]" />
        
        <div className="relative w-full max-w-[440px]">
          <MockupWindow 
            headerCenter={
              <span className="text-[11px] font-semibold text-zinc-500 truncate px-2">introduction.tex</span>
            }
            headerRight={
              <div className="flex -space-x-1.5">
                <div className="h-5 w-5 rounded-full border-[1.5px] border-white bg-indigo-100 flex items-center justify-center text-[8px] font-bold text-indigo-600 shadow-sm z-20 relative">AL</div>
                <div className="h-5 w-5 rounded-full border-[1.5px] border-white bg-emerald-100 flex items-center justify-center text-[8px] font-bold text-emerald-600 shadow-sm z-10 relative">ML</div>
                <div className="h-5 w-5 rounded-full border-[1.5px] border-white bg-rose-100 flex items-center justify-center text-[8px] font-bold text-rose-600 shadow-sm z-0 relative">JL</div>
              </div>
            }
          >
            <div className="flex flex-col p-4 sm:p-6 font-mono text-[11px] sm:text-[12px] leading-relaxed text-zinc-500 bg-white/50 h-full min-h-[220px]">
              <div className="flex-1">
                <div className="flex">
                  <span className="w-6 sm:w-8 shrink-0 text-zinc-400 select-none">42</span>
                  <span className="text-[#a626a4] font-medium break-all">\\section<span className="text-[#50a14f]">{"{Results}"}</span></span>
                </div>
                <div className="flex mt-2">
                  <span className="w-6 sm:w-8 shrink-0 text-zinc-400 select-none">43</span>
                  <span className="text-zinc-700 break-words">
                    The models show strong performance on
                    <span className="bg-emerald-100/80 text-emerald-900 rounded-sm px-1 py-0.5 mx-1 font-medium border border-emerald-200/50 shadow-sm">
                      the validation set
                    </span>
                    across all metrics.
                  </span>
                </div>
                <div className="flex mt-2 mb-6">
                  <span className="w-6 sm:w-8 shrink-0 text-zinc-400 select-none">44</span>
                  <span className="text-zinc-700 truncate">Particularly in zero-shot</span>
                </div>
              </div>

              {/* WebRTC inline badge inside Mockup */}
              <div className="mt-4 self-end rounded-xl border border-white/80 bg-white/95 p-2 sm:p-2.5 shadow-sm flex items-center gap-2">
                <div className="relative flex h-2.5 w-2.5 items-center justify-center shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[9px] sm:text-[10px] font-bold text-zinc-900 uppercase tracking-wide leading-none mb-0.5">WebRTC Sync</span>
                  <span className="text-[8px] sm:text-[9px] text-zinc-500 font-medium leading-none">3 peers connected</span>
                </div>
              </div>
            </div>
          </MockupWindow>
        </div>
      </div>
    );
  }

  if (variant === "ai") {
    return (
      <div className="relative min-h-[360px] sm:min-h-[400px] py-8 sm:py-10 px-4 sm:px-8 overflow-hidden rounded-[34px] border border-[#d7e5f8] bg-[linear-gradient(135deg,#e0f2fe,#dbeafe_45%,#e0f2fe)] shadow-[0_28px_100px_rgba(108,155,213,0.12)] flex items-center justify-center">
        <div className="landing-hero-aura absolute inset-[-15%] opacity-80 bg-[radial-gradient(circle_at_22%_30%,rgba(255,255,255,0.6),transparent_40%),radial-gradient(circle_at_78%_75%,rgba(255,222,244,0.4),transparent_40%)]" />
        
        <div className="relative w-full max-w-[440px]">
          <MockupWindow
            headerCenter={
              <span className="text-[11px] font-semibold text-zinc-500 flex items-center gap-1.5 truncate px-2">
                <span className="truncate">Browser AI Assistant</span>
              </span>
            }
          >
            <div className="flex flex-col p-4 sm:p-5 bg-white/50 min-h-[240px] h-full">
              <div className="flex justify-end w-full pl-6 sm:pl-10 mb-4">
                <div className="rounded-2xl rounded-tr-[4px] bg-blue-500 px-3 py-2 text-[11px] sm:text-[12px] leading-relaxed text-white shadow-md font-medium break-words">
                  Summarize methodology.
                </div>
              </div>
              <div className="rounded-2xl rounded-tl-[4px] border border-white/80 bg-white/95 p-3 sm:p-4 shadow-sm flex flex-col gap-2.5 mr-4 sm:mr-8 mb-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-blue-600 flex items-center justify-center bg-blue-50 p-1.5 rounded-full shrink-0"><span className="scale-100"><IconBrain /></span></span>
                    <span className="text-[11px] sm:text-[12px] font-bold text-zinc-800 truncate">ONNX LFM-1.2B</span>
                  </div>
                  <span className="shrink-0 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-zinc-500">Local</span>
                </div>
                <div className="text-[11px] sm:text-[12px] leading-relaxed text-zinc-600 pl-1 break-words">
                  Double-blind approach used. State the <code className="bg-zinc-100 text-zinc-800 px-1 py-0.5 rounded font-mono text-[10px]">control group</code> conditions.
                </div>
                <div className="flex flex-wrap gap-1.5 pl-1 mt-0.5">
                  <button className="rounded-full border border-zinc-200/80 bg-white px-2.5 py-1 text-[10px] font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 transition-colors">Draft addition</button>
                  <button className="rounded-full border border-zinc-200/80 bg-white px-2.5 py-1 text-[10px] font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 transition-colors">Literature</button>
                </div>
              </div>
              
              {/* Inline Chat input box */}
              <div className="mt-auto rounded-2xl border border-white/80 bg-white/95 p-1.5 shadow-sm flex items-center gap-2">
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0 hover:bg-blue-100 transition-colors cursor-pointer">
                  <span className="text-blue-500 scale-75 sm:scale-90 flex items-center justify-center"><IconPlus /></span>
                </div>
                <div className="flex-1 text-[11px] sm:text-[12px] text-zinc-400 truncate px-1">Ask anything...</div>
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-zinc-900 text-white flex items-center justify-center shadow-sm hover:bg-zinc-800 transition-colors cursor-pointer shrink-0">
                  <span className="scale-75 flex items-center justify-center"><IconArrowRight /></span>
                </div>
              </div>
            </div>
          </MockupWindow>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[360px] sm:min-h-[400px] py-8 sm:py-10 px-4 sm:px-8 overflow-hidden rounded-[34px] border border-[#d7e5f8] bg-[linear-gradient(135deg,#e0f2fe,#dbeafe_45%,#e0f2fe)] shadow-[0_28px_100px_rgba(108,155,213,0.12)] flex items-center justify-center">
      <div className="landing-hero-aura absolute inset-[-15%] opacity-80 bg-[radial-gradient(circle_at_18%_24%,rgba(255,255,255,0.6),transparent_40%),radial-gradient(circle_at_78%_78%,rgba(255,220,235,0.4),transparent_40%)]" />
      
      <div className="relative w-full max-w-[440px]">
        <MockupWindow
          headerCenter={
            <div className="flex items-center gap-1 bg-black/5 p-0.5 rounded-full">
              <span className="bg-white text-zinc-900 shadow-sm rounded-full px-3 py-0.5 text-[10px] font-bold">Files</span>
              <span className="text-zinc-500 hover:text-zinc-700 rounded-full px-3 py-0.5 text-[10px] font-bold cursor-pointer transition-colors">Git</span>
            </div>
          }
        >
          <div className="flex flex-col p-4 sm:p-5 bg-white/50 gap-4 min-h-[240px] h-full">
            {/* Compiler Success Banner */}
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-2.5 sm:p-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-sm shrink-0">
                  <span className="flex items-center justify-center scale-75 sm:scale-90"><IconCheckSquare /></span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] sm:text-[12px] font-bold text-zinc-900 leading-tight truncate">Compile complete</div>
                  <div className="text-[9px] sm:text-[10px] font-medium text-emerald-600 mt-0.5 truncate">Local WASM engine</div>
                </div>
              </div>
              <button className="shrink-0 rounded-full bg-white border border-emerald-200 text-emerald-700 px-3 py-1.5 text-[10px] font-bold shadow-sm hover:bg-emerald-50 transition-colors w-full sm:w-auto mt-1 sm:mt-0">
                View PDF
              </button>
            </div>

            {/* Git / Changes section */}
            <div className="mt-auto rounded-2xl border border-white/80 bg-white/90 shadow-sm overflow-hidden flex flex-col">
              <div className="bg-white/60 border-b border-zinc-100/50 px-3 sm:px-4 py-2 flex items-center justify-between">
                <div className="text-[10px] sm:text-[11px] font-bold text-zinc-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <span className="text-zinc-500 flex items-center justify-center scale-90"><IconGitBranch /></span>
                  Changes
                </div>
                <div className="text-[9px] font-bold text-zinc-500 bg-white px-2 py-0.5 rounded-full border border-zinc-200/60 flex items-center gap-1.5 shadow-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  main
                </div>
              </div>
              <div className="p-2 flex flex-col gap-1.5 bg-white/40">
                <div className="flex items-center justify-between px-2.5 sm:px-3 py-2 rounded-xl bg-white shadow-sm border border-zinc-100/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-blue-500 flex items-center justify-center shrink-0 scale-90"><IconFileText /></span>
                    <span className="text-[11px] text-zinc-800 font-semibold truncate">introduction.tex</span>
                  </div>
                  <div className="flex gap-1 font-mono text-[9px] font-bold shrink-0">
                    <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">+12</span>
                    <span className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">-3</span>
                  </div>
                </div>
                <div className="flex items-center justify-between px-2.5 sm:px-3 py-2 rounded-xl hover:bg-white/60 transition-colors cursor-default">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-zinc-400 flex items-center justify-center shrink-0 scale-90"><IconFileText /></span>
                    <span className="text-[11px] text-zinc-600 font-medium truncate">references.bib</span>
                  </div>
                  <div className="flex gap-1 font-mono text-[9px] font-bold shrink-0">
                    <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">+2</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </MockupWindow>
      </div>
    </div>
  );
}

function FeatureRow({
  eyebrow,
  title,
  description,
  points,
  variant,
  reverse,
}: {
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
  variant: SceneVariant;
  reverse?: boolean;
}) {
  return (
    <section className="grid gap-10 lg:grid-cols-[1.1fr,0.9fr] lg:items-center">
      <div className={reverse ? "lg:order-2" : ""}>
        <FeatureScene variant={variant} />
      </div>
      <div className={reverse ? "lg:order-1" : ""}>
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-zinc-500">{eyebrow}</p>
        <h3 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">{title}</h3>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-zinc-700">{description}</p>
        <div className="mt-6 space-y-3">
          {points.map((point) => (
            <div key={point} className="flex items-start gap-3 text-base text-zinc-800">
              <span className="mt-0.5 text-zinc-900">
                <IconCheckSquare />
              </span>
              <span>{point}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ScrollIndicator({ targetRef }: { targetRef: React.RefObject<HTMLDivElement | null> }) {
  const isInView = useInView(targetRef, { once: true, margin: "-40% 0px -40% 0px" });

  const scrollToAnimation = () => {
    targetRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // Don't show if animation is in view
  if (isInView) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40"
    >
      <button
        onClick={scrollToAnimation}
        className="group relative flex items-center justify-center w-12 h-12 rounded-full border border-black/10 bg-white/72 shadow-[0_10px_30px_rgba(70,110,170,0.08)] backdrop-blur hover:bg-white/90 transition-all duration-300 hover:scale-105"
        aria-label="Scroll to animation"
      >
        <motion.div
          animate={{ y: [0, 4, 0] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="text-zinc-600"
        >
          <IconChevronDown />
        </motion.div>
        <div className="absolute inset-0 rounded-full border border-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </button>
    </motion.div>
  );
}

export default function FeaturesPage() {
  const animationRef = useRef<HTMLDivElement>(null);
  return (
    <div className="h-dvh w-screen overflow-y-auto overflow-x-hidden bg-[#eef2f7] text-zinc-950">
      <header className="sticky top-0 z-50 border-b border-black/5 bg-[#eef2f7]/78 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/features" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-zinc-950">
            <img 
              src={getAssetPath("/associated-press-black.svg")} 
              alt="Antiprism" 
              className="h-7 w-7"
            />
            <span>Antiprism</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm text-zinc-600 md:flex">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-zinc-950">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 transition-colors sm:inline-flex"
            >
              Go to dashboard
            </Link>
            <Link
              href="/new"
              className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-medium text-white shadow-[0_12px_30px_rgba(0,0,0,0.14)] hover:bg-zinc-800 transition-colors"
            >
              Start a new project
              <IconArrowRight />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-x-hidden pb-20 pt-12 sm:pt-16 w-full">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(210,231,255,0.9),transparent_38%),radial-gradient(circle_at_85%_10%,rgba(191,220,255,0.65),transparent_24%),radial-gradient(circle_at_18%_35%,rgba(255,225,242,0.35),transparent_24%)]" />
          <div className="relative mx-auto max-w-5xl px-6 text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/72 px-4 py-2 text-sm text-zinc-600 shadow-[0_10px_30px_rgba(70,110,170,0.08)] backdrop-blur">
              <span className="font-medium text-zinc-900">Local-first scientific writing</span>
              <span className="text-zinc-500">with collaboration and browser-native AI</span>
            </div>
            <h1 className="mx-auto mt-8 max-w-5xl text-5xl font-semibold tracking-tight text-zinc-950 sm:text-7xl">
              Scientific writing, collaboration, and AI in one calm workspace
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-zinc-700 sm:text-xl">
              Draft with peers, compile locally, run ONNX models in-browser, and work with text and images without
              sending your project to a cloud backend.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/new"
                className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-base font-medium text-white shadow-[0_18px_40px_rgba(0,0,0,0.14)]"
              >
                Start a local-first project
                <IconArrowRight />
              </Link>
              <a
                href={GITHUB_REPO}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/72 px-6 py-3 text-base font-medium text-zinc-700 shadow-sm backdrop-blur"
              >
                View GitHub
              </a>
            </div>
            <p className="mt-5 text-sm text-zinc-500">
              Works in the browser. Offline workflows are available after initial asset and model caching.
            </p>
          </div>

          <div className="w-full px-4 sm:px-12 mt-16 max-w-[1600px] mx-auto">
            <div ref={animationRef}>
              <AnimatedHero />
            </div>
          </div>
        </section>

        <section id="why" className="py-24">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center text-4xl font-semibold tracking-tight text-zinc-950 sm:text-6xl">
              Built to accelerate everyday scientific work
            </h2>
            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              {VALUE_CARDS.map(({ title, description, Icon }) => (
                <article
                  key={title}
                  className="rounded-[30px] border border-black/8 bg-white/72 p-8 shadow-[0_20px_70px_rgba(94,129,180,0.08)] backdrop-blur"
                >
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-black/8 bg-[#f8fbff] text-zinc-800 shadow-sm">
                    <Icon />
                  </span>
                  <h3 className="mt-6 text-3xl font-semibold tracking-tight text-zinc-950">{title}</h3>
                  <p className="mt-4 text-lg leading-relaxed text-zinc-700">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="product" className="py-8">
          <div className="mx-auto max-w-6xl px-6">
            <div className="space-y-24">
              {FEATURE_ROWS.map((feature) => (
                <FeatureRow key={feature.title} {...feature} />
              ))}
            </div>
          </div>
        </section>

        <section id="included" className="py-24">
          <div className="mx-auto max-w-5xl px-6 text-center">
            <h2 className="text-4xl font-semibold tracking-tight text-zinc-950 sm:text-6xl">
              A complete workspace for scientific writing
            </h2>
            <p className="mx-auto mt-5 max-w-3xl text-lg leading-relaxed text-zinc-700">
              Antiprism combines collaboration, manuscript-aware AI, local compile, and open project portability in one
              browser-native environment.
            </p>
          </div>

          <div className="mx-auto mt-14 max-w-4xl px-6">
            <div className="overflow-hidden rounded-[34px] border border-black/8 bg-white/72 shadow-[0_24px_80px_rgba(94,129,180,0.08)] backdrop-blur">
              {[0, 1, 2, 3, 4].map((index) => (
                <div key={index} className="grid gap-4 border-b border-black/8 px-6 py-5 last:border-b-0 md:grid-cols-2">
                  <div className="flex items-center gap-3 text-left text-lg text-zinc-900">
                    <IconCheckSquare />
                    <span>{INCLUDED_LEFT[index]}</span>
                  </div>
                  <div className="flex items-center gap-3 text-left text-lg text-zinc-900">
                    <IconCheckSquare />
                    <span>{INCLUDED_RIGHT[index]}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="pb-32 pt-16">
          <div className="mx-auto max-w-5xl px-6">
            <div className="relative overflow-hidden rounded-[40px] border border-zinc-200/50 bg-[linear-gradient(135deg,#f0f9ff,#e0f2fe_44%,#f0f9ff)] px-6 py-20 shadow-[0_35px_120px_rgba(103,142,196,0.12)] sm:px-16 sm:py-24 text-center flex flex-col items-center">
              <div className="landing-hero-aura absolute inset-[-15%] opacity-70 bg-[radial-gradient(circle_at_18%_22%,rgba(255,255,255,0.7),transparent_30%),radial-gradient(circle_at_82%_74%,rgba(255,255,255,0.5),transparent_30%)]" />
              <div className="relative z-10 flex flex-col items-center">
                <div className="flex flex-wrap justify-center gap-2 mb-8">
                  <SurfaceChip label="Local-first" />
                  <SurfaceChip label="Real-time sync" />
                  <SurfaceChip label="Browser-native AI" />
                  <SurfaceChip label="Git integration" />
                </div>

                <h2 className="text-4xl font-semibold tracking-tight text-zinc-950 sm:text-6xl max-w-3xl">
                  Ready to upgrade your scientific writing?
                </h2>
                <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-700">
                  Join researchers drafting, compiling, and reasoning in a single local-first environment. No cloud lock-in, no central servers.
                </p>
                <div className="mt-10 flex flex-wrap justify-center gap-4">
                  <Link
                    href="/new"
                    className="inline-flex items-center gap-2 rounded-full bg-black px-8 py-4 text-base font-medium text-white shadow-[0_18px_40px_rgba(0,0,0,0.14)] hover:bg-zinc-800 transition-colors"
                  >
                    Start a new project
                    <IconArrowRight />
                  </Link>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-8 py-4 text-base font-medium text-zinc-700 shadow-sm backdrop-blur-xl hover:bg-white transition-colors"
                  >
                    Go to dashboard
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Scroll Indicator - always show, will hide based on scroll position */}
      <ScrollIndicator targetRef={animationRef} />

      <footer className="border-t border-black/6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p>Antiprism is a local-first research workspace for collaboration, writing, and browser-native AI.</p>
          <div className="flex items-center gap-5">
            <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer" className="hover:text-zinc-900">
              GitHub
            </a>
            <Link href="/" className="hover:text-zinc-900">
              Dashboard
            </Link>
            <Link href="/new" className="hover:text-zinc-900">
              New project
            </Link>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        .landing-hero-aura {
          animation: landingAura 18s ease-in-out infinite;
          will-change: transform, opacity;
        }

        .landing-camera {
          transform-origin: 50% 50%;
          animation: landingCamera 18s cubic-bezier(0.65, 0.05, 0.36, 1) infinite;
          will-change: transform;
        }

        .landing-float-a,
        .landing-float-b,
        .landing-float-c,
        .landing-pill-row {
          animation: landingFloatA 12s ease-in-out infinite;
          will-change: transform;
        }

        @keyframes landingAura {
          0%,
          100% {
            opacity: 0.82;
            transform: scale(1) translate3d(0, 0, 0);
          }
          50% {
            opacity: 1;
            transform: scale(1.08) translate3d(2%, -2%, 0);
          }
        }

        @keyframes landingCamera {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          22% {
            transform: translate3d(-1.5%, 1.5%, 0) scale(1.04);
          }
          48% {
            transform: translate3d(2.5%, -2%, 0) scale(1.08);
          }
          76% {
            transform: translate3d(-2%, 1%, 0) scale(1.03);
          }
        }

        @keyframes landingFloatA {
          0%,
          100% {
            transform: translate3d(-50%, -50%, 0) rotate(0deg);
          }
          50% {
            transform: translate3d(-50%, -46%, 0) rotate(0deg);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .landing-hero-aura,
          .landing-camera,
          .landing-float-a,
          .landing-float-b,
          .landing-float-c,
          .landing-pill-row {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}
