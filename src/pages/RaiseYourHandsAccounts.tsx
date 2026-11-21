import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Banknote, EyeOff, Receipt } from "lucide-react";
import { RyhShell } from "@/components/ryh/RyhShell";
import { ZoomLightbox, type LightboxPhoto } from "@/components/ryh/ZoomLightbox";
import { ryh } from "@/components/ryh/ryhStyles";
import { ryhPaths, showPlaceholders } from "@/config/raiseYourHands";
import { useLanguage } from "@/contexts/LanguageContext";
import { accounts, cityTotal, dayTotal, formatMoney, hasNumber, receiptList, totals, type AccountsCity, type AccountsItem } from "@/lib/ryhAccounts";
import { diaryEntries, shortDate, type DiaryEntry, type DiaryLang } from "@/lib/ryhDiary";
import { cn } from "@/lib/utils";

/*
 * Raise Your Hands accounts: what came in and what was handed out, day → city → receipt, with the
 * exact values from the receipts (src/content/ryh-contas/contas.json). Every receipt thumbnail
 * opens the shared zoom viewer. Values still unknown (exchange rate, balance) are not estimated:
 * hidden in production, marked in development.
 *
 * Structure only: the visual finish follows EZ Design's spec (redesign/contas-v2).
 */

const Pending = ({ children, className }: { children: ReactNode; className?: string }) =>
  showPlaceholders ? (
    <span className={cn("rounded bg-[var(--ryh-soft)] px-1.5 py-0.5 text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--ryh-muted)]", className)}>{children}</span>
  ) : null;

const longDate = (iso: string, lang: DiaryLang) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(lang === "pt" ? "pt-PT" : "en-GB", { dateStyle: "long", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
};

/** Position of each receipt in the shared viewer, keyed by the item object */
const RECEIPTS = receiptList(accounts);
const receiptIndex = new Map(RECEIPTS.map((r, i) => [r.item, i]));

function ItemRow({ item, city, lang, onOpen }: { item: AccountsItem; city: string; lang: DiaryLang; onOpen: (i: number) => void }) {
  const { t } = useLanguage();
  const a = t.ryh.accounts;
  const money = formatMoney(item.valorEUR, "EUR", lang);
  const direct = item.tipo === "apoio-direto";
  const what = direct ? a.directLabel : item.loja;
  const index = receiptIndex.get(item);
  const when = item.hora ? a.at.replace("{{date}}", shortDate(item.data, lang)).replace("{{time}}", item.hora) : shortDate(item.data, lang);

  return (
    <tr className="border-t border-[var(--ryh-line)] align-middle">
      <td className="w-[64px] py-3 pr-3 md:w-[84px] md:pr-4">
        {index !== undefined && item.comprovativo ? (
          <button
            type="button"
            onClick={() => onOpen(index)}
            aria-label={a.openReceipt.replace("{{what}}", `${what}, ${city}`).replace("{{value}}", money)}
            className={cn(ryh.focus, "block h-[68px] w-[52px] cursor-zoom-in overflow-hidden rounded-[8px] border border-[var(--ryh-line)] bg-[var(--ryh-paper)] md:h-[88px] md:w-[68px]")}
          >
            <img src={`${item.comprovativo.base}-1000.webp`} alt="" width={item.comprovativo.w} height={item.comprovativo.h} loading="lazy" decoding="async" className="h-full w-full object-cover object-top" />
          </button>
        ) : showPlaceholders ? (
          <span aria-hidden className="grid h-[68px] w-[52px] place-items-center rounded-[8px] border border-dashed border-[var(--ryh-line)] bg-[var(--ryh-soft)] text-center text-[9px] leading-tight text-[var(--ryh-muted)] md:h-[88px] md:w-[68px]">
            {a.receiptPending}
          </span>
        ) : (
          <span aria-hidden className="grid h-[44px] w-[44px] place-items-center rounded-full bg-[var(--ryh-soft)] text-[var(--ryh-muted)]">
            {direct ? <Banknote className="h-5 w-5" /> : <Receipt className="h-5 w-5" />}
          </span>
        )}
      </td>
      <td className="py-3">
        <p className="text-[15px] font-medium leading-snug md:text-base">
          {direct && <Banknote className="mr-1.5 inline h-4 w-4 -translate-y-px text-[var(--ryh-sage)]" aria-hidden />}
          {what}
        </p>
        <p className="mt-0.5 text-[13px] text-[var(--ryh-muted)]">
          {when}
          {direct && item.referencia && <> · {a.directRef.replace("{{ref}}", item.referencia)}</>}
        </p>
      </td>
      <td className="whitespace-nowrap py-3 pl-3 text-right text-[15px] font-medium tabular-nums md:text-base">{money}</td>
    </tr>
  );
}

function CityBlock({ city, lang, onOpen }: { city: AccountsCity; lang: DiaryLang; onOpen: (i: number) => void }) {
  const { t } = useLanguage();
  const a = t.ryh.accounts;
  const families = city.familias === 1 ? a.familiesOne : a.familiesMany.replace("{{n}}", String(city.familias));
  return (
    <table className="mt-6 w-full border-collapse first:mt-0">
      <caption className="pb-1.5 text-left">
        <span className="ryh-serif text-[19px] font-medium">{city.cidade}</span>
        <span className="text-sm text-[var(--ryh-muted)]"> · {families}</span>
      </caption>
      <thead className="sr-only">
        <tr>
          <th scope="col">{a.colReceipt}</th>
          <th scope="col">{a.colPurchase}</th>
          <th scope="col">{a.colValue}</th>
        </tr>
      </thead>
      <tbody>
        {city.itens.map((item, i) => (
          <ItemRow key={i} item={item} city={city.cidade} lang={lang} onOpen={onOpen} />
        ))}
      </tbody>
      {city.itens.length > 1 && (
        <tfoot>
          <tr className="border-t border-[var(--ryh-line)]">
            <th scope="row" colSpan={2} className="py-2.5 text-left text-sm font-normal text-[var(--ryh-muted)]">
              {a.subtotal.replace("{{city}}", city.cidade)}
            </th>
            <td className="py-2.5 pl-3 text-right text-sm font-semibold tabular-nums">{formatMoney(cityTotal(city), "EUR", lang)}</td>
          </tr>
        </tfoot>
      )}
    </table>
  );
}

const RaiseYourHandsAccounts = () => {
  const { t, language } = useLanguage();
  const lang: DiaryLang = language === "pt" ? "pt" : "en";
  const a = t.ryh.accounts;
  const sum = totals(accounts);
  const entries = new Map<string, DiaryEntry>(diaryEntries(lang).map((e) => [e.id, e]));
  const [viewer, setViewer] = useState<number | null>(null);

  const viewerPhotos: LightboxPhoto[] = RECEIPTS.map(({ item, city, photo }) => {
    const value = formatMoney(item.valorEUR, "EUR", lang);
    return {
      src: `${photo.base}-2000.webp`,
      w: photo.w,
      h: photo.h,
      alt: item.tipo === "apoio-direto" ? a.transferAlt.replace("{{value}}", value) : a.receiptAlt.replace("{{store}}", item.loja).replace("{{city}}", city).replace("{{value}}", value),
    };
  });

  const stats: { value: string; caption: ReactNode }[] = [];
  if (hasNumber(accounts.angariadoGBP)) stats.push({ value: formatMoney(accounts.angariadoGBP, "GBP", lang), caption: a.raised });
  stats.push({ value: formatMoney(sum.purchases, "EUR", lang), caption: a.statPurchases.replace("{{n}}", String(sum.purchaseCount)) });
  if (sum.directSupport > 0) stats.push({ value: formatMoney(sum.directSupport, "EUR", lang), caption: a.statDirect });
  stats.push({
    value: String(sum.families),
    caption: (
      <>
        {a.statFamilies}
        {hasNumber(accounts.metaFamilias) && <span className="block">{a.statGoal.replace("{{n}}", String(accounts.metaFamilias))}</span>}
      </>
    ),
  });

  // Exchange rate and balance: never estimated; shown when filled in, marked in development
  const meta = [
    { label: a.rate, value: hasNumber(accounts.cambioGBPparaEUR) ? `£1 = ${formatMoney(accounts.cambioGBPparaEUR, "EUR", lang)}` : null },
    { label: a.balance, value: hasNumber(accounts.saldoEUR) ? formatMoney(accounts.saldoEUR, "EUR", lang) : null },
    { label: a.updated, value: accounts.atualizadoEm ? longDate(accounts.atualizadoEm, lang) : null },
  ].filter((m) => m.value !== null || showPlaceholders);

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
        {/* Summary */}
        <section aria-label={a.summaryLabel} className="pb-10 pt-10 md:pb-14 md:pt-16">
          <ul className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4 md:gap-10">
            {stats.map((s) => (
              <li key={s.value}>
                <b className="ryh-serif block text-[34px] font-normal leading-none tracking-[-0.02em] tabular-nums md:text-[48px]">{s.value}</b>
                <span className="mt-2.5 block text-[14px] leading-[1.5] text-[var(--ryh-muted)] md:text-[15px]">{s.caption}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 space-y-1.5 text-[15px] leading-[1.6] text-[var(--ryh-muted)]">
            <p>
              <strong className="font-semibold text-[var(--ryh-fg)]">{a.delivered.replace("{{value}}", formatMoney(sum.delivered, "EUR", lang))}</strong>
              {hasNumber(accounts.doacoesEmLogisticaEUR) && (
                <>
                  {" · "}
                  {formatMoney(accounts.doacoesEmLogisticaEUR, "EUR", lang)} {a.logistics}
                </>
              )}
            </p>
            {meta.length > 0 && (
              <p>
                {meta.map((m, i) => (
                  <span key={m.label}>
                    {i > 0 && " · "}
                    {m.label}: {m.value !== null ? <span className="text-[var(--ryh-fg)]">{m.value}</span> : <Pending>{a.pending}</Pending>}
                  </span>
                ))}
              </p>
            )}
          </div>
        </section>

        <p className="flex max-w-[44em] gap-3 border-l-2 border-[var(--ryh-y)] py-1 pl-4 text-base leading-[1.6] text-[var(--ryh-fg)] md:pl-5">
          <EyeOff className="mt-1 h-4 w-4 shrink-0 text-[var(--ryh-muted)]" aria-hidden />
          <span>
            <strong className="font-semibold">{a.privacyLabel}</strong> {a.privacy}
          </span>
        </p>

        {/* Day → city → receipts */}
        <section aria-labelledby="ryh-taloes" className="pb-[72px] pt-12 md:pb-[120px] md:pt-16">
          <span className={ryh.kicker}>{a.listKicker}</span>
          <h2 id="ryh-taloes" className={cn(ryh.h2, "mb-6 md:mb-8")}>
            {a.listTitle}
          </h2>
          <ol>
            {accounts.dias.map((day) => {
              const entry = entries.get(day.diaId);
              if (!entry) return null;
              return (
                <li key={day.diaId} className="grid gap-4 border-t border-[var(--ryh-line)] py-8 md:grid-cols-[200px_1fr] md:gap-10 md:py-10">
                  <div>
                    <h3 className="ryh-serif text-[22px] font-medium leading-tight">{entry.label}</h3>
                    <p className="mt-1 text-sm text-[var(--ryh-muted)]">{shortDate(entry.date, lang)}</p>
                    <Link to={`${ryhPaths.diary}#${entry.id}`} className={cn(ryh.link, ryh.focus, "mt-3 text-[14px]")}>
                      {a.readDiary}
                    </Link>
                  </div>
                  <div className="max-w-[640px]">
                    {day.cidades.map((city) => (
                      <CityBlock key={city.cidade} city={city} lang={lang} onOpen={setViewer} />
                    ))}
                    {day.cidades.length > 1 && (
                      <p className="mt-3 flex justify-between border-t-2 border-[var(--ryh-fg)] pt-2.5 text-[15px] font-semibold">
                        <span>{a.dayTotal.replace("{{day}}", entry.label)}</span>
                        <span className="tabular-nums">{formatMoney(dayTotal(day), "EUR", lang)}</span>
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="flex justify-between border-y-2 border-[var(--ryh-fg)] py-4 text-lg font-semibold md:ml-[240px] md:max-w-[640px] md:text-xl">
            <span>{a.grandTotal}</span>
            <span className="tabular-nums">{formatMoney(sum.delivered, "EUR", lang)}</span>
          </p>
          <p className="mt-6 text-sm text-[var(--ryh-muted)]">{a.currencyNote}</p>
        </section>
      </div>

      <ZoomLightbox photos={viewerPhotos} index={viewer} onIndexChange={setViewer} onClose={() => setViewer(null)} label={a.receiptsLabel} tone="studio" caption={a.hidden} />
    </RyhShell>
  );
};

export default RaiseYourHandsAccounts;
