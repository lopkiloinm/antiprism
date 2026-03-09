"use client";

import { IconFileText, IconImage, IconCode2, IconBrain, IconBookOpen, IconGitBranch, IconPlus } from "@/components/Icons";

interface ExamplePrompt {
  id: string;
  title: string;
  prompt: string;
  icon: React.ReactNode;
  category: "document" | "image" | "code" | "analysis" | "research" | "git";
}

interface ExamplePromptsProps {
  onSelectPrompt: (prompt: string) => void;
  chatMode: "ask" | "agent";
}

const examplePrompts: ExamplePrompt[] = [
  {
    id: "latex-help",
    title: "LaTeX Help",
    prompt: "How do I create a table with merged cells in LaTeX?",
    icon: <IconFileText />,
    category: "document"
  },
  {
    id: "image-analysis",
    title: "Analyze Image",
    prompt: "What does this diagram show? Can you explain the key components?",
    icon: <IconImage />,
    category: "image"
  },
  {
    id: "code-review",
    title: "Code Review",
    prompt: "Can you review this Python function and suggest improvements?",
    icon: <IconCode2 />,
    category: "code"
  },
  {
    id: "document-analysis",
    title: "Document Analysis",
    prompt: "Summarize the main arguments in this research paper",
    icon: <IconBrain />,
    category: "analysis"
  },
  {
    id: "literature-review",
    title: "Literature Review",
    prompt: "Find recent papers on machine learning applications in healthcare",
    icon: <IconBookOpen />,
    category: "research"
  },
  {
    id: "git-help",
    title: "Git Assistance",
    prompt: "How do I resolve a merge conflict in my LaTeX project?",
    icon: <IconGitBranch />,
    category: "git"
  }
];

export function ExamplePrompts({ onSelectPrompt, chatMode }: ExamplePromptsProps) {
  // Filter prompts based on chat mode
  const filteredPrompts = chatMode === "agent" 
    ? examplePrompts.filter(p => p.category === "document")
    : examplePrompts;

  return (
    <div className="grid grid-cols-2 gap-0">
      {filteredPrompts.map((example, index) => (
        <div
          key={example.id}
          onClick={() => onSelectPrompt(example.prompt)}
          className="px-4 py-3 cursor-pointer text-sm flex items-center gap-3 min-w-0 transition-colors hover:bg-[color-mix(in_srgb,var(--border)_35%,transparent)]"
        >
          <span className="shrink-0 flex items-center justify-center w-4 h-4 text-[var(--muted)]">
            {example.icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium text-[var(--foreground)] leading-5">
              {example.title}
            </div>
          </div>
          <span className="shrink-0 flex items-center text-[var(--muted)] opacity-60">
            <IconPlus />
          </span>
        </div>
      ))}
    </div>
  );
}
