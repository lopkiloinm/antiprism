"use client";

import { useState, useRef, useEffect } from "react";
import { IconChevronUp } from "./Icons";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
  disabled?: boolean;
}

export function Select({ id, value, onChange, options, className = "", disabled = false }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(option => option.value === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        id={id}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-2 px-2 py-1 text-xs rounded border transition-colors w-full ${
          disabled 
            ? "bg-[color-mix(in_srgb,var(--border)_22%,transparent)] border-[var(--border)] text-[var(--muted)] opacity-50 cursor-not-allowed"
            : "bg-[color-mix(in_srgb,var(--border)_22%,transparent)] border-[var(--border)] text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_35%,transparent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        } ${className}`}
      >
        <span className="flex-1 text-left truncate">{selectedOption?.label || "Select..."}</span>
        <div 
          className="w-4 h-4 flex items-center justify-center"
          style={{ 
            transition: "transform 0.2s", 
            transform: isOpen ? "rotate(0deg)" : "rotate(180deg)"
          }}
        >
          <IconChevronUp />
        </div>
      </button>
      
      {isOpen && !disabled && (
        <div className="absolute left-0 top-full mt-1 z-50 min-w-[160px] rounded border border-[var(--border)] bg-[var(--background)] shadow-xl overflow-hidden">
          <div style={{ maxHeight: "200px", overflowY: "auto" }}>
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                    isSelected 
                      ? "bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-[var(--accent)]"
                      : "text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)]"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
