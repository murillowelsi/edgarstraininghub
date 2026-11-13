import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronDown, Map as MapIcon } from "lucide-react";
import { RyhShell } from "@/components/ryh/RyhShell";
import { ryh } from "@/components/ryh/ryhStyles";
import { ProductCard } from "@/components/ryh/shop/ProductCard";
import { Pending, ShopMeanwhile, SoonPill, Swatches } from "@/components/ryh/shop/ShopParts";
import { RYH, ryhPaths, showPlaceholders } from "@/config/raiseYourHands";
import { useLanguage } from "@/contexts/LanguageContext";
import type { DiaryLang } from "@/lib/ryhDiary";
import {
  IMAGE_SIZE,
  SHOP_VIEWS,
  colourOf,
  detailTransform,
  findProduct,
  imageBase,
  productAlt,
  shopData,
  srcSet,
  text,
  type ShopColour,
  type ShopProduct,
  type ShopView,
} from "@/lib/ryhShop";
import { cn } from "@/lib/utils";

/*
 * Raise Your Hands product page (ez-project/raise-your-hands/redesign/loja-vitrine/SPEC.md §4):
 * /raise-your-hands/loja/:slug (and /loja/:slug on the subdomain). Pre-launch: no price, no
 * purchase, no form; the call to action is the YouTube channel. ?cor= keeps the chosen colour.
 */

function ProductImage({ product, colour, view, sizes, alt, eager }: { product: ShopProduct; colour: ShopColour; view: ShopView; sizes: string; alt: string; eager?: boolean }) {
  const base = imageBase(product.slug, colour.id, view);
  return (
    <img
      src={`${base}-1000.webp`}
      srcSet={srcSet(base)}
      sizes={sizes}
      width={IMAGE_SIZE.w}
      height={IMAGE_SIZE.h}
      alt={alt}
      loading={eager ? undefined : "lazy"}
      decoding="async"
      // "Detail" is the front image zoomed on the chest logo (no extra asset)
      style={view === "detalhe" ? { transform: detailTransform(product) } : undefined}
      className="absolute inset-0 h-full w-full object-contain"
    />
  );
}

function Gallery({ product, colour, view, onView, lang }: { product: ShopProduct; colour: ShopColour; view: ShopView; onView: (v: ShopView) => void; lang: DiaryLang }) {
  const { t } = useLanguage();
  const s = t.ryh.shop;
  const touchX = useRef<number | null>(null);
  const index = SHOP_VIEWS.indexOf(view);
  const go = (delta: number) => onView(SHOP_VIEWS[(index + delta + SHOP_VIEWS.length) % SHOP_VIEWS.length]);
  const alt = (v: ShopView) => productAlt(s, product, colour, v, lang);

  return (
    <section aria-label={s.galleryLabel}>
      <div
        className="relative aspect-[4/5] overflow-hidden rounded-[16px] bg-[var(--ryh-studio)]"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
      >
        <ProductImage key={`${colour.id}-${view}`} product={product} colour={colour} view={view} alt={alt(view)} eager sizes="(min-width: 1024px) 640px, 100vw" />
        <p className="sr-only" aria-live="polite">
          {s.counter.replace("{{n}}", String(index + 1)).replace("{{total}}", String(SHOP_VIEWS.length))}
        </p>
        {/* Swipe hint on touch screens; the thumbnails below are the accessible control */}
        <span aria-hidden className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 md:hidden">
          {SHOP_VIEWS.map((v) => (
            <i key={v} className={cn("h-1.5 w-1.5 rounded-full bg-[var(--ryh-fg)]", v === view ? "opacity-80" : "opacity-25")} />
          ))}
        </span>
      </div>
      <ul className="mt-3 flex gap-2.5">
        {SHOP_VIEWS.map((v) => (
          <li key={v}>
            <button
              type="button"
              onClick={() => onView(v)}
              aria-current={v === view ? "true" : undefined}
              aria-label={s.viewOf.replace("{{view}}", s.views[v].toLowerCase())}
              className={cn(
                ryh.focus,
                "relative block aspect-[4/5] w-[72px] overflow-hidden rounded-[10px] border-2 bg-[var(--ryh-studio)]",
                v === view ? "border-[var(--ryh-fg)]" : "border-transparent hover:border-[var(--ryh-line)]",
              )}
            >
              <ProductImage product={product} colour={colour} view={v} alt="" sizes="72px" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** One row of the details accordion; hidden in production when there is no text */
function Detail({ title, body, open, pendingLabel }: { title: string; body: string; open?: boolean; pendingLabel: string }) {
  if (!body && !showPlaceholders) return null;
  return (
    <details open={open} className="group border-b border-[var(--ryh-line)]">
      <summary className={cn(ryh.focus, "flex cursor-pointer list-none items-center justify-between gap-3 py-4 text-[15px] font-medium [&::-webkit-details-marker]:hidden")}>
        <span>
          {title}
          {!body && <Pending>{pendingLabel}</Pending>}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-[var(--ryh-muted)] transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
      </summary>
      <p className="pb-4 text-[15px] leading-[1.65] text-[var(--ryh-muted)]">{body || "—"}</p>
    </details>
  );
}

const ExternalMark = ({ newTab }: { newTab: string }) => (
  <>
    <span aria-hidden>↗</span>
    <span className="sr-only"> {newTab}</span>
  </>
);

const RaiseYourHandsProduct = () => {
  const { slug } = useParams();
  const product = findProduct(slug);
  return product ? <ProductPage key={product.slug} product={product} /> : <Navigate to={ryhPaths.shop} replace />;
};

function ProductPage({ product }: { product: ShopProduct }) {
  const { t, language } = useLanguage();
  const lang: DiaryLang = language === "pt" ? "pt" : "en";
  const s = t.ryh.shop;
  const [params, setParams] = useSearchParams();
  const colour = colourOf(product, params.get("cor"));
  const [view, setView] = useState<ShopView>("frente");
  const ctaRef = useRef<HTMLAnchorElement>(null);
  const [showBar, setShowBar] = useState(false);

  const name = text(product.nome, lang);
  const type = text(product.tipo, lang);
  const profit = text(shopData.lucro, lang);
  const sizes = product.tamanhos?.[lang] ?? product.tamanhos?.pt ?? [];
  const others = shopData.produtos.filter((p) => p.slug !== product.slug);
  const pending = (field: string) => s.pending.replace("{{campo}}", field);

  // Changing the colour keeps the open view and updates ?cor= (shareable, survives refresh)
  const selectColour = (id: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("cor", id);
        return next;
      },
      { replace: true },
    );

  // 375: the bottom bar appears while the main call to action is off screen
  useEffect(() => {
    const el = ctaRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setShowBar(!entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const notifyLink = (label: ReactNode, className: string, ref?: React.Ref<HTMLAnchorElement>) => (
    <a ref={ref} href={RYH.subscribeUrl} target="_blank" rel="noopener noreferrer" className={cn(ryh.btn, ryh.focus, className)}>
      {label}
      <ExternalMark newTab={s.newTab} />
    </a>
  );

  return (
    <RyhShell page="shop" title={s.productMeta.replace("{{nome}}", name)} description={text(product.descricao, lang) || s.lead}>
      <div className={cn(ryh.wrap, "pb-[72px] pt-6 md:pb-[120px] md:pt-8")}>
        <nav aria-label={s.breadcrumb} className="text-[13px] text-[var(--ryh-muted)]">
          <ol className="flex items-center gap-1.5">
            <li>
              <Link to={ryhPaths.shop} className={cn(ryh.focus, "underline underline-offset-2 hover:text-[var(--ryh-fg)]")}>
                {s.backToShop}
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li aria-current="page">{type}</li>
          </ol>
        </nav>

        <div className="mt-4 grid gap-8 lg:mt-5 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-7">
            <Gallery product={product} colour={colour} view={view} onView={setView} lang={lang} />
          </div>

          {/* Info: sticky next to the gallery on desktop (below the 73 px sticky bar) */}
          <div className="lg:sticky lg:top-24 lg:col-span-5 lg:self-start">
            <p className="text-[13px] text-[var(--ryh-sage)]">{type}</p>
            <h1 className="ryh-serif mt-1 text-[32px] font-normal leading-[1.1] tracking-[-0.015em] lg:text-[44px]">{name || pending("nome")}</h1>

            {/* Status where the price will go */}
            <p className="mt-4 flex items-center gap-2.5">
              <SoonPill dark className="px-3 py-1.5 text-[13px]">
                {s.priceSoon}
              </SoonPill>
              <span className="text-[15px] text-[var(--ryh-muted)]">{s.priceNoteLong}</span>
            </p>

            {text(product.descricao, lang) ? (
              <p className={cn(ryh.p, "mt-5 md:text-base")}>{text(product.descricao, lang)}</p>
            ) : (
              <Pending className="ml-0 mt-5 inline-block">{pending("descrição")}</Pending>
            )}

            <div className="mt-6">
              <p className="text-[15px]">
                {s.color}: <span className="text-[var(--ryh-muted)]">{text(colour.nome, lang)}</span>
              </p>
              <Swatches
                colours={product.cores}
                selected={colour.id}
                onSelect={selectColour}
                labelOf={(c) => s.colorLabel.replace("{{cor}}", text(c.nome, lang))}
                size="lg"
                className="-ml-1 mt-1.5"
              />
            </div>

            {/* Planned sizes: information, not a choice (no buttons, not focusable). No size guide until the supplier's table exists. */}
            {(sizes.length > 0 || showPlaceholders) && (
              <div className="mt-6">
                <p className="text-[15px]">
                  {s.sizes}
                  {!sizes.length && <Pending>{pending("tamanhos")}</Pending>}
                </p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {sizes.map((size) => (
                    <li key={size} className="grid h-10 min-w-[48px] place-items-center rounded-[10px] border border-dashed border-[var(--ryh-line)] px-3 text-sm text-[var(--ryh-muted)]">
                      {size}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[13px] text-[var(--ryh-muted)]">{s.sizesNote}</p>
              </div>
            )}

            {/* Main call to action: an existing channel, never a disabled button */}
            <div className="mt-7">
              {notifyLink(s.notify, "w-full", ctaRef)}
              <p className="mt-2 text-center text-[13px] text-[var(--ryh-muted)]">{s.notifyNote}</p>
              {RYH.instagramUrl && (
                <a href={RYH.instagramUrl} target="_blank" rel="noopener noreferrer" className={cn(ryh.link, ryh.focus, "mt-3")}>
                  {s.instagramFollow}
                  <ExternalMark newTab={s.newTab} />
                </a>
              )}
            </div>

            <div className="mt-7 border-t border-[var(--ryh-line)]">
              <Detail title={s.details.print} body={text(product.impressao, lang)} open pendingLabel={pending(s.details.print)} />
              <Detail title={s.details.material} body={text(product.material, lang)} pendingLabel={pending(s.details.material)} />
              <Detail title={s.details.shipping} body={text(product.envio, lang)} pendingLabel={pending(s.details.shipping)} />
              <Detail title={s.details.profit} body={profit} pendingLabel={pending(s.details.profit)} />
            </div>

            {/* Mission seal: only with the profit text */}
            {(profit || showPlaceholders) && (
              <div className="mt-6 flex gap-3 rounded-[16px] bg-[var(--ryh-paper)] px-4 py-4">
                <MapIcon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ryh-sage)]" aria-hidden />
                <p className="text-[15px] leading-[1.55]">
                  {s.missionSeal}
                  {!profit && <Pending>{pending(s.details.profit)}</Pending>}{" "}
                  <Link to={ryhPaths.accounts} className={cn(ryh.focus, "font-medium underline decoration-[var(--ryh-y)] underline-offset-4")}>
                    {s.seeAccounts}
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>

        {others.length > 0 && (
          <section aria-labelledby="ryh-also" className="mt-16 md:mt-24">
            <h2 id="ryh-also" className={cn(ryh.h2, "text-[26px] md:text-[32px]")}>
              {s.alsoIn}
            </h2>
            <ul className="mt-4 grid max-w-[920px] grid-cols-2 gap-3 md:grid-cols-3 md:gap-7">
              {others.map((p) => (
                <li key={p.slug}>
                  <ProductCard product={p} imageSizes="(min-width: 768px) 290px, 50vw" />
                </li>
              ))}
            </ul>
          </section>
        )}

        <ShopMeanwhile className="mt-16 md:mt-24" />
      </div>

      {/* 375: fixed bar while the main CTA is off screen (respects the safe area) */}
      <div aria-hidden className="h-[calc(64px+env(safe-area-inset-bottom))] md:hidden" />
      {showBar && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--ryh-line)] bg-[var(--ryh-bg)] pb-[env(safe-area-inset-bottom)] md:hidden">
          <div className="flex h-16 items-center gap-3 px-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-medium">{name}</p>
              <p className="text-[12px] text-[var(--ryh-muted)]">{s.priceSoon}</p>
            </div>
            {notifyLink(s.notifyShort, "h-11 shrink-0 px-5 text-[15px]")}
          </div>
        </div>
      )}
    </RyhShell>
  );
}

export default RaiseYourHandsProduct;
