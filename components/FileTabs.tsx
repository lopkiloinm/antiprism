"use client";

interface Tab {
  path: string;
  type: "text" | "image";
}

interface FileTabsProps {
  tabs: Tab[];
  activePath: string | null;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
}

function getFileName(path: string): string {
  return path.split("/").filter(Boolean).pop() || path;
}

export function FileTabs({ tabs, activePath, onSelect, onClose }: FileTabsProps) {
  if (tabs.length === 0) return null;

  return (
    <div className="file-tabs-scroll h-12 flex flex-nowrap items-end border-b border-zinc-800 bg-zinc-900 shrink-0 overflow-x-auto overflow-y-hidden">
      {tabs.map((tab) => {
        const isActive = tab.path === activePath;
        const name = getFileName(tab.path);
        return (
          <div
            key={tab.path}
            className={`group relative flex items-center px-3 pr-3 border-r border-zinc-800 cursor-pointer shrink-0 min-w-0 max-w-[180px] h-full overflow-hidden ${
              isActive
                ? "bg-zinc-950 border-b-2 border-b-zinc-950 -mb-px text-zinc-100 [--gradient-end:rgb(3_7_18)]"
                : "bg-zinc-900/80 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300 [--gradient-end:rgb(24_24_27)] hover:[--gradient-end:rgb(39_39_42)]"
            }`}
            onClick={() => onSelect(tab.path)}
          >
            <span className="text-sm truncate block">{name}</span>
            <div
              className="absolute right-0 top-0 bottom-0 w-12 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{
                background: "linear-gradient(to right, transparent 0%, var(--gradient-end) 45%)",
              }}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose(tab.path);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto"
              title="Close"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
