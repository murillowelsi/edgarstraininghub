import { useEffect, useState } from "react";
import { RyhShell } from "@/components/ryh/RyhShell";
import { ryh } from "@/components/ryh/ryhStyles";
import { useLanguage } from "@/contexts/LanguageContext";
import { diaryEntries, diaryPage, shortDate, type DiaryEntry, type Inline } from "@/lib/ryhDiary";
import { cn } from "@/lib/utils";

/*
 * Raise Your Hands logbook (NOTA.md DB-3..6): entries in chronological order, 65ch column,
 * Newsreader 20 px / 1.75, sticky index on desktop, scrollable chips on mobile, one anchor
 * per entry (#dia-1) and "↑ Index" at the end of each. Text comes from
 * src/content/ryh-diario (PT = the user's text as is, EN = faithful translation).
 */

const InlineText = ({ parts }: { parts: Inline[] }) => (
  <>
    {parts.map((p, i) =>
      p.kind === "strong" ? <strong key={i}>{p.text}</strong> : p.kind === "em" ? <em key={i}>{p.text}</em> : <span key={i}>{p.text}</span>,
    )}
  </>
);

/** The entry being read: the last one whose title has passed the upper third of the screen */
function useActiveEntry(ids: string[]) {
  const [active, setActive] = useState(ids.at(-1) ?? "");
  useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    if (!els.length) return;
    const update = () => {
      const line = window.innerHeight / 3;
      let current = els[0].id;
      for (const el of els) if (el.getBoundingClientRect().top <= line) current = el.id;
      // At the very bottom the last entry is the one being read
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) current = els[els.length - 1].id;
      setActive(current);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [ids]);
  return active;
}

function Entry({ entry }: { entry: DiaryEntry }) {
  const { t } = useLanguage();
  const d = t.ryh.diary;
  return (
    <article
      id={entry.id}
      aria-labelledby={`${entry.id}-t`}
      className="max-w-[65ch] scroll-mt-6 border-b border-[var(--ryh-line)] pb-16 pt-1 [&:not(:first-child)]:pt-16 last:border-0"
    >
      <p className="text-[14.5px] leading-[1.6] text-[var(--ryh-muted)]">
        {entry.dateText} · <b className="font-medium text-[var(--ryh-sage)]">{entry.kind === "Trajeto" ? d.route : d.local}:</b> {entry.place}
        {entry.stage && <> · {d.stage.replace("{{n}}", entry.stage)}</>}
      </p>
      <h2 id={`${entry.id}-t`} className="ryh-serif mb-[22px] mt-2.5 text-[28px] font-normal leading-[1.15] tracking-[-0.015em] md:mb-[26px] md:text-[36px]">
        {entry.title}
      </h2>
      <div className="ryh-serif space-y-5 text-[18.5px] leading-[1.75] md:text-[20px] [&_strong]:font-semibold">
        {entry.blocks.map((b, i) =>
          b.kind === "p" ? (
            <p key={i}>
              <InlineText parts={b.parts} />
            </p>
          ) : (
            <ul key={i} className="space-y-[18px]">
              {b.items.map((item, j) => (
                <li
                  key={j}
                  className="relative pl-[22px] before:absolute before:left-0 before:top-[0.75em] before:h-[7px] before:w-[7px] before:rounded-full before:bg-[var(--ryh-y)]"
                >
                  <InlineText parts={item} />
                </li>
              ))}
            </ul>
          ),
        )}
      </div>
      {/* DB-6: only when the entry has a photo, always with its description */}
      {entry.photo && (
        <img src={entry.photo.src} alt={entry.photo.alt} loading="lazy" className="mb-1 mt-[30px] w-full rounded-[20px] bg-[var(--ryh-soft)] object-cover" />
      )}
      <a href="#indice" className={cn(ryh.focus, "mt-[26px] inline-block text-sm text-[var(--ryh-muted)] hover:text-[var(--ryh-fg)]")}>
        {d.back}
      </a>
    </article>
  );
}

const RaiseYourHandsDiary = () => {
  const { t, language } = useLanguage();
  const lang = language === "pt" ? "pt" : "en";
  const d = t.ryh.diary;
  const page = diaryPage(lang);
  const entries = diaryEntries(lang);
  const [ids] = useState(() => entries.map((e) => e.id));
  const active = useActiveEntry(ids);
  const latest = entries.at(-1);

  return (
    <RyhShell page="diary" title={d.metaTitle} description={page.subtitle}>
      <div className={ryh.wrap}>
        {/* DB-3: header */}
        <header className="max-w-[46em] pb-[34px] pt-9 md:pb-14 md:pt-[72px]">
          <span className={ryh.kicker}>{d.eyebrow}</span>
          <h1 className={ryh.h1}>{page.title}</h1>
          <p className="text-[17px] leading-[1.7] text-[var(--ryh-muted)] md:text-[19px]">{page.subtitle}</p>
          {latest && (
            <a href={`#${latest.id}`} className={cn(ryh.link, ryh.focus, "mt-[26px] text-[15px]")}>
              {d.recent.replace("{{label}}", latest.label).replace("{{date}}", shortDate(latest.date, lang))}
            </a>
          )}
        </header>

        {/* "↑ Index" target: the chips on mobile, the sticky index on desktop */}
        <div id="indice" className="scroll-mt-4">
          {/* DB-4: chips on mobile */}
          <nav aria-label={d.toc} className="md:hidden">
            <ul className="-mx-[22px] mb-9 flex gap-2 overflow-x-auto border-y border-[var(--ryh-line)] px-[22px] py-3.5 [scrollbar-width:none]">
              {entries.map((e) => (
                <li key={e.id} className="shrink-0">
                  <a
                    href={`#${e.id}`}
                    aria-current={active === e.id ? "location" : undefined}
                    className={cn(
                      ryh.focus,
                      "block whitespace-nowrap rounded-full border px-3.5 py-2 text-sm",
                      active === e.id
                        ? "border-[var(--ryh-fg)] bg-[var(--ryh-fg)] text-[var(--ryh-bg)]"
                        : "border-[var(--ryh-line)] bg-[var(--ryh-paper)] text-[var(--ryh-muted)]",
                    )}
                  >
                    {e.label} · {shortDate(e.date, lang)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="pb-[72px] md:grid md:grid-cols-[200px_1fr] md:gap-14 md:border-t md:border-[var(--ryh-line)] md:pb-[120px] md:pt-14 lg:grid-cols-[230px_1fr] lg:gap-20">
            {/* DB-4: sticky index on desktop */}
            <nav aria-label={d.toc} className="hidden self-start md:sticky md:top-6 md:block">
              <b className="mb-3.5 block text-[13px] font-medium tracking-[0.02em] text-[var(--ryh-muted)]">{d.toc}</b>
              <ul className="text-[15px]">
                {entries.map((e) => (
                  <li key={e.id}>
                    <a
                      href={`#${e.id}`}
                      aria-current={active === e.id ? "location" : undefined}
                      className={cn(
                        ryh.focus,
                        "relative flex justify-between border-b border-[var(--ryh-line)] py-[9px]",
                        active === e.id
                          ? "font-medium text-[var(--ryh-fg)] before:absolute before:-left-4 before:top-[17px] before:h-1.5 before:w-1.5 before:rounded-full before:bg-[var(--ryh-y)]"
                          : "text-[var(--ryh-muted)] hover:text-[var(--ryh-fg)]",
                      )}
                    >
                      {e.label}
                      <span className="tabular-nums">{shortDate(e.date, lang)}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div>
              {entries.map((e) => (
                <Entry key={e.id} entry={e} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </RyhShell>
  );
};

export default RaiseYourHandsDiary;
