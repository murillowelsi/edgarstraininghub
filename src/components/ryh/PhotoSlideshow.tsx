import { useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";
import { ryh } from "@/components/ryh/ryhStyles";
import type { DiaryPhoto } from "@/lib/ryhDiary";
import { cn } from "@/lib/utils";

/*
 * Calm automatic slideshow: one photo at a time, soft cross-fade every few seconds.
 * Pauses on hover / keyboard focus and with the pause button; no autoplay when the
 * reader prefers reduced motion. Dots let the reader pick a photo.
 */

const srcSet = (p: DiaryPhoto) => `${p.base}-640.webp 640w, ${p.base}-1280.webp 1280w`;

export interface SlideshowLabels {
  label: string;
  pause: string;
  play: string;
  goTo: string;
}

export function PhotoSlideshow({
  photos,
  labels,
  interval = 5000,
  className,
}: {
  photos: DiaryPhoto[];
  labels: SlideshowLabels;
  interval?: number;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [reduced, setReduced] = useState(false);
  const total = photos.length;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const running = total > 1 && !paused && !hovered && !reduced;
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % total), interval);
    return () => window.clearInterval(id);
  }, [running, total, interval]);

  if (!total) return null;

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={labels.label}
      className={cn("relative overflow-hidden rounded-[28px] bg-[var(--ryh-soft)]", className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      {photos.map((p, i) => (
        <img
          key={p.base}
          src={`${p.base}-1280.webp`}
          srcSet={srcSet(p)}
          sizes="(min-width: 1024px) 45vw, 100vw"
          width={p.w}
          height={p.h}
          alt={i === index ? p.alt : ""}
          aria-hidden={i !== index}
          loading={i === 0 ? "eager" : "lazy"}
          decoding="async"
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ease-in-out",
            i === index ? "opacity-100" : "opacity-0",
          )}
        />
      ))}

      {total > 1 && (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/35 to-transparent px-4 pb-3.5 pt-10">
          <div className="flex items-center gap-1.5">
            {photos.map((p, i) => (
              <button
                key={p.base}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={labels.goTo.replace("{{n}}", String(i + 1)).replace("{{total}}", String(total))}
                aria-current={i === index ? "true" : undefined}
                className={cn(
                  ryh.focus,
                  "h-2 rounded-full transition-all duration-300",
                  i === index ? "w-5 bg-white" : "w-2 bg-white/55 hover:bg-white/80",
                )}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPaused((v) => !v)}
            aria-label={paused ? labels.play : labels.pause}
            className={cn(ryh.focus, "grid h-8 w-8 place-items-center rounded-full bg-black/30 text-white hover:bg-black/45")}
          >
            {paused ? <Play className="h-3.5 w-3.5" aria-hidden /> : <Pause className="h-3.5 w-3.5" aria-hidden />}
          </button>
        </div>
      )}
    </div>
  );
}
