/**
 * Raise Your Hands accounts content (the shop lives in ryhShop.ts).
 * src/content/ryh-contas/contas.json: days → cities → items, with the exact values read from the
 * receipts (ez-project/raise-your-hands/contas/levantamento-2026-11-21.md). Nothing here is
 * invented; empty values (null, "", []) are hidden in production.
 */
import contasJson from "@/content/ryh-contas/contas.json";
import type { DiaryLang } from "@/lib/ryhDiary";

/** Cropped receipt with personal details covered: `${base}-1000.webp` and `${base}-2000.webp` */
export interface ReceiptPhoto {
  base: string;
  w: number;
  h: number;
}

export interface AccountsItem {
  /** "compra": supermarket purchase; "apoio-direto": money given straight to a family (transfer) */
  tipo: "compra" | "apoio-direto";
  /** Store name as on the receipt ("" for direct support) */
  loja: string;
  /** ISO date and HH:MM of the receipt */
  data: string;
  hora: string;
  valorEUR: number;
  /** Transfer reference (direct support), e.g. "Projeto Raise your hands" */
  referencia?: string;
  comprovativo: ReceiptPhoto | null;
}

export interface AccountsCity {
  cidade: string;
  familias: number;
  itens: AccountsItem[];
}

export interface AccountsDay {
  /** Logbook entry id ("chegada", "dia-2", …) */
  diaId: string;
  cidades: AccountsCity[];
}

export interface AccountsRaw {
  angariadoGBP: number | null;
  doacoesEmLogisticaEUR: number | null;
  metaFamilias: number | null;
  cambioGBPparaEUR: number | null;
  saldoEUR: number | null;
  /** ISO date, e.g. "2026-11-21" */
  atualizadoEm: string;
  dias: AccountsDay[];
}

export const accounts = contasJson as unknown as AccountsRaw;

export const hasNumber = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

/** Sum in whole cents, so 98,56 + 66,44 + … never drifts (floating point) */
const sumCents = (values: number[]) => values.reduce((s, v) => s + Math.round(v * 100), 0) / 100;

const itemsOf = (data: AccountsRaw) => data.dias.flatMap((d) => d.cidades.flatMap((c) => c.itens));

export interface AccountsTotals {
  /** Supermarket purchases */
  purchases: number;
  /** Money given straight to families */
  directSupport: number;
  /** purchases + directSupport */
  delivered: number;
  families: number;
  purchaseCount: number;
}

export function totals(data: AccountsRaw): AccountsTotals {
  const items = itemsOf(data);
  const purchases = sumCents(items.filter((i) => i.tipo === "compra").map((i) => i.valorEUR));
  const directSupport = sumCents(items.filter((i) => i.tipo === "apoio-direto").map((i) => i.valorEUR));
  return {
    purchases,
    directSupport,
    delivered: sumCents([purchases, directSupport]),
    families: data.dias.reduce((s, d) => s + d.cidades.reduce((t, c) => t + c.familias, 0), 0),
    purchaseCount: items.filter((i) => i.tipo === "compra").length,
  };
}

export const cityTotal = (city: AccountsCity) => sumCents(city.itens.map((i) => i.valorEUR));
export const dayTotal = (day: AccountsDay) => sumCents(day.cidades.map(cityTotal));

/**
 * Same notation as the rest of the page: PT "£1.000" / "136,70 €", EN "£1,000" / "€136.70".
 * Whole amounts without decimals ("50 €"), otherwise always 2 decimals.
 */
export function formatMoney(value: number, currency: "EUR" | "GBP", lang: DiaryLang): string {
  const [int, dec] = Math.abs(value).toFixed(Number.isInteger(value) ? 0 : 2).split(".");
  const group = lang === "pt" ? "." : ",";
  const num = int.replace(/\B(?=(\d{3})+(?!\d))/g, group) + (dec ? (lang === "pt" ? "," : ".") + dec : "");
  const sign = value < 0 ? "−" : "";
  if (currency === "GBP") return `${sign}£${num}`;
  return lang === "pt" ? `${sign}${num} €` : `${sign}€${num}`;
}

/** Receipts in page order, for one shared full-screen viewer (index = position in this list) */
export function receiptList(data: AccountsRaw): { item: AccountsItem; city: string; photo: ReceiptPhoto }[] {
  return data.dias.flatMap((d) => d.cidades.flatMap((c) => c.itens.flatMap((item) => (item.comprovativo ? [{ item, city: c.cidade, photo: item.comprovativo }] : []))));
}
