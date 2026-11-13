import { Heart, Mountain, Youtube } from "lucide-react";
import { RyhShell } from "@/components/ryh/RyhShell";
import { ryh } from "@/components/ryh/ryhStyles";
import { ProductCard } from "@/components/ryh/shop/ProductCard";
import { Pending, ShopMeanwhile } from "@/components/ryh/shop/ShopParts";
import { showPlaceholders } from "@/config/raiseYourHands";
import { useLanguage } from "@/contexts/LanguageContext";
import { shopData, text } from "@/lib/ryhShop";
import { cn } from "@/lib/utils";

/*
 * Raise Your Hands shop window (ez-project/raise-your-hands/redesign/loja-vitrine/SPEC.md §2):
 * pre-launch, no price, no purchase, no form. Products from src/content/ryh-loja/produtos.json;
 * the bar gets no new item (the shop is reached from the footer and the final band).
 */

const RaiseYourHandsShop = () => {
  const { t, language } = useLanguage();
  const lang = language === "pt" ? "pt" : "en";
  const s = t.ryh.shop;
  const profit = text(shopData.lucro, lang);
  const products = shopData.produtos;

  const trust = [
    { key: "design", icon: Mountain, label: s.trust.design, show: true },
    // Only with the user's text (it points to the profit block)
    { key: "profit", icon: Heart, label: s.trust.profit, show: !!profit || showPlaceholders, href: "#lucro", pending: !profit },
    { key: "launch", icon: Youtube, label: s.trust.launch, show: true },
  ].filter((i) => i.show);

  return (
    <RyhShell page="shop" title={s.metaTitle} description={s.lead}>
      {/* 1 · Top band */}
      <section className={cn(ryh.wrap, "ryh-band")}>
        <div className="py-9 md:py-16">
          <span className={ryh.kicker}>{s.kicker}</span>
          <h1 className="ryh-serif my-3 text-[36px] font-normal leading-[1.08] tracking-[-0.015em] md:my-4 md:text-[56px]">{s.title}</h1>
          <p className={ryh.lead}>{s.lead}</p>
        </div>
      </section>

      <div className={cn(ryh.wrap, "pb-[72px] md:pb-[120px]")}>
        {/* 2 · Trust strip */}
        <ul aria-label={s.trust.label} className="flex flex-col gap-3 border-b border-[var(--ryh-line)] py-5 text-sm text-[var(--ryh-muted)] md:flex-row md:gap-10 md:py-6">
          {trust.map(({ key, icon: Icon, label, href, pending }) => (
            <li key={key} className="flex items-center gap-2.5">
              <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
              {href ? (
                <a href={href} className={cn(ryh.focus, "hover:text-[var(--ryh-fg)]")}>
                  {label}
                </a>
              ) : (
                label
              )}
              {pending && <Pending>{s.pending.replace("{{campo}}", s.details.profit)}</Pending>}
            </li>
          ))}
        </ul>

        {/* 3 + 4 · Count and grid (no filters with 2 pieces) */}
        {products.length > 0 && (
          <section aria-label={s.productsLabel} className="pt-7 md:pt-9">
            <p className="text-sm text-[var(--ryh-muted)]">{s.count.replace("{{n}}", String(products.length))}</p>
            <ul className="mt-4 grid max-w-[920px] grid-cols-2 gap-3 md:mt-5 md:gap-7">
              {products.map((p) => (
                <li key={p.slug}>
                  <ProductCard product={p} imageSizes="(min-width: 1024px) 446px, (min-width: 768px) 45vw, 50vw" />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 5 · Where the profit goes: hidden until the user sends the text */}
        {(profit || showPlaceholders) && (
          <div id="lucro" className="mt-12 max-w-[720px] scroll-mt-24 rounded-[20px] border border-[var(--ryh-line)] bg-[var(--ryh-paper)] px-5 py-5 md:mt-16 md:px-6">
            <h2 className="ryh-serif text-[19px] font-medium">{s.profitTitle}</h2>
            <p className={cn(ryh.p, "mt-1.5 md:text-base", !profit && "text-[13px] font-semibold md:text-[13px]")}>{profit || s.profitPending}</p>
          </div>
        )}

        {/* 6 · In the meantime */}
        <ShopMeanwhile className="mt-14 md:mt-16" />
      </div>
    </RyhShell>
  );
};

export default RaiseYourHandsShop;
