import { Fragment, type ReactNode } from "react";
import { Link } from "react-router-dom";
import YouTubeFacade from "@/components/YouTubeFacade";
import { PhotoSlideshow } from "@/components/ryh/PhotoSlideshow";
import { PhotoStrip } from "@/components/ryh/PhotoStrip";
import { RyhLogo } from "@/components/ryh/RyhLogo";
import { RouteMap, StageTable, type StageRow } from "@/components/ryh/RouteMap";
import { RyhShell } from "@/components/ryh/RyhShell";
import { ryh } from "@/components/ryh/ryhStyles";
import { RYH, ryhPaths, showPlaceholders } from "@/config/raiseYourHands";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { diaryCover, diaryEntries, diaryPhoto, firstSentence, type DiaryPhoto } from "@/lib/ryhDiary";

/*
 * Raise Your Hands landing, calm version (ez-project/raise-your-hands/redesign/NOTA.md,
 * RC-1..13). Copy in translations (namespace "ryh"): PT is the user's pt-PT text, EN a
 * faithful translation. Main hero: text on the left, logo trace on the right, no wordmark.
 */

/** "{{name}}" in a sentence becomes the project name */
const withName = (text: string, name: ReactNode) =>
  text.split("{{name}}").map((part, i) => (
    <Fragment key={i}>
      {i > 0 && name}
      {part}
    </Fragment>
  ));

/** Photos picked from the logbook ("entry/nn"): one per moment of the crossing */
const ROAD_PICKS = ["chegada/01", "dia-1/02", "dia-1/03", "dia-2/02", "dia-2/04", "dia-1/05", "dia-3/04", "dia-3/05", "dia-4/03", "dia-4/06"];
/** Purpose slideshow: groceries and deliveries (no faces of the people helped) */
const PURPOSE_PICKS = ["dia-3/01", "chegada/02", "dia-3/06", "dia-2/06", "dia-4/04", "dia-3/02"];

const srcSet = (p: DiaryPhoto) => `${p.base}-640.webp 640w, ${p.base}-1280.webp 1280w`;

/** Pending content: a soft box in development, nothing in production */
const Placeholder = ({ children, className }: { children: ReactNode; className?: string }) =>
  showPlaceholders ? (
    <div className={cn("grid place-items-center rounded-[28px] bg-[var(--ryh-soft)] p-6 text-center text-[13px] text-[var(--ryh-muted)]", className)}>
      {children}
    </div>
  ) : null;

const RaiseYourHands = () => {
  const { t, language } = useLanguage();
  const r = t.ryh;
  const lang = language === "pt" ? "pt" : "en";
  const { toast } = useToast();
  // eslint-disable-next-line i18next/no-literal-string -- project name, same in every language
  const projectName = <strong className="font-medium text-[var(--ryh-fg)]">Raise Your Hands</strong>;

  // RC-5: the most recent logbook entry
  const latest = diaryEntries(lang).at(-1);
  const cover = latest && diaryCover(latest.id, lang);
  const roadPhotos = ROAD_PICKS.map((ref) => diaryPhoto(ref, lang)).filter((p): p is DiaryPhoto => !!p);
  const purposePhotos = PURPOSE_PICKS.map((ref) => diaryPhoto(ref, lang)).filter((p): p is DiaryPhoto => !!p);

  const stageRows: StageRow[] = r.route.stages.map(([distance, elevation], i) => ({
    label: r.route.stageLabel.replace("{{n}}", String(i + 1)),
    distance,
    elevation,
  }));

  // Native share sheet, else copy the link
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

  const f = r.fundraising;

  return (
    <RyhShell page="landing" title={r.meta.title} description={r.hero.lead}>
      {/* RC-4 · Hero: text left, logo trace right (no wordmark, no pill, no waves) */}
      <section id="topo" className={ryh.wrap}>
        <div className="grid items-center gap-7 pb-16 pt-7 md:pb-24 md:pt-[72px] lg:grid-cols-[1.25fr_1fr] lg:gap-16">
          <div>
            <span className={ryh.kicker}>{r.hero.eyebrow}</span>
            <h1 className={ryh.h1}>{r.hero.title}</h1>
            <p className={ryh.lead}>{r.hero.lead}</p>
            <div className="mt-[26px] flex flex-wrap items-center gap-[18px] md:mt-[34px] md:gap-[22px]">
              <a href={RYH.playlistUrl} target="_blank" rel="noopener noreferrer" className={cn(ryh.btn, ryh.focus)}>
                {r.hero.follow}
              </a>
              <a href="#rota" className={cn(ryh.link, ryh.focus)}>
                {r.hero.seeRoute}
              </a>
            </div>
          </div>
          {/* Mobile/tablet: the full logo A on top; desktop: trace only, next to the text (approved hero) */}
          <RyhLogo size="lg" className="-order-1 lg:hidden" />
          <RyhLogo variant="trace" className="hidden lg:flex lg:justify-center" />
        </div>
      </section>

      {/* RC-5 · From the logbook: the most recent entry */}
      {latest && (
        <section aria-labelledby="ryh-latest" className={ryh.wrap}>
          <div className="grid items-center gap-4 border-t border-[var(--ryh-line)] py-[26px] md:grid-cols-[220px_1fr_auto] md:gap-10 md:py-[34px]">
            {cover ? (
              <Link to={`${ryhPaths.diary}#${latest.id}`} tabIndex={-1} aria-hidden className="block overflow-hidden rounded-[20px]">
                <img
                  src={`${cover.base}-640.webp`}
                  srcSet={srcSet(cover)}
                  sizes="(min-width: 768px) 220px, 100vw"
                  width={cover.w}
                  height={cover.h}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="aspect-[16/10] w-full bg-[var(--ryh-soft)] object-cover transition-transform duration-300 hover:scale-[1.03] md:aspect-[4/5]"
                />
              </Link>
            ) : null}
            <div>
              <p className="mb-2 text-sm leading-normal text-[var(--ryh-muted)]">
                <b className="font-medium text-[var(--ryh-sage)]">{r.latest.label}</b> · {latest.dateText}
              </p>
              <h2 id="ryh-latest" className="ryh-serif mb-1.5 text-[21px] font-normal leading-[1.25] tracking-[-0.015em] md:text-[25px]">
                {latest.title}
              </h2>
              <p className="max-w-[52em] text-base leading-[1.7] text-[var(--ryh-muted)]">{firstSentence(latest)}</p>
            </div>
            <Link to={`${ryhPaths.diary}#${latest.id}`} className={cn(ryh.link, ryh.focus, "mt-2 justify-self-start md:mt-0")}>
              {r.latest.read}
            </Link>
          </div>
        </section>
      )}

      {/* RC-6 · Purpose: pull quote without a box; optional photo on a soft background */}
      <section id="proposito" className={cn(ryh.wrap, "ryh-band")}>
        <div className={cn(ryh.sec)}>
          <div className="grid items-center gap-9 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
            <div>
              <span className={ryh.kicker}>{r.purpose.kicker}</span>
              <h2 className={ryh.h2}>{r.purpose.title}</h2>
              <div className={cn(ryh.p, "space-y-3.5")}>
                <p>{withName(r.purpose.p1, projectName)}</p>
                <p>{r.purpose.p2}</p>
              </div>
              <blockquote className="ryh-serif mt-[30px] border-l-2 border-[var(--ryh-y)] pl-[22px] text-[22px] italic leading-[1.45] md:text-[27px]">
                {/* eslint-disable-next-line i18next/no-literal-string -- project name */}
                {withName(r.purpose.quote, <>"Raise Your Hands"</>)}
              </blockquote>
            </div>
            {purposePhotos.length > 0 ? (
              <PhotoSlideshow
                photos={purposePhotos}
                labels={{ label: r.road.slides, pause: r.road.pause, play: r.road.play, goTo: r.road.goTo }}
                className="aspect-[4/5] w-full"
              />
            ) : RYH.purposePhoto.src ? (
              <img
                src={RYH.purposePhoto.src}
                alt={RYH.purposePhoto.alt}
                loading="lazy"
                className="aspect-[4/3] w-full rounded-[28px] bg-[var(--ryh-soft)] object-cover lg:aspect-[4/5]"
              />
            ) : (
              <Placeholder className="aspect-[4/3] lg:aspect-[4/5]">{r.purpose.photoPlaceholder}</Placeholder>
            )}
          </div>
        </div>
      </section>

      {/* RC-7 · Route: numbers in a row, soft map, table with hairlines */}
      <section id="rota" className={ryh.wrap}>
        <div className={ryh.sec}>
          <span className={ryh.kicker}>{r.route.kicker}</span>
          <h2 className={ryh.h2}>{r.route.title}</h2>
          <p className={cn(ryh.p, "max-w-[40em]")}>{r.route.sub}</p>
          <ul className="mb-9 mt-[30px] flex flex-wrap gap-[26px] md:mb-[52px] md:mt-11 md:gap-[72px]">
            {r.route.kpis.map(({ value, label }) => (
              <li key={value}>
                <b className="ryh-serif block text-[34px] font-normal leading-none tracking-[-0.02em] tabular-nums md:text-[46px]">{value}</b>
                <span className="text-[15px] text-[var(--ryh-muted)]">{label}</span>
              </li>
            ))}
          </ul>
          <div className="grid items-center gap-9 lg:grid-cols-[1fr_1.15fr] lg:gap-[72px]">
            <RouteMap label={r.route.mapLabel} />
            <StageTable rows={stageRows} headers={[r.route.table.stage, r.route.table.distance, r.route.table.elevation]} />
          </div>
          {RYH.komootUrl ? (
            <a
              href={RYH.komootUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                ryh.focus,
                "mt-[26px] inline-block text-[15px] text-[var(--ryh-muted)] underline decoration-[var(--ryh-line)] underline-offset-4 hover:text-[var(--ryh-fg)]",
              )}
            >
              {r.route.komoot}
            </a>
          ) : (
            <Placeholder className="mt-[26px] inline-grid rounded-xl px-4 py-2">{r.route.komootPlaceholder}</Placeholder>
          )}
        </div>
      </section>

      {/* RC-8 · Transparency: serif numerals in sage, no cards */}
      {/* From the road: moments of the crossing, tap to enlarge, link to the logbook */}
      {roadPhotos.length > 0 && (
        <section id="estrada" aria-labelledby="ryh-road" className={cn(ryh.wrap, "ryh-band")}>
          <div className={ryh.sec}>
            <span className={ryh.kicker}>{r.road.kicker}</span>
            <h2 id="ryh-road" className={ryh.h2}>
              {r.road.title}
            </h2>
            <PhotoStrip photos={roadPhotos} label={r.road.title} />
            <Link to={ryhPaths.diary} className={cn(ryh.link, ryh.focus, "mt-6")}>
              {r.road.more}
            </Link>
          </div>
        </section>
      )}

      <section id="transparencia" className={ryh.wrap}>
        <div className={ryh.sec}>
          <span className={ryh.kicker}>{r.transparency.kicker}</span>
          <h2 className={ryh.h2}>{r.transparency.title}</h2>
          <p className={cn(ryh.p, "max-w-[40em]")}>{r.transparency.sub}</p>
          <ol className="mt-10 grid gap-10 md:mt-[52px] md:grid-cols-3 md:gap-14">
            {r.transparency.pillars.map(({ title, body }, i) => (
              <li key={title}>
                <span aria-hidden className="ryh-serif mb-[18px] block text-[40px] leading-none text-[var(--ryh-sage)]">
                  {i + 1}
                </span>
                <h3 className={ryh.h3}>{title}</h3>
                <p className={cn(ryh.p, "md:text-[16.5px]")}>{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* RC-13 · Support: where the money came from (no "Donate" button, no £840, no supporter count) */}
      <section id="apoio" className={cn(ryh.wrap, "ryh-band")}>
        <div className={ryh.sec}>
          <span className={ryh.kicker}>{f.kicker}</span>
          <h2 className={ryh.h2}>{f.title}</h2>
          <div className="mt-8 grid items-start gap-10 md:mt-10 lg:grid-cols-2 lg:gap-20">
            <div>
              <p className="flex flex-wrap items-baseline gap-x-3.5">
                <b className="ryh-serif text-[56px] font-normal leading-none tracking-[-0.02em] tabular-nums md:text-[72px]">{f.amount}</b>
                <span className="ryh-serif text-[20px] text-[var(--ryh-muted)] md:text-[24px]">{f.amountLabel}</span>
              </p>
              <p className={cn(ryh.p, "mt-5 max-w-[24em]")}>{f.via}</p>
              <a href={RYH.justGivingUrl} target="_blank" rel="noopener" className={cn(ryh.link, ryh.focus, "mt-6")}>
                {f.link}
                <span aria-hidden>↗</span>
              </a>
            </div>
            <figure className="border-l-2 border-[var(--ryh-y)] pl-[22px] md:pl-7">
              <figcaption className="mb-2 text-sm text-[var(--ryh-sage)]">{f.storyLabel}</figcaption>
              <blockquote className="ryh-serif text-[19px] italic leading-[1.75] md:text-[21px]">
                <p>{f.story}</p>
              </blockquote>
              {/* The rest of Edgar's story: only when the text exists */}
              {f.storyRest && (
                <details className="group mt-4">
                  <summary
                    className={cn(
                      ryh.focus,
                      "inline-flex cursor-pointer list-none items-center gap-1.5 border-b border-[var(--ryh-line)] pb-0.5 text-[15px] text-[var(--ryh-muted)] hover:text-[var(--ryh-fg)] [&::-webkit-details-marker]:hidden",
                    )}
                  >
                    {f.readFull}
                    <span aria-hidden className="transition-transform group-open:rotate-180">
                      ↓
                    </span>
                  </summary>
                  <div className="ryh-serif mt-4 space-y-4 text-[19px] italic leading-[1.75] md:text-[21px]">
                    {f.storyRest.split("\n\n").map((para) => (
                      <p key={para}>{para}</p>
                    ))}
                  </div>
                </details>
              )}
            </figure>
          </div>
        </div>
      </section>

      {/* RC-9 · Stories: list with hairlines, video in a soft frame, YouTube as a link */}
      <section id="historias" className={ryh.wrap}>
        <div className={ryh.sec}>
          <span className={ryh.kicker}>{r.stories.kicker}</span>
          <h2 className={ryh.h2}>{r.stories.title}</h2>
          <p className={cn(ryh.p, "max-w-[40em]")}>{r.stories.sub}</p>
          <div className="mt-9 grid items-start gap-9 md:mt-[52px] lg:grid-cols-[1.1fr_1fr] lg:gap-16">
            <div className="aspect-video overflow-hidden rounded-[24px] bg-[var(--ryh-soft)]">
              <YouTubeFacade videoId={RYH.episode1VideoId} list={RYH.playlistId} title="Raise Your Hands" />
            </div>
            <ul>
              {r.stories.items.map((s) => (
                <li key={s.title} className="mb-6 border-b border-[var(--ryh-line)] pb-6 last:mb-0 last:border-0 last:pb-0">
                  <h3 className={ryh.h3}>{s.title}</h3>
                  <p className={cn(ryh.p, "md:text-[16.5px]")}>{s.body}</p>
                </li>
              ))}
            </ul>
          </div>
          <a href={RYH.playlistUrl} target="_blank" rel="noopener noreferrer" className={cn(ryh.link, ryh.focus, "mt-9")}>
            {r.stories.watch}
          </a>
        </div>
      </section>

      {/* RC-10 · Final call on a paper band, no waves */}
      <section className="bg-[var(--ryh-paper)] py-[76px] text-center md:py-[120px]">
        <div className={ryh.wrap}>
          <h2 className={ryh.h2}>{r.cta.title}</h2>
          <p className={cn(ryh.p, "mx-auto max-w-[36em]")}>{r.cta.body}</p>
          <div className="mt-[26px] flex flex-wrap items-center justify-center gap-[18px] md:mt-[34px] md:gap-[22px]">
            <a href={RYH.subscribeUrl} target="_blank" rel="noopener noreferrer" className={cn(ryh.btn, ryh.focus)}>
              {r.cta.subscribe}
            </a>
            <button type="button" onClick={() => void share()} className={cn(ryh.link, ryh.focus)}>
              {r.cta.share}
            </button>
          </div>
        </div>
      </section>
    </RyhShell>
  );
};

export default RaiseYourHands;
