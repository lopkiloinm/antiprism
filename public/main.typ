// --------------------
// Layout to mirror the LaTeX preamble
// --------------------
#set page("us-letter", margin: 1in)
#set text(size: 11pt)
#set par(first-line-indent: 0pt, spacing: 1em)

// LaTeX uses \section* / \subsection*, so disable heading numbering.
#set heading(numbering: none)

= What is Prism?

*Prism* is an AI-powered LaTeX editor for writing scientific documents. It supports
real-time collaboration with coauthors and includes OpenAI-powered intelligence to
help you draft and edit text, reason through ideas, and handle formatting.

= What is Antiprism?

*Antiprism* is a P2P decentralized version of Prism. Where Prism relies on cloud
services and centralized infrastructure, Antiprism runs entirely in your browser—no
servers, no API keys, no data leaving your device. Everything that makes Antiprism
“anti” to Prism is summarized below.

= Antiprism vs. Prism: Architecture Comparison

#align(center)[
  #table(
    columns: (auto, auto, 1fr),
    stroke: none,
    inset: (x: 6pt, y: 4pt),
    column-gutter: 14pt,

    // booktabs-style rules
    table.hline(stroke: 0.9pt),
    table.header([*Component*], [*Prism (cloud)*], [*Antiprism (client-side)*]),
    table.hline(stroke: 0.6pt),

    [Realtime collaboration], [WebSockets via central server], [WebRTC + Yjs (peer-to-peer)],
    [AI assistant], [OpenAI API (datacenter)], [LFM2.5-1.2B Q4 ONNX (WebGPU)],
    [LaTeX rendering], [Cloud compilation], [Client-side WASM (texlyre-busytex)],
    [Data storage], [Server-side], [IndexedDB, local-first],

    table.hline(stroke: 0.9pt),
  )
]

== Realtime: WebRTC Yjs vs. WebSockets

Prism uses WebSockets to sync edits through a central server. Antiprism uses *WebRTC*
with *Yjs* for CRDT-based collaboration: peers connect directly to each other, and a
signaling server (or public mesh) only helps establish connections—it never sees
document content. Your edits sync peer-to-peer without a middleman.

== AI: WebGPU in-Browser vs. OpenAI Datacenter

Prism sends your text to OpenAI's servers. Antiprism runs *LFM2.5-1.2B Q4 ONNX*
(LiquidAI) entirely in your browser via *WebGPU*. The model is quantized to 4-bit (Q4)
and exported to ONNX for efficient in-browser inference. No API keys, no network calls
for inference—the model loads once, caches locally, and runs on your GPU. Privacy and
offline use come by design.

== LaTeX: Client-Side WASM vs. Cloud

Prism compiles LaTeX in the cloud. Antiprism uses *texlyre-busytex*, a WebAssembly port
of a TeX engine, to compile and render PDFs locally. Your documents never leave your
machine for compilation.

// Force the two-column section to begin on a fresh page (so none of it sits at the
// bottom of page 1 in a compact layout).
#pagebreak()

= Features

#columns(2, gutter: 18pt)[
  Antiprism includes an in-browser AI assistant and can access your project, so you can ask it to do things like:

  “Add the equation for the Laplace transform of $t cos(a t)$ to the introduction.”

  $ cal(L)(t cos(a t)) = frac(s^2 - a^2, (s^2 + a^2)^2) $

  “Add a 4-by-4 table” to the summary section.

  #align(center)[
    #box(width: 50%)[
      #table(
        columns: 4,
        stroke: 0.6pt,
        inset: 4pt,
        align: center,

        [1], [2], [3], [4],
        [5], [6], [7], [8],
        [9], [10], [11], [12],
        [13], [14], [15], [16],
      )
    ]
  ]

  “Proofread this and highlight any errors or gaps in logic, and make suggestions for how I can improve the clarity of the section.”

  “Are there any corollaries or follow-on implications of Theorem 3.1 that I've missed? Are all the bounds tight, or can some be relaxed?”

  #colbreak()

  “Write an abstract based on the rest of the paper”

  “Add a bibliography to my paper, and suggest related work I may have missed.”

  “Generate this hand-drawn diagram in LaTeX.”

  #grid(columns: (1fr, 1fr), column-gutter: 12pt, align: center)[
    #image("diagram.jpg", width: 100%),

    
  ]

  “Add any missing dependencies across my project.”

  “Generate a 200-word summary for a popular audience.”

  “Generate a Beamer presentation with each slide in its own file.”
]

= Collaboration

Invite collaborators by clicking the “Share” menu. As you edit, they will see your updates
in real time over WebRTC—no central server stores your document. You can also leave comments
by highlighting text and selecting “Leave a comment.”
