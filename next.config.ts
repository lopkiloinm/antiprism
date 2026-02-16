import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Only use static export for production build (GitHub Pages). In dev, skip it so
  // middleware runs and dynamic project routes work without generateStaticParams errors.
  ...(process.env.NODE_ENV === "production" && { output: "export" as const }),
  turbopack: {},
  webpack: (config, { isServer, dev }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), "@huggingface/transformers"];
    }
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    // Must come first so .wasm files are handled before other rules; asyncWebAssembly enables webpack to process them
    config.module.rules.unshift({ test: /\.wasm$/, type: "asset/resource" });
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
