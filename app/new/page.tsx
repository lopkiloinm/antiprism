"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createProject } from "@/lib/projects";

export default function NewProjectPage() {
  const router = useRouter();

  useEffect(() => {
    const p = createProject("Untitled Project");
    router.replace(`/project/${p.id}`);
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
      <div className="text-sm text-zinc-400">Creating project…</div>
    </div>
  );
}

