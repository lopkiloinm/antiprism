import Link from "next/link";

export default function FeaturesPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-950/60 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="font-semibold tracking-tight">Antiprism</div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="px-3 py-2 text-sm rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
            >
              Open dashboard
            </Link>
            <Link
              href="/new"
              className="px-3 py-2 text-sm rounded bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              Create a project
            </Link>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 pt-14 pb-10">
        <div className="grid lg:grid-cols-2 gap-10 items-start">
          <div>
            <div className="inline-flex items-center gap-2 text-xs px-2.5 py-1 rounded-full border border-zinc-800 bg-zinc-900/40 text-zinc-300">
              Local-first · Zero backend · Privacy-preserving
            </div>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight">
              Write scientific docs with collaboration, AI, and in-browser compilation.
            </h1>
            <p className="mt-4 text-zinc-300 leading-relaxed">
              Antiprism is a decentralized, peer-to-peer document editor for LaTeX and Typst.
              Your projects stay on your device, collaboration happens over WebRTC, and compilation runs
              in WASM directly in the browser—no server compiler, no API keys required.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/new"
                className="px-4 py-2.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                Create a project
              </Link>
              <Link
                href="/"
                className="px-4 py-2.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
              >
                Explore dashboard
              </Link>
            </div>
            <div className="mt-6 text-xs text-zinc-500">
              No sign-in. Works offline after initial asset/model caching.
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
            <div className="text-sm font-medium text-zinc-200">What you get</div>
            <div className="mt-4 grid sm:grid-cols-2 gap-3">
              {[
                ["Real-time collaboration", "Peer-to-peer sync via WebRTC + Yjs (CRDT)."],
                ["AI assistant (local)", "Runs in-browser with WebGPU (no API keys)."],
                ["LaTeX compilation", "BusyTeX/texlyre in WASM — compile locally."],
                ["Typst compilation", "Official compiler via typst.ts — compile locally."],
                ["Local-first storage", "IndexedDB-backed project filesystem."],
                ["Export/import", "Download ZIP, import ZIP/folder."],
              ].map(([title, desc]) => (
                <div key={title} className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-3">
                  <div className="text-sm font-medium text-zinc-200">{title}</div>
                  <div className="mt-1 text-xs text-zinc-400 leading-relaxed">{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-14">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-6">
          <h2 className="text-xl font-semibold tracking-tight">Why Antiprism</h2>
          <div className="mt-4 grid md:grid-cols-3 gap-4">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-4">
              <div className="text-sm font-medium">Privacy</div>
              <div className="mt-1 text-sm text-zinc-400">
                Your source, assets, and compiled PDFs stay on-device. Collaboration is direct, not relayed through a central server.
              </div>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-4">
              <div className="text-sm font-medium">Offline-first</div>
              <div className="mt-1 text-sm text-zinc-400">
                After caching, you can write and compile without a network connection.
              </div>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-4">
              <div className="text-sm font-medium">Fast iteration</div>
              <div className="mt-1 text-sm text-zinc-400">
                Compile locally, zoom smoothly, and keep working even when you’re traveling or on flaky Wi‑Fi.
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-zinc-400">
              Ready to try it? Create a project and start writing.
            </div>
            <div className="flex gap-2">
              <Link
                href="/new"
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                Create a project
              </Link>
              <Link
                href="/"
                className="px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
              >
                Back to dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 py-8 text-xs text-zinc-500 flex items-center justify-between">
          <div>Antiprism</div>
          <div>Built for local-first scientific writing.</div>
        </div>
      </footer>
    </main>
  );
}

