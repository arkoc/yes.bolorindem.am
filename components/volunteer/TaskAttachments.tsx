"use client";

import { useState } from "react";
import { Download, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import L from "@/lib/labels";

interface TaskAttachmentsProps {
  urls: string[];
}

export function TaskAttachments({ urls }: TaskAttachmentsProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);

  async function handleDownload(url: string, index: number) {
    setDownloading(index);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const ext = url.split(".").pop()?.split("?")[0] ?? "jpg";
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `attachment-${index + 1}.${ext}`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      // fallback: open in new tab
      window.open(url, "_blank");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <>
      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2"
            onClick={() => setLightboxIndex(null)}
          >
            <X className="h-6 w-6" />
          </button>
          {lightboxIndex > 0 && (
            <button
              className="absolute left-3 text-white/80 hover:text-white p-3"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}
          {lightboxIndex < urls.length - 1 && (
            <button
              className="absolute right-3 text-white/80 hover:text-white p-3"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}
          <div className="relative max-w-2xl max-h-[80vh] mx-16" onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={urls[lightboxIndex]}
              alt=""
              className="object-contain max-w-full max-h-[80vh] rounded-lg"
            />
            <Button
              size="sm"
              variant="secondary"
              className="absolute bottom-3 right-3 gap-1.5"
              onClick={() => handleDownload(urls[lightboxIndex], lightboxIndex)}
              disabled={downloading === lightboxIndex}
            >
              <Download className="h-3.5 w-3.5" />
              {L.forms.task.downloadBtn}
            </Button>
          </div>
          {urls.length > 1 && (
            <div className="absolute bottom-4 flex gap-1.5">
              {urls.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(i); }}
                  className={`w-2 h-2 rounded-full transition-colors ${i === lightboxIndex ? "bg-white" : "bg-white/40"}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Grid */}
      <div className={`grid gap-2 ${urls.length === 1 ? "grid-cols-1" : urls.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
        {urls.map((url, i) => (
          <div key={i} className="relative group">
            <button
              type="button"
              onClick={() => setLightboxIndex(i)}
              className="relative aspect-square w-full rounded-lg overflow-hidden border hover:opacity-90 transition-opacity block"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover" />
            </button>
            <Button
              size="sm"
              variant="secondary"
              className="absolute bottom-1.5 right-1.5 h-7 gap-1 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => handleDownload(url, i)}
              disabled={downloading === i}
            >
              <Download className="h-3 w-3" />
              {L.forms.task.downloadBtn}
            </Button>
          </div>
        ))}
      </div>
    </>
  );
}
