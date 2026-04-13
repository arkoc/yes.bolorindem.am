"use client";

import { useState, useEffect } from "react";
import { ExternalLink, ChevronUp } from "lucide-react";

type Candidate = {
  id: string;
  candidate_number: number;
  full_name: string;
  social_url: string | null;
  bio: string | null;
  reason: string | null;
  image_url: string | null;
};

function getColCount() {
  if (typeof window === "undefined") return 2;
  if (window.innerWidth >= 768) return 4;
  if (window.innerWidth >= 640) return 3;
  return 2;
}

export default function CandidatesGrid({ candidates }: { candidates: Candidate[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [colCount, setColCount] = useState(2);

  useEffect(() => {
    setColCount(getColCount());
    const handler = () => setColCount(getColCount());
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const expanded = candidates.find((c) => c.id === expandedId) ?? null;

  // Split into rows based on col count
  const rows: Candidate[][] = [];
  for (let i = 0; i < candidates.length; i += colCount) {
    rows.push(candidates.slice(i, i + colCount));
  }

  return (
    <div className="space-y-3">
      {rows.map((row, rowIdx) => {
        const rowHasExpanded = row.some((c) => c.id === expandedId);
        return (
          <div key={rowIdx}>
            {/* Card row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {row.map((c) => {
                const isExpanded = expandedId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setExpandedId(isExpanded ? null : c.id)}
                    className={`group relative rounded-2xl overflow-hidden aspect-[3/4] bg-primary/10 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all ${isExpanded ? "ring-2 ring-primary" : ""}`}
                  >
                    {c.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.image_url}
                        alt={c.full_name}
                        className="absolute inset-0 w-full h-full object-cover object-top grayscale transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-4xl font-bold text-primary">
                          {c.full_name.trim().charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className="absolute top-2 left-2 h-8 w-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow-md z-10">
                      {c.candidate_number}
                    </span>
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2 pt-6 pb-2 z-10">
                      <p className="text-white text-xs font-semibold leading-tight line-clamp-2">
                        {c.full_name}
                      </p>
                    </div>
                    {isExpanded && (
                      <div className="absolute inset-x-0 bottom-7 flex justify-center z-10">
                        <ChevronUp className="h-4 w-4 text-white drop-shadow" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Expanded detail — full width below the row */}
            {rowHasExpanded && expanded && (
              <div className="mt-3 rounded-2xl border bg-card overflow-hidden">
                <div className="flex gap-0">
                  <div className="flex-1 min-w-0 p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs font-bold items-center justify-center shrink-0">
                          {expanded.candidate_number}
                        </span>
                        <span className="font-bold text-base leading-tight">{expanded.full_name}</span>
                      </div>
                      {expanded.social_url && (
                        <a
                          href={expanded.social_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-primary hover:text-primary/70"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                    {expanded.bio && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{expanded.bio}</p>
                    )}
                    {expanded.reason && (
                      <div className="pt-2 border-t space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground">Ինչու՞ եմ բոլորին դեմ</p>
                        <p className="text-sm leading-relaxed">{expanded.reason}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
