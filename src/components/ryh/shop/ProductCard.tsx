import { useState } from "react";
import { Link } from "react-router-dom";
import { ryh } from "@/components/ryh/ryhStyles";
import { ryhPaths } from "@/config/raiseYourHands";
import { useLanguage } from "@/contexts/LanguageContext";
import type { DiaryLang } from "@/lib/ryhDiary";
import { IMAGE_SIZE, colourOf, imageBase, productAlt, srcSet, text, type ShopProduct } from "@/lib/ryhShop";
import { cn } from "@/lib/utils";
import { SoonPill, Swatches } from "./ShopParts";

/**
 * Product card (SPEC §3): photo 4:5 on the studio background, front by default and the back on
 * hover (only with a fine pointer; no animation with reduced motion). The swatches change the
 * colour in the card without navigating; the name is a "stretched link" that covers the card and
 * carries the colour to the product page (?cor=).
 */
export function ProductCard({ product, imageSizes }: { product: ShopProduct; imageSizes: string }) {
  const { t, language } = useLanguage();
  const lang: DiaryLang = language === "pt" ? "pt" : "en";
  const s = t.ryh.shop;
  const [colourId, setColourId] = useState(product.cores[0]?.id ?? "");
  const colour = colourOf(product, colourId);
  const name = text(product.nome, lang);
  const front = imageBase(product.slug, colour.id, "frente");
  const back = imageBase(product.slug, colour.id, "costas");

  return (
    <article className="group relative">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[16px] bg-[var(--ryh-studio)]">
        <img
          src={`${front}-1000.webp`}
          srcSet={srcSet(front)}
          sizes={imageSizes}
          width={IMAGE_SIZE.w}
          height={IMAGE_SIZE.h}
          alt={productAlt(s, product, colour, "frente", lang)}
          // Literal class names (Tailwind only sees complete strings): hover swap only with a fine pointer
          className="absolute inset-0 h-full w-full object-contain transition-opacity duration-[250ms] motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-0"
        />
        {/* Back view: only shown on hover with a mouse/trackpad, so it is decorative here */}
        <img
          src={`${back}-1000.webp`}
          srcSet={srcSet(back)}
          sizes={imageSizes}
          width={IMAGE_SIZE.w}
          height={IMAGE_SIZE.h}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-contain opacity-0 transition-opacity duration-[250ms] motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100"
        />
        <SoonPill className="absolute left-2.5 top-2.5 md:left-3 md:top-3">{s.badge}</SoonPill>
        {/* Touch: two dots say there is more than the front (the photo opens the product) */}
        <span aria-hidden className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 gap-1.5 [@media(hover:hover)_and_(pointer:fine)]:hidden">
          <i className="h-1.5 w-1.5 rounded-full bg-[var(--ryh-fg)] opacity-70" />
          <i className="h-1.5 w-1.5 rounded-full bg-[var(--ryh-fg)] opacity-25" />
        </span>
      </div>

      <p className="mt-3 text-[13px] text-[var(--ryh-sage)]">{text(product.tipo, lang)}</p>
      <h3 className="ryh-serif mt-0.5 line-clamp-2 text-[15px] font-medium leading-snug md:text-[20px]">
        <Link
          to={`${ryhPaths.shop}/${product.slug}?cor=${colour.id}`}
          className={cn(ryh.focus, "rounded-sm after:absolute after:inset-0 after:content-['']")}
        >
          {name}
        </Link>
      </h3>
      <div className="relative z-10 mt-1 flex items-center gap-1.5">
        <Swatches
          colours={product.cores}
          selected={colour.id}
          onSelect={setColourId}
          labelOf={(c) => s.colorLabel.replace("{{cor}}", text(c.nome, lang))}
          className="-ml-[5px]"
        />
        <span className="text-[13px] text-[var(--ryh-muted)]">{s.colorsN.replace("{{n}}", String(product.cores.length))}</span>
      </div>
      {/* Never a value: "Em breve · preço a anunciar" until launch */}
      <p className="mt-1 text-[13px] md:text-sm">
        <span className="font-semibold text-[var(--ryh-fg)]">{s.priceSoon}</span>
        <span className="text-[var(--ryh-muted)]"> · {s.priceNote}</span>
      </p>
    </article>
  );
}
