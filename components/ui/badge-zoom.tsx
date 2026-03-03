"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { BadgeIcon } from "@/components/ui/badge-icon";
import { cn } from "@/lib/utils";

interface BadgeZoomProps {
  src: string | null;
  fallback: string;
  name: string;
  description?: string;
  size?: number;
  earned?: boolean;
  className?: string;
}

export function BadgeZoom({ src, fallback, name, description, size = 40, earned = true, className }: BadgeZoomProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("focus:outline-none active:scale-95 transition-transform cursor-zoom-in", className)}
        aria-label={name}
      >
        <BadgeIcon src={src} fallback={fallback} alt={name} size={size} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex flex-col items-center gap-4 max-w-xs text-center p-8">
          <div className={cn(!earned && "opacity-40")}>
            <BadgeIcon src={src} fallback={fallback} alt={name} size={160} />
          </div>
          <div>
            <p className="font-bold text-base">{name}</p>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
            {!earned && (
              <p className="text-xs text-muted-foreground mt-2 italic">Not yet earned</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
