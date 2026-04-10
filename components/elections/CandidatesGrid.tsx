"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

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

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {candidates.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelected(c)}
            className="group relative rounded-2xl overflow-hidden aspect-[3/4] bg-primary/10 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {/* Photo */}
            {c.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.image_url}
                alt={c.full_name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl font-bold text-primary">
                  {c.full_name.trim().charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            {/* Number badge */}
            <span className="absolute top-2 left-2 h-8 w-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow-md z-10">
              {c.candidate_number}
            </span>

            {/* Name bar at bottom */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2 pt-6 pb-2 z-10">
              <p className="text-white text-xs font-semibold leading-tight line-clamp-2">
                {c.full_name}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Detail modal */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-sm p-0 overflow-hidden rounded-2xl">
          {selected && (
            <>
              {/* Photo header */}
              <div className="relative aspect-[4/3] bg-primary/10">
                {selected.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selected.image_url}
                    alt={selected.full_name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-6xl font-bold text-primary">
                      {selected.full_name.trim().charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="absolute top-3 left-3 h-10 w-10 rounded-full bg-primary text-primary-foreground text-base font-bold flex items-center justify-center shadow-md">
                  {selected.candidate_number}
                </span>
                {/* Logo watermark */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.svg"
                  alt=""
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 w-16 opacity-90 drop-shadow-md"
                />
              </div>

              {/* Details */}
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <DialogTitle className="text-lg font-bold leading-tight">
                    {selected.full_name}
                  </DialogTitle>
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
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
