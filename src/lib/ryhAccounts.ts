/**
 * Raise Your Hands accounts (RC-23..28) and shop (RC-31..34) content.
 * The numbers live in src/content/ryh-contas/contas.json and are filled in by the user:
 * nothing here is invented. Empty values (null, "", []) are hidden in production.
 */
import contasJson from "@/content/ryh-contas/contas.json";
import lojaJson from "@/content/ryh-loja/produtos.json";
import type { DiaryLang, DiaryPhoto } from "@/lib/ryhDiary";

type Localized = Partial<Record<DiaryLang, string>>;

export interface InvoicePhotoRaw {
  /** Without the size suffix: `${base}-640.webp` and `${base}-1280.webp` (public/ryh/contas/<dia>/) */
  base: string;
  w: number;
  h: number;
  /** Optional: the default is "Invoice of [day], [value], with personal details hidden" */
  alt?: Localized;
  /** Value of this invoice in euros, used in the default alt */
  valorEUR?: number | null;
}

export interface AccountsDayRaw {
  diaId: string;
  lugar?: Localized;
  numCompras: number | null;
  valoresEUR: number[];
  faturas: InvoicePhotoRaw[];
}

export interface AccountsRaw {
  angariadoGBP: number | null;
  doacoesEmLogisticaEUR: number | null;
  metaFamilias: number | null;
  familiasAtendidas: number | null;
  totalGastoAlimentosEUR: number | null;
  cambioGBPparaEUR: number | null;
  saldoEUR: number | null;
  /** ISO date, e.g. "2026-11-14" */
  atualizadoEm: string;
  dias: AccountsDayRaw[];
}

export interface ShopProductRaw {
  id: string;
  nome: Localized;
  categoria: "tshirt" | "hoodie" | "outro";
  preco?: string;
  url?: string;
  fotos?: InvoicePhotoRaw[];
}

export interface ShopRaw {
  lucro: Localized;
  produtos: ShopProductRaw[];
}

export const accounts = contasJson as unknown as AccountsRaw;
export const shop = lojaJson as unknown as ShopRaw;

const isNum = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

/** Sum of the purchase values recorded so far and the days they come from */
export function recordedFood(data: AccountsRaw): { total: number; dayIds: string[] } {
  const days = data.dias.filter((d) => d.valoresEUR.some(isNum));
  return { total: days.reduce((sum, d) => sum + d.valoresEUR.filter(isNum).reduce((a, b) => a + b, 0), 0), dayIds: days.map((d) => d.diaId) };
}

/** Days still without values (shown only as "purchases mentioned in the logbook") */
export const daysWithoutValues = (data: AccountsRaw) => data.dias.filter((d) => !d.valoresEUR.some(isNum)).map((d) => d.diaId);

/**
 * Same notation as the rest of the page: PT "£1.000" / "493 €", EN "£1,000" / "€493".
 * (Intl's pt-PT gives "1000 £", which doesn't match the copy.)
 */
export function formatMoney(value: number, currency: "EUR" | "GBP", lang: DiaryLang): string {
  const [int, dec] = Math.abs(value).toFixed(Number.isInteger(value) ? 0 : 2).split(".");
  const group = lang === "pt" ? "." : ",";
  const num = int.replace(/\B(?=(\d{3})+(?!\d))/g, group) + (dec ? (lang === "pt" ? "," : ".") + dec : "");
  const sign = value < 0 ? "−" : "";
  if (currency === "GBP") return `${sign}£${num}`;
  return lang === "pt" ? `${sign}${num} €` : `${sign}€${num}`;
}

export const localized = (v: Localized | undefined, lang: DiaryLang) => v?.[lang] || v?.pt || "";

/** Invoice photos of a day in the PhotoStrip format, with a default description */
export function invoicePhotos(day: AccountsDayRaw, lang: DiaryLang, defaultAlt: (value: string) => string): DiaryPhoto[] {
  return day.faturas.map((f) => ({
    base: f.base,
    w: f.w,
    h: f.h,
    alt: localized(f.alt, lang) || defaultAlt(isNum(f.valorEUR) ? formatMoney(f.valorEUR, "EUR", lang) : ""),
  }));
}

export const hasNumber = isNum;
