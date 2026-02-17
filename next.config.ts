import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  // Only use static export for production build (GitHub Pages). In dev, skip it so
  // middleware runs and dynamic project routes work without generateStaticParams errors.
  ...(process.env.NODE_ENV === "production" && { output: "export" as const }),
  // GitHub Pages project sites deploy to /repo-name; basePath/assetPrefix ensure assets resolve
  ...(basePath && {
    basePath,
    assetPrefix: `${basePath}/`,
  }),
  turbopack: {},
  webpack: (config, { isServer, dev }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), "@huggingface/transformers"];
    }
    // Enable async WebAssembly so wasm-pack modules (e.g. codemirror-lang-typst) get proper named exports
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    // pandoc-wasm: treat only its .wasm as asset (URL); other .wasm (e.g. codemirror-lang-typst) use normal WASM loading
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.unshift({
      test: /\.wasm$/,
      type: "asset/resource",
      include: [/node_modules[\\/]pandoc-wasm[\\/]/],
    });
    // Fix pdfjs-dist "Object.defineProperty called on non-object" in dev mode.
    // eval-source-map causes variable shadowing that breaks pdfjs-dist; use source-map instead.
    if (dev && !isServer) {
      Object.defineProperty(config, "devtool", {
        get: () => "source-map",
        set: () => {},
      });
    }
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };
    return config;
  },
};

export default nextConfig;
