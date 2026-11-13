import { describe, expect, it } from "vitest";
import { diaryEntries, diaryPage, diaryPhotos, entriesFor, firstSentence, parseBody, parseInline, photosFor, shortDate } from "./ryhDiary";

describe("parseInline", () => {
  it("keeps bold and italic from the user's text", () => {
    expect(parseInline("valor de **259 €**, na *Barbosa Bike Shop*.")).toEqual([
      { kind: "text", text: "valor de " },
      { kind: "strong", text: "259 €" },
      { kind: "text", text: ", na " },
      { kind: "em", text: "Barbosa Bike Shop" },
      { kind: "text", text: "." },
    ]);
  });
});

describe("parseBody", () => {
  it("splits paragraphs and '* ' lists", () => {
    const blocks = parseBody("Primeiro.\n\n* **A:** um\n* **B:** dois\n\nFim.");
    expect(blocks.map((b) => b.kind)).toEqual(["p", "ul", "p"]);
    expect(blocks[1].kind === "ul" && blocks[1].items.length).toBe(2);
  });
});

describe("entriesFor", () => {
  const file = (date: string, slug: string, lang: string, extra = "") =>
    [`/src/content/ryh-diario/${date}-${slug}.${lang}.md`, `---\ndata: ${date}\ndataTexto: "x"\nrotulo: "${slug}"\ntitulo: "T"\ntipo: Trajeto\nlugar: "A ➔ B"\netapa: ${extra}\nfoto: \n---\nTexto.\n`];
  it("orders by date, keeps the language and the optional stage", () => {
    const files = Object.fromEntries([file("2026-11-08", "dia-1", "pt", "1"), file("2026-11-06", "prologo", "pt"), file("2026-11-08", "dia-1", "en", "1")]);
    const pt = entriesFor(files, "pt");
    expect(pt.map((e) => e.id)).toEqual(["prologo", "dia-1"]);
    expect(pt[0].stage).toBeUndefined();
    expect(pt[1].stage).toBe("1");
    expect(pt[1].photo).toBeUndefined();
  });
});

describe("firstSentence / shortDate", () => {
  it("cuts the teaser at the first sentence and formats the short date", () => {
    const [entry] = entriesFor(Object.fromEntries([["/src/content/ryh-diario/2026-11-08-dia-1.pt.md", "---\ndata: 2026-11-08\n---\nPrimeira frase com 3 °C. Segunda frase.\n"]]), "pt");
    expect(firstSentence(entry)).toBe("Primeira frase com 3 °C.");
    expect(shortDate("2026-11-08", "pt")).toBe("8 nov");
    expect(shortDate("2026-11-08", "en")).toBe("8 Nov");
  });
});

describe("real content", () => {
  it("has the same entries in PT and EN, in order, and only Day 1 has a stage", () => {
    const pt = diaryEntries("pt");
    const en = diaryEntries("en");
    expect(pt.map((e) => e.id)).toEqual(["prologo", "chegada", "dia-1", "dia-2", "dia-3", "dia-4"]);
    expect(en.map((e) => e.id)).toEqual(pt.map((e) => e.id));
    expect(pt.filter((e) => e.stage).map((e) => e.id)).toEqual(["dia-1"]);
    expect(en.map((e) => e.blocks.map((b) => b.kind).join())).toEqual(pt.map((e) => e.blocks.map((b) => b.kind).join()));
    expect(diaryPage("pt").title).toBe("Diário de Bordo");
  });
});

describe("photos per entry", () => {
  const index = { "dia-1": [{ base: "/ryh/diario/dia-1/01", w: 960, h: 1280, alt: { pt: "Bicicleta", en: "Bike" } }] };

  it("returns the entry's photos with the description in the reader's language", () => {
    expect(photosFor(index, "dia-1", "en")).toEqual([{ base: "/ryh/diario/dia-1/01", w: 960, h: 1280, alt: "Bike" }]);
    expect(photosFor(index, "prologo", "pt")).toEqual([]);
  });

  it("ships photos only for existing entries, each with a description in both languages", () => {
    const ids = new Set(diaryEntries("pt").map((e) => e.id));
    for (const id of ["prologo", "chegada", "dia-1", "dia-2", "dia-3", "dia-4"]) {
      expect(ids.has(id)).toBe(true);
      for (const lang of ["pt", "en"] as const) {
        const photos = diaryPhotos(id, lang);
        expect(photos.length).toBeGreaterThan(0);
        for (const p of photos) expect(p.alt).not.toBe("");
      }
    }
  });
});
