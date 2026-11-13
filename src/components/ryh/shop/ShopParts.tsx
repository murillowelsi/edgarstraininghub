import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Youtube } from "lucide-react";
import { ryh } from "@/components/ryh/ryhStyles";
import { RYH, ryhPaths, showPlaceholders } from "@/config/raiseYourHands";
import { useLanguage } from "@/contexts/LanguageContext";
import type { ShopColour } from "@/lib/ryhShop";
import { cn } from "@/lib/utils";

/** Development-only marker for content the user still has to approve or send */
export const Pending = ({ children, className }: { children: ReactNode; className?: string }) =>
  showPlaceholders ? (
    <span className={cn("ml-2 rounded bg-[var(--ryh-soft)] px-1.5 py-0.5 align-middle text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--ryh-muted)]", className)}>
      {children}
    </span>
  ) : null;

/** "Em breve" pill (photo badge and product status) */
export const SoonPill = ({ children, dark = false, className }: { children: ReactNode; dark?: boolean; className?: string }) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-semibold leading-none",
      dark ? "bg-[var(--ryh-btn-bg)] text-[var(--ryh-btn-fg)]" : "bg-[var(--ryh-paper)] text-[var(--ryh-fg)]",
      className,
    )}
  >
    {children}
  </span>
);

/** Colour swatches: 18 px dots with a 28 px touch area (card) or 28 px dots (product page) */
export function Swatches({
  colours,
  selected,
  onSelect,
  labelOf,
  size = "sm",
  className,
}: {
  colours: ShopColour[];
  selected: string;
  onSelect: (id: string) => void;
  labelOf: (c: ShopColour) => string;
  size?: "sm" | "lg";
  className?: string;
}) {
  return (
    <div className={cn("flex items-center", size === "sm" ? "gap-0.5" : "gap-2.5", className)}>
      {colours.map((c) => (
        <button
          key={c.id}
          type="button"
          aria-pressed={c.id === selected}
          aria-label={labelOf(c)}
          title={labelOf(c)}
          onClick={() => onSelect(c.id)}
          className={cn("grid place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ryh-sage)]", size === "sm" ? "h-7 w-7" : "h-9 w-9")}
        >
          <span
            aria-hidden
            className={cn(
              "ryh-swatch block rounded-full border border-[var(--ryh-line)]",
              size === "sm" ? "h-[18px] w-[18px]" : "h-7 w-7",
              // Selected: 2 px ring in the text colour with a 2 px gap
              c.id === selected && "ring-2 ring-[var(--ryh-fg)] ring-offset-2 ring-offset-[var(--ryh-bg)]",
            )}
            style={{ backgroundColor: c.hex }}
          />
        </button>
      ))}
    </div>
  );
}

/** Shared "In the meantime" block: YouTube (primary), Instagram only with a link, the logbook */
export function ShopMeanwhile({ className }: { className?: string }) {
  const { t } = useLanguage();
  const s = t.ryh.shop;
  return (
    <section className={className}>
      <h2 className={cn(ryh.h2, "text-[28px] md:text-[36px]")}>{s.meanwhile}</h2>
      <div className="mt-2 flex flex-wrap items-center gap-[18px] md:gap-[22px]">
        <a href={RYH.subscribeUrl} target="_blank" rel="noopener noreferrer" className={cn(ryh.btn, ryh.focus)}>
          <Youtube className="h-[18px] w-[18px]" aria-hidden />
          {s.youtube}
          <span className="sr-only"> {s.newTab}</span>
        </a>
        {RYH.instagramUrl && (
          <a
            href={RYH.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(ryh.focus, "inline-flex h-[50px] items-center rounded-full border border-[var(--ryh-line)] px-5 text-[15.5px] font-medium transition-colors hover:border-[var(--ryh-fg)]")}
          >
            {s.instagram}
            <span className="sr-only"> {s.newTab}</span>
          </a>
        )}
        <Link to={ryhPaths.diary} className={cn(ryh.link, ryh.focus)}>
          {s.diary}
        </Link>
      </div>
    </section>
  );
}
