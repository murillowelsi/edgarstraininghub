import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { accounts, allCities, cityTotal, dayTotal, formatMoney, receiptList, totals } from "./ryhAccounts";
import { diaryEntries } from "./ryhDiary";

describe("formatMoney", () => {
  it("follows the page notation in PT and EN, exact to the cent", () => {
    expect(formatMoney(1000, "GBP", "pt")).toBe("£1\u00a0000");
    expect(formatMoney(1000, "GBP", "en")).toBe("£1,000");
    expect(formatMoney(1139.32, "EUR", "pt")).toBe("1\u00a0139,32\u00a0€");
    expect(formatMoney(1089.32, "EUR", "en")).toBe("€1,089.32");
    expect(formatMoney(136.7, "EUR", "pt")).toBe("136,70\u00a0€");
    expect(formatMoney(50, "EUR", "pt")).toBe("50\u00a0€");
    expect(formatMoney(50, "EUR", "pt", { cents: true })).toBe("50,00\u00a0€");
    expect(formatMoney(50, "EUR", "en", { cents: true })).toBe("€50.00");
  });
});

describe("accounts content (receipts of 21/11/2026)", () => {
  it("adds up to the confirmed totals: 1 089,32 € in purchases, 50 € direct support, 13 families", () => {
    expect(totals(accounts)).toEqual({ purchases: 1089.32, directSupport: 50, delivered: 1139.32, families: 13, purchaseCount: 11 });
    expect(accounts.metaFamilias).toBe(7);
    expect(accounts.angariadoGBP).toBe(1000);
    expect(accounts.doacoesEmLogisticaEUR).toBe(0);
  });

  it("keeps the user's decisions per city", () => {
    const city = (name: string) => accounts.dias.flatMap((d) => d.cidades).find((c) => c.cidade === name)!;
    expect(city("Porto · Vila Nova de Gaia").itens.map((i) => i.valorEUR)).toEqual([136.7]);
    expect(city("Chaves").itens.map((i) => i.valorEUR)).toEqual([98.56, 66.44, 70.18]);
    expect(cityTotal(city("Chaves"))).toBe(235.18);
    expect(dayTotal(accounts.dias.find((d) => d.diaId === "dia-3")!)).toBe(296.54);
    expect(city("Faro").itens.map((i) => i.tipo)).toEqual(["compra", "apoio-direto"]);
  });

  it("has no estimated numbers: exchange rate and balance stay empty", () => {
    expect(accounts.cambioGBPparaEUR).toBeNull();
    expect(accounts.saldoEUR).toBeNull();
  });

  it("points every day to an existing logbook entry, and every item date is a real ISO date", () => {
    const ids = diaryEntries("pt").map((e) => e.id);
    for (const d of accounts.dias) {
      expect(ids).toContain(d.diaId);
      for (const c of d.cidades) for (const i of c.itens) expect(i.data).toMatch(/^2026-11-\d{2}$/);
    }
  });

  it("has the 12 covered receipts, each with its full image and thumbnail", () => {
    const list = receiptList(accounts);
    expect(list).toHaveLength(12);
    for (const { photo } of list)
      for (const suffix of ["full", "thumb"]) expect(existsSync(join(process.cwd(), "public", `${photo.base}-${suffix}.webp`)), photo.base).toBe(true);
  });

  it("puts every town on a different stop of the route map", () => {
    const stops = allCities(accounts).map((c) => c.ponto);
    expect(stops).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(new Set(allCities(accounts).map((c) => c.id)).size).toBe(8);
  });
});

describe("logbook dates (receipts)", () => {
  it("Day 5 is 13/11 and Day 6 is 14/11, in PT and EN", () => {
    for (const lang of ["pt", "en"] as const) {
      const byId = Object.fromEntries(diaryEntries(lang).map((e) => [e.id, e.date]));
      expect(byId["dia-5"]).toBe("2026-11-13");
      expect(byId["dia-6"]).toBe("2026-11-14");
    }
  });
});

/** Published images carry no EXIF/XMP metadata (GPS, camera, author) */
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
