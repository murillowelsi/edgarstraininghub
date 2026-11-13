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

/** Plain text of the first sentence of an entry (RC-5 teaser) */
export function firstSentence(entry: DiaryEntry): string {
  const first = entry.blocks.find((b) => b.kind === "p");
  const text = first?.kind === "p" ? first.parts.map((p) => p.text).join("") : "";
  return text.match(/^(.+?[.!?])(?=\s+\p{Lu}|\s*$)/u)?.[1] ?? text;
}

/** "8 nov" / "8 Nov" for the index and the shortcut (from the ISO date, no time zone shift) */
export function shortDate(iso: string, lang: DiaryLang): string {
  const [y, m, d] = iso.split("-").map(Number);
  // Month alone: pt-PT turns "day + short month" into "08/11"
  const month = new Intl.DateTimeFormat(lang === "pt" ? "pt-PT" : "en-GB", { month: "short", timeZone: "UTC" })
    .format(new Date(Date.UTC(y, m - 1, d)))
    .replace(/\.$/, "");
  return `${d} ${month}`;
}

const FILES =import.meta.glob("/src/content/ryh-diario/*.md", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

export const diaryEntries = (lang: DiaryLang) => entriesFor(FILES, lang);
export const diaryPage = (lang: DiaryLang) => pageFor(FILES, lang);

/*
 * "From the road": Edgar's Instagram posts from the crossing, one Markdown file per post and
 * language in src/content/ryh-estrada/<yyyy-mm-dd>-post-<n>.<pt|en>.md. Frontmatter: data,
 * dataTexto, lugar, fotos (folder in public/ryh/estrada) and alts (JSON array, one per photo,
 * in order). Image sizes come from fotos.json (generated with the WebP files).
 */

export interface RoadPhoto {
  /** Without the size suffix: `${base}-640.webp` and `${base}-1280.webp` */
  base: string;
  w: number;
  h: number;
  alt: string;
}

export interface RoadPost {
  id: string;
  date: string;
  dateText: string;
  place: string;
  photos: RoadPhoto[];
  blocks: Block[];
}

type PhotoManifest = Record<string, { base: string; w: number; h: number }[]>;

export function parseRoadPost(file: string, raw: string, manifest: PhotoManifest): RoadPost {
  const { data, body } = parseFrontmatter(raw);
  let alts: string[] = [];
  try {
    alts = JSON.parse(data.alts || "[]");
  } catch {
    /* no descriptions */
  }
  return {
    id: slugOf(file),
    date: data.data,
    dateText: data.dataTexto,
    place: data.lugar,
    photos: (manifest[data.fotos] ?? []).map((p, i) => ({ ...p, alt: alts[i] ?? "" })),
    blocks: parseBody(body),
  };
}

/** Posts of one language, oldest first (same date: post number order) */
export function roadPostsFor(files: Record<string, string>, manifest: PhotoManifest, lang: DiaryLang): RoadPost[] {
  return Object.entries(files)
    .filter(([f]) => f.endsWith(`.${lang}.md`))
    .sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true }))
    .map(([f, raw]) => parseRoadPost(f, raw, manifest));
}

const ROAD_FILES = import.meta.glob("/src/content/ryh-estrada/*.md", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const ROAD_PHOTOS = import.meta.glob("/src/content/ryh-estrada/fotos.json", { import: "default", eager: true }) as Record<string, PhotoManifest>;

export const roadPosts = (lang: DiaryLang) => roadPostsFor(ROAD_FILES, Object.values(ROAD_PHOTOS)[0] ?? {}, lang);
