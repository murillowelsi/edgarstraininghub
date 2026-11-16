import { useState } from "react";
import { Lock } from "lucide-react";
import { ZoomLightbox } from "@/components/ryh/ZoomLightbox";
import { ryh } from "@/components/ryh/ryhStyles";
import { useLanguage } from "@/contexts/LanguageContext";
import type { DiaryPhoto } from "@/lib/ryhDiary";
import { cn } from "@/lib/utils";

/*
 * Photos of one logbook day: a horizontal strip (swipe / scroll) where each photo opens a
 * full-screen viewer with previous / next (buttons, arrow keys, swipe), a counter and Esc to close.
 * variant "thumbs" (accounts, RC-27): small 3:4 thumbnails, each with a caption under it
 * (e.g. "Personal details hidden"), also shown in the viewer.
 */

const srcSet = (p: DiaryPhoto) => `${p.base}-640.webp 640w, ${p.base}-1280.webp 1280w`;

export function PhotoStrip({ photos, label, variant = "strip", caption }: { photos: DiaryPhoto[]; label: string; variant?: "strip" | "thumbs"; caption?: string }) {
  const thumbs = variant === "thumbs";
  const { t } = useLanguage();
  const d = t.ryh.diary;
  const [open, setOpen] = useState<number | null>(null);
  const total = photos.length;

  const fill = (s: string, n: number) => s.replace("{{n}}", String(n)).replace("{{total}}", String(total));

  if (!total) return null;

  return (
    <div className={cn("-mx-[22px] md:mx-0", thumbs ? "mt-4" : "mt-[30px]")}>
      <ul role="list" aria-label={label} className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-[22px] pb-3 [scrollbar-width:thin] md:px-0">
        {photos.map((p, i) => (
          <li key={p.base} className={cn("snap-start", thumbs ? "w-[140px] shrink-0 md:w-[170px]" : total === 1 ? "w-full" : "shrink-0")}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-label={fill(d.openPhoto, i + 1)}
              className={cn(ryh.focus, "block cursor-zoom-in overflow-hidden", thumbs ? "w-full rounded-[12px]" : "rounded-[16px]", !thumbs && total === 1 && "w-full")}
            >
              <img
                src={`${p.base}-1280.webp`}
                srcSet={srcSet(p)}
                sizes={thumbs ? "(min-width: 768px) 170px, 140px" : "(min-width: 768px) 420px, 82vw"}
                width={p.w}
                height={p.h}
                alt={p.alt}
                loading="lazy"
                decoding="async"
                className={cn(
                  "bg-[var(--ryh-soft)] object-cover transition-transform duration-300 hover:scale-[1.02]",
                  // A single photo fills the column (any orientation); several form a scrollable strip
                  thumbs
                    ? "h-[186px] w-full md:h-[226px]"
                    : total === 1
                      ? "h-auto w-full max-w-full"
                      : "h-[min(64vh,500px)] w-auto max-w-none md:h-[540px]",
                )}
              />
            </button>
            {caption && (
              <p className="mt-1.5 flex items-start gap-1 text-[12.5px] leading-snug text-[var(--ryh-muted)]">
                <Lock className="mt-[2px] h-3 w-3 shrink-0" aria-hidden />
                {caption}
              </p>
            )}
          </li>
        ))}
      </ul>
      {total > 1 && <p className="px-[22px] text-[13px] text-[var(--ryh-muted)] md:px-0">{d.photosHint}</p>}

      {/* Full-screen viewer with zoom (shared with the shop): counter + caption, ← →, swipe at 1×, Esc */}
      <ZoomLightbox
        photos={photos.map((p) => ({ src: `${p.base}-1280.webp`, alt: p.alt, w: p.w, h: p.h }))}
        index={open}
        onIndexChange={setOpen}
        onClose={() => setOpen(null)}
        label={label}
        tone="dark"
        caption={caption}
      />
    </div>
  );
}
