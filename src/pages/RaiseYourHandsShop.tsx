import { Link } from "react-router-dom";
import { Youtube } from "lucide-react";
import { RyhShell } from "@/components/ryh/RyhShell";
import { ryh } from "@/components/ryh/ryhStyles";
import { OUTLINE_A, ROUTE_A } from "@/components/ryh/ryhPaths";
import { RYH, ryhPaths, showPlaceholders } from "@/config/raiseYourHands";
import { useLanguage } from "@/contexts/LanguageContext";
import { localized, shop } from "@/lib/ryhAccounts";
import { cn } from "@/lib/utils";

/*
 * Raise Your Hands shop, "Coming soon" state only (ez-project/raise-your-hands/redesign/contas-loja/NOTA.md,
 * RC-31). No products, prices or e-mail form: the shop doesn't sell anything yet. The profit box shows
 * only when the user's text is in src/content/ryh-loja/produtos.json. The future shop window and
 * product page (RC-33/34) will read `shop.produtos` from the same file.
 */

/** Neutral line drawings with the logo map on the chest (reference only, not products) */
const GARMENTS = [
  ["M60 40 L95 22 Q125 40 155 22 L190 40 L220 85 L188 102 L180 90 L180 230 L70 230 L70 90 L62 102 L30 85 Z"],
  ["M70 52 Q125 0 180 52 L222 95 L196 118 L186 104 L186 232 L64 232 L64 104 L54 118 L28 95 Z", "M95 52 Q125 92 155 52", "M108 232 L108 200 L142 200 L142 232"],
  ["M70 80 L180 80 L195 232 L55 232 Z", "M95 80 Q95 30 125 30 Q155 30 155 80"],
];

function Illustration({ paths }: { paths: string[] }) {
  return (
    <svg viewBox="0 0 250 250" aria-hidden="true" className="h-[96px] w-[96px] md:h-[150px] md:w-[150px]">
      <g fill="none" stroke="var(--ryh-fg)" strokeWidth="3" strokeLinejoin="round" opacity=".85">
        {paths.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <g transform="translate(108 92) scale(.12)">
        <path d={OUTLINE_A} fill="none" stroke="var(--ryh-fg)" strokeWidth="14" />
        <path d={ROUTE_A} fill="none" stroke="var(--ryh-y)" strokeWidth="22" strokeLinecap="round" />
      </g>
    </svg>
  );
}

const RaiseYourHandsShop = () => {
  const { t, language } = useLanguage();
  const s = t.ryh.shop;
  const profit = localized(shop.lucro, language === "pt" ? "pt" : "en");

  return (
    <RyhShell page="shop" title={s.metaTitle} description={s.lead}>
      {/* Header band, same as the accounts page (RC-24) */}
      <section className={cn(ryh.wrap, "ryh-band")}>
        <div className="py-9 md:py-16">
          <span className={ryh.kicker}>{s.kicker}</span>
          <h1 className="ryh-serif my-3 text-[36px] font-normal leading-[1.08] tracking-[-0.015em] md:my-4 md:text-[56px]">{s.title}</h1>
          <p className={ryh.lead}>{s.lead}</p>
        </div>
      </section>

      <div className={cn(ryh.wrap, "pb-[72px] pt-12 md:pb-[120px] md:pt-16")}>
        {/* RC-31: reference illustrations */}
        <figure>
          {/* Mobile: two cards side by side (as in the mockup); "And more" from 640 px up */}
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5">
            {GARMENTS.map((paths, i) => (
              <li
                key={i}
                className={cn(
                  "flex flex-col items-center gap-3 rounded-[20px] border border-[var(--ryh-line)] bg-[var(--ryh-paper)] px-3 pb-5 pt-6 md:px-4 md:pb-8 md:pt-9",
                  i === 2 && "hidden sm:flex",
                )}
              >
                <Illustration paths={paths} />
                <span className="text-sm text-[var(--ryh-muted)]">{s.items[i]}</span>
              </li>
            ))}
          </ul>
          <figcaption className="mt-3 text-[12.5px] text-[var(--ryh-muted)]">{s.illustrationsNote}</figcaption>
        </figure>

        {/* Where the profit goes: hidden until the user sends the text */}
        {(profit || showPlaceholders) && (
          <div className="mt-8 max-w-[720px] rounded-[20px] border border-[var(--ryh-line)] bg-[var(--ryh-paper)] px-5 py-5 md:px-6">
            <h2 className="ryh-serif text-[19px] font-medium">{s.profitTitle}</h2>
            <p className={cn(ryh.p, "mt-1.5 md:text-base", !profit && "text-[13px] font-semibold md:text-[13px]")}>{profit || s.profitPending}</p>
          </div>
        )}

        {/* In the meantime: YouTube (primary), Instagram only with a link, the logbook; no e-mail form */}
        <h2 className={cn(ryh.h2, "mt-14 text-[28px] md:mt-16 md:text-[36px]")}>{s.meanwhile}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-[18px] md:gap-[22px]">
          <a href={RYH.subscribeUrl} target="_blank" rel="noopener noreferrer" className={cn(ryh.btn, ryh.focus)}>
            <Youtube className="h-[18px] w-[18px]" aria-hidden />
            {s.youtube}
          </a>
          {RYH.instagramUrl && (
            <a
              href={RYH.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                ryh.focus,
                "inline-flex h-[50px] items-center rounded-full border border-[var(--ryh-line)] px-5 text-[15.5px] font-medium transition-colors hover:border-[var(--ryh-fg)]",
              )}
            >
              {s.instagram}
            </a>
          )}
          <Link to={ryhPaths.diary} className={cn(ryh.link, ryh.focus)}>
            {s.diary}
          </Link>
        </div>
      </div>
    </RyhShell>
  );
};

export default RaiseYourHandsShop;
