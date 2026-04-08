import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  // Move dev indicator away from bottom left
  devIndicators: {
    position: "bottom-right",
  },
  // Use static export for GitHub Pages, but ensure WASM files are handled correctly
  ...(process.env.NODE_ENV === "production" && {
    output: "export" as const,
    images: { unoptimized: true },
  }),
  // GitHub Pages project sites deploy to /repo-name; basePath/assetPrefix ensure assets resolve
  ...(basePath && {
    basePath,
    assetPrefix: `${basePath}/`,
  }),
  webpack: (config, { isServer, dev }) => {
    // Split heavy vendor libs into separate cacheable chunks (production only)
    if (!isServer && !dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...(config.optimization?.splitChunks as object || {}),
          cacheGroups: {
            ...((config.optimization?.splitChunks as any)?.cacheGroups || {}),
            yjs: {
              test: /[\\/]node_modules[\\/](yjs|y-webrtc|y-indexeddb|y-codemirror\.next|yjs-orderedtree|lib0)[\\/]/,
              name: "vendor-yjs",
              chunks: "all" as const,
              priority: 30,
            },
            codemirror: {
              test: /[\\/]node_modules[\\/](@codemirror|codemirror|codemirror-lang-latex|codemirror-lang-typst|@replit)[\\/]/,
              name: "vendor-codemirror",
              chunks: "all" as const,
              priority: 25,
            },
            ai: {
              test: /[\\/]node_modules[\\/](@huggingface|streamdown|@streamdown)[\\/]/,
              name: "vendor-ai",
              chunks: "all" as const,
              priority: 20,
            },
          },
        },
      };
    }
    if (isServer) {
      config.externals = [...(config.externals || []), "@huggingface/transformers"];
    }
    
    // Enable async WebAssembly so wasm-pack modules (e.g. codemirror-lang-typst) get proper named exports
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    
    // Handle WASM files properly for static export
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    
    // For static export, treat most WASM files as assets but exclude codemirror-lang-typst
    config.module.rules.unshift({
      test: /\.wasm$/,
      type: "asset/resource",
      exclude: [/node_modules[\\/]codemirror-lang-typst[\\/]/],
      generator: {
        filename: "static/wasm/[name].[hash][ext]",
      },
    });
    
    // Handle codemirror-lang-typst WASM files as WebAssembly modules
    config.module.rules.push({
      test: /\.wasm$/,
      type: "webassembly/async",
      include: [/node_modules[\\/]codemirror-lang-typst[\\/]/],
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
