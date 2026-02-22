import Link from "next/link";
import React from "react";

export interface DashboardItemProps {
  id: string;
  title: string;
  subtitle: React.ReactNode;
  icon?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  leftAccessory?: React.ReactNode;
  topRightAccessory?: React.ReactNode;
  bottomAccessory?: React.ReactNode;
  listRightAccessory?: React.ReactNode;
  isActive?: boolean;
}

export interface DashboardViewProps {
  items: DashboardItemProps[];
  viewMode: "list" | "icons";
  emptyContent: React.ReactNode;
}

export function DashboardView({ items, viewMode, emptyContent }: DashboardViewProps) {
  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--muted)] text-sm">
        {emptyContent}
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div className="flex-1 overflow-auto">
        <div className="divide-y divide-[var(--border)]">
          {items.map((item) => {
            const Wrapper = (item.href ? Link : "div") as any;
            const wrapperProps = {
              ...(item.href ? { href: item.href as any } : {}),
              ...(item.onClick && !item.href ? { onClick: item.onClick } : {}),
              className: `w-full flex items-center justify-between px-4 py-3 group ${
                item.isActive 
                  ? "bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]" 
                  : "hover:bg-[color-mix(in_srgb,var(--border)_35%,transparent)]"
              } transition-colors ${item.onClick || item.href ? "cursor-pointer text-left" : ""}`
            };

            return (
              <Wrapper key={item.id} {...wrapperProps}>
                <div className="flex items-center gap-3 min-w-0">
                  {item.leftAccessory && (
                    <div className="shrink-0" onClick={e => e.stopPropagation()}>
                      {item.leftAccessory}
                    </div>
                  )}
                  {item.icon && !item.leftAccessory && (
                    <div className="shrink-0 text-[var(--accent)]">
                      {item.icon}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[var(--foreground)] truncate">
                      {item.title}
                    </div>
                    <div className="text-xs text-[var(--muted)] truncate">
                      {item.subtitle}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {item.listRightAccessory ? (
                    item.listRightAccessory
                  ) : (
                    <>
                      {item.topRightAccessory && (
                        <div className="flex items-center gap-1">
                          {item.topRightAccessory}
                        </div>
                      )}
                      {item.bottomAccessory && (
                        <div className="ml-2">
                          {item.bottomAccessory}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </Wrapper>
            );
          })}
        </div>
      </div>
    );
  }

  // Icons view
  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
        {items.map((item) => {
          const isClickable = item.onClick || item.href;
          const Wrapper = (item.href ? Link : (item.onClick ? "div" : "div")) as any;
          
          let bgClass = "bg-[color-mix(in_srgb,var(--border)_18%,transparent)] hover:bg-[color-mix(in_srgb,var(--border)_30%,transparent)] border-[var(--border)]";
          if (item.isActive) {
            bgClass = "bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] border-[color-mix(in_srgb,var(--accent)_22%,transparent)]";
          }
          
          const wrapperProps = {
            ...(item.href ? { href: item.href as any } : {}),
            ...(item.onClick && !item.href ? { onClick: item.onClick } : {}),
            className: `flex flex-col items-center p-4 rounded-lg border ${bgClass} transition-colors group relative ${isClickable ? "cursor-pointer" : ""} text-left w-full h-full`
          };

          return (
            <Wrapper key={item.id} {...wrapperProps}>
              {item.leftAccessory && (
                <div className="absolute top-2 left-2 z-10">
                  {item.leftAccessory}
                </div>
              )}
              {item.topRightAccessory && (
                <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                  {item.topRightAccessory}
                </div>
              )}
              
              {/* Spacer/Icon container to push content down or center it */}
              {item.icon ? (
                <div className="w-12 h-12 rounded-lg bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent)] flex items-center justify-center mb-4 mt-8 shrink-0 [&>svg]:w-6 [&>svg]:h-6">
                  {item.icon}
                </div>
              ) : (
                <div className="mt-8"></div>
              )}

              <div className={`flex-1 min-w-0 flex flex-col items-center w-full ${item.bottomAccessory ? 'mb-4' : ''}`}>
                <span className="text-sm font-medium text-[var(--foreground)] text-center truncate w-full">
                  {item.title}
                </span>
                <span className="text-xs text-[var(--muted)] text-center line-clamp-2 mt-1">
                  {item.subtitle}
                </span>
              </div>
              
              {item.bottomAccessory && (
                <div className="w-full mt-auto z-10">
                  {item.bottomAccessory}
                </div>
              )}
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
}
