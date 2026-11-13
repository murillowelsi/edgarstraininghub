import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { accounts, daysWithoutValues, formatMoney, invoicePhotos, recordedFood, shop, type AccountsRaw } from "./ryhAccounts";
import { diaryEntries } from "./ryhDiary";

describe("formatMoney", () => {
  it("follows the page notation in PT and EN", () => {
    expect(formatMoney(1000, "GBP", "pt")).toBe("£1.000");
    expect(formatMoney(1000, "GBP", "en")).toBe("£1,000");
    expect(formatMoney(493, "EUR", "pt")).toBe("493 €");
    expect(formatMoney(493, "EUR", "en")).toBe("€493");
    expect(formatMoney(12.5, "EUR", "pt")).toBe("12,50 €");
  });
});

describe("accounts content", () => {
  it("only records what the logbook says: 259 + 66 + 70 + 98 = 493 € (Chegada and Day 2)", () => {
    expect(recordedFood(accounts)).toEqual({ total: 493, dayIds: ["chegada", "dia-2"] });
    expect(daysWithoutValues(accounts)).toEqual(["dia-3", "dia-4"]);
    expect(accounts.angariadoGBP).toBe(1000);
    expect(accounts.doacoesEmLogisticaEUR).toBe(0);
  });

  it("has no invented numbers: total, exchange rate, balance and date stay empty until the user sends them", () => {
    expect(accounts.totalGastoAlimentosEUR).toBeNull();
    expect(accounts.cambioGBPparaEUR).toBeNull();
    expect(accounts.saldoEUR).toBeNull();
    expect(accounts.familiasAtendidas).toBeNull();
    expect(accounts.atualizadoEm).toBe("");
  });

  it("points every day to an existing logbook entry", () => {
    const ids = diaryEntries("pt").map((e) => e.id);
    for (const d of accounts.dias) expect(ids).toContain(d.diaId);
  });

  it("builds a default description for invoices without one", () => {
    const day: AccountsRaw["dias"][number] = { diaId: "dia-2", numCompras: 1, valoresEUR: [66], faturas: [{ base: "/ryh/contas/dia-2/01", w: 960, h: 1280, valorEUR: 66 }] };
    expect(invoicePhotos(day, "pt", (v) => `Fatura do Dia 2, ${v}`)[0].alt).toBe("Fatura do Dia 2, 66 €");
  });

  it("starts the shop empty (Coming soon) and without a profit text", () => {
    expect(shop.produtos).toEqual([]);
    expect(shop.lucro.pt).toBe("");
  });
});

/** RC-28: published images carry no EXIF/XMP metadata (GPS, camera, author) */
describe("published RYH photos", () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? walk(p) : p.endsWith(".webp") ? [p] : [];
    });
  const chunks = (buf: Buffer) => {
    const out: string[] = [];
    for (let i = 12; i + 8 <= buf.length; ) {
      const size = buf.readUInt32LE(i + 4);
      out.push(buf.toString("latin1", i, i + 4));
      i += 8 + size + (size & 1);
    }
    return out;
  };
  it("have no EXIF or XMP chunk", () => {
    const files = walk(join(process.cwd(), "public/ryh"));
    expect(files.length).toBeGreaterThan(0);
    const withMeta = files.filter((f) => chunks(readFileSync(f)).some((c) => c === "EXIF" || c === "XMP "));
    expect(withMeta).toEqual([]);
  });
});
