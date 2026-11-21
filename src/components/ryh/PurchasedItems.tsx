import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { ryh } from "@/components/ryh/ryhStyles";
import { useLanguage } from "@/contexts/LanguageContext";
import { accounts, allCities, formatMoney } from "@/lib/ryhAccounts";
import { shortDate, type DiaryLang } from "@/lib/ryhDiary";
import { categoryShares, highlights, isVisible, purchasedItems } from "@/lib/ryhItems";
import { cn } from "@/lib/utils";

/*
 * "O que foi comprado" (EZ Design mock: redesign/contas-itens). Every number is computed from
 * src/content/ryh-contas/itens.json. Unreadable lines are left out of everything shown (user
 * decision): the percentages are of the visible categories, and there is no total line here
 * (the page total is in the summary at the top).
 */

const SHARES = categoryShares(purchasedItems);
const HL = highlights(purchasedItems);
const RECEIPT_COUNT = new Set(purchasedItems.map((i) => i.talao)).size;

/** Receipts in page order (town by town), with their readable lines */
const RECEIPTS = allCities(accounts).flatMap((city) =>
  city.itens.flatMap((item) => {
    const talao = item.comprovativo?.base.split("/").pop();
    if (item.tipo !== "compra" || !talao) return [];
    const lines = purchasedItems.filter((i) => i.talao === talao && isVisible(i));
    return lines.length ? [{ talao, city: city.cidade, store: item.loja, date: item.data, hour: item.hora, lines }] : [];
  }),
);

const num = (v: number, lang: DiaryLang) => new Intl.NumberFormat(lang === "pt" ? "pt-PT" : "en-GB", { maximumFractionDigits: 1 }).format(v);

export function PurchasedItems() {
  const { t, language } = useLanguage();
  const lang: DiaryLang = language === "pt" ? "pt" : "en";
  const s = t.ryh.items;
  const [open, setOpen] = useState(false);
  const listId = useId();

  const cards = [
    { n: HL.leite.unidades, label: s.milk, note: s.milkNote.replace("{{l}}", num(HL.leite.litros, lang)) },
    { n: HL.massa.unidades, label: s.pasta, note: s.pastaNote.replace("{{kg}}", num(HL.massa.kg, lang)) },
    { n: HL.arroz.unidades, label: s.rice, note: s.riceNote.replace("{{kg}}", num(HL.arroz.kg, lang)) },
    { n: HL.papel.rolos, label: s.paper, note: s.paperNote },
    { n: HL.atum.unidades, label: s.tuna, note: s.tunaNote },
    { n: HL.higiene.artigos, label: s.hygiene, note: s.hygieneNote },
  ];
  const maxShare = Math.max(...SHARES.categories.map((c) => c.share));

  return (
    <section aria-labelledby="ryh-comprado" className="pt-16 md:pt-24">
      <span className={ryh.kicker}>{s.kicker}</span>
      <h2 id="ryh-comprado" className={cn(ryh.h2, "mb-3")}>
        {s.title}
      </h2>
      <p className="mb-6 max-w-[40em] text-[16.5px] leading-[1.6] text-[var(--ryh-muted)] md:mb-7">
        {s.lead.replace("{{n}}", String(HL.legiveis)).replace("{{receipts}}", String(RECEIPT_COUNT))}
      </p>

      {/* Highlights: 2 columns on the phone, 3 on desktop */}
      <ul aria-label={s.highlightsLabel} className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-[18px]">
        {cards.map((c) => (
          <li key={c.label} className="rounded-[20px] border border-[var(--ryh-line)] bg-[var(--ryh-paper)] px-[18px] pb-4 pt-[18px]">
            <b className="ryh-serif block text-[44px] font-medium leading-none tracking-[-0.02em] text-[var(--ryh-y)] tabular-nums lg:text-[60px]">{c.n}</b>
            <span className="mt-2 block font-semibold leading-[1.3]">{c.label}</span>
            <span className="mt-1 block text-[13px] leading-[1.4] text-[var(--ryh-muted)]">{c.note}</span>
          </li>
        ))}
      </ul>

      {/* Where every euro went (readable lines only; shares of the visible total) */}
      <div className="mt-8 rounded-[24px] border border-[var(--ryh-line)] bg-[var(--ryh-paper)] p-5 md:mt-[34px] lg:max-w-[860px] lg:px-[34px] lg:py-[30px]">
        <h3 className="ryh-serif mb-3.5 text-[22px] font-medium leading-[1.2]">{s.barsTitle}</h3>
        <ul>
          {SHARES.categories.map((c) => {
            const label = s.categories[c.categoria as keyof typeof s.categories] ?? c.categoria;
            const pct = Math.round(c.share * 100);
            return (
              <li key={c.categoria} className="border-t border-[var(--ryh-line)] py-2.5">
                <p className="flex justify-between gap-2.5 text-[15px]">
                  <span>{label}</span>
                  <span className="whitespace-nowrap font-semibold tabular-nums">
                    {formatMoney(c.valorEUR, "EUR", lang, { cents: true })}
                    <span className="ml-1.5 inline-block min-w-[34px] text-right font-medium text-[var(--ryh-muted)]">{pct}%</span>
                  </span>
                </p>
                <span aria-hidden className="mt-[7px] block h-1.5 rounded-full bg-[var(--ryh-soft)]">
                  <i className="block h-full rounded-full bg-[var(--ryh-y)]" style={{ width: `${(c.share / maxShare) * 100}%` }} />
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-2.5 border-t border-[var(--ryh-line)] pt-3 text-[13px] leading-[1.5] text-[var(--ryh-muted)]">{s.barsNote}</p>

        {/* Full list: rendered only when opened */}
        <button
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((o) => !o)}
          className={cn(ryh.link, ryh.focus, "mt-3.5 text-[15px]")}
        >
          {open ? s.hideList : s.showList}
          <ChevronDown className={cn("h-4 w-4 transition-transform motion-reduce:transition-none", open && "rotate-180")} aria-hidden />
        </button>
        {open && (
          <div id={listId} className="mt-5">
            {s.listNote && <p className="mb-3 text-[13px] text-[var(--ryh-muted)]">{s.listNote}</p>}
            {RECEIPTS.map((r) => (
              <section key={r.talao} aria-label={`${r.city} · ${r.store}`} className="border-t border-[var(--ryh-line)] py-3.5">
                <h4 className="text-[15px] font-semibold">
                  {r.city}
                  <span className="font-normal text-[var(--ryh-muted)]">
                    {" · "}
                    {s.receiptHead.replace("{{store}}", r.store).replace("{{date}}", `${shortDate(r.date, lang)} ${r.hour}`.trim())}
                  </span>
                </h4>
                <table className="mt-1.5 w-full text-[14px]">
                  <thead className="sr-only">
                    <tr>
                      <th scope="col">{s.colItem}</th>
                      <th scope="col">{s.colQty}</th>
                      <th scope="col">{s.colValue}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.lines.map((l, i) => (
                      <tr key={i} className="align-top">
                        <td className="py-1 pr-3">{l.descricao}</td>
                        <td className="w-12 whitespace-nowrap py-1 pr-3 text-right tabular-nums text-[var(--ryh-muted)]">{s.qty.replace("{{n}}", num(l.qtd, lang))}</td>
                        <td className="w-20 whitespace-nowrap py-1 text-right tabular-nums">{formatMoney(l.valorEUR, "EUR", lang, { cents: true })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
