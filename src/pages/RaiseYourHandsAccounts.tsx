import { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { RyhShell } from "@/components/ryh/RyhShell";
import { ZoomLightbox, type LightboxPhoto } from "@/components/ryh/ZoomLightbox";
import { OUTLINE_A, ROUTE_A, STAGES, START } from "@/components/ryh/ryhPaths";
import { ryh } from "@/components/ryh/ryhStyles";
import { ryhPaths } from "@/config/raiseYourHands";
import { useLanguage } from "@/contexts/LanguageContext";
import { accounts, allCities, cityTotal, formatMoney, hasNumber, receiptList, totals, type AccountsCity, type AccountsItem } from "@/lib/ryhAccounts";
import { diaryEntries, shortDate, type DiaryLang } from "@/lib/ryhDiary";
import { cn } from "@/lib/utils";

/*
 * Raise Your Hands accounts (EZ Design spec: ez-project/raise-your-hands/redesign/contas-v2/SPEC.md).
 * Every number is computed from the receipts in src/content/ryh-contas/contas.json: totals, purchases,
 * families. Exchange rate and balance are unknown and never shown. Receipt images are the covered
 * versions only (public/ryh/contas/*-{thumb,full}.webp); the viewer is the shared zoom lightbox.
 */

/** Stops on the route map: the start (Porto) and the end of each stage (same points as the merch art) */
const STOPS: [number, number][] = [
  START,
  ...STAGES.map((s) => {
    const nums = s.d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    return [nums[nums.length - 2], nums[nums.length - 1]] as [number, number];
  }),
];

const RECEIPTS = receiptList(accounts);
const receiptIndex = new Map(RECEIPTS.map((r, i) => [r.item, i]));
const CITIES = allCities(accounts);
const dayOfCity = new Map(accounts.dias.flatMap((d) => d.cidades.map((c) => [c.id, d.diaId] as const)));

const firstDate = (city: AccountsCity) => city.itens.map((i) => i.data).sort()[0];

function RouteMapCard({ lang, active, onHover }: { lang: DiaryLang; active: string | null; onHover: (id: string | null) => void }) {
  const { t } = useLanguage();
  const a = t.ryh.accounts;
  const label = a.mapLabel.replace("{{list}}", CITIES.map((c) => `${c.cidade} ${c.familias}`).join(", "));
  return (
    <figure className="rounded-[20px] border border-[var(--ryh-line)] bg-[var(--ryh-paper)] p-4 md:p-6">
      <svg viewBox="-14 -14 373 733" role="img" aria-label={label} className="mx-auto block h-[380px] w-full lg:h-[600px]">
        <path d={OUTLINE_A} fill="var(--ryh-map-fill)" stroke="var(--ryh-fg)" strokeLinejoin="round" className="ryh-outline-map" />
        <path d={ROUTE_A} fill="none" stroke="var(--ryh-y)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
        {CITIES.map((c) => {
          const [cx, cy] = STOPS[c.ponto] ?? START;
          const on = active === c.id;
          return (
            <g key={c.id} onMouseEnter={() => onHover(c.id)} onMouseLeave={() => onHover(null)}>
              <circle cx={cx} cy={cy} r="17" fill="var(--ryh-bg)" />
              <circle cx={cx} cy={cy} r="14.5" fill="var(--ryh-y)" stroke={on ? "var(--ryh-fg)" : "none"} strokeWidth="3" />
              <text
                x={cx}
                y={cy + 5.5}
                textAnchor="middle"
                fontSize="16"
                fontWeight="800"
                fill="var(--ryh-bg)"
                fontFamily="Montserrat, Inter, sans-serif"
                aria-hidden
              >
                {c.familias}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-3 flex items-center gap-2 text-[13px] text-[var(--ryh-muted)]">
        <span aria-hidden className="grid h-5 w-5 place-items-center rounded-full bg-[var(--ryh-y)] font-['Montserrat',sans-serif] text-[11px] font-extrabold text-[var(--ryh-bg)]">
          2
        </span>
        {a.mapLegend}
      </figcaption>
    </figure>
  );
}

function ReceiptRow({ item, city, lang, onOpen }: { item: AccountsItem; city: AccountsCity; lang: DiaryLang; onOpen: (i: number) => void }) {
  const { t } = useLanguage();
  const a = t.ryh.accounts;
  const direct = item.tipo === "apoio-direto";
  const what = direct ? a.directSupport : item.loja;
  const date = shortDate(item.data, lang);
  const when = item.hora ? `${date} · ${item.hora}` : date;
  const value = formatMoney(item.valorEUR, "EUR", lang, { cents: direct });
  const index = receiptIndex.get(item);
  return (
    <li className="flex items-center gap-3.5 border-t border-[var(--ryh-line)] py-3 first:border-t-0 md:gap-4">
      {index !== undefined && item.comprovativo && (
        <button
          type="button"
          onClick={() => onOpen(index)}
          aria-label={a.openReceipt.replace("{{what}}", `${what}, ${city.cidade}`).replace("{{date}}", when).replace("{{value}}", value)}
          className={cn(ryh.focus, "h-[68px] w-[52px] shrink-0 cursor-zoom-in overflow-hidden rounded-[8px] border border-[var(--ryh-line)] bg-[#F6F6F6]")}
        >
          <img
            src={`${item.comprovativo.base}-thumb.webp`}
            alt=""
            width={52}
            height={68}
            loading="lazy"
            decoding="async"
            className={cn("h-full w-full", direct ? "object-contain" : "object-cover object-top")}
          />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium leading-snug">{what}</p>
        <p className="mt-0.5 text-[13px] text-[var(--ryh-muted)]">{when}</p>
      </div>
      <p className="shrink-0 text-right text-[15px] font-semibold tabular-nums md:text-base">{value}</p>
    </li>
  );
}

const RaiseYourHandsAccounts = () => {
  const { t, language } = useLanguage();
  const lang: DiaryLang = language === "pt" ? "pt" : "en";
  const a = t.ryh.accounts;
  const sum = totals(accounts);
  const [viewer, setViewer] = useState<number | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const entries = new Map(diaryEntries(lang).map((e) => [e.id, e]));
  const money = (v: number) => formatMoney(v, "EUR", lang);

  const receiptsCount = RECEIPTS.length;
  const maxSubtotal = Math.max(...CITIES.map(cityTotal));
  const families = (n: number) => (n === 1 ? a.familiesOne : a.familiesMany.replace("{{n}}", String(n)));
  const receiptsOf = (n: number) => (n === 1 ? a.receiptOne : a.receiptMany.replace("{{n}}", String(n)));

  // Period from the receipt dates (all in the same month): "7 a 14 de novembro de 2026"
  const dates = CITIES.flatMap((c) => c.itens.map((i) => i.data)).sort();
  const [y, m, d1] = dates[0].split("-").map(Number);
  const d2 = Number(dates[dates.length - 1].split("-")[2]);
  const month = new Intl.DateTimeFormat(lang === "pt" ? "pt-PT" : "en-GB", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));
  const period = a.period.replace("{{d1}}", String(d1)).replace("{{d2}}", String(d2)).replace("{{month}}", month).replace("{{year}}", String(y));

  const goal = hasNumber(accounts.metaFamilias) ? accounts.metaFamilias : null;

  const viewerPhotos: LightboxPhoto[] = RECEIPTS.map(({ item, city, photo }) => {
    const direct = item.tipo === "apoio-direto";
    // Direct support shown with cents, as in the summary ("50,00 €")
    const value = formatMoney(item.valorEUR, "EUR", lang, { cents: direct });
    const date = shortDate(item.data, lang);
    const when = item.hora ? `${date} ${item.hora}` : date;
    return {
      src: `${photo.base}-full.webp`,
      w: photo.w,
      h: photo.h,
      fit: "width",
      alt: direct
        ? a.transferAlt.replace("{{value}}", value).replace("{{date}}", date)
        : a.receiptAlt.replace("{{store}}", item.loja).replace("{{date}}", when).replace("{{value}}", value),
      title: a.viewerTitle
        .replace("{{city}}", city)
        .replace("{{what}}", direct ? a.directSupport : item.loja)
        .replace("{{when}}", when)
        .replace("{{value}}", value),
    };
  });

  return (
    <RyhShell page="accounts" title={a.metaTitle} description={a.lead}>
      <section className={cn(ryh.wrap, "ryh-band")}>
        <div className="py-9 md:py-16">
          <span className={ryh.kicker}>{a.kicker}</span>
          <h1 className="ryh-serif my-3 text-[36px] font-normal leading-[1.08] tracking-[-0.015em] md:my-4 md:text-[56px]">{a.title}</h1>
          <p className={ryh.lead}>{a.lead}</p>
        </div>
      </section>

      <div className={ryh.wrap}>
        {/* 2 · Summary in three cards */}
        <section aria-label={a.summaryLabel} className="pt-10 md:pt-14">
          <ul className="grid gap-3 md:grid-cols-[1fr_1.25fr_1fr] md:gap-4">
            {hasNumber(accounts.angariadoGBP) && (
              <li className="rounded-[20px] border border-[var(--ryh-line)] bg-[var(--ryh-paper)] p-5 md:p-6">
                <b className="ryh-serif block text-[44px] font-normal leading-none tracking-[-0.02em] tabular-nums md:text-[56px]">
                  {formatMoney(accounts.angariadoGBP, "GBP", lang)}
                </b>
                <span className="mt-3 block text-[14px] leading-[1.5] text-[var(--ryh-muted)] md:text-[15px]">{a.raised}</span>
              </li>
            )}
            <li className="rounded-[20px] border border-[var(--ryh-line)] bg-[var(--ryh-paper)] p-5 md:p-6">
              <b className="ryh-serif block text-[44px] font-normal leading-none tracking-[-0.02em] text-[var(--ryh-y)] tabular-nums md:text-[56px]">{money(sum.delivered)}</b>
              <span className="mt-3 block text-[14px] leading-[1.5] text-[var(--ryh-muted)] md:text-[15px]">
                {a.delivered.split(/(\{\{compras\}\}|\{\{apoio\}\})/).map((part, i) =>
                  part === "{{compras}}" ? (
                    <strong key={i} className="font-semibold text-[var(--ryh-fg)]">
                      {money(sum.purchases)}
                    </strong>
                  ) : part === "{{apoio}}" ? (
                    <strong key={i} className="font-semibold text-[var(--ryh-fg)]">
                      {formatMoney(sum.directSupport, "EUR", lang, { cents: true })}
                    </strong>
                  ) : (
                    part
                  ),
                )}
              </span>
            </li>
            <li className="rounded-[20px] border border-[var(--ryh-line)] bg-[var(--ryh-paper)] p-5 md:p-6">
              <p className="flex items-baseline gap-2">
                <b className="ryh-serif text-[44px] font-normal leading-none tracking-[-0.02em] tabular-nums md:text-[56px]">{sum.families}</b>
                <span className="ryh-serif text-[20px] text-[var(--ryh-muted)]">{a.families}</span>
              </p>
              {goal !== null && (
                <div className="mt-4">
                  <div
                    role="img"
                    aria-label={a.goalAria.replace("{{n}}", String(sum.families)).replace("{{goal}}", String(goal))}
                    className="relative h-1.5 rounded-full bg-[var(--ryh-y)]"
                  >
                    {/* Tick at the goal (7 of 13) */}
                    <i aria-hidden className="absolute -top-1 h-3.5 w-0.5 rounded bg-[var(--ryh-fg)]" style={{ left: `${Math.min(100, (goal / sum.families) * 100)}%` }} />
                  </div>
                  <p aria-hidden className="mt-2 flex justify-between text-[12px] text-[var(--ryh-muted)]">
                    <span>{a.goal.replace("{{n}}", String(goal))}</span>
                    <span>{a.goalNote.replace("{{n}}", String(sum.families))}</span>
                  </p>
                </div>
              )}
            </li>
          </ul>
          <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-[var(--ryh-muted)] md:text-sm">
            {[a.towns.replace("{{n}}", String(CITIES.length)), a.purchasesN.replace("{{n}}", String(sum.purchaseCount)), a.receiptsN.replace("{{n}}", String(receiptsCount)), period].map((x) => (
              <li key={x} className="flex items-center gap-2">
                <i aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--ryh-y)]" />
                {x}
              </li>
            ))}
          </ul>
        </section>

        {/* 3 · Transparency seal */}
        <div className="mt-7 flex gap-4 rounded-[20px] border border-[var(--ryh-line)] bg-[var(--ryh-band)] px-5 py-[18px]">
          <ShieldCheck className="mt-0.5 h-7 w-7 shrink-0 text-[var(--ryh-y)]" strokeWidth={1.8} aria-hidden />
          <div>
            <b className="ryh-serif block text-[19px] font-medium leading-[1.3]">{a.sealTitle}</b>
            <p className="mt-1 text-[15px] text-[var(--ryh-muted)]">{a.sealText}</p>
          </div>
        </div>

        {/* 4 · By town: map (sticky on desktop) + list */}
        <section aria-labelledby="ryh-por-cidade" className="pt-16 md:pt-24">
          <span className={ryh.kicker}>{a.routeKicker}</span>
          <h2 id="ryh-por-cidade" className={cn(ryh.h2, "mb-6 md:mb-8")}>
            {a.byTown}
          </h2>
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
            <div className="lg:sticky lg:top-24 lg:col-span-5 lg:self-start">
              <RouteMapCard lang={lang} active={active} onHover={setActive} />
            </div>
            <div className="lg:col-span-7">
              <ol>
                {CITIES.map((c) => {
                  const subtotal = cityTotal(c);
                  return (
                    <li key={c.id} className="border-t border-[var(--ryh-line)]">
                      <a
                        href={`#cidade-${c.id}`}
                        onMouseEnter={() => setActive(c.id)}
                        onMouseLeave={() => setActive(null)}
                        onFocus={() => setActive(c.id)}
                        onBlur={() => setActive(null)}
                        className={cn(ryh.focus, "grid grid-cols-[28px_1fr_auto] items-center gap-x-3 gap-y-2.5 py-4 transition-colors hover:bg-[var(--ryh-soft)]/40")}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "grid h-6 w-6 place-items-center rounded-full bg-[var(--ryh-y)] font-['Montserrat',sans-serif] text-[12px] font-extrabold text-[var(--ryh-bg)]",
                            active === c.id && "ring-2 ring-[var(--ryh-fg)] ring-offset-2 ring-offset-[var(--ryh-bg)]",
                          )}
                        >
                          {c.familias}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[15px] font-medium leading-snug">{c.cidade}</span>
                          <span className="block text-[13px] text-[var(--ryh-muted)]">
                            {a.cityMeta.replace("{{date}}", shortDate(firstDate(c), lang)).replace("{{n}}", receiptsOf(c.itens.length))}
                            <span className="sr-only"> · {families(c.familias)}</span>
                          </span>
                        </span>
                        <span className="text-right text-[15px] font-semibold tabular-nums">{money(subtotal)}</span>
                        <span aria-hidden className="col-start-2 col-end-4 h-1 rounded-full bg-[var(--ryh-soft)]">
                          <i className="block h-full rounded-full bg-[var(--ryh-y)]" style={{ width: `${(subtotal / maxSubtotal) * 100}%` }} />
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ol>
              <p className="flex justify-between border-t border-[var(--ryh-line)] pt-4 text-[15px]">
                <span className="text-[var(--ryh-muted)]">{a.total}</span>
                <span className="font-semibold tabular-nums">{money(sum.delivered)}</span>
              </p>
            </div>
          </div>
        </section>

        {/* 5 · The receipts: vertical timeline, one card per town */}
        <section aria-labelledby="ryh-taloes" className="pb-[72px] pt-16 md:pb-[120px] md:pt-24">
          <span className={ryh.kicker}>{a.receiptsKicker}</span>
          <h2 id="ryh-taloes" className={cn(ryh.h2, "mb-4")}>
            {a.receiptsTitle}
          </h2>
          <p className="max-w-[44em] text-[15px] leading-[1.6] text-[var(--ryh-muted)]">
            <strong className="font-semibold text-[var(--ryh-fg)]">{a.privacyLabel}</strong> {a.privacy}
          </p>

          <ol className="relative mt-8 max-w-[860px] pl-[26px] before:absolute before:bottom-2.5 before:left-[7px] before:top-2.5 before:w-0.5 before:bg-[var(--ryh-line)] md:pl-[34px]">
            {CITIES.map((c) => {
              const entry = entries.get(dayOfCity.get(c.id) ?? "");
              return (
                <li key={c.id} id={`cidade-${c.id}`} className="relative mb-4">
                  <i aria-hidden className="absolute -left-[26px] top-[22px] h-4 w-4 rounded-full bg-[var(--ryh-y)] shadow-[0_0_0_4px_var(--ryh-bg)] md:-left-[34px]" />
                  <article className="rounded-[20px] border border-[var(--ryh-line)] bg-[var(--ryh-paper)] px-[18px] pb-1.5 pt-[18px] md:px-[26px] md:pb-2 md:pt-[22px]">
                    <header className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[13px] text-[var(--ryh-muted)]">
                          {shortDate(firstDate(c), lang)}
                          {entry && (
                            <>
                              {" · "}
                              <Link to={`${ryhPaths.diary}#${entry.id}`} className={cn(ryh.focus, "underline decoration-[var(--ryh-line)] underline-offset-2 hover:text-[var(--ryh-fg)]")}>
                                {a.diaryLink.replace("{{day}}", entry.label)}
                              </Link>
                            </>
                          )}
                        </p>
                        <h3 className="ryh-serif mt-0.5 text-[22px] font-medium leading-[1.2]">{c.cidade}</h3>
                      </div>
                      <span className="shrink-0 rounded-full border border-[var(--ryh-line)] px-2.5 py-1 text-[12px] font-medium">{families(c.familias)}</span>
                    </header>
                    <ul>
                      {c.itens.map((item, i) => (
                        <ReceiptRow key={i} item={item} city={c} lang={lang} onOpen={setViewer} />
                      ))}
                    </ul>
                    {c.itens.length > 1 && (
                      <footer className="flex justify-between border-t border-[var(--ryh-line)] py-3">
                        <span className="text-sm text-[var(--ryh-muted)]">{a.subtotal}</span>
                        <span className="text-[15px] font-semibold tabular-nums">{money(cityTotal(c))}</span>
                      </footer>
                    )}
                  </article>
                </li>
              );
            })}
          </ol>

          {/* Total box (inverted) */}
          <div className="mt-6 flex max-w-[860px] flex-wrap items-center justify-between gap-3 rounded-[20px] bg-[var(--ryh-fg)] px-5 py-5 text-[var(--ryh-bg)] md:ml-[34px] md:px-7">
            <div>
              <p className="text-base font-semibold">{a.totalDelivered}</p>
              <p className="mt-0.5 text-[13px] opacity-75">
                {a.totalDetail.replace("{{compras}}", money(sum.purchases)).replace("{{apoio}}", formatMoney(sum.directSupport, "EUR", lang, { cents: true }))}
              </p>
            </div>
            <b className="ryh-serif text-[34px] font-normal leading-none tabular-nums md:text-[44px]">{money(sum.delivered)}</b>
          </div>

          {/* 7 · Page footer */}
          <p className="mt-10 text-sm text-[var(--ryh-muted)]">
            {a.footerNote}{" "}
            <Link to={ryhPaths.diary} className={cn(ryh.link, ryh.focus, "text-sm")}>
              {a.readDiary}
            </Link>
          </p>
        </section>
      </div>

      <ZoomLightbox photos={viewerPhotos} index={viewer} onIndexChange={setViewer} onClose={() => setViewer(null)} label={a.receiptsLabel} tone="dark" caption={a.hidden} />
    </RyhShell>
  );
};

export default RaiseYourHandsAccounts;
