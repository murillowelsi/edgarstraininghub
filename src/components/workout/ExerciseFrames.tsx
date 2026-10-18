import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

/**
 * Start/end photos of an exercise played as a two-frame loop — the catalog has
 * no GIFs, and flipping between the positions shows the movement just as well.
 * Both frames stay mounted so the swap never flashes while an image loads.
 */
export function ExerciseFrames({
  images,
  alt,
  className,
  interval = 900,
}: {
  images: string[];
  alt: string;
  className?: string;
  interval?: number;
}) {
  const [frame, setFrame] = useState(0);
  const frames = images.slice(0, 2);

  useEffect(() => {
    if (frames.length < 2) return;
    const id = window.setInterval(() => setFrame((f) => (f + 1) % frames.length), interval);
    return () => window.clearInterval(id);
  }, [frames.length, interval]);

  return (
    <div className={cn("relative overflow-hidden bg-white", className)}>
      {frames.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={i === 0 ? alt : ""}
          aria-hidden={i !== 0}
          className={cn(
            "absolute inset-0 h-full w-full object-contain transition-opacity duration-150",
            i === frame ? "opacity-100" : "opacity-0"
          )}
        />
      ))}
    </div>
  );
}
