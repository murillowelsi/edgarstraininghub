/**
 * "What was bought" on the Raise Your Hands accounts page.
 * src/content/ryh-contas/itens.json is generated from EZ Design's transcription of the 11 receipts
 * (scripts/ryh-contas/itens-from-csv.mjs). Everything shown is computed here from the items:
 * category totals, percentages and the highlights. Lines that can't be read on the receipts
 * ("nao-identificado") stay in the data so each receipt still adds up, but are never shown.
 */
import itensJson from "@/content/ryh-contas/itens.json";

export type ItemCategory =
  | "mercearia"
  | "higiene"
  | "pequeno-almoco"
  | "leite"
  | "mimos"
  | "ovos-charcutaria"
  | "fruta-legumes"
  | "limpeza"
  | "bebidas"
  | "nao-identificado";

export type HighlightGroup = "leite" | "massa" | "arroz" | "papel" | "atum";

export interface PurchasedItem {
  /** Receipt name, as in contas.json (comprovativo.base = /ryh/contas/<talao>) */
  talao: string;
  descricao: string;
  qtd: number;
  /** Amount paid for the line, discounts already applied */
  valorEUR: number;
  categoria: ItemCategory;
  /** What the receipt says for the highlights: units counted, litres / kg printed */
  destaque?: { grupo: HighlightGroup; unidades: number; litros?: number; kg?: number };
}

export const purchasedItems = (itensJson as unknown as { itens: PurchasedItem[] }).itens;

/** Unreadable lines: kept for the per-receipt check, never shown */
export const UNREADABLE: ItemCategory = "nao-identificado";
export const isVisible = (i: PurchasedItem) => i.categoria !== UNREADABLE;

const cents = (v: number) => Math.round(v * 100);
const fromCents = (c: number) => c / 100;

/** Sum paid per receipt (all lines, including unreadable ones) */
export function totalsByReceipt(items: PurchasedItem[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const i of items) out[i.talao] = (out[i.talao] ?? 0) + cents(i.valorEUR);
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, fromCents(v)]));
}

export const totalPaid = (items: PurchasedItem[]) => fromCents(items.reduce((s, i) => s + cents(i.valorEUR), 0));

export interface CategoryShare {
  categoria: ItemCategory;
  valorEUR: number;
  /** Share of the visible total, 0–1 */
  share: number;
}

/** Visible categories, largest first; shares are of the visible total (unreadable lines left out) */
export function categoryShares(items: PurchasedItem[]): { categories: CategoryShare[]; visibleTotal: number } {
  const byCat = new Map<ItemCategory, number>();
  for (const i of items.filter(isVisible)) byCat.set(i.categoria, (byCat.get(i.categoria) ?? 0) + cents(i.valorEUR));
  const totalC = [...byCat.values()].reduce((a, b) => a + b, 0);
  const categories = [...byCat.entries()]
    .map(([categoria, c]) => ({ categoria, valorEUR: fromCents(c), share: totalC ? c / totalC : 0 }))
    .sort((a, b) => b.valorEUR - a.valorEUR);
  return { categories, visibleTotal: fromCents(totalC) };
}

export interface Highlights {
  leite: { unidades: number; litros: number };
  massa: { unidades: number; kg: number };
  arroz: { unidades: number; kg: number };
  papel: { rolos: number };
  atum: { unidades: number };
  higiene: { artigos: number };
  /** Items readable on the receipts (quantities, unreadable lines excluded) */
  legiveis: number;
}

export function highlights(items: PurchasedItem[]): Highlights {
  const sum = (g: HighlightGroup, k: "unidades" | "litros" | "kg") =>
    Math.round(items.reduce((s, i) => s + (i.destaque?.grupo === g ? (i.destaque[k] ?? 0) : 0), 0) * 1000) / 1000;
  return {
    leite: { unidades: sum("leite", "unidades"), litros: sum("leite", "litros") },
    massa: { unidades: sum("massa", "unidades"), kg: sum("massa", "kg") },
    arroz: { unidades: sum("arroz", "unidades"), kg: sum("arroz", "kg") },
    papel: { rolos: sum("papel", "unidades") },
    atum: { unidades: sum("atum", "unidades") },
    higiene: { artigos: items.filter((i) => i.categoria === "higiene").reduce((s, i) => s + i.qtd, 0) },
    legiveis: items.filter(isVisible).reduce((s, i) => s + i.qtd, 0),
  };
}
