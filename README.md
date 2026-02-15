# Antiprism LaTeX Editor

**Antiprism** is a P2P decentralized LaTeX editor—the client-side counterpart to [Prism](https://prism.com). Where Prism uses cloud services and centralized infrastructure, Antiprism runs entirely in your browser: no servers, no API keys, no data leaving your device.

## Architecture: Antiprism vs Prism

| Component | Prism (cloud) | Antiprism (client-side) |
|-----------|---------------|-------------------------|
| **Realtime collaboration** | WebSockets via central server | WebRTC + Yjs (peer-to-peer) |
| **AI assistant** | OpenAI API (datacenter) | LFM2.5-1.2B Q4 ONNX (WebGPU) |
| **LaTeX rendering** | Cloud compilation | Client-side WASM (texlyre-busytex) |
| **Data storage** | Server-side | IndexedDB, local-first |

- **WebRTC + Yjs**: Peers connect directly; a signaling server only helps establish connections and never sees document content.
- **WebGPU AI**: The [LiquidAI LFM2.5-1.2B](https://huggingface.co/LiquidAI/LFM2.5-1.2B-Instruct-ONNX) model runs in-browser, quantized to 4-bit (Q4) and exported to ONNX. No API keys, no network calls for inference.
- **Client-side LaTeX**: [texlyre-busytex](https://github.com/texlyre/busytex) compiles and renders PDFs locally via WebAssembly.

---

## Features

### Dashboard

- **Projects & Rooms**: Create projects (local) or rooms (shared via WebRTC room ID).
- **Sidebar**: All Projects, Your Projects, Your Rooms.
- **Search**: Filter projects/rooms by name.
- **View modes**: List or icon view.
- **Import**: Zip files or entire folders.
- **Delete**: Permanently removes project/room and all IndexedDB data.

### Project Editor

- **File tree**: Hierarchical browser with infinite nesting.
  - Add file/folder into the selected folder.
  - Upload file or directory.
  - Right-click: Rename, Download, Delete.
  - Empty folders stay open; only non-empty folders can be collapsed.
- **Tabs**: Multiple open files; close deletes the tab (and closes the tab when the file is deleted).
- **CodeMirror 6**: LaTeX syntax highlighting, One Dark theme.
- **Yjs + y-webrtc**: Real-time collaborative editing; edits sync peer-to-peer.
- **PDF preview**: Scrollable multi-page view, zoom, download.
- **AI assistant**: In-browser chat with document context; helps draft, edit, and debug LaTeX.

### LaTeX Compilation

- **texlyre-busytex**: WebAssembly TeX engine.
- Compiles on demand; PDF updates after each compile.
- Supports `main.tex`, images, and additional `.tex` files.

---

## Prerequisites

- **Node.js** 20.9+
- **Browser** with WebGPU support: Chrome 113+, Edge 113+, Safari 18+

---

## Setup

```bash
# Install dependencies
npm install

# Download LaTeX WASM assets (~175MB)
npm run download-latex-assets

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Build for production (webpack) |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run download-latex-assets` | Download texlyre-busytex WASM assets to `./public/core` |

---

## Project Structure

```
├── app/
│   ├── layout.tsx          # Root layout, metadata
│   ├── page.tsx             # Dashboard (projects/rooms)
│   ├── project/[id]/page.tsx # Project editor
│   └── globals.css
├── components/
│   ├── DashboardHeader.tsx  # Search, view toggle, import, New
│   ├── DashboardSidebar.tsx # Nav: All / Projects / Rooms
│   ├── ProjectList.tsx      # Project/room cards, delete
│   ├── FileTree.tsx         # IDBFS file browser, context menu
│   ├── FileActions.tsx      # Add file/folder, upload
│   ├── FileTabs.tsx         # Open tabs
│   ├── EditorPanel.tsx      # CodeMirror + Yjs
│   ├── PdfPreview.tsx       # PDF viewer (react-pdf)
│   ├── ImageViewer.tsx      # Image preview
│   └── NameModal.tsx        # Rename/create dialogs
├── lib/
│   ├── projects.ts          # Project/room CRUD, IDBFS cleanup
│   ├── localModelRuntime.ts # AI model (transformers.js, Cache API)
│   ├── localModel.ts        # Model API exports
│   ├── latexCompiler.ts     # texlyre-busytex wrapper
│   └── idbfsAdapter.ts      # File manager helpers
├── public/
│   ├── main.tex             # Default document (Antiprism intro)
│   ├── diagram.jpg          # Sample image
│   └── core/                # LaTeX WASM assets (after download)
├── PACKAGES.md              # Package docs & snippets
└── package.json
```

---

## Tech Stack

| Category | Packages |
|----------|----------|
| **Framework** | Next.js 16, React 19 |
| **Collaboration** | Yjs, y-webrtc, y-codemirror.next |
| **Editor** | CodeMirror 6, codemirror-lang-latex |
| **Storage** | @wwog/idbfs (IndexedDB filesystem) |
| **LaTeX** | texlyre-busytex (WASM) |
| **AI** | @huggingface/transformers (LFM2.5-1.2B Q4 ONNX) |
| **PDF** | react-pdf |
| **Styling** | Tailwind CSS |

---

## Packages

See [PACKAGES.md](./PACKAGES.md) for detailed usage and code snippets for Yjs, y-webrtc, CodeMirror, and related libraries.
