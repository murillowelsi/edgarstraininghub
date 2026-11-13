import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import en from "@/translations/en.json";
import pt from "@/translations/pt.json";
import { SHOP_VIEWS, colourOf, detailTransform, findProduct, imageBase, productAlt, shopData } from "./ryhShop";

const root = process.cwd();

describe("shop data", () => {
  it("has the two pieces with two colours each and no price (pre-launch)", () => {
    expect(shopData.produtos.map((p) => p.slug)).toEqual(["camiseta", "moletom"]);
    for (const p of shopData.produtos) {
      expect(p.cores.map((c) => c.id)).toEqual(["areia", "grafite"]);
      expect(p.preco).toBeNull();
      expect(p.medidas).toBeNull();
      expect(p.tipo.pt && p.tipo.en).toBeTruthy();
    }
    expect(shopData.produtos.map((p) => p.tipo.pt)).toEqual(["T-shirt", "Hoodie"]);
  });

  it("falls back to the first colour for an unknown ?cor=", () => {
    const p = findProduct("camiseta")!;
    expect(colourOf(p, "grafite").id).toBe("grafite");
    expect(colourOf(p, "rosa").id).toBe("areia");
    expect(findProduct("caneca")).toBeUndefined();
  });

  it("zooms the detail on the chest logo (T-shirt as in the spec)", () => {
    expect(detailTransform(findProduct("camiseta")!)).toBe("scale(2.6) translate(13.5%, 13.7%)");
  });
});

describe("shop images", () => {
  it("exist for every piece, colour and view, in 500 and 1000 px, under 120 KB, with transparency and no metadata", () => {
    for (const p of shopData.produtos)
      for (const c of p.cores)
        for (const v of SHOP_VIEWS)
          for (const w of [500, 1000]) {
            const file = join(root, "public", `${imageBase(p.slug, c.id, v)}-${w}.webp`);
            expect(existsSync(file), file).toBe(true);
            expect(statSync(file).size).toBeLessThan(120 * 1024);
            const buf = readFileSync(file);
            expect(buf.toString("latin1", 8, 16)).toBe("WEBPVP8X"); // extended format = alpha channel
            expect(buf.includes(Buffer.from("EXIF"))).toBe(false);
          }
  });
});

describe("productAlt", () => {
  it("describes type, colour, view and artwork in PT and EN", () => {
    const tee = findProduct("camiseta")!;
    const hoodie = findProduct("moletom")!;
    expect(productAlt(pt.ryh.shop, tee, tee.cores[0], "frente", "pt")).toBe("T-shirt areia, frente, com o logo Raise Your Hands no peito");
    expect(productAlt(en.ryh.shop, hoodie, hoodie.cores[1], "costas", "en")).toBe("Graphite Hoodie, back, with the map of the Porto → Faro route");
  });
});

describe("product routes on Vercel", () => {
  it("have a static HTML entry and rewrites (www and subdomain) for every product, so a direct refresh works", () => {
    const vercel = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8")) as { rewrites: { source: string; destination: string }[] };
    const vite = readFileSync(join(root, "vite.config.ts"), "utf8");
    for (const { slug } of shopData.produtos) {
      const html = `raise-your-hands-loja-${slug}.html`;
      expect(existsSync(join(root, html))).toBe(true);
      expect(vite).toContain(html);
      for (const source of [`/loja/${slug}`, `/raise-your-hands/loja/${slug}`])
        expect(vercel.rewrites.find((r) => r.source === source)?.destination).toBe(`/${html}`);
    }
  });
});
