/**
 * Raise Your Hands logbook (DB-1): one Markdown file per entry and language in
 * src/content/ryh-diario/<yyyy-mm-dd>-<slug>.<pt|en>.md. Adding a day = adding a file.
 * The body supports what the user's text uses: paragraphs, "* " lists, **bold**, *italic*.
 * It becomes plain data (no HTML strings), rendered by React.
 */

export type DiaryLang = "pt" | "en";

export type Inline = { kind: "text" | "strong" | "em"; text: string };
export type Block = { kind: "p"; parts: Inline[] } | { kind: "ul"; items: Inline[][] };

export interface DiaryEntry {
  /** Anchor id, e.g. "dia-1" (same in both languages) */
  id: string;
  /** ISO date, used for order */
  date: string;
  dateText: string;
  label: string;
  title: string;
  /** "Local" (a place) or "Trajeto" (from → to) */
  kind: "Local" | "Trajeto";
  place: string;
  /** Only when known (DB-5) */
  stage?: string;
  photo?: { src: string; alt: string };
  blocks: Block[];
}

export interface DiaryPage {
  title: string;
  subtitle: string;
}

/** "key: value" lines between --- markers; values may be JSON strings */
export function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  const data: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();
    if (value.startsWith('"')) {
      try {
        value = JSON.parse(value);
      } catch {
        /* keep as written */
      }
    }
    data[key] = value;
  }
  return { data, body: m[2] };
}

/** **bold** and *italic* (non-nested, as in the user's text) */
export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push({ kind: "text", text: text.slice(last, m.index) });
    out.push(m[1] !== undefined ? { kind: "strong", text: m[1] } : { kind: "em", text: m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}

export function parseBody(body: string): Block[] {
  const blocks: Block[] = [];
  for (const chunk of body.trim().split(/\n\s*\n/)) {
    const lines = chunk.split("\n").filter((l) => l.trim());
    if (!lines.length) continue;
    if (lines.every((l) => /^\s*[*-] /.test(l))) {
      blocks.push({ kind: "ul", items: lines.map((l) => parseInline(l.replace(/^\s*[*-] /, ""))) });
    } else {
      blocks.push({ kind: "p", parts: parseInline(lines.join(" ")) });
    }
  }
  return blocks;
}

const slugOf = (file: string) => file.replace(/^.*\/\d{4}-\d{2}-\d{2}-/, "").replace(/\.(pt|en)\.md$/, "");

export function parseEntry(file: string, raw: string): DiaryEntry {
  const { data, body } = parseFrontmatter(raw);
  return {
    id: slugOf(file),
    date: data.data,
    dateText: data.dataTexto,
    label: data.rotulo,
    title: data.titulo,
    kind: data.tipo === "Trajeto" ? "Trajeto" : "Local",
    place: data.lugar,
    ...(data.etapa ? { stage: data.etapa } : {}),
    ...(data.foto ? { photo: { src: data.foto, alt: data.fotoAlt || "" } } : {}),
    blocks: parseBody(body),
  };
}

/** Entries of one language, oldest first (chronological, as decided) */
export function entriesFor(files: Record<string, string>, lang: DiaryLang): DiaryEntry[] {
  return Object.entries(files)
    .filter(([f]) => f.endsWith(`.${lang}.md`) && !/\/_pagina\./.test(f))
    .map(([f, raw]) => parseEntry(f, raw))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function pageFor(files: Record<string, string>, lang: DiaryLang): DiaryPage {
  const raw = Object.entries(files).find(([f]) => f.endsWith(`/_pagina.${lang}.md`))?.[1] ?? "";
  const { data } = parseFrontmatter(raw);
  return { title: data.titulo ?? "", subtitle: data.subtitulo ?? "" };
}

const FILES = import.meta.glob("/src/content/ryh-diario/*.md", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

export const diaryEntries = (lang: DiaryLang) => entriesFor(FILES, lang);
export const diaryPage = (lang: DiaryLang) => pageFor(FILES, lang);
