/* eslint-disable i18next/no-literal-string -- pt-PT-only landing: the copy is the user's exact text (ez-project/raise-your-hands/conteudo.md), not app UI to translate */
import { cn } from "@/lib/utils";
import { END, OUTLINE_A, OUTLINE_C, ROUTE_A, ROUTE_C, START } from "./ryhPaths";

/**
 * The Raise Your Hands logo — the ONE place to change when the final logo arrives
 * (the user asked for adjustments). Variant A for now: Portugal outline in a thin line,
 * the route in EZ yellow, start/end points, and the wordmark next to it.
 * The wordmark is HTML text in Montserrat (already loaded by the site), so it needs no
 * outlined glyphs. `mark` is the compact version (logo C) for the header.
 */
export function RyhLogo({
  variant = "full",
  className,
}: {
  /** full: map + wordmark (hero) · mark: compact map only (header, small sizes) */
  variant?: "full" | "mark";
  className?: string;
}) {
  if (variant === "mark") {
    return (
      <svg viewBox="-20 -20 385 745" className={cn("h-8 w-auto", className)} aria-hidden="true">
        <path d={OUTLINE_C} fill="none" stroke="hsl(var(--ryh-fg))" strokeWidth="30" strokeLinejoin="round" />
        <path d={ROUTE_C} fill="none" stroke="hsl(var(--primary))" strokeWidth="46" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <div className={cn("flex items-center gap-5 md:gap-7", className)}>
      <svg viewBox="-6 -6 357 717" className="h-44 w-auto shrink-0 md:h-[440px]" role="img" aria-label="Raise Your Hands: Matosinhos → Faro">
        <path d={OUTLINE_A} fill="none" stroke="hsl(var(--ryh-fg))" strokeWidth="5" strokeLinejoin="round" />
        <path d={ROUTE_A} fill="none" stroke="hsl(var(--primary))" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
        {[START, END].map(([cx, cy]) => (
          <circle key={cx} cx={cx} cy={cy} r="9" fill="hsl(var(--ryh-fg))" stroke="hsl(var(--primary))" strokeWidth="5" />
        ))}
      </svg>
      <div aria-hidden className="font-display">
        <b className="block text-[30px] font-black leading-none tracking-[0.02em] md:text-[64px]">
          RAISE
          <br />
          YOUR
          <br />
          <span className="text-[hsl(var(--ryh-ink))]">HANDS</span>
        </b>
        <span className="mt-2 block font-sans text-[10px] font-semibold tracking-[0.2em] text-[hsl(var(--ryh-muted))] md:mt-3.5 md:text-[13px]">
          MATOSINHOS → FARO
        </span>
      </div>
    </div>
  );
}
