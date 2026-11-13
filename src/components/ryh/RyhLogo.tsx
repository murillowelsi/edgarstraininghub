/* eslint-disable i18next/no-literal-string -- only proper names here (Raise Your Hands, Porto, Faro); the page copy is in translations (ryh) */
import { cn } from "@/lib/utils";
import { END, OUTLINE_A, OUTLINE_C, ROUTE_A, ROUTE_C, START } from "./ryhPaths";

/**
 * The Raise Your Hands logo — the ONE place to change when the logo changes.
 * Logo A (outline in line + yellow route + wordmark) and the compact mark C stay as
 * designed; only the colours follow the page tokens.
 * - full: map + wordmark (footer; hero with size lg on mobile, xl on desktop)
 * - trace: map only, no wordmark (hero: the name is already in the H1 and the menu, RC-4)
 * - mark: compact C (header)
 */
export function RyhLogo({
  variant = "full",
  size = "sm",
  className,
}: {
  variant?: "full" | "trace" | "mark";
  /** full only: "lg" = mobile hero, "xl" = desktop hero */
  size?: "sm" | "lg" | "xl";
  className?: string;
}) {
  const lg = size === "lg";
  const xl = size === "xl";
  if (variant === "mark") {
    return (
      <svg viewBox="-20 -20 385 745" className={cn("h-[26px] w-auto", className)} aria-hidden="true">
        <path d={OUTLINE_C} fill="none" stroke="currentColor" strokeWidth="30" strokeLinejoin="round" />
        <path d={ROUTE_C} fill="none" stroke="var(--ryh-y)" strokeWidth="46" strokeLinecap="round" />
      </svg>
    );
  }

  const map = (svgClass: string) => (
    <svg viewBox="-6 -6 357 717" className={svgClass} aria-hidden="true">
      {/* Exactly OUTLINE_A (= MAP_OUTLINE), non-scaling stroke in the text colour (RC-12) */}
      <path d={OUTLINE_A} fill="none" stroke="currentColor" strokeLinejoin="round" className="ryh-outline" />
      <path d={ROUTE_A} fill="none" stroke="var(--ryh-y)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      {[START, END].map(([cx, cy]) => (
        <circle key={cx} cx={cx} cy={cy} r="8" fill="var(--ryh-bg)" stroke="var(--ryh-y)" strokeWidth="5" />
      ))}
    </svg>
  );

  if (variant === "trace") {
    return <div className={cn("flex text-[var(--ryh-fg)]", className)}>{map("h-[150px] w-auto md:h-[470px]")}</div>;
  }

  return (
    <div className={cn("flex items-center text-[var(--ryh-fg)]", xl ? "gap-7 xl:gap-9" : lg ? "gap-6" : "gap-5", className)}>
      {map(xl ? "h-[340px] w-auto shrink-0 xl:h-[400px]" : lg ? "h-[150px] w-auto shrink-0" : "h-16 w-auto shrink-0")}
      <div aria-hidden>
        <b className={cn("block font-['Montserrat',sans-serif] font-black tracking-[0.02em]", xl ? "text-[52px] xl:text-[64px]" : lg ? "text-[44px]" : "text-[30px]", "leading-none")}>
          RAISE
          <br />
          YOUR
          <br />
          <span className="text-[var(--ryh-y)]">HANDS</span>
        </b>
        <span className={cn("block font-semibold tracking-[0.2em] text-[var(--ryh-muted)]", xl ? "mt-4 text-[12px] xl:mt-5 xl:text-[14px]" : lg ? "mt-3 text-[11px]" : "mt-2 text-[9px]")}>PORTO → FARO</span>
      </div>
    </div>
  );
}
