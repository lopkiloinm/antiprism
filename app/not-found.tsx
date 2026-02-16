"use client";

import { usePathname } from "next/navigation";
import ProjectPageClient from "@/app/project/[id]/ProjectPageClient";

export default function NotFound() {
  const pathname = usePathname();
  const base = typeof process !== "undefined" && process.env?.NEXT_PUBLIC_BASE_PATH ? process.env.NEXT_PUBLIC_BASE_PATH : "";
  const path = pathname.replace(base || "", "") || "/";
  const match = path.match(/^\/project\/([^/]+)\/?$/);
  const projectId = match?.[1];

  if (projectId) {
    return <ProjectPageClient idOverride={projectId} />;
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center p-8 gap-4">
      <h1 className="text-2xl font-semibold text-zinc-200">404</h1>
      <p className="text-zinc-500">Page not found</p>
      <a href={base || "/"} className="text-sm text-blue-500 hover:underline">
        ← Back to home
      </a>
    </div>
  );
}
