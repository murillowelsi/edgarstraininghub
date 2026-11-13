import { useCallback, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { ryh } from "@/components/ryh/ryhStyles";
import { useLanguage } from "@/contexts/LanguageContext";
import type { DiaryPhoto } from "@/lib/ryhDiary";
import { cn } from "@/lib/utils";

/*
 * Photos of one logbook day: a horizontal strip (swipe / scroll) where each photo opens a
 * full-screen viewer with previous / next (buttons, arrow keys, swipe), a counter and Esc to close.
 */

const srcSet = (p: DiaryPhoto) => `${p.base}-640.webp 640w, ${p.base}-1280.webp 1280w`;

export function PhotoStrip({ photos, label }: { photos: DiaryPhoto[]; label: string }) {
  const { t } = useLanguage();
  const d = t.ryh.diary;
  const [open, setOpen] = useState<number | null>(null);
  const touchX = useRef<number | null>(null);
  const total = photos.length;

  const go = useCallback((delta: number) => setOpen((i) => (i === null ? i : (i + delta + total) % total)), [total]);
  const fill = (s: string, n: number) => s.replace("{{n}}", String(n)).replace("{{total}}", String(total));

  if (!total) return null;
  const current = open === null ? null : photos[open];

  return (
    <div className="-mx-[22px] mt-[30px] md:mx-0">
      <ul role="list" aria-label={label} className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-[22px] pb-3 [scrollbar-width:thin] md:px-0">
        {photos.map((p, i) => (
          <li key={p.base} className="shrink-0 snap-start">
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-label={fill(d.openPhoto, i + 1)}
              className={cn(ryh.focus, "block cursor-zoom-in overflow-hidden rounded-[16px]")}
            >
              <img
                src={`${p.base}-1280.webp`}
                srcSet={srcSet(p)}
                sizes="(min-width: 768px) 420px, 82vw"
                width={p.w}
                height={p.h}
                alt={p.alt}
                loading="lazy"
                decoding="async"
                className="h-[min(64vh,500px)] w-auto max-w-none bg-[var(--ryh-soft)] object-cover transition-transform duration-300 hover:scale-[1.02] md:h-[540px]"
              />
            </button>
          </li>
        ))}
      </ul>
      {total > 1 && <p className="px-[22px] text-[13px] text-[var(--ryh-muted)] md:px-0">{d.photosHint}</p>}

      <DialogPrimitive.Root open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#100f0d] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-3 outline-none md:p-8"
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") go(1);
              if (e.key === "ArrowLeft") go(-1);
            }}
            onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touchX.current === null) return;
              const dx = e.changedTouches[0].clientX - touchX.current;
              if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
              touchX.current = null;
            }}
          >
            <DialogPrimitive.Title className="sr-only">{label}</DialogPrimitive.Title>
            {current && (
              <>
                <img
                  key={current.base}
                  src={`${current.base}-1280.webp`}
                  srcSet={srcSet(current)}
                  sizes="100vw"
                  alt={current.alt}
                  className="max-h-[calc(100dvh-110px)] max-w-full rounded-[12px] object-contain"
                />
                <DialogPrimitive.Description className="mt-3 max-w-[60ch] text-center text-[14px] leading-snug text-white/75">
                  {fill(d.counter, (open ?? 0) + 1)} · {current.alt}
                </DialogPrimitive.Description>
              </>
            )}
            <DialogPrimitive.Close
              aria-label={d.close}
              className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              <X className="h-5 w-5" aria-hidden />
            </DialogPrimitive.Close>
            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label={d.prev}
                  className="absolute left-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white md:left-6"
                >
                  <ChevronLeft className="h-6 w-6" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label={d.next}
                  className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white md:right-6"
                >
                  <ChevronRight className="h-6 w-6" aria-hidden />
                </button>
              </>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
