import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";

export const metadata: Metadata = {
  title: "Antiprism LaTeX Editor",
  description: "P2P decentralized LaTeX editor: WebRTC Yjs collaboration, WebGPU in-browser AI, client-side WASM LaTeX.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="h-screen w-screen overflow-hidden antialiased bg-[var(--background)] text-[var(--foreground)]">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
