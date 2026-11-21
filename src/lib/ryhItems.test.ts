import { describe, expect, it } from "vitest";
import { accounts, receiptList } from "./ryhAccounts";
import { categoryShares, highlights, purchasedItems, totalPaid, totalsByReceipt } from "./ryhItems";

const purchaseReceipts = receiptList(accounts).filter((r) => r.item.tipo === "compra");
const receiptName = (base: string) => base.split("/").pop()!;

describe("what was bought (11 receipts)", () => {
  it("adds up, receipt by receipt, to the amount of each purchase in contas.json", () => {
    const byReceipt = totalsByReceipt(purchasedItems);
    expect(Object.keys(byReceipt).sort()).toEqual(purchaseReceipts.map((r) => receiptName(r.photo.base)).sort());
    for (const r of purchaseReceipts) expect(byReceipt[receiptName(r.photo.base)], receiptName(r.photo.base)).toBe(r.item.valorEUR);
  });

  it("totals 1 089,32 € with all lines; the shown categories add up to the visible 984,30 €", () => {
    expect(totalPaid(purchasedItems)).toBe(1089.32);
    const { categories, visibleTotal } = categoryShares(purchasedItems);
    expect(visibleTotal).toBe(984.3);
    expect(Math.round(categories.reduce((s, c) => s + c.valorEUR, 0) * 100) / 100).toBe(984.3);
    expect(categories.some((c) => c.categoria === "nao-identificado")).toBe(false);
    expect(categories.map((c) => c.categoria)[0]).toBe("mercearia");
    expect(Math.abs(categories.reduce((s, c) => s + c.share, 0) - 1)).toBeLessThan(1e-9);
  });

  it("gives exactly the highlights of the design", () => {
    expect(highlights(purchasedItems)).toEqual({
      leite: { unidades: 108, litros: 60 },
      massa: { unidades: 62, kg: 15 },
      arroz: { unidades: 41, kg: 21 },
      papel: { rolos: 84 },
      atum: { unidades: 20 },
      higiene: { artigos: 65 },
      legiveis: 513,
    });
  });
});
