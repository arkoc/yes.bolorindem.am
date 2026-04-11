"use client";

import { useState, useEffect } from "react";
import { ExternalLink, X } from "lucide-react";

type Candidate = {
  id: string;
  candidate_number: number;
  full_name: string;
  social_url: string | null;
  bio: string | null;
  reason: string | null;
  image_url: string | null;
};

export default function CandidatesGrid({ candidates }: { candidates: Candidate[] }) {
  const [selected, setSelected] = useState<Candidate | null>(null);

  useEffect(() => {
    if (selected) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [selected]);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {candidates.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelected(c)}
            className="group relative rounded-2xl overflow-hidden aspect-[3/4] bg-primary/10 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
          </button>
        ))}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative w-full sm:max-w-sm max-h-[95dvh] sm:max-h-[90dvh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-background shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle (mobile) */}
            <div className="sticky top-0 z-10 flex justify-center pt-3 pb-1 sm:hidden bg-background rounded-t-3xl">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Close button */}
            <button
              onClick={() => setSelected(null)}
              className="absolute top-3 right-3 z-20 h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Photo — natural size, no clipping */}
            {selected.image_url ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selected.image_url}
                  alt={selected.full_name}
                  className="w-full object-contain max-h-72 bg-black"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.svg"
                  alt=""
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 w-14 opacity-90 drop-shadow-md"
                />
              </div>
            ) : (
              <div className="w-full h-40 bg-primary/10 flex items-center justify-center">
                <span className="text-6xl font-bold text-primary">
                  {selected.full_name.trim().charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            {/* Number badge */}
            <span className="absolute top-10 sm:top-3 left-3 h-10 w-10 rounded-full bg-primary text-primary-foreground text-base font-bold flex items-center justify-center shadow-md z-10">
              {selected.candidate_number}
            </span>

            {/* Details */}
            <div className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-bold leading-tight">{selected.full_name}</h2>
                {selected.social_url && (
                  <a
                    href={selected.social_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-primary hover:text-primary/70 mt-0.5"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
              {selected.bio && (
                <p className="text-sm text-muted-foreground leading-relaxed">{selected.bio}</p>
              )}
              {selected.reason && (
                <div className="pt-3 border-t space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">Ինչու՞ եմ բոլորին դեմ</p>
                  <p className="text-sm leading-relaxed">{selected.reason}</p>
                </div>
              )}
              <div className="pb-2" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
