import { Fragment, useEffect, type ReactNode } from "react";
import { HandHelping, MapPin, Mountain, Play, Route as RouteIcon, Share2, Youtube } from "lucide-react";
import YouTubeFacade from "@/components/YouTubeFacade";
import { RyhLogo } from "@/components/ryh/RyhLogo";
import { RouteMap, StageTable, type StageRow } from "@/components/ryh/RouteMap";
import { RYH, showPlaceholders } from "@/config/raiseYourHands";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

/*
 * Raise Your Hands landing (docs/design/raise-your-hands, RYH-1..8), in PT and EN.
 * The copy lives in translations (namespace "ryh"): PT is the user's exact pt-PT text
 * (ez-project/raise-your-hands/conteudo.md); EN is a faithful translation of it.
 * Decisions: elevation total stays "+11.094 m" as in the text; no "Quero Apoiar o
 * Projeto" button (final call = Subscribe + Share).
 */

/** "{{name}}" in a sentence becomes the bold project name */
const withName = (text: string, name: ReactNode) =>
  text.split("{{name}}").map((part, i) => (
    <Fragment key={i}>
      {i > 0 && name}
      {part}
    </Fragment>
  ));

/** Own title, favicon and description while on this page (the static HTML entry has them for crawlers) */
function usePageIdentity(title: string, description: string, htmlLang: string) {
  // <html lang>: the language context sets "pt"/"en" in its own effect (it runs after
  // this page's), so this one runs right after it to make it "pt-PT" / "en"
  useEffect(() => {
    const id = window.setTimeout(() => {
      document.documentElement.lang = htmlLang;
    }, 0);
    return () => window.clearTimeout(id);
  }, [htmlLang]);

  useEffect(() => {
    document.title = title;
    const desc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (desc) desc.content = description;
  }, [title, description]);

  useEffect(() => {
    const prevTitle = document.title;
    const prevLang = document.documentElement.lang;
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    const prevIcon = icon ? { href: icon.href, type: icon.type } : null;
    if (icon) {
      icon.href = "/ryh/favicon.svg";
      icon.type = "image/svg+xml";
    }
    const desc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const prevDesc = desc?.content;
    return () => {
      document.title = prevTitle;
      document.documentElement.lang = prevLang;
      if (icon && prevIcon) {
        icon.href = prevIcon.href;
        icon.type = prevIcon.type;
      }
      if (desc && prevDesc !== undefined) desc.content = prevDesc;
    };
  }, []);
}


/** Pending content: a dashed box in development, nothing in production */
const Placeholder = ({ children, className }: { children: ReactNode; className?: string }) =>
  showPlaceholders ? (
    <div className={cn("grid place-items-center rounded-[20px] border-2 border-dashed border-[hsl(var(--ryh-border))] p-5 text-center text-[13px] font-semibold text-[hsl(var(--ryh-muted))]", className)}>
      {children}
    </div>
  ) : null;

const btnPrimary =
  "inline-flex h-[50px] items-center justify-center gap-2.5 rounded-xl bg-primary px-5 text-[15px] font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
const btnSecondary =
  "inline-flex h-[50px] items-center justify-center gap-2.5 rounded-xl border border-[hsl(var(--ryh-border))] bg-[hsl(var(--ryh-card))] px-5 text-[15px] font-bold transition-colors hover:bg-[hsl(var(--ryh-s2))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
const kicker = "text-xs font-bold uppercase tracking-[0.14em] text-[hsl(var(--ryh-terra))]";
const h2 = "mt-2.5 mb-4 font-display text-[25px] font-extrabold leading-[1.1] md:text-4xl";
const card = "rounded-[20px] border border-[hsl(var(--ryh-border))] bg-[hsl(var(--ryh-card))]";

const RaiseYourHands = () => {
  const { t, language } = useLanguage();
  const r = t.ryh;
  const pageLang = language === "pt" ? "pt-PT" : "en";
  usePageIdentity(r.meta.title, r.hero.lead, pageLang);
  const { toast } = useToast();
  // eslint-disable-next-line i18next/no-literal-string -- project name, same in every language
  const projectName = <b className="text-[hsl(var(--ryh-fg))]">Raise Your Hands</b>;

  const stageRows: StageRow[] = r.route.stages.map(([distance, elevation], i) => ({
    label: r.route.stageLabel.replace("{{n}}", String(i + 1)),
    distance,
    elevation,
  }));

  // RYH-6: native share sheet, else copy the link
  const share = async () => {
    const data = { title: r.meta.title, text: r.hero.lead, url: RYH.publicUrl };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
      await navigator.clipboard.writeText(RYH.publicUrl);
      toast({ title: r.cta.linkCopied, description: RYH.publicUrl });
    } catch {
      /* the person closed the share sheet */
    }
  };

  const footerLinks = [
    { label: "YouTube", href: RYH.channelUrl },
    { label: r.footer.instagram, href: RYH.instagramUrl },
    { label: r.footer.komoot, href: RYH.komootUrl },
  ];

  return (
    <div lang={pageLang} className="ryh min-h-screen bg-[hsl(var(--ryh-bg))] text-[hsl(var(--ryh-fg))]">
      <header className="flex items-center gap-7 border-b border-[hsl(var(--ryh-border))] px-[18px] py-3.5 md:px-16 md:py-[18px]">
        <a href="#topo" className="flex items-center gap-2.5 font-display text-[13px] font-extrabold tracking-[0.14em] md:text-[15px]">
          <RyhLogo variant="mark" className="h-[30px]" />
          {/* eslint-disable-next-line i18next/no-literal-string -- project name, same in every language */}
          <span className="hidden whitespace-nowrap min-[360px]:inline">RAISE YOUR HANDS</span>
        </a>
        <nav aria-label={r.nav.label} className="ml-auto hidden gap-[22px] text-sm text-[hsl(var(--ryh-muted))] md:flex">
          <a href="#proposito" className="hover:text-[hsl(var(--ryh-fg))]">{r.nav.purpose}</a>
          <a href="#rota" className="hover:text-[hsl(var(--ryh-fg))]">{r.nav.route}</a>
          <a href="#transparencia" className="hover:text-[hsl(var(--ryh-fg))]">{r.nav.transparency}</a>
          <a href="#historias" className="hover:text-[hsl(var(--ryh-fg))]">{r.nav.stories}</a>
        </nav>
        {/* Same flags as the site's navbar */}
        <div className="ml-auto md:ml-0">
          <LanguageSwitcher />
        </div>
        <a href={RYH.siteUrl} className="border-l border-[hsl(var(--ryh-border))] pl-4 font-display text-lg font-extrabold text-[hsl(var(--ryh-ink))] md:pl-[22px]" aria-label="Edgar Zanin">
          EZ
        </a>
      </header>

      <main>
        {/* 1 · Hero */}
        {/* Plain background (user's choice): no topographic lines behind the hero */}
        <section id="topo" className="relative overflow-hidden px-[18px] pb-6 pt-8 md:px-16 md:pb-10 md:pt-[72px]">
          <div className="relative grid items-center gap-[22px] lg:grid-cols-[1.15fr_1fr] lg:gap-12">
            <div className="order-2 lg:order-1">
              <span className="inline-block rounded-full border border-[hsl(var(--ryh-terra))] px-3 py-[7px] text-xs font-bold tracking-[0.16em] text-[hsl(var(--ryh-terra))]">
                {r.hero.badge}
              </span>
              <h1 className="my-[18px] font-display text-[30px] font-black leading-[1.04] tracking-[-0.01em] md:text-[54px]">
                {r.hero.title}
              </h1>
              <p className="max-w-[600px] text-base text-[hsl(var(--ryh-muted))] md:text-lg">{r.hero.lead}</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <a href={RYH.playlistUrl} target="_blank" rel="noopener noreferrer" className={btnPrimary}>
                  <Play className="h-4 w-4 fill-current" aria-hidden />
                  {r.hero.follow}
                </a>
                <a href="#rota" className={btnSecondary}>
                  <RouteIcon className="h-4 w-4" aria-hidden />
                  {r.hero.seeRoute}
                </a>
              </div>
            </div>
            <RyhLogo className="order-1 lg:order-2 lg:justify-center" />
          </div>
          <div aria-hidden className="relative mt-6 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[hsl(var(--ryh-muted))] md:mt-11 md:text-[13px]">
            {/* eslint-disable-next-line i18next/no-literal-string -- place names */}
            <span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[hsl(var(--ryh-terra))] align-middle" />Matosinhos</span>
            <em className="flex-1 border-t-2 border-dashed border-[hsl(var(--ryh-terra))]" />
            {/* eslint-disable-next-line i18next/no-literal-string -- place names */}
            <span>Faro<i className="ml-2 inline-block h-2.5 w-2.5 rounded-full bg-[hsl(var(--ryh-terra))] align-middle" /></span>
          </div>
        </section>

        {/* 2 · Propósito */}
        <section id="proposito" className="grid items-center gap-[22px] border-t border-[hsl(var(--ryh-border))] px-[18px] py-11 md:px-16 md:py-[72px] lg:grid-cols-[1.1fr_1fr] lg:gap-14">
          <div>
            <span className={kicker}>{r.purpose.kicker}</span>
            <h2 className={h2}>{r.purpose.title}</h2>
            <div className="max-w-[720px] space-y-3 text-base text-[hsl(var(--ryh-muted))]">
              <p>{withName(r.purpose.p1, projectName)}</p>
              <p>{r.purpose.p2}</p>
            </div>
            <blockquote className="mt-[18px] rounded-r-[14px] border-l-4 border-primary bg-[hsl(var(--ryh-card))] px-5 py-4 text-[17px]">
              {/* eslint-disable-next-line i18next/no-literal-string -- project name */}
              {withName(r.purpose.quote, <b>"Raise Your Hands"</b>)}
            </blockquote>
          </div>
          {RYH.purposePhoto.src ? (
            <img src={RYH.purposePhoto.src} alt={RYH.purposePhoto.alt} loading="lazy" className="h-[220px] w-full rounded-[20px] object-cover md:h-[380px]" />
          ) : (
            <Placeholder className="h-[220px] md:h-[380px]">{r.purpose.photoPlaceholder}</Placeholder>
          )}
        </section>

        {/* 3 · Rota */}
        <section id="rota" className="border-t border-[hsl(var(--ryh-border))] px-[18px] py-11 md:px-16 md:py-[72px]">
          <span className={kicker}>{r.route.kicker}</span>
          <h2 className={h2}>{r.route.title}</h2>
          <p className="max-w-[720px] text-[17px] text-[hsl(var(--ryh-muted))]">{r.route.sub}</p>
          <ul className="my-7 grid gap-2.5 md:grid-cols-3 md:gap-3.5">
            {r.route.kpis.map(({ value: n, label: l }) => (
              <li key={n} className={cn(card, "px-[22px] py-5")}>
                <b className="block font-display text-[30px] font-black tabular-nums md:text-[40px]">{n}</b>
                <span className="text-sm text-[hsl(var(--ryh-muted))]">{l}</span>
              </li>
            ))}
          </ul>
          <div className="grid items-stretch gap-3.5 lg:grid-cols-[1fr_1.1fr]">
            <div className={cn(card, "p-4 md:p-[22px]")}>
              <RouteMap label={r.route.mapLabel} />
            </div>
            <div className={cn(card, "p-4 md:p-[22px]")}>
              <StageTable rows={stageRows} headers={[r.route.table.stage, r.route.table.distance, r.route.table.elevation]} />
            </div>
          </div>
          {RYH.komootUrl ? (
            <a href={RYH.komootUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--ryh-ink))]">
              <RouteIcon className="h-[15px] w-[15px]" aria-hidden />
              {r.route.komoot}
            </a>
          ) : (
            <Placeholder className="mt-4 inline-grid">{r.route.komootPlaceholder}</Placeholder>
          )}
        </section>

        {/* 4 · Transparência */}
        <section id="transparencia" className="border-t border-[hsl(var(--ryh-border))] px-[18px] py-11 md:px-16 md:py-[72px]">
          <span className={kicker}>{r.transparency.kicker}</span>
          <h2 className={h2}>{r.transparency.title}</h2>
          <p className="max-w-[720px] text-[17px] text-[hsl(var(--ryh-muted))]">{r.transparency.sub}</p>
          <ol className="mt-7 grid gap-3.5 md:grid-cols-3">
            {r.transparency.pillars.map(({ title, body }, i) => (
              <li key={title} className={cn(card, "p-6")}>
                <span className="mb-3.5 grid h-10 w-10 place-items-center rounded-xl bg-primary font-display text-lg font-black text-primary-foreground">{i + 1}</span>
                <h3 className="mb-2 font-display text-lg font-bold leading-tight">{title}</h3>
                <p className="text-[15px] text-[hsl(var(--ryh-muted))]">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* 5 · Histórias */}
        <section id="historias" className="border-t border-[hsl(var(--ryh-border))] px-[18px] py-11 md:px-16 md:py-[72px]">
          <span className={kicker}>{r.stories.kicker}</span>
          <h2 className={h2}>{r.stories.title}</h2>
          <p className="max-w-[720px] text-[17px] text-[hsl(var(--ryh-muted))]">{r.stories.sub}</p>
          <div className="mt-7 grid items-start gap-5 lg:grid-cols-[1.1fr_1fr]">
            <div className="aspect-video overflow-hidden rounded-[20px] border border-[hsl(var(--ryh-border))]">
              <YouTubeFacade videoId={RYH.episode1VideoId} list={RYH.playlistId} title="Raise Your Hands" />
            </div>
            <ul className="grid gap-3.5">
              {r.stories.items.map((item, i) => ({ ...item, icon: [MapPin, HandHelping, Mountain][i] ?? MapPin })).map((s) => (
                <li key={s.title} className={cn(card, "flex gap-3.5 p-[18px]")}>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[hsl(var(--ryh-terra)/0.16)] text-[hsl(var(--ryh-terra))]">
                    <s.icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <h3 className="mb-2 font-display text-lg font-bold leading-tight">{s.title}</h3>
                    <p className="text-[15px] text-[hsl(var(--ryh-muted))]">{s.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <a href={RYH.playlistUrl} target="_blank" rel="noopener noreferrer" className={cn(btnSecondary, "mt-[22px] w-full sm:w-auto")}>
            <Youtube className="h-4 w-4" aria-hidden />
            {r.stories.watch}
          </a>
        </section>

        {/* 6 · Chamada final */}
        <section className="relative border-t border-[hsl(var(--ryh-border))] bg-[hsl(var(--ryh-card))] px-[18px] py-[52px] text-center md:px-16 md:py-[88px]">
          <div className="relative mx-auto max-w-[760px]">
            <h2 className={h2}>{r.cta.title}</h2>
            <p className="text-[17px] text-[hsl(var(--ryh-muted))]">{r.cta.body}</p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <a href={RYH.subscribeUrl} target="_blank" rel="noopener noreferrer" className={btnPrimary}>
                <Youtube className="h-4 w-4" aria-hidden />
                {r.cta.subscribe}
              </a>
              <button type="button" onClick={() => void share()} className={btnSecondary}>
                <Share2 className="h-4 w-4" aria-hidden />
                {r.cta.share}
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="flex flex-col items-start justify-between gap-6 border-t border-[hsl(var(--ryh-border))] px-[18px] py-6 text-sm text-[hsl(var(--ryh-muted))] md:flex-row md:items-center md:px-16 md:py-7">
        <div>
          {/* eslint-disable-next-line i18next/no-literal-string -- project name */}
          <b className="tracking-[0.08em] text-[hsl(var(--ryh-fg))]">RAISE YOUR HANDS</b> {r.footer.byline}
          <br />
          <i>{r.footer.tagline}</i>
        </div>
        <nav aria-label={r.footer.linksLabel} className="flex flex-wrap gap-[18px]">
          {footerLinks.map((l) =>
            l.href ? (
              <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="font-semibold text-[hsl(var(--ryh-fg))] hover:underline">
                {l.label}
              </a>
            ) : showPlaceholders ? (
              // eslint-disable-next-line i18next/no-literal-string -- dev-only marker, never shown in production
              <span key={l.label} className="font-semibold text-[hsl(var(--ryh-ink))]">{l.label} [LINK]</span>
            ) : null
          )}
          <a href={RYH.contactUrl} className="font-semibold text-[hsl(var(--ryh-fg))] hover:underline">
            {r.footer.contact}
          </a>
        </nav>
      </footer>
    </div>
  );
};

export default RaiseYourHands;
