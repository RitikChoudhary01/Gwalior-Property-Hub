"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GalleryImage {
  url: string;
  caption?: string | null;
}

export function ImageGallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (!images.length) {
    return (
      <div className="grid aspect-[16/9] place-items-center rounded-xl bg-muted text-muted-foreground">
        No photographs available
      </div>
    );
  }

  const main = images[active];

  function step(delta: number, length: number, current: number) {
    return (current + delta + length) % length;
  }

  return (
    <div>
      {/* Main image */}
      <div className="group relative aspect-[16/10] overflow-hidden rounded-xl bg-muted sm:aspect-[16/9]">
        <button
          type="button"
          className="absolute inset-0 size-full cursor-zoom-in"
          aria-label="Open full photo gallery"
          onClick={() => {
            setLightboxIndex(active);
            setLightbox(true);
          }}
        >
          { }
          <img src={main.url} alt={main.caption ?? title} className="size-full object-cover" />
        </button>

        <span className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-stone-900/60 px-3 py-1 text-xs font-medium text-white backdrop-blur">
          <ZoomIn className="size-3.5" aria-hidden="true" />
          {active + 1} / {images.length}
        </span>

        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={() => setActive((a) => step(-1, images.length, a))}
              className="absolute left-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-stone-800 shadow transition hover:bg-white md:opacity-0 md:group-hover:opacity-100"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={() => setActive((a) => step(1, images.length, a))}
              className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-stone-800 shadow transition hover:bg-white md:opacity-0 md:group-hover:opacity-100"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </>
        )}
        {main.caption && (
          <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-stone-900/70 to-transparent px-4 py-2.5 text-left text-xs font-medium text-white">
            {main.caption}
          </span>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="gph-scroll mt-3 flex gap-2.5 overflow-x-auto pb-1" role="tablist" aria-label="Property photographs">
          {images.map((img, i) => (
            <button
              key={img.url + i}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`View photo ${i + 1}`}
              onClick={() => setActive(i)}
              className={cn(
                "relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-all sm:h-[4.5rem] sm:w-28",
                i === active ? "border-primary" : "border-transparent opacity-75 hover:opacity-100"
              )}
            >
              { }
              <img src={img.url} alt="" className="size-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <Dialog open={lightbox} onOpenChange={setLightbox}>
        <DialogContent className="max-w-5xl border-none bg-stone-950/95 p-0 sm:rounded-2xl [&>button]:bg-white/10 [&>button]:text-white [&>button]:hover:bg-white/20">
          <DialogTitle className="sr-only">{title} — photo gallery</DialogTitle>
          <div className="relative flex min-h-[60vh] items-center justify-center">
            { }
            <img
              src={images[lightboxIndex].url}
              alt={images[lightboxIndex].caption ?? title}
              className="max-h-[78vh] w-full object-contain"
            />
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous photo"
                  onClick={() => setLightboxIndex((a) => step(-1, images.length, a))}
                  className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/25"
                >
                  <ChevronLeft className="size-6" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Next photo"
                  onClick={() => setLightboxIndex((a) => step(1, images.length, a))}
                  className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/25"
                >
                  <ChevronRight className="size-6" aria-hidden="true" />
                </button>
              </>
            )}
            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              {lightboxIndex + 1} / {images.length}
              {images[lightboxIndex].caption ? ` — ${images[lightboxIndex].caption}` : ""}
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
