import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import en from "@/translations/en.json";
import pt from "@/translations/pt.json";
import { MERCH_COLOURS, MERCH_IMAGE, MERCH_PIECES, MERCH_VIEWS, merchAlt, merchBase } from "./ryhMerch";

const combos = MERCH_PIECES.flatMap((p) => MERCH_COLOURS.flatMap((c) => MERCH_VIEWS.map((v) => [p, c, v] as const)));

describe("merch images", () => {
  it("exist for every piece, colour and view, in both widths, under 120 KB, without metadata", () => {
    for (const [p, c, v] of combos)
      for (const w of MERCH_IMAGE.widths) {
        const file = join(process.cwd(), "public", `${merchBase(p, c, v)}-${w}.webp`);
        expect(existsSync(file), file).toBe(true);
        expect(statSync(file).size).toBeLessThan(120 * 1024);
        // RIFF/WebP width from the VP8/VP8L/VP8X header must match the srcset descriptor
        const buf = readFileSync(file);
        expect(buf.toString("latin1", 0, 4)).toBe("RIFF");
        expect(buf.includes(Buffer.from("EXIF"))).toBe(false);
      }
  });
});

describe("merchAlt", () => {
  it("describes piece, colour and view in PT and EN", () => {
    expect(merchAlt(pt.ryh.shop.merch, "camiseta", "areia", "frente")).toBe("Camiseta areia, frente, com o logo Raise Your Hands no peito");
    expect(merchAlt(en.ryh.shop.merch, "moletom", "grafite", "costas")).toBe(
      "Graphite kangaroo-pocket hoodie, back, with the map of Portugal and the Raise Your Hands logo",
    );
  });
});
