import { Fragment, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { EyeOff } from "lucide-react";
import { PhotoStrip } from "@/components/ryh/PhotoStrip";
import { RyhShell } from "@/components/ryh/RyhShell";
import { ryh } from "@/components/ryh/ryhStyles";
import { ryhPaths, showPlaceholders } from "@/config/raiseYourHands";
import { useLanguage } from "@/contexts/LanguageContext";
import { accounts, daysWithoutValues, formatMoney, hasNumber, invoicePhotos, localized, recordedFood, type AccountsDayRaw } from "@/lib/ryhAccounts";
import { diaryEntries, shortDate, type DiaryEntry, type DiaryLang } from "@/lib/ryhDiary";
import { cn } from "@/lib/utils";

/*
 * Raise Your Hands accounts (ez-project/raise-your-hands/redesign/contas-loja/NOTA.md, RC-23..28).
 * Every number comes from src/content/ryh-contas/contas.json. What is still empty there is not
 * shown in production; in development it appears as a marked placeholder so the gap is visible.
 */

/** Development-only marker for data the user still has to send */
const Pending = ({ children, className }: { children: ReactNode; className?: string }) =>
  showPlaceholders ? (
    <span className={cn("rounded bg-[var(--ryh-soft)] px-1.5 py-0.5 text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--ryh-muted)]", className)}>{children}</span>
  ) : null;

/** "Chegada e Dia 2" / "Arrival and Day 2" (the TS target has no Intl.ListFormat) */
const listFormat = (items: string[], and: string) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} ${and} ${items[items.length - 1]}`);

const longDate = (iso: string, lang: DiaryLang) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(lang === "pt" ? "pt-PT" : "en-GB", { dateStyle: "long", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
};

function DayRow({ day, entry, lang }: { day: AccountsDayRaw; entry: DiaryEntry; lang: DiaryLang }) {
  const { t } = useLanguage();
  const a = t.ryh.accounts;
  const values = day.valoresEUR.filter(hasNumber);
  const place = localized(day.lugar, lang) || entry.place;
  const photos = invoicePhotos(day, lang, (value) =>
    (value ? a.invoiceAlt.replace("{{value}}", value) : a.invoiceAltNoValue).replace("{{day}}", entry.label),
  );
  const purchases = values.length
    ? hasNumber(day.numCompras) && day.numCompras > 0
      ? day.numCompras === 1
        ? a.purchasesOne
        : a.purchases.replace("{{n}}", String(day.numCompras))
      : a.mentioned
    : a.mentioned;
  // One amount for several shops: "259 € (2 compras)"; otherwise one pill per amount
  const pills =
    values.length === 1 && hasNumber(day.numCompras) && day.numCompras > 1
      ? [a.groupValue.replace("{{value}}", formatMoney(values[0], "EUR", lang)).replace("{{n}}", String(day.numCompras))]
      : values.map((v) => formatMoney(v, "EUR", lang));
  const pendingInvoices = showPlaceholders && !photos.length ? Math.max(day.numCompras ?? 0, values.length, 1) : 0;

  return (
    <li className="grid gap-3 border-t border-[var(--ryh-line)] py-8 md:grid-cols-[240px_1fr] md:gap-10 md:py-10">
      <div>
        <h3 className="ryh-serif text-[21px] font-medium leading-tight tracking-[-0.01em]">{entry.label}</h3>
        <p className="mt-1 text-sm text-[var(--ryh-muted)]">
          {shortDate(entry.date, lang)} · {place}
        </p>
      </div>
      <div>
        <p className="text-base text-[var(--ryh-fg)]">{purchases}</p>
        {pills.length > 0 ? (
          <ul aria-label={a.valuesLabel} className="mt-3 flex flex-wrap gap-2">
            {pills.map((p) => (
              <li key={p} className="rounded-full border border-[var(--ryh-line)] bg-[var(--ryh-paper)] px-3 py-1 text-sm font-medium tabular-nums">
                {p}
              </li>
            ))}
          </ul>
        ) : (
          <Pending className="mt-3 inline-block">{a.valuePending}</Pending>
        )}

        {/* RC-27: invoices (only when there are photos; dashed frames only in development) */}
        {photos.length > 0 && <PhotoStrip photos={photos} label={a.invoicesLabel.replace("{{day}}", entry.label)} variant="thumbs" caption={a.hidden} />}
        {pendingInvoices > 0 && (
          <ul className="mt-4 flex flex-wrap gap-3" aria-hidden>
            {Array.from({ length: pendingInvoices }, (_, i) => (
              <li key={i} className="w-[140px] md:w-[170px]">
                <div className="grid h-[186px] place-content-center rounded-[12px] border border-dashed border-[var(--ryh-line)] bg-[var(--ryh-soft)] text-center text-[12px] text-[var(--ryh-muted)] md:h-[226px]">
                  {a.invoicePending}
                  <br />
                  {a.invoicePendingSub}
                </div>
              </li>
            ))}
          </ul>
        )}

        <Link to={`${ryhPaths.diary}#${entry.id}`} className={cn(ryh.link, ryh.focus, "mt-5 text-[15px]")}>
          {a.readDiary}
        </Link>
      </div>
    </li>
  );
}

const RaiseYourHandsAccounts = () => {
  const { t, language } = useLanguage();
  const lang: DiaryLang = language === "pt" ? "pt" : "en";
  const a = t.ryh.accounts;
  const entries = new Map(diaryEntries(lang).map((e) => [e.id, e]));
  const labelOf = (id: string) => entries.get(id)?.label ?? id;

  const food = recordedFood(accounts);
  const missingDays = daysWithoutValues(accounts);

  const familiesText = (n: number) => a.familiesWord[n] || a.familiesN.replace("{{n}}", String(n));

  // RC-25 summary: only the numbers we have
  const summary: { value: string; caption: ReactNode }[] = [];
  if (hasNumber(accounts.angariadoGBP)) summary.push({ value: formatMoney(accounts.angariadoGBP, "GBP", lang), caption: a.raised });
  if (food.dayIds.length)
    summary.push({
      value: formatMoney(food.total, "EUR", lang),
      caption: (
        <>
          {a.food.replace("{{days}}", listFormat(food.dayIds.map(labelOf), a.and))}
          {missingDays.length > 0 && (
            <Pending className="mt-2 block w-fit">{a.foodPending.replace("{{days}}", listFormat(missingDays.map(labelOf), a.and))}</Pending>
          )}
        </>
      ),
    });
  if (hasNumber(accounts.doacoesEmLogisticaEUR)) summary.push({ value: formatMoney(accounts.doacoesEmLogisticaEUR, "EUR", lang), caption: a.logistics });

  // Metadata line: what is filled in; the rest only as a development marker
  const meta: { label: string; value: string | null }[] = [
    { label: a.familiesReached, value: hasNumber(accounts.familiasAtendidas) ? String(accounts.familiasAtendidas) : null },
    { label: a.totalSpent, value: hasNumber(accounts.totalGastoAlimentosEUR) ? formatMoney(accounts.totalGastoAlimentosEUR, "EUR", lang) : null },
    { label: a.rate, value: hasNumber(accounts.cambioGBPparaEUR) ? `£1 = ${formatMoney(accounts.cambioGBPparaEUR, "EUR", lang)}` : null },
    { label: a.balance, value: hasNumber(accounts.saldoEUR) ? formatMoney(accounts.saldoEUR, "EUR", lang) : null },
    { label: a.updated, value: accounts.atualizadoEm ? longDate(accounts.atualizadoEm, lang) : null },
  ];
  const metaShown = meta.filter((m) => m.value !== null || showPlaceholders);

  const days = accounts.dias.flatMap((d) => {
    const entry = entries.get(d.diaId);
    return entry ? [{ day: d, entry }] : [];
  });

  const goal = hasNumber(accounts.metaFamilias) ? a.goal.split("{{families}}") : null;

  return (
    <RyhShell page="accounts" title={a.metaTitle} description={a.lead}>
      {/* RC-24: header band */}
      <section className={cn(ryh.wrap, "ryh-band")}>
        <div className="py-9 md:py-16">
          <span className={ryh.kicker}>{a.kicker}</span>
          <h1 className="ryh-serif my-3 text-[36px] font-normal leading-[1.08] tracking-[-0.015em] md:my-4 md:text-[56px]">{a.title}</h1>
          <p className={ryh.lead}>{a.lead}</p>
        </div>
      </section>

      <div className={ryh.wrap}>
        {/* RC-25: summary in three numbers */}
        <section aria-label={a.summaryLabel} className="pb-12 pt-12 md:pb-14 md:pt-16">
          <ul className="grid gap-8 md:grid-cols-3 md:gap-10">
            {summary.map((s) => (
              <li key={s.value}>
                <b className="ryh-serif block text-[42px] font-normal leading-none tracking-[-0.02em] tabular-nums md:text-[52px]">{s.value}</b>
                <span className="mt-3 block text-[15px] leading-[1.55] text-[var(--ryh-muted)]">{s.caption}</span>
              </li>
            ))}
          </ul>
          <div className="mt-9 space-y-1.5 text-[15px] leading-[1.6] text-[var(--ryh-muted)]">
            {goal && (
              <p>
                {goal[0]}
                <strong className="font-semibold text-[var(--ryh-fg)]">{familiesText(accounts.metaFamilias as number)}</strong>
                {goal[1]}
              </p>
            )}
            {metaShown.length > 0 && (
              <p>
                {metaShown.map((m, i) => (
                  <Fragment key={m.label}>
                    {i > 0 && " · "}
                    {m.label}: {m.value !== null ? <span className="text-[var(--ryh-fg)]">{m.value}</span> : <Pending>{a.pending}</Pending>}
                  </Fragment>
                ))}
              </p>
            )}
          </div>
        </section>

        {/* RC-26: privacy notice before the invoices */}
        <p className="flex max-w-[44em] gap-3 border-l-2 border-[var(--ryh-y)] py-1 pl-4 text-base leading-[1.6] text-[var(--ryh-fg)] md:pl-5">
          <EyeOff className="mt-1 h-4 w-4 shrink-0 text-[var(--ryh-muted)]" aria-hidden />
          <span>
            <strong className="font-semibold">{a.privacyLabel}</strong> {a.privacy}
          </span>
        </p>

        {/* RC-27: invoices by day */}
        <section aria-labelledby="ryh-faturas" className="pb-[72px] pt-14 md:pb-[120px] md:pt-16">
          <span className={ryh.kicker}>{a.daysKicker}</span>
          <h2 id="ryh-faturas" className={cn(ryh.h2, "mb-6 md:mb-8")}>
            {a.daysTitle}
          </h2>
          <ol>
            {days.map(({ day, entry }) => (
              <DayRow key={day.diaId} day={day} entry={entry} lang={lang} />
            ))}
          </ol>
          <p className="mt-2 border-t border-[var(--ryh-line)] pt-8 text-sm text-[var(--ryh-muted)]">{a.currencyNote}</p>
        </section>
      </div>
    </RyhShell>
  );
};

export default RaiseYourHandsAccounts;
