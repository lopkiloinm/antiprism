import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  webpack: (config, { isServer, dev }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), "@huggingface/transformers"];
    }
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({ test: /\.wasm$/, type: "asset/resource" });
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
