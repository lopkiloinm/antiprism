import Link from "next/link";
import {
  IconUsers,
  IconSparkles,
  IconFileText,
  IconFileCode,
  IconFolder,
  IconFileArchive,
  IconShield,
  IconWifiOff,
  IconZap,
  IconArrowRight,
  IconSend,
  IconGitBranch,
  IconCheckSquare,
  IconX,
  IconAntiprism,
} from "@/components/Icons";

type MockupKey =
  | "peers"
  | "chat"
  | "editor-pdf"
  | "git"
  | "project-list"
  | "export";

const FEATURES: Array<{
  title: string;
  description: string;
  Icon: typeof IconUsers;
  mockup: MockupKey;
}> = [
  {
    title: "Real-time collaboration",
    description:
      "Peer-to-peer sync via WebRTC and Yjs (CRDT). Work together without a central server. No relay—connections are direct.",
    Icon: IconUsers,
    mockup: "peers",
  },
  {
    title: "AI assistant (local)",
    description:
      "Runs in-browser with WebGPU. No API keys, no data leaves your device. Ask questions or use Agent mode to generate LaTeX.",
    Icon: IconSparkles,
    mockup: "chat",
  },
  {
    title: "LaTeX compilation",
    description:
      "BusyTeX and texlyre in WASM — compile locally, no cloud compiler. Supports XeLaTeX, LuaLaTeX, and pdfTeX.",
    Icon: IconFileText,
    mockup: "editor-pdf",
  },
  {
    title: "Git integration",
    description:
      "Built-in Git panel with commit, diff, and history. Track changes, collaborate with version control, and sync with remote repositories.",
    Icon: IconGitBranch,
    mockup: "git",
  },
  {
    title: "Local-first storage",
    description:
      "IndexedDB-backed project filesystem. Your files stay on your device. Open projects from the dashboard anytime.",
    Icon: IconFolder,
    mockup: "project-list",
  },
  {
    title: "Export & import",
    description: "Download projects as ZIP, or import from ZIP or folder. Take your work with you or restore from backup.",
    Icon: IconFileArchive,
    mockup: "export",
  },
];

const GITHUB_REPO = "https://github.com/lopkiloinm/antiprism";

const VALUES = [
  {
    title: "Privacy",
    description:
      "Your source, assets, and compiled PDFs stay on-device. Collaboration is direct, not relayed through a central server.",
    Icon: IconShield,
  },
  {
    title: "Offline-first",
    description:
      "After caching assets and models, you can write and compile without a network connection. Everything runs on your machine.",
    Icon: IconWifiOff,
  },
  {
    title: "Fast iteration",
    description:
      "Compile locally, zoom smoothly, and keep working on flaky Wi‑Fi or while traveling. No cloud dependency.",
    Icon: IconZap,
  },
  {
    title: "Open formats",
    description:
      "LaTeX, Typst, and standard tooling. Your project is plain files—no lock-in and no proprietary formats to export.",
    Icon: IconFileCode,
  },
] as const;

export default function FeaturesPage() {
  return (
    <div className="h-screen w-screen overflow-auto">
      <main className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/features" className="flex items-center gap-2 font-semibold tracking-tight">
            <IconAntiprism className="w-5 h-5" />
            Antiprism
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700"
            >
              Open dashboard
            </Link>
            <Link
              href="/new"
              className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Create a project
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-zinc-800 bg-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr,auto]">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-xs text-zinc-400">
                Local-first · Zero backend · Privacy-preserving
              </p>
              <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-zinc-100 sm:text-5xl">
                The open workspace for scientific writing
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-zinc-300">
                A coherent set of local-first, open-source tools for LaTeX and
                Typst: real-time collaboration, in-browser compilation, and an
                optional AI assistant—no server, no API keys.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/new"
                  className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700"
                >
                  Create a project
                </Link>
                <Link
                  href="/"
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-5 py-2.5 font-medium text-zinc-200 hover:bg-zinc-700"
                >
                  Open dashboard
                </Link>
              </div>
              <p className="mt-6 text-sm text-zinc-500">
                No sign-in required. Works offline after initial asset and model
                caching.
              </p>
            </div>

            {/* Hero graphic: chat mockup — about Antiprism, with send button */}
            <div className="hidden w-full max-w-[320px] shrink-0 lg:block">
              <div className="flex min-h-[280px] flex-col overflow-hidden rounded-xl border border-zinc-700/80 bg-zinc-800/50 p-3 shadow-xl">
                <div className="flex gap-1.5 border-b border-zinc-700/80 pb-1.5 text-xs">
                  <span className="rounded bg-zinc-700 px-2 py-0.5 text-zinc-400">Ask</span>
                  <span className="px-2 py-0.5 text-zinc-500">Agent</span>
                </div>
                <div className="mt-2 flex-1 space-y-2">
                  <div className="flex justify-end">
                    <div className="max-w-[88%] rounded-lg rounded-br-sm bg-blue-600/80 px-2.5 py-1.5 text-xs text-white">
                      What can I do with Antiprism?
                    </div>
                  </div>
                  <div className="rounded-lg rounded-bl-sm bg-zinc-700/80 px-2.5 py-2 text-xs leading-snug text-zinc-300">
                    Local-first workspace for LaTeX and Typst: real-time sync, in-browser compile, and this assistant. No server, no API keys.
                  </div>
                  <div className="flex justify-end">
                    <div className="max-w-[88%] rounded-lg rounded-br-sm bg-blue-600/80 px-2.5 py-1.5 text-xs text-white">
                      Is my data stored in the cloud?
                    </div>
                  </div>
                  <div className="rounded-lg rounded-bl-sm bg-zinc-700/80 px-2.5 py-1.5 text-xs leading-snug text-zinc-300">
                    No. Source, assets, and PDFs stay on your device. Collaboration is peer-to-peer—no central server.
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-2.5 py-2">
                  <span className="flex-1 text-xs text-zinc-500">Ask about Antiprism…</span>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-blue-600 text-white [&>svg]:h-3.5 [&>svg]:w-3.5">
                    <IconSend />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tools / What you get */}
      <section className="border-b border-zinc-800 bg-zinc-900/20 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-100 sm:text-5xl">
            What you get
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-zinc-300">
            One workspace with the same goal: write better, together, with
            privacy and control over your documents.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {FEATURES.map(({ title, description, Icon, mockup }) => (
              <div
                key={title}
                className="flex min-h-[260px] flex-col gap-4 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/50 p-5 transition-colors hover:border-zinc-700 md:min-h-[300px] md:flex-row md:items-stretch md:gap-5"
              >
                <div className="min-w-0 flex-1">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700/80 bg-zinc-800/50 text-zinc-400">
                    <Icon />
                  </span>
                  <h3 className="mt-3 font-medium text-zinc-200">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                    {description}
                  </p>
                  <Link
                    href="/"
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-blue-400 hover:text-blue-300"
                  >
                    Open dashboard
                    <IconArrowRight />
                  </Link>
                </div>
                {/* Text stays top-aligned; mockup pins to bottom, hugs right and bottom */}
                <div className="shrink-0 self-end -mb-5 -mr-5 md:self-end md:-mb-5 md:-mr-5">
                  <div className="h-[260px] w-[340px] overflow-hidden rounded-tl-lg border border-zinc-700/80 border-b-0 border-r-0 bg-zinc-900/60">
                  {mockup === "peers" && (
                    <div className="flex min-h-[260px] w-[440px] flex-col bg-zinc-800/50 p-3">
                      <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Sync</div>
                      <div className="mt-1.5 font-mono text-[11px] text-zinc-400">main.tex · 2 peers connected</div>
                      <div className="mt-3 flex items-center gap-2 text-[11px]">
                        <span className="rounded bg-blue-500/25 px-2 py-1 text-blue-400">you</span>
                        <span className="text-zinc-600">↔</span>
                        <span className="rounded bg-zinc-600/50 px-2 py-1 text-zinc-400">peer</span>
                      </div>
                      <div className="mt-3 rounded bg-zinc-950/60 px-2.5 py-1.5 font-mono text-[10px] text-zinc-500">Cursors in sync · no server</div>
                      <div className="mt-4 flex-1 space-y-1.5">
                        <div className="h-1.5 w-full rounded bg-zinc-700/40" />
                        <div className="h-1.5 w-4/5 rounded bg-zinc-700/30" />
                        <div className="h-1.5 w-3/4 rounded bg-zinc-700/25" />
                        <div className="h-1.5 w-2/3 rounded bg-zinc-700/20" />
                        <div className="h-1.5 w-5/6 rounded bg-zinc-700/25" />
                        <div className="mt-3 border-t border-zinc-700/60 pt-2">
                          <div className="text-[9px] text-zinc-500 uppercase">Shared files</div>
                          <div className="mt-1 flex gap-2 font-mono text-[10px] text-zinc-500">
                            <span>main.tex</span><span>refs.bib</span><span>fig/</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {mockup === "chat" && (
                    <div className="flex min-h-[260px] w-[340px] flex-col bg-zinc-800/50 p-2.5">
                      <div className="flex gap-1.5 border-b border-zinc-700/80 pb-1.5 text-[10px]">
                        <span className="rounded bg-zinc-700 px-2 py-0.5 text-zinc-400">Ask</span>
                        <span className="px-2 py-0.5 text-zinc-500">Agent</span>
                      </div>
                      <div className="mt-1.5 flex-1 space-y-1.5 overflow-hidden">
                        <div className="flex justify-end">
                          <div className="max-w-[88%] rounded-lg rounded-br-sm bg-blue-600/80 px-2 py-1 text-[10px] text-white">Add methods section</div>
                        </div>
                        <div className="rounded-lg rounded-bl-sm bg-zinc-700/80 px-2 py-1.5 font-mono text-[10px] leading-snug text-zinc-300">
                          {"\\section{Methods}\n\\begin{itemize}\n  \\item Survey (n=120)\n  \\item Interviews\n  \\item Thematic analysis\n\\end{itemize}"}
                        </div>
                        <div className="flex justify-end">
                          <div className="max-w-[88%] rounded-lg rounded-br-sm bg-blue-600/80 px-2 py-1 text-[10px] text-white">What about citations?</div>
                        </div>
                        <div className="rounded-lg rounded-bl-sm bg-zinc-700/80 px-2 py-1 text-[10px] leading-snug text-zinc-300">
                          {"Use \\cite{key} and \\bibliography{refs} in your .tex."}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-2 py-1.5">
                        <span className="min-w-0 flex-1 text-[10px] text-zinc-500">Ask about your document…</span>
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-blue-600 text-white [&>svg]:h-2.5 [&>svg]:w-2.5">
                          <IconSend />
                        </span>
                      </div>
                    </div>
                  )}
                  {mockup === "editor-pdf" && (
                    <div className="flex h-[260px] w-[440px] flex-col border-b border-zinc-700/80">
                      <div className="flex min-h-0 flex-1">
                        <div className="flex w-1/2 flex-col min-h-0 border-r border-zinc-800 bg-zinc-950 p-2.5">
                          <div className="flex gap-1 border-b border-zinc-800 pb-1.5 shrink-0">
                            <span className="border-b-2 border-blue-500 px-2 text-[10px] text-zinc-300">main.tex</span>
                            <span className="px-2 text-[10px] text-zinc-500">refs.bib</span>
                          </div>
                          <pre className="mt-2 min-h-0 flex-1 overflow-hidden font-mono text-[10px] leading-relaxed text-zinc-500 whitespace-pre-wrap">{`\\documentclass{article}
\\begin{document}
\\section{Introduction}
Lorem ipsum dolor sit
amet, consectetur.
\\section{Methods}
We used a mixed-methods
approach.
\\section{Results}
Data shows significant
effects (p < .05).
\\end{document}`}</pre>
                        </div>
                        <div className="flex w-1/2 flex-col min-h-0 bg-zinc-900/60 p-2.5">
                          <div className="text-[9px] shrink-0 text-zinc-500 uppercase">PDF</div>
                          <div className="mt-2 flex-1 min-h-0 space-y-1.5 overflow-hidden">
                            <div className="h-2 w-4/5 rounded bg-zinc-700/60" />
                            <div className="h-1.5 w-full rounded bg-zinc-800/50" />
                            <div className="h-1.5 w-5/6 rounded bg-zinc-800/50" />
                            <div className="h-1.5 w-4/5 rounded bg-zinc-800/40" />
                            <div className="h-1.5 w-full rounded bg-zinc-800/50" />
                            <div className="h-1.5 w-5/6 rounded bg-zinc-800/40" />
                            <div className="h-1.5 w-4/5 rounded bg-zinc-800/30" />
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 border-t border-zinc-700/80 bg-zinc-950/80 px-2.5 py-1.5 text-[9px] text-zinc-500">
                        <span>Ln 12, Col 4</span><span>·</span><span>UTF-8</span><span>·</span><span>LaTeX</span>
                      </div>
                    </div>
                  )}
                  {mockup === "git" && (
                    <div className="flex min-h-[260px] w-[440px] flex-col bg-zinc-800/50">
                      <div className="border-b border-zinc-700/80 px-3 py-2.5 text-[11px] font-medium text-zinc-400">
                        Git
                      </div>
                      <div className="flex-1 overflow-hidden p-2">
                        <div className="flex gap-1 border-b border-zinc-700/80 pb-1.5 mb-2">
                          <span className="border-b-2 border-blue-500 px-2 text-[10px] text-zinc-300">Status</span>
                          <span className="px-2 text-[10px] text-zinc-500">History</span>
                          <span className="px-2 text-[10px] text-zinc-500">Branches</span>
                        </div>
                        <div className="space-y-2">
                          <div className="text-[9px] text-zinc-500 uppercase">Changes</div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                              <span className="text-green-500">+</span>
                              <span>main.tex</span>
                              <span className="text-zinc-500">+12/-3 lines</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                              <span className="text-green-500">+</span>
                              <span>refs.bib</span>
                              <span className="text-zinc-500">+5 lines</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                              <span className="text-red-500">-</span>
                              <span>old-section.tex</span>
                              <span className="text-zinc-500">-28 lines</span>
                            </div>
                          </div>
                          
                          {/* Diff Preview */}
                          <div className="mt-3 pt-2 border-t border-zinc-700/60">
                            <div className="text-[9px] text-zinc-500 uppercase mb-2">Diff Preview</div>
                            <div className="bg-zinc-950/60 rounded border border-zinc-700/40 p-2 font-mono text-[9px] leading-tight space-y-0.5 max-h-24 overflow-hidden">
                              <div className="text-zinc-600">@@ -15,7 +15,9 @@</div>
                              <div className="text-red-600 bg-red-500/10">- Lorem ipsum dolor sit amet</div>
                              <div className="text-red-600 bg-red-500/10">- consectetur adipiscing elit</div>
                              <div className="text-green-600 bg-green-500/10">+ Lorem ipsum dolor sit amet,</div>
                              <div className="text-green-600 bg-green-500/10">+ consectetur adipiscing elit.</div>
                              <div className="text-zinc-400">  Sed do eiusmod tempor</div>
                              <div className="text-zinc-400">  incididunt ut labore</div>
                              <div className="text-green-600 bg-green-500/10">+ et dolore magna aliqua.</div>
                              <div className="text-zinc-400">  Ut enim ad minim veniam</div>
                            </div>
                          </div>
                          
                          <div className="mt-3 pt-2 border-t border-zinc-700/60">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] text-zinc-500">main</span>
                              <span className="text-[9px] text-zinc-500">2 commits ahead</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-zinc-700/80 px-2.5 py-1.5 flex gap-2">
                        <span className="text-[10px] text-zinc-500">Commit changes</span>
                        <span className="text-[10px] text-zinc-500">Push</span>
                        <span className="text-[10px] text-zinc-500">Pull</span>
                      </div>
                    </div>
                  )}
                  {mockup === "project-list" && (
                    <div className="flex min-h-[260px] w-[440px] flex-col bg-zinc-800/50">
                      <div className="border-b border-zinc-700/80 px-3 py-2.5 text-[11px] font-medium text-zinc-400">
                        Projects
                      </div>
                      <div className="flex-1 overflow-hidden p-2">
                        <div className="mb-1.5 rounded border border-zinc-700/80 bg-zinc-900/50 px-2 py-1.5 text-[10px] text-zinc-500">
                          Search projects…
                        </div>
                        <ul className="divide-y divide-zinc-700/60">
                          {["Paper draft", "Thesis ch.2", "Notes", "Draft v2", "Appendix", "Lit review", "Slides"].map((name) => (
                            <li
                              key={name}
                              className="flex items-center justify-between px-2.5 py-2 text-[11px] text-zinc-400"
                            >
                              <span className="truncate">{name}</span>
                              <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-500">.tex</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="border-t border-zinc-700/80 px-2.5 py-1.5">
                        <span className="text-[10px] text-zinc-500">+ New project</span>
                      </div>
                    </div>
                  )}
                  {mockup === "export" && (
                    <div className="flex min-h-[260px] w-[440px] flex-col bg-zinc-800/50 p-3">
                      <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Export / Import</div>
                      <div className="mt-2.5 flex items-center gap-2.5">
                        <div className="rounded border border-zinc-700 bg-zinc-800/60 px-2.5 py-2 font-mono text-[11px] text-zinc-400">
                          project.zip
                        </div>
                        <span className="text-zinc-500">↔</span>
                        <div className="rounded border border-zinc-700 bg-zinc-800/60 px-2.5 py-2 text-[11px] text-zinc-400">
                          folder
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-2 gap-y-1.5 text-[10px] text-zinc-500">
                        <span>main.tex</span><span>refs.bib</span><span>fig/</span><span>style.sty</span>
                      </div>
                      <div className="mt-4 flex-1 rounded border border-zinc-700/80 bg-zinc-950/40 p-2.5">
                        <div className="text-[9px] text-zinc-500 uppercase">Include</div>
                        <div className="mt-1.5 space-y-1 font-mono text-[10px] text-zinc-400">
                          <label className="flex items-center gap-2"><input type="checkbox" defaultChecked className="rounded" readOnly /> main.tex</label>
                          <label className="flex items-center gap-2"><input type="checkbox" defaultChecked className="rounded" readOnly /> refs.bib</label>
                          <label className="flex items-center gap-2"><input type="checkbox" defaultChecked className="rounded" readOnly /> fig/</label>
                          <label className="flex items-center gap-2"><input type="checkbox" className="rounded" readOnly /> build/</label>
                        </div>
                      </div>
                      <div className="mt-2 text-[9px] text-zinc-500">No cloud · full project copy</div>
                    </div>
                  )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* At a glance */}
      <section className="border-b border-zinc-800 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-100 sm:text-5xl">
            Antiprism at a glance
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-zinc-300">
            Antiprism is built on a simple idea: scientific writing deserves
            tools that are private, fast, and work where you do—without locking
            you into a cloud or a single device.
          </p>
          <div className="mt-12 grid grid-cols-4 gap-x-8 gap-y-0">
            {VALUES.map(({ title, description, Icon }) => (
              <div key={title} className="flex flex-col items-start gap-3">
                <span className="flex h-12 w-12 items-center justify-center text-zinc-400 [&>svg]:h-12 [&>svg]:w-12">
                  <Icon />
                </span>
                <h3 className="text-lg font-medium text-zinc-200">{title}</h3>
                <p className="text-sm leading-relaxed text-zinc-400">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="border-b border-zinc-800 bg-zinc-900/20 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-100 sm:text-5xl">
            Compare Antiprism
          </h2>
          <p className="mt-5 mb-10 text-lg leading-relaxed text-zinc-300 max-w-3xl">
            See how we stack up against traditional cloud-based LaTeX editors.
          </p>
          
          <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/50">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/40">
                    <th className="py-4 px-5 font-medium text-zinc-400 w-1/3">Feature</th>
                    <th className="py-4 px-5 font-semibold text-zinc-100 w-1/4">Antiprism</th>
                    <th className="py-4 px-5 font-medium text-zinc-500 w-1/4">Overleaf (Free)</th>
                    <th className="py-4 px-5 font-medium text-zinc-500 w-1/4">Overleaf (Paid)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  <tr className="hover:bg-zinc-800/20 transition-colors">
                    <td className="py-4 px-5 text-sm text-zinc-300">Offline compilation</td>
                    <td className="py-4 px-5 text-green-500"><IconCheckSquare /></td>
                    <td className="py-4 px-5 text-zinc-600"><IconX /></td>
                    <td className="py-4 px-5 text-zinc-600"><IconX /></td>
                  </tr>
                  <tr className="hover:bg-zinc-800/20 transition-colors">
                    <td className="py-4 px-5 text-sm text-zinc-300">Privacy (Zero-knowledge)</td>
                    <td className="py-4 px-5 text-green-500"><IconCheckSquare /></td>
                    <td className="py-4 px-5 text-zinc-600"><IconX /></td>
                    <td className="py-4 px-5 text-zinc-600"><IconX /></td>
                  </tr>
                  <tr className="hover:bg-zinc-800/20 transition-colors">
                    <td className="py-4 px-5 text-sm text-zinc-300">Unlimited collaborators</td>
                    <td className="py-4 px-5 text-green-500"><IconCheckSquare /></td>
                    <td className="py-4 px-5 text-zinc-600"><IconX /></td>
                    <td className="py-4 px-5 text-green-500"><IconCheckSquare /></td>
                  </tr>
                  <tr className="hover:bg-zinc-800/20 transition-colors">
                    <td className="py-4 px-5 text-sm text-zinc-300">Full Git Integration</td>
                    <td className="py-4 px-5 text-green-500"><IconCheckSquare /></td>
                    <td className="py-4 px-5 text-zinc-600"><IconX /></td>
                    <td className="py-4 px-5 text-green-500"><IconCheckSquare /></td>
                  </tr>
                  <tr className="hover:bg-zinc-800/20 transition-colors">
                    <td className="py-4 px-5 text-sm text-zinc-300">In-browser AI (Local)</td>
                    <td className="py-4 px-5 text-green-500"><IconCheckSquare /></td>
                    <td className="py-4 px-5 text-zinc-600"><IconX /></td>
                    <td className="py-4 px-5 text-zinc-600"><IconX /></td>
                  </tr>
                  <tr className="hover:bg-zinc-800/20 transition-colors">
                    <td className="py-4 px-5 text-sm text-zinc-300">Typst support</td>
                    <td className="py-4 px-5 text-green-500"><IconCheckSquare /></td>
                    <td className="py-4 px-5 text-zinc-600"><IconX /></td>
                    <td className="py-4 px-5 text-zinc-600"><IconX /></td>
                  </tr>
                  <tr className="hover:bg-zinc-800/20 transition-colors">
                    <td className="py-4 px-5 text-sm text-zinc-300">Compile timeout limits</td>
                    <td className="py-4 px-5 text-zinc-300">None (Your hardware)</td>
                    <td className="py-4 px-5 text-zinc-500">20 seconds</td>
                    <td className="py-4 px-5 text-zinc-500">240 seconds</td>
                  </tr>
                  <tr className="hover:bg-zinc-800/20 transition-colors">
                    <td className="py-4 px-5 text-sm text-zinc-300">Price</td>
                    <td className="py-4 px-5 font-medium text-zinc-200">Free & Open Source</td>
                    <td className="py-4 px-5 text-zinc-500">Free</td>
                    <td className="py-4 px-5 text-zinc-500">$15-$30/month</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 sm:p-10">
            <h2 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-100 sm:text-5xl">
              Ready to try it?
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-zinc-300">
              Create a project and start writing. No account required.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/new"
                className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700"
              >
                Create a project
              </Link>
              <Link
                href="/"
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-5 py-2.5 font-medium text-zinc-200 hover:bg-zinc-700"
              >
                Back to dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-900/20">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="font-semibold tracking-tight text-zinc-200">
                Antiprism
              </div>
              <p className="mt-2 text-sm text-zinc-500">
                Local-first scientific writing with LaTeX, Typst, and in-browser
                AI. No server, no sign-in.
              </p>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Product
              </h3>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link
                    href="/"
                    className="text-sm text-zinc-400 hover:text-zinc-200"
                  >
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    href="/new"
                    className="text-sm text-zinc-400 hover:text-zinc-200"
                  >
                    Create a project
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Resources
              </h3>
              <ul className="mt-3 space-y-2">
                <li>
                  <a
                    href={`${GITHUB_REPO}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-zinc-400 hover:text-zinc-200"
                  >
                    GitHub
                  </a>
                </li>
                <li>
                  <a
                    href={`${GITHUB_REPO}#readme`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-zinc-400 hover:text-zinc-200"
                  >
                    Documentation
                  </a>
                </li>
                <li>
                  <a
                    href={`${GITHUB_REPO}/blob/main/CONTRIBUTING.md`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-zinc-400 hover:text-zinc-200"
                  >
                    Contributing
                  </a>
                </li>
                <li>
                  <a
                    href={`${GITHUB_REPO}/issues`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-zinc-400 hover:text-zinc-200"
                  >
                    Report an issue
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Legal
              </h3>
              <ul className="mt-3 space-y-2">
                <li>
                  <a
                    href={`${GITHUB_REPO}/blob/main/LICENSE`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-zinc-400 hover:text-zinc-200"
                  >
                    License
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-col gap-2 border-t border-zinc-800 pt-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-zinc-500">
              Built for local-first scientific writing. Simple, open-source.
            </p>
            <p className="text-xs text-zinc-600">
              © {new Date().getFullYear()} Antiprism
            </p>
          </div>
        </div>
      </footer>
    </main>
    </div>
  );
}
