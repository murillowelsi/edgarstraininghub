import { describe, expect, it } from "vitest";
import { diaryEntries, diaryPage, entriesFor, parseBody, parseInline } from "./ryhDiary";

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

describe("real content", () => {
  it("has the same entries in PT and EN, in order, and only Day 1 has a stage", () => {
    const pt = diaryEntries("pt");
    const en = diaryEntries("en");
    expect(pt.map((e) => e.id)).toEqual(["prologo", "chegada", "dia-1", "dia-2", "dia-3"]);
    expect(en.map((e) => e.id)).toEqual(pt.map((e) => e.id));
    expect(pt.filter((e) => e.stage).map((e) => e.id)).toEqual(["dia-1"]);
    expect(en.map((e) => e.blocks.map((b) => b.kind).join())).toEqual(pt.map((e) => e.blocks.map((b) => b.kind).join()));
    expect(diaryPage("pt").title).toBe('Diário de Bordo: A Travessia "Raise Your Hands"');
  });
});
