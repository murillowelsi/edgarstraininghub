#!/usr/bin/env node
/**
 * Splits the user's diary (pt-PT, ez-project/raise-your-hands/diario.md) into one file
 * per entry under src/content/ryh-diario/, without retyping: titles, dates, places and
 * body text are copied byte for byte. Re-run when the user sends a new version:
 *   node scripts/ryh-diario/split.mjs <path/to/diario.md>
 * New days can also be added by hand as a new file (same frontmatter).
 */
import fs from "node:fs";
import path from "node:path";

const src = process.argv[2];
if (!src) throw new Error("usage: split.mjs <diario.md>");
const outDir = path.resolve("src/content/ryh-diario");
fs.mkdirSync(outDir, { recursive: true });

const text = fs.readFileSync(src, "utf8").replace(/<!--[\s\S]*?-->\s*/g, "");
const [head, ...sections] = text.split(/^## /m);

// Page header: "# Title" + "**Subtítulo da Página:** …"
const title = head.match(/^# (.+)$/m)[1].trim();
const subtitle = head.match(/\*\*Subtítulo da Página:\*\*\s*(.+)$/m)[1].trim();
fs.writeFileSync(path.join(outDir, "_pagina.pt.md"), `---\ntitulo: ${JSON.stringify(title)}\nsubtitulo: ${JSON.stringify(subtitle)}\n---\n`);

const months = { janeiro: 1, fevereiro: 2, "março": 3, abril: 4, maio: 5, junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12 };
const slugify = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

for (const raw of sections) {
  const section = raw.replace(/\n---\s*$/m, "").trim();
  const [heading, ...rest] = section.split("\n");
  const titulo = heading.trim();
  const rotulo = titulo.split(":")[0].trim(); // "Prólogo", "Chegada", "Dia 1"
  const metaLine = rest.find((l) => l.startsWith("**Data:**"));
  const body = rest.slice(rest.indexOf(metaLine) + 1).join("\n").replace(/^\s*---\s*$/gm, "").trim();
  // **Data:** 6 de novembro de 2026 (Sexta-feira) | **Local:** Reino Unido
  const m = metaLine.match(/\*\*Data:\*\*\s*(.+?)\s*\|\s*\*\*(Local|Trajeto):\*\*\s*(.+)$/);
  const [, dataTexto, tipo, lugar] = m;
  const d = dataTexto.match(/(\d+) de (\w+) de (\d{4})/);
  const iso = `${d[3]}-${String(months[d[2]]).padStart(2, "0")}-${String(d[1]).padStart(2, "0")}`;
  // DB-5: only Day 1 (Porto ➔ Chaves) is a known stage; others stay empty until the user says
  const etapa = rotulo === "Dia 1" ? "1" : "";
  const front = [
    "---",
    `data: ${iso}`,
    `dataTexto: ${JSON.stringify(dataTexto)}`,
    `rotulo: ${JSON.stringify(rotulo)}`,
    `titulo: ${JSON.stringify(titulo)}`,
    `tipo: ${tipo}`,
    `lugar: ${JSON.stringify(lugar.trim())}`,
    `etapa: ${etapa}`,
    "foto: ",
    "fotoAlt: ",
    "---",
  ].join("\n");
  const file = `${iso}-${slugify(rotulo)}.pt.md`;
  fs.writeFileSync(path.join(outDir, file), `${front}\n${body}\n`);
  console.log("wrote", file);
}
