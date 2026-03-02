"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

interface VolunteerSearchProps<T extends { id: string; full_name: string }> {
  users: T[];
  value: string;
  onChange: (userId: string) => void;
  placeholder?: string;
  className?: string;
  renderSuffix?: (user: T) => string;
}

export function VolunteerSearch<T extends { id: string; full_name: string }>({
  users,
  value,
  onChange,
  placeholder = "Search volunteer...",
  className,
  renderSuffix,
}: VolunteerSearchProps<T>) {
  const selected = users.find((u) => u.id === value);
  const [query, setQuery] = useState(selected?.full_name ?? "");
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) return;
    if (!value) {
      setQuery("");
    } else {
      const found = users.find((u) => u.id === value);
      if (found) setQuery(found.full_name);
    }
  }, [value, users, open]);

  const filtered = query.trim()
    ? users.filter((u) => u.full_name?.toLowerCase().includes(query.toLowerCase()))
    : users;

  function openWithPosition() {
    if (containerRef.current) {
      setRect(containerRef.current.getBoundingClientRect());
    }
    setOpen(true);
  }

  function select(u: T) {
    setQuery(u.full_name);
    setOpen(false);
    onChange(u.id);
  }

  function clear() {
    setQuery("");
    setOpen(false);
    onChange("");
  }

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (!value) setQuery("");
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [value]);

  const dropdownStyle: React.CSSProperties = rect
    ? { position: "fixed", top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 9999 }
    : { position: "fixed", top: -9999, left: -9999, zIndex: 9999 };

  const dropdown = open ? (
    <ul style={dropdownStyle} className="rounded-md border bg-popover shadow-md max-h-52 overflow-y-auto py-1">
      {filtered.length > 0 ? (
        filtered.map((u) => (
          <li
            key={u.id}
            className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-accent ${u.id === value ? "bg-accent font-medium" : ""}`}
            onMouseDown={() => select(u)}
          >
            <span>{u.full_name}</span>
            {renderSuffix && (
              <span className="text-xs text-muted-foreground ml-2 shrink-0">{renderSuffix(u)}</span>
            )}
          </li>
        ))
      ) : (
        <li className="px-3 py-2 text-sm text-muted-foreground">No results</li>
      )}
    </ul>
  ) : null;

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          className="pl-8 pr-7"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            openWithPosition();
            if (!e.target.value || value) onChange("");
          }}
          onFocus={openWithPosition}
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {mounted && dropdown ? createPortal(dropdown, document.body) : null}
    </div>
  );
}
