import { useState } from "react";
import { useRouter } from "next/navigation";
import { mount } from "@wwog/idbfs";
import { createProject } from "@/lib/projects";
import {
  IconFileText,
  IconPlus,
} from "./Icons";

interface Template {
  id: string;
  name: string;
  description: string;
  path: string;
}

const TEMPLATES: Template[] = [
  {
    id: "beamer",
    name: "Beamer Presentation",
    description: "Standard LaTeX Beamer presentation with Madrid theme",
    path: "/templates/beamer",
  },
  {
    id: "resume",
    name: "Modern CV",
    description: "Clean, modern resume template using moderncv",
    path: "/templates/resume",
  },
  {
    id: "ieee",
    name: "IEEE Conference Paper",
    description: "Standard two-column IEEE conference paper format",
    path: "/templates/ieee",
  },
  {
    id: "homework",
    name: "Math/CS Homework",
    description: "Clean homework template with theorem and proof environments",
    path: "/templates/homework",
  },
  {
    id: "notes",
    name: "Lecture Notes",
    description: "Comprehensive notes template with custom boxes and definitions",
    path: "/templates/notes",
  },
  {
    id: "book",
    name: "Book Template",
    description: "Standard book layout with frontmatter, chapters, and backmatter",
    path: "/templates/book",
  },
];

interface TemplateGalleryProps {
  viewMode: "list" | "icons";
  searchQuery: string;
}

export function TemplateGallery({ viewMode, searchQuery }: TemplateGalleryProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState<string | null>(null);

  const filteredTemplates = TEMPLATES.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateFromTemplate = async (template: Template) => {
    if (isCreating) return;
    setIsCreating(template.id);
    
    try {
      // 1. Fetch the template main.tex
      const basePathEnv = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(`${basePathEnv}${template.path}/main.tex`);
      if (!response.ok) throw new Error("Failed to load template");
      const content = await response.text();
      
      // 2. Create a new project
      const project = createProject(`New ${template.name}`);
      
      // 3. Mount filesystem and write the file
      const fs = await mount();
      const basePath = `/projects/${project.id}`;
      
      for (const dir of ["/projects", basePath]) {
        try {
          await fs.mkdir(dir);
        } catch {
          // might exist
        }
      }
      
      // We don't mark it as imported, so it will get the standard .vscode/settings.json
      // from ProjectPageClient seeding, but we write the main.tex so it doesn't use the default one.
      const buf = new TextEncoder().encode(content).buffer as ArrayBuffer;
      await fs.writeFile(`${basePath}/main.tex`, buf, { mimeType: "text/plain" });

      // If it's the IEEE template, also fetch and write the IEEEtran.cls file
      if (template.id === "ieee") {
        try {
          const clsResponse = await fetch(`${basePathEnv}${template.path}/IEEEtran.cls`);
          if (clsResponse.ok) {
            const clsContent = await clsResponse.text();
            const clsBuf = new TextEncoder().encode(clsContent).buffer as ArrayBuffer;
            await fs.writeFile(`${basePath}/IEEEtran.cls`, clsBuf, { mimeType: "text/plain" });
          }
        } catch (err) {
          console.error("Failed to copy IEEEtran.cls:", err);
        }
      }

      // 4. Navigate to the new project
      router.push(`/project/${project.id}`);
    } catch (err) {
      console.error("Failed to create from template:", err);
      alert("Failed to create project from template");
      setIsCreating(null);
    }
  };

  if (filteredTemplates.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--muted)] text-sm">
        <IconFileText />
        <p className="mt-2">No templates found.</p>
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div className="flex-1 overflow-auto">
        <div className="divide-y divide-[var(--border)]">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-[color-mix(in_srgb,var(--border)_35%,transparent)] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="shrink-0 text-[var(--accent)]">
                  <IconFileText />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[var(--foreground)] truncate">
                    {template.name}
                  </div>
                  <div className="text-xs text-[var(--muted)] truncate">
                    {template.description}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleCreateFromTemplate(template)}
                disabled={isCreating !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[var(--accent)] text-white rounded hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {isCreating === template.id ? (
                  <span className="animate-pulse">Creating...</span>
                ) : (
                  <>
                    <IconPlus />
                    Use
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className="group relative flex flex-col items-center p-4 rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--border)_18%,transparent)] hover:bg-[color-mix(in_srgb,var(--border)_30%,transparent)] transition-colors"
          >
            <div className="w-12 h-12 rounded-lg bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent)] flex items-center justify-center mb-4 mt-8 shrink-0 [&>svg]:w-6 [&>svg]:h-6">
              <IconFileText />
            </div>
            
            <div className="flex-1 min-w-0 flex flex-col items-center mb-4 w-full">
              <span className="text-sm font-medium text-[var(--foreground)] text-center truncate w-full">
                {template.name}
              </span>
              <span className="text-xs text-[var(--muted)] text-center line-clamp-2 mt-1">
                {template.description}
              </span>
            </div>
            
            <button
              onClick={() => handleCreateFromTemplate(template)}
              disabled={isCreating !== null}
              className="w-full flex items-center justify-center gap-2 py-2 bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent)] rounded-lg hover:bg-[var(--accent)] hover:text-white transition-colors disabled:opacity-50"
            >
              {isCreating === template.id ? (
                <span className="animate-pulse">Creating...</span>
              ) : (
                <>
                  <div className="[&>svg]:w-4 [&>svg]:h-4 flex items-center">
                    <IconPlus />
                  </div>
                  Use Template
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
