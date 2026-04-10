"use client";

import { useRef, useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

type Candidate = {
  id: string;
  candidate_number: number;
  full_name: string;
  social_url: string | null;
  bio: string | null;
  reason: string | null;
  image_url: string | null;
};

const COLLAPSED_HEIGHT = 160; // px

export default function CandidateCard({ c }: { c: Candidate }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (bodyRef.current) {
      setOverflows(bodyRef.current.scrollHeight > COLLAPSED_HEIGHT);
    }
  }, []);

  return (
    <div className="rounded-2xl border bg-card overflow-hidden flex gap-0 print:break-inside-avoid">
      {/* Photo */}
      <div className="relative shrink-0 w-32 sm:w-44" style={{ minHeight: COLLAPSED_HEIGHT }}>
        {c.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={c.image_url}
            alt={c.full_name}
            className="w-full h-full object-cover absolute inset-0"
          />
        ) : (
          <div className="w-full h-full bg-primary/10 flex items-center justify-center absolute inset-0">
            <span className="text-4xl font-bold text-primary">
              {c.full_name.trim().charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <span className="absolute top-2 left-2 h-9 w-9 rounded-full bg-primary text-primary-foreground text-base font-bold flex items-center justify-center shadow-md z-10">
          {c.candidate_number}
        </span>
        {/* Logo watermark at bottom of photo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.svg"
          alt=""
          className="absolute bottom-2 left-1/2 -translate-x-1/2 w-16 opacity-90 z-10 drop-shadow-md"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 p-4 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-bold text-base leading-tight">{c.full_name}</h2>
          {c.social_url && (
            <a
              href={c.social_url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-primary hover:text-primary/70"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>

        {/* Collapsible body */}
        <div
          ref={bodyRef}
          className="flex flex-col gap-2 overflow-hidden transition-all duration-300"
          style={{ maxHeight: expanded ? bodyRef.current?.scrollHeight : COLLAPSED_HEIGHT }}
        >
          {c.bio && (
            <p className="text-sm text-muted-foreground leading-relaxed">{c.bio}</p>
          )}
          {c.reason && (
            <div className="pt-2 border-t">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Ինչու՞ եմ բոլորին դեմ</p>
              <p className="text-sm leading-relaxed">{c.reason}</p>
            </div>
          )}
        </div>

        {overflows && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="self-start text-xs font-medium text-primary hover:underline mt-1 print:hidden"
          >
            {expanded ? "Փակել" : "Ավելին"}
          </button>
        )}
      </div>
    </div>
  );
}
