#!/usr/bin/env node
/*
 * itens.csv (EZ Design transcription of the 11 receipts) → src/content/ryh-contas/itens.json
 * Usage: node scripts/ryh-contas/itens-from-csv.mjs <itens.csv>
 *
 * Keeps only what the page needs (no personal data exists in the CSV): receipt, description,
 * quantity, amount paid, category. Tags the lines behind the "what was bought" highlights with
 * what the receipt itself says (units per pack, litres / kg printed); the page only sums them.
 */
import { readFileSync, writeFileSync } from "node:fs";

const CATEGORIES = {
  "Mercearia básica": "mercearia",
  "Higiene pessoal": "higiene",
  "Pequeno-almoço": "pequeno-almoco",
  "Leite e lacticínios": "leite",
  Mimos: "mimos",
  "Ovos, charcutaria e refeições": "ovos-charcutaria",
  "Fruta e legumes": "fruta-legumes",
  "Limpeza e sacos": "limpeza",
  Bebidas: "bebidas",
  "Não identificado": "nao-identificado",
};

/** Minimal CSV parser (quoted fields, commas inside quotes) */
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}

/** Highlight tag: units counted and, when printed on the receipt, the volume / weight */
function highlight(r, qtd) {
  const d = r.descricao.toLowerCase();
  const t = r.descricao_talao.toUpperCase();
  if (/^leite\b/.test(d)) {
    // 6×1 L packs ("6X1L", "6*1L") and the 6 L pack: 6 cartons each, 6 L printed
    const pack = /6\s*[×X*]\s*1\s*L/.test(t) || /6\s*×\s*1\s*L/.test(r.descricao) || /\b6L\b/.test(t);
    return pack ? { grupo: "leite", unidades: qtd * 6, litros: qtd * 6 } : { grupo: "leite", unidades: qtd };
  }
  if (/^massa\b/.test(d)) {
    const g = r.descricao.match(/(\d+)\s*g\b/);
    return g ? { grupo: "massa", unidades: qtd, kg: (qtd * Number(g[1])) / 1000 } : { grupo: "massa", unidades: qtd };
  }
  if (/^arroz\b/.test(d)) {
    const kg = r.descricao.match(/(\d+(?:[.,]\d+)?)\s*kg\b/i);
    return kg ? { grupo: "arroz", unidades: qtd, kg: qtd * Number(kg[1].replace(",", ".")) } : { grupo: "arroz", unidades: qtd };
  }
  if (/^papel higi/.test(d)) {
    const rolls = r.descricao.match(/(\d+)\s*rolos/);
    // Packs without the number of rolls on the receipt are not counted as rolls
    return { grupo: "papel", unidades: rolls ? qtd * Number(rolls[1]) : 0 };
  }
  if (/^atum\b/.test(d)) return { grupo: "atum", unidades: qtd };
  return undefined;
}

const src = process.argv[2];
if (!src) throw new Error("usage: itens-from-csv.mjs <itens.csv>");
const rows = parseCsv(readFileSync(src, "utf8"));
const itens = rows.map((r) => {
  const categoria = CATEGORIES[r.categoria];
  if (!categoria) throw new Error(`unknown category: ${r.categoria}`);
  const qtd = Number(r.qtd);
  const item = {
    talao: r.talao,
    descricao: r.descricao,
    qtd,
    valorEUR: Number(r.valor_pago),
    categoria,
  };
  const h = highlight(r, qtd);
  if (h) item.destaque = h;
  return item;
});

const out = {
  _leia:
    "Gerado por scripts/ryh-contas/itens-from-csv.mjs a partir de itens.csv (transcrição do EZ Design, ez-project/raise-your-hands/redesign/contas-itens/). Não editar à mão: corrija o CSV e volte a gerar. talao = nome do comprovativo em contas.json; valorEUR = valor pago (já com descontos); destaque = o que o talão diz (unidades, litros/kg impressos).",
  itens,
};
writeFileSync("src/content/ryh-contas/itens.json", JSON.stringify(out, null, 2) + "\n");
console.log(`${itens.length} linhas → src/content/ryh-contas/itens.json`);
