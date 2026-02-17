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
  IconLayoutDashboard,
  IconEye,
  IconServer,
  IconArrowRight,
} from "@/components/Icons";

const FEATURES = [
  {
    title: "Real-time collaboration",
    description:
      "Peer-to-peer sync via WebRTC and Yjs (CRDT). Work together without a central server.",
    Icon: IconUsers,
  },
  {
    title: "AI assistant (local)",
    description:
      "Runs in-browser with WebGPU. No API keys, no data leaves your device.",
    Icon: IconSparkles,
  },
  {
    title: "LaTeX compilation",
    description:
      "BusyTeX and texlyre in WASM — compile locally, no cloud compiler.",
    Icon: IconFileText,
  },
  {
    title: "Typst compilation",
    description:
      "Official compiler via typst.ts — full Typst support in the browser.",
    Icon: IconFileCode,
  },
  {
    title: "Local-first storage",
    description:
      "IndexedDB-backed project filesystem. Your files stay on your device.",
    Icon: IconFolder,
  },
  {
    title: "Export & import",
    description: "Download projects as ZIP, or import from ZIP or folder.",
    Icon: IconFileArchive,
  },
] as const;

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
      "After caching assets and models, you can write and compile without a network connection.",
    Icon: IconWifiOff,
  },
  {
    title: "Fast iteration",
    description:
      "Compile locally, zoom smoothly, and keep working on flaky Wi‑Fi or while traveling.",
    Icon: IconZap,
  },
] as const;

export default function FeaturesPage() {
  return (
    <div className="h-screen w-screen overflow-auto">
      <main className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/features" className="font-semibold tracking-tight">
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

            {/* Hero graphic: chat mockup with assistant responding in LaTeX */}
            <div className="hidden w-full max-w-[320px] shrink-0 lg:block">
              <div className="rounded-xl border border-zinc-700/80 bg-zinc-900/60 shadow-xl overflow-hidden">
                <div className="border-b border-zinc-800/80 px-3 py-2 text-xs font-medium text-zinc-400">
                  AI assistant
                </div>
                <div className="flex flex-col gap-3 p-3 min-h-[240px]">
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-blue-600 px-3 py-2 text-sm text-white">
                      Add a methods section with bullet points
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="max-w-[95%] rounded-2xl rounded-bl-sm bg-zinc-700/80 px-3 py-2 text-zinc-200">
                      <pre className="text-xs font-mono whitespace-pre-wrap break-words text-zinc-300">{`\\section{Methods}

\\begin{itemize}
  \\item Survey (n=120)
  \\item Semi-structured interviews
  \\item Thematic analysis
\\end{itemize}`}</pre>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 border-t border-zinc-800/80 px-3 py-2">
                  <div className="rounded bg-zinc-800/80 border border-zinc-700/60 px-2 py-1 text-xs text-zinc-500">
                    Ask
                  </div>
                  <div className="rounded bg-zinc-700 text-zinc-200 border border-zinc-600 px-2 py-1 text-xs">
                    Agent
                  </div>
                  <div className="ml-auto h-7 w-7 rounded bg-blue-600 flex items-center justify-center">
                    <IconArrowRight />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tools / What you get */}
      <section className="border-b border-zinc-800 bg-zinc-900/20 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800/50 text-zinc-300">
              <IconLayoutDashboard />
            </span>
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">
              What you get
            </h2>
          </div>
          <p className="mt-2 max-w-2xl text-zinc-400">
            One workspace with the same goal: write better, together, with
            privacy and control over your documents.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ title, description, Icon }) => (
              <div
                key={title}
                className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-950/50 p-5 transition-colors hover:border-zinc-700"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700/80 bg-zinc-800/50 text-zinc-400">
                  <Icon />
                </span>
                <h3 className="mt-3 font-medium text-zinc-200">{title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-400">
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
            ))}
          </div>
        </div>
      </section>

      {/* At a glance */}
      <section className="border-b border-zinc-800 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800/50 text-zinc-300">
              <IconEye />
            </span>
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">
              Antiprism at a glance
            </h2>
          </div>
          <p className="mt-2 max-w-2xl text-zinc-400">
            Antiprism is built on a simple idea: scientific writing deserves
            tools that are private, fast, and work where you do—without locking
            you into a cloud or a single device.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {VALUES.map(({ title, description, Icon }) => (
              <div
                key={title}
                className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700/80 bg-zinc-800/50 text-zinc-400">
                  <Icon />
                </span>
                <h3 className="mt-3 font-medium text-zinc-200">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works / Single workspace */}
      <section className="border-b border-zinc-800 bg-zinc-900/20 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800/50 text-zinc-300">
              <IconServer />
            </span>
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">
              One workspace, no backend
            </h2>
          </div>
          <p className="mt-2 max-w-2xl text-zinc-400">
            No server to run, no API keys to manage. Compile in the browser,
            collaborate over WebRTC, and keep your data on your device.
          </p>
          <ul className="mt-6 space-y-2 text-zinc-300">
            <li className="flex items-center gap-2">
              <span className="text-blue-500">•</span>
              Compile LaTeX and Typst in WASM, locally
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-500">•</span>
              Real-time sync via peer-to-peer (WebRTC + Yjs)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-500">•</span>
              Optional in-browser AI with WebGPU
            </li>
          </ul>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 sm:p-10">
            <h2 className="text-xl font-semibold tracking-tight text-zinc-100">
              Ready to try it?
            </h2>
            <p className="mt-2 text-zinc-400">
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
      <footer className="border-t border-zinc-800 bg-zinc-950">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="font-semibold tracking-tight text-zinc-200">
            Antiprism
          </div>
          <p className="text-sm text-zinc-500">
            Built for local-first scientific writing. Simple, open-source.
          </p>
        </div>
      </footer>
    </main>
    </div>
  );
}
