"use client";

import { useState } from "react";
import Link from "next/link";
import AnimatedHero from "@/components/AnimatedHero";
import {
  IconAntiprism,
  IconArrowRight,
  IconBrain,
  IconCheckSquare,
  IconFileText,
  IconLock,
  IconServer,
  IconSparkles,
  IconUsers,
  IconZap,
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
    eyebrow: "Collaboration",
    title: "Work with unlimited collaborators",
    description:
      "Share a project link, bring teammates onto the right signaling setup, and keep comments, file trees, and editing state live in one room.",
    points: [
      "Peer-to-peer sync over Yjs and WebRTC",
      "Custom signaling URLs for room setup",
      "Project-wide state, not just cursor mirroring",
    ],
    variant: "collab",
  },
  {
    eyebrow: "AI",
    title: "Frontier AI that runs in your browser",
    description:
      "Project-aware AI models run entirely locally. Featuring SOTA browser-ready models from Liquid AI (LFM2.5 1.2B Thinking/Instruct, 1.6B Vision), Alibaba (Qwen3.5 0.8B Multimodal), and Boss Zhipin (Nanbeige4.1 3B Thinking).",
    points: [
      "Thinking chains and instruct models for deep reasoning",
      "Vision-native models for inspecting scientific figures",
      "Complete privacy with zero cloud API dependencies",
    ],
    variant: "ai",
    reverse: true,
  },
  {
    eyebrow: "Workflow",
    title: "Save time with built-in proofreading and formatting",
    description:
      "Compile locally, search literature, manage references, keep Git history, and move full projects without leaving the workspace.",
    points: [
      "Local compile and Git built in",
      "Open LaTeX, Typst, ZIP, and folder workflows",
      "Offline-ready after initial asset and model caching",
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

          <div className="flex flex-col md:grid md:h-[420px] md:grid-cols-[0.9fr,1.7fr,1fr]">
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

function FeatureScene({ variant }: { variant: SceneVariant }) {
  if (variant === "collab") {
    return (
      <div className="relative h-[320px] overflow-hidden rounded-[34px] border border-[#d7e5f8] bg-[linear-gradient(135deg,#e0f2fe,#dbeafe_45%,#e0f2fe)] p-8 shadow-[0_28px_100px_rgba(108,155,213,0.12)]">
        <div className="landing-hero-aura absolute inset-[-15%] opacity-70 bg-[radial-gradient(circle_at_20%_25%,rgba(255,255,255,0.6),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.4),transparent_40%)]" />
        <div className="absolute left-6 top-6 rounded-full border border-black/5 bg-white/90 px-3 py-1 text-xs font-medium text-zinc-700 shadow-sm backdrop-blur">
          2 peers connected
        </div>
        <div className="absolute right-6 top-6 rounded-full border border-black/5 bg-white/90 px-3 py-1 text-xs font-medium text-zinc-700 shadow-sm backdrop-blur">
          Peer-to-Peer Sync
        </div>
        <div className="landing-float-a absolute left-1/2 top-1/2 w-[340px] max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-[30px] border border-zinc-200 bg-white/95 p-5 text-zinc-900 shadow-[0_24px_70px_rgba(11,16,28,0.12)] backdrop-blur">
          <div className="flex items-center gap-3 text-sm font-medium text-zinc-500">
            <span className="h-9 w-9 rounded-full bg-[linear-gradient(135deg,#e0e7ff,#a5b4fc)]" />
            <span>Comments and presence</span>
          </div>
          <p className="mt-4 text-2xl font-medium leading-snug text-zinc-900">
            This reads really well overall. I left one small suggestion where the example could land faster.
          </p>
          <div className="mt-5 rounded-2xl border border-zinc-100 bg-zinc-50/80 px-4 py-3 text-sm text-zinc-600">
            Share links can securely carry signaling parameters for P2P setup.
          </div>
        </div>
      </div>
    );
  }

  if (variant === "ai") {
    return (
      <div className="relative h-[320px] overflow-hidden rounded-[34px] border border-[#d7e5f8] bg-[linear-gradient(135deg,#e0f2fe,#dbeafe_45%,#e0f2fe)] p-4 sm:p-8 shadow-[0_28px_100px_rgba(108,155,213,0.12)]">
        <div className="landing-hero-aura absolute inset-[-15%] opacity-80 bg-[radial-gradient(circle_at_22%_30%,rgba(255,255,255,0.6),transparent_40%),radial-gradient(circle_at_78%_75%,rgba(255,222,244,0.4),transparent_40%)]" />
        <div className="landing-pill-row absolute left-1/2 top-[15%] flex w-[calc(100%-2rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-2 sm:top-[28%] sm:gap-3">
          <div className="whitespace-nowrap rounded-full border border-zinc-200 bg-white/95 px-5 py-3 text-base sm:text-lg font-medium text-zinc-700 shadow-[0_18px_50px_rgba(12,16,28,0.08)] backdrop-blur">
            Summarize
          </div>
          <div className="whitespace-nowrap rounded-full border border-zinc-200 bg-white/95 px-5 py-3 text-base sm:text-lg font-medium text-zinc-700 shadow-[0_18px_50px_rgba(12,16,28,0.08)] backdrop-blur">
            Proof read
          </div>
          <div className="whitespace-nowrap rounded-full border border-zinc-200 bg-white/95 px-5 py-3 text-base sm:text-lg font-medium text-zinc-700 shadow-[0_18px_50px_rgba(12,16,28,0.08)] backdrop-blur">
            Find literature
          </div>
        </div>
        <div className="landing-float-b absolute bottom-6 left-1/2 w-[320px] max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-[28px] border border-zinc-200 bg-white/95 p-4 text-zinc-900 shadow-[0_24px_70px_rgba(10,14,24,0.12)] backdrop-blur sm:bottom-8">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-500">
            <span>Vision-ready assistant</span>
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1">ONNX Model</span>
          </div>
          <p className="mt-3 text-lg font-medium leading-relaxed text-zinc-800">
            Summarize the introduction, then compare Figure 2 with the Results section and suggest one tighter
            caption.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[320px] overflow-hidden rounded-[34px] border border-[#d7e5f8] bg-[linear-gradient(135deg,#e0f2fe,#dbeafe_45%,#e0f2fe)] p-8 shadow-[0_28px_100px_rgba(108,155,213,0.12)]">
      <div className="landing-hero-aura absolute inset-[-15%] opacity-80 bg-[radial-gradient(circle_at_18%_24%,rgba(255,255,255,0.6),transparent_40%),radial-gradient(circle_at_78%_78%,rgba(255,220,235,0.4),transparent_40%)]" />
      <div className="landing-float-c absolute left-1/2 top-1/2 w-[420px] max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-[30px] border border-zinc-200 bg-white/95 p-6 text-zinc-900 shadow-[0_24px_70px_rgba(10,14,24,0.12)] backdrop-blur">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Literature results</div>
        <div className="mt-4 space-y-4">
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-3">
            <p className="font-medium text-zinc-900">Perturbations of a Rotating Black Hole. I. Fundamental Equations</p>
            <p className="mt-1 text-sm text-zinc-500">ApJ 185 (Oct., 1973) 635-648</p>
          </div>
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-3">
            <p className="font-medium text-zinc-900">Hidden conformal symmetry of the Kerr black hole</p>
            <p className="mt-1 text-sm text-zinc-500">Phys. Rev. D 82, 024008</p>
          </div>
          <div className="px-3 text-sm font-medium text-zinc-600">Separation of Variables and Superintegrability</div>
        </div>
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

export default function FeaturesPage() {
  return (
    <div className="h-dvh w-screen overflow-y-auto overflow-x-hidden bg-[#eef2f7] text-zinc-950">
      <header className="sticky top-0 z-50 border-b border-black/5 bg-[#eef2f7]/78 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/features" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-zinc-950">
            <IconAntiprism className="h-5 w-5" />
            Antiprism
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
              className="hidden rounded-full border border-black/10 bg-white/75 px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm backdrop-blur sm:inline-flex"
            >
              Open dashboard
            </Link>
            <Link
              href="/new"
              className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-medium text-white shadow-[0_12px_30px_rgba(0,0,0,0.14)]"
            >
              Open the workspace
              <IconArrowRight />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden pb-20 pt-12 sm:pt-16 w-full">
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
            <AnimatedHero />
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

        <section className="pb-28 pt-8">
          <div className="mx-auto max-w-6xl px-6">
            <div className="relative overflow-hidden rounded-[40px] border border-zinc-200 bg-[linear-gradient(135deg,#f0f9ff,#e0f2fe_44%,#f0f9ff)] px-6 py-12 shadow-[0_35px_120px_rgba(103,142,196,0.12)] sm:px-12 sm:py-16">
              <div className="landing-hero-aura absolute inset-[-15%] opacity-70 bg-[radial-gradient(circle_at_18%_22%,rgba(255,255,255,0.7),transparent_30%),radial-gradient(circle_at_82%_74%,rgba(255,255,255,0.5),transparent_30%)]" />
              <div className="relative">
                <div className="flex flex-wrap gap-2">
                  <SurfaceChip label="Local-first" />
                  <SurfaceChip label="Real-time sync" />
                  <SurfaceChip label="Browser-native AI" />
                  <SurfaceChip label="Git integration" />
                </div>

                <div className="mt-8 grid gap-10 lg:grid-cols-[1.1fr,0.9fr] lg:items-end">
                  <div>
                    <h2 className="text-4xl font-semibold tracking-tight text-zinc-950 sm:text-6xl">Try Antiprism today</h2>
                    <p className="mt-5 max-w-2xl text-lg leading-relaxed text-zinc-700">
                      Open the workspace, invite collaborators, run browser-native models, and keep the project in
                      formats you control.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-3">
                      <Link
                        href="/new"
                        className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-base font-medium text-white shadow-[0_18px_40px_rgba(0,0,0,0.14)]"
                      >
                        Open the workspace
                        <IconArrowRight />
                      </Link>
                      <Link
                        href="/"
                        className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/75 px-6 py-3 text-base font-medium text-zinc-700 shadow-sm backdrop-blur"
                      >
                        Open dashboard
                      </Link>
                    </div>
                  </div>

                  <div className="rounded-[30px] border border-zinc-200 bg-white/95 p-6 text-zinc-900 shadow-[0_24px_70px_rgba(10,14,24,0.12)] backdrop-blur">
                    <div className="flex items-center gap-3 text-sm font-medium text-zinc-500">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-50 border border-zinc-100">
                        <IconSparkles />
                      </span>
                      Supported today
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {SUPPORTED_FEATURES.map((chip) => (
                        <span key={chip} className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm font-medium text-zinc-700">
                          {chip}
                        </span>
                      ))}
                    </div>
                    <div className="mt-6 grid gap-3 text-sm text-zinc-700 sm:grid-cols-2">
                      <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4">
                        <div className="flex items-center gap-2 font-medium text-zinc-900">
                          <IconServer />
                          Peer-to-peer Sync
                        </div>
                        <p className="mt-2 text-zinc-600">Share URLs securely carry signaling parameters for collaboration setup.</p>
                      </div>
                      <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4">
                        <div className="flex items-center gap-2 font-medium text-zinc-900">
                          <IconZap />
                          Local compile
                        </div>
                        <p className="mt-2 text-zinc-600">BusyTeX and texlyre keep core writing loops local and fast.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

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
