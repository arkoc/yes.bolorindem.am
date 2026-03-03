"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { BadgeIcon } from "@/components/ui/badge-icon";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

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
  const [dialogImageLoaded, setDialogImageLoaded] = useState(false);

  // Preload the image on mount so it's in the browser cache before the user clicks
  useEffect(() => {
    if (src) {
      const img = new window.Image();
      img.src = src;
    }
  }, [src]);

  function handleOpenChange(val: boolean) {
    if (!val) setDialogImageLoaded(false);
    setOpen(val);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("focus:outline-none active:scale-95 transition-transform cursor-pointer", className)}
        aria-label={name}
      >
        <BadgeIcon src={src} fallback={fallback} alt={name} size={size} />
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex flex-col items-center gap-4 max-w-xs text-center p-8">
          <div className={cn("relative flex items-center justify-center", !earned && "opacity-40")} style={{ width: 160, height: 160 }}>
            {src ? (
              <>
                {!dialogImageLoaded && (
                  <Loader2 className="absolute h-8 w-8 animate-spin text-muted-foreground" />
                )}
                <img
                  src={src}
                  alt={name}
                  width={160}
                  height={160}
                  className={cn("object-contain transition-opacity duration-200", dialogImageLoaded ? "opacity-100" : "opacity-0")}
                  onLoad={() => setDialogImageLoaded(true)}
                  onError={() => setDialogImageLoaded(true)}
                />
              </>
            ) : (
              <span className="leading-none" style={{ fontSize: 120 }}>{fallback}</span>
            )}
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
