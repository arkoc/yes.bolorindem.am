"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import type { Candidate } from "@/app/(public)/candidates/page";

export default function CandidatesList({ candidates }: { candidates: Candidate[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {candidates.map((c) => {
        const isExpanded = expandedId === c.id;
        const shouldShowMore = !!c.bio;

        return (
          <div key={c.id} className="rounded-lg border overflow-hidden">
            {/* Main row */}
            <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
              {/* Number */}
              <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                {c.candidate_number}
              </div>
              {/* Avatar */}
              <div className="shrink-0 w-10 h-10 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
                {c.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.image_url}
                    alt={c.full_name}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <span className="text-sm font-bold text-primary">
                    {c.full_name.trim().charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-base">{c.full_name}</p>
              </div>
              {/* Actions */}
              <div className="shrink-0 flex items-center gap-2">
                {shouldShowMore && (
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : c.id)}
                    className="text-xs text-primary hover:text-primary/70 font-medium"
                  >
                    {isExpanded ? "Փակել" : "կենսագրություն"}
                  </button>
                )}
                {c.social_url && (
                  <a
                    href={c.social_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/70 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Expanded details */}
            {isExpanded && (c.reason || c.bio) && (
              <div className="border-t bg-muted/30 px-4 py-3 space-y-3 text-sm">
                {c.bio && (
                  <div>
                    <p className="text-muted-foreground">{c.bio}</p>
                  </div>
                )}
                {c.reason && (
                  <div>
                    <p className="font-semibold text-xs text-muted-foreground mb-1">Ինչու՞ եմ բոլորին դեմ</p>
                    <p className="text-muted-foreground">{c.reason}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
