/**
 * Raise Your Hands shop (ez-project/raise-your-hands/redesign/loja-vitrine/SPEC.md).
 * Pre-launch: no price, no purchase, no form. Data in src/content/ryh-loja/produtos.json;
 * empty strings / null are hidden in production (dev shows them as [PENDENTE]).
 */
import lojaJson from "@/content/ryh-loja/produtos.json";
import type { DiaryLang } from "@/lib/ryhDiary";

type Localized = Partial<Record<DiaryLang, string>>;

export type ShopView = "frente" | "costas" | "detalhe";
export const SHOP_VIEWS: ShopView[] = ["frente", "costas", "detalhe"];

export interface ShopColour {
  id: string;
  nome: Localized;
  hex: string;
}

export interface ShopProduct {
  slug: string;
  tipo: Localized;
  nome: Localized;
  descricao: Localized;
  cores: ShopColour[];
  /** Logo centre on the front image, in % of width/height: the "Detail" view zooms there */
  detalhe: { x: number; y: number };
  tamanhos: Partial<Record<DiaryLang, string[]>> | null;
  impressao: Localized | null;
  material: Localized | null;
  envio: Localized | null;
  /** Stays null until launch; the layout already has its place (the "Coming soon" line) */
  preco: Localized | null;
  medidas: unknown;
}

export interface ShopData {
  lucro: Localized;
  produtos: ShopProduct[];
}

export const shopData = lojaJson as unknown as ShopData;

export const text = (v: Localized | null | undefined, lang: DiaryLang) => (v ? v[lang] || v.pt || "" : "");

export const findProduct = (slug: string | undefined) => shopData.produtos.find((p) => p.slug === slug);

export const colourOf = (product: ShopProduct, id: string | null | undefined) => product.cores.find((c) => c.id === id) ?? product.cores[0];

/** Image base without the size suffix; "detalhe" reuses the front image (zoomed by CSS) */
export const imageBase = (slug: string, colour: string, view: ShopView) => `/ryh/loja/${slug}-${colour}-${view === "costas" ? "costas" : "frente"}`;

export const IMAGE_SIZE = { w: 1000, h: 1250 };

export const srcSet = (base: string) => `${base}-500.webp 500w, ${base}-1000.webp 1000w`;

/** CSS zoom for the "Detail" view: scale around the centre, then move the logo centre to the middle */
export const DETAIL_SCALE = 2.6;
export const detailTransform = (product: ShopProduct) =>
  `scale(${DETAIL_SCALE}) translate(${(50 - product.detalhe.x).toFixed(1)}%, ${(50 - product.detalhe.y).toFixed(1)}%)`;

export interface AltTexts {
  alt: string;
  views: Record<ShopView, string>;
  art: Record<ShopView, string>;
}

/** "T-shirt areia, frente, com o logo Raise Your Hands no peito" / "Sand T-shirt, front, with …" */
export function productAlt(t: AltTexts, product: ShopProduct, colour: ShopColour, view: ShopView, lang: DiaryLang): string {
  const s = t.alt
    .replace("{{type}}", text(product.tipo, lang))
    .replace("{{colour}}", text(colour.nome, lang).toLowerCase())
    .replace("{{view}}", t.views[view].toLowerCase())
    .replace("{{art}}", t.art[view]);
  return s.charAt(0).toUpperCase() + s.slice(1);
}
