import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProject } from "@/lib/projects";
import { mount } from "@wwog/idbfs";
import { IconFileText, IconPlus } from "./Icons";
import { DashboardView, DashboardItemProps } from "./DashboardView";

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

  const dashboardItems: DashboardItemProps[] = filteredTemplates.map(template => {
    return {
      id: template.id,
      title: template.name,
      subtitle: template.description,
      icon: <IconFileText />,
      listRightAccessory: (
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => {
            if (isCreating !== null) return;
            e.preventDefault();
            e.stopPropagation();
            handleCreateFromTemplate(template);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[var(--accent)] text-white rounded transition-opacity cursor-pointer ${
            isCreating !== null ? "opacity-50 pointer-events-none" : "hover:opacity-90"
          }`}
        >
          {isCreating === template.id ? (
            <span className="animate-pulse">Creating...</span>
          ) : (
            <>
              <IconPlus />
              Use
            </>
          )}
        </div>
      ),
      bottomAccessory: (
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => {
            if (isCreating !== null) return;
            e.preventDefault();
            e.stopPropagation();
            handleCreateFromTemplate(template);
          }}
          className={`w-full flex items-center justify-center gap-2 py-2 bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent)] rounded-lg transition-colors cursor-pointer ${
            isCreating !== null ? "opacity-50 pointer-events-none" : "hover:bg-[var(--accent)] hover:text-white"
          }`}
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
        </div>
      )
    };
  });

  return (
    <DashboardView 
      items={dashboardItems}
      viewMode={viewMode}
      emptyContent={
        <div className="flex flex-col items-center gap-2 text-[var(--muted)] text-sm">
          <IconFileText />
          <p>No templates found.</p>
        </div>
      }
    />
  );
}
