/* eslint-disable i18next/no-literal-string -- pt-PT-only landing: the copy is the user's exact text (ez-project/raise-your-hands/conteudo.md), not app UI to translate */
import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { HandHelping, MapPin, Mountain, Play, Route as RouteIcon, Share2, Youtube } from "lucide-react";
import YouTubeFacade from "@/components/YouTubeFacade";
import { RyhLogo } from "@/components/ryh/RyhLogo";
import { RouteMap, StageTable, type StageRow } from "@/components/ryh/RouteMap";
import { RYH, showPlaceholders } from "@/config/raiseYourHands";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/*
 * Raise Your Hands landing (docs/design/raise-your-hands, RYH-1..8).
 * All visible copy is the user's pt-PT text from ez-project/raise-your-hands/conteudo.md,
 * used exactly as written. Decisions: elevation total stays "+11.094 m" as in the text;
 * no "Quero Apoiar o Projeto" button (final call = Subscrever o Canal + Partilhar).
 */
const STAGE_ROWS: StageRow[] = [
  { label: "Etapa 1", distance: "168,7 km", elevation: "+2.861 m" },
  { label: "Etapa 2", distance: "132,1 km", elevation: "+2.064 m" },
  { label: "Etapa 3", distance: "114,8 km", elevation: "+1.337 m" },
  { label: "Etapa 4", distance: "103,2 km", elevation: "+1.948 m" },
  { label: "Etapa 5", distance: "103,0 km", elevation: "+668 m" },
  { label: "Etapa 6", distance: "116,1 km", elevation: "+977 m" },
  { label: "Etapa 7", distance: "141,5 km", elevation: "+1.240 m" },
];

const TITLE = "Raise Your Hands — Pedalando com propósito de norte a sul de Portugal";
const DESCRIPTION =
  "Muito mais do que um desafio de resistência física e superação. Uma travessia de Matosinhos a Faro movida pela fé, conectando comunidades e levando alimento, esperança e apoio direto a famílias em situação de vulnerabilidade.";

/** Own title, favicon and description while on this page (the static HTML entry has them for crawlers) */
function usePageIdentity() {
  useEffect(() => {
    const prevTitle = document.title;
    const prevLang = document.documentElement.lang;
    document.title = TITLE;
    document.documentElement.lang = "pt-PT";
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    const prevIcon = icon ? { href: icon.href, type: icon.type } : null;
    if (icon) {
      icon.href = "/ryh/favicon.svg";
      icon.type = "image/svg+xml";
    }
    const desc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const prevDesc = desc?.content;
    if (desc) desc.content = DESCRIPTION;
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

const Topo = () => (
  <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 800 400" preserveAspectRatio="none" aria-hidden="true">
    {Array.from({ length: 9 }, (_, i) => {
      const y = 60 + i * 38;
      return <path key={i} d={`M-20 ${y} C 150 ${y - 40}, 260 ${y + 60}, 420 ${y + 10} S 700 ${y - 50}, 820 ${y + 20}`} fill="none" stroke="hsl(var(--ryh-topo))" strokeWidth="1.4" />;
    })}
  </svg>
);

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
  usePageIdentity();
  const { toast } = useToast();

  // RYH-6: native share sheet, else copy the link
  const share = async () => {
    const data = { title: TITLE, text: DESCRIPTION, url: RYH.publicUrl };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
      await navigator.clipboard.writeText(RYH.publicUrl);
      toast({ title: "Link copiado", description: RYH.publicUrl });
    } catch {
      /* the person closed the share sheet */
    }
  };

  const footerLinks = [
    { label: "YouTube", href: RYH.channelUrl },
    { label: "Instagram", href: RYH.instagramUrl },
    { label: "Rota GPX (Komoot)", href: RYH.komootUrl },
  ];

  return (
    <div lang="pt-PT" className="ryh min-h-screen bg-[hsl(var(--ryh-bg))] text-[hsl(var(--ryh-fg))]">
      <header className="flex items-center gap-7 border-b border-[hsl(var(--ryh-border))] px-[18px] py-3.5 md:px-16 md:py-[18px]">
        <a href="#topo" className="flex items-center gap-2.5 font-display text-[13px] font-extrabold tracking-[0.14em] md:text-[15px]">
          <RyhLogo variant="mark" className="h-[30px]" />
          RAISE YOUR HANDS
        </a>
        <nav aria-label="Secções" className="ml-auto hidden gap-[22px] text-sm text-[hsl(var(--ryh-muted))] md:flex">
          <a href="#proposito" className="hover:text-[hsl(var(--ryh-fg))]">Propósito</a>
          <a href="#rota" className="hover:text-[hsl(var(--ryh-fg))]">Rota</a>
          <a href="#transparencia" className="hover:text-[hsl(var(--ryh-fg))]">Transparência</a>
          <a href="#historias" className="hover:text-[hsl(var(--ryh-fg))]">Histórias</a>
        </nav>
        <Link to="/" className="ml-auto border-l border-[hsl(var(--ryh-border))] pl-[22px] font-display text-lg font-extrabold text-[hsl(var(--ryh-ink))] md:ml-0" aria-label="Edgar Zanin">
          EZ
        </Link>
      </header>

      <main>
        {/* 1 · Hero */}
        <section id="topo" className="relative overflow-hidden px-[18px] pb-6 pt-8 md:px-16 md:pb-10 md:pt-[72px]">
          <Topo />
          <div className="relative grid items-center gap-[22px] lg:grid-cols-[1.15fr_1fr] lg:gap-12">
            <div className="order-2 lg:order-1">
              <span className="inline-block rounded-full border border-[hsl(var(--ryh-terra))] px-3 py-[7px] text-xs font-bold tracking-[0.16em] text-[hsl(var(--ryh-terra))]">
                PORTUGAL | 7 ETAPAS | 879,4 KM
              </span>
              <h1 className="my-[18px] font-display text-[30px] font-black leading-[1.04] tracking-[-0.01em] md:text-[54px]">
                RAISE YOUR HANDS: PEDALANDO COM PROPÓSITO DE NORTE A SUL DE PORTUGAL
              </h1>
              <p className="max-w-[600px] text-base text-[hsl(var(--ryh-muted))] md:text-lg">{DESCRIPTION}</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <a href={RYH.playlistUrl} target="_blank" rel="noopener noreferrer" className={btnPrimary}>
                  <Play className="h-4 w-4 fill-current" aria-hidden />
                  Acompanhar a Jornada
                </a>
                <a href="#rota" className={btnSecondary}>
                  <RouteIcon className="h-4 w-4" aria-hidden />
                  Ver a Rota Completa
                </a>
              </div>
            </div>
            <RyhLogo className="order-1 lg:order-2 lg:justify-center" />
          </div>
          <div aria-hidden className="relative mt-6 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[hsl(var(--ryh-muted))] md:mt-11 md:text-[13px]">
            <span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[hsl(var(--ryh-terra))] align-middle" />Matosinhos</span>
            <em className="flex-1 border-t-2 border-dashed border-[hsl(var(--ryh-terra))]" />
            <span>Faro<i className="ml-2 inline-block h-2.5 w-2.5 rounded-full bg-[hsl(var(--ryh-terra))] align-middle" /></span>
          </div>
        </section>

        {/* 2 · Propósito */}
        <section id="proposito" className="grid items-center gap-[22px] border-t border-[hsl(var(--ryh-border))] px-[18px] py-11 md:px-16 md:py-[72px] lg:grid-cols-[1.1fr_1fr] lg:gap-14">
          <div>
            <span className={kicker}>01 · O propósito</span>
            <h2 className={h2}>O QUE É O PROJETO RAISE YOUR HANDS?</h2>
            <div className="max-w-[720px] space-y-3 text-base text-[hsl(var(--ryh-muted))]">
              <p>
                Idealizado por Edgar Alan Zanin, o <b className="text-[hsl(var(--ryh-fg))]">Raise Your Hands</b> nasceu da convicção de que o desporto de longa distância pode ser uma ferramenta poderosa de transformação social e espiritual.
              </p>
              <p>
                Durante a travessia pelo interior e litoral de Portugal, cada paragem vai muito além do descanso físico. Em parceria com igrejas locais, corporações de bombeiros e instituições de caridade, identificamos famílias, idosos e pessoas que enfrentam momentos difíceis — seja por problemas de saúde, desemprego ou isolamento.
              </p>
            </div>
            <blockquote className="mt-[18px] rounded-r-[14px] border-l-4 border-primary bg-[hsl(var(--ryh-card))] px-5 py-4 text-[17px]">
              <b>"Raise Your Hands"</b> é um convite para erguer as mãos em gratidão, fé e, acima de tudo, estender a mão para ajudar quem mais precisa pelo caminho.
            </blockquote>
          </div>
          {RYH.purposePhoto.src ? (
            <img src={RYH.purposePhoto.src} alt={RYH.purposePhoto.alt} loading="lazy" className="h-[220px] w-full rounded-[20px] object-cover md:h-[380px]" />
          ) : (
            <Placeholder className="h-[220px] md:h-[380px]">[FOTO: paragem / entrega de mantimentos, sem rostos identificáveis sem consentimento]</Placeholder>
          )}
        </section>

        {/* 3 · Rota */}
        <section id="rota" className="border-t border-[hsl(var(--ryh-border))] px-[18px] py-11 md:px-16 md:py-[72px]">
          <span className={kicker}>02 · A rota</span>
          <h2 className={h2}>A TRAVESSIA: DE MATOSINHOS A FARO</h2>
          <p className="max-w-[720px] text-[17px] text-[hsl(var(--ryh-muted))]">
            Uma jornada exigente pelas estradas e montanhas de Portugal, enfrentando subidas íngremes, ventos fortes e mudanças climáticas para cumprir cada etapa da missão.
          </p>
          <ul className="my-7 grid gap-2.5 md:grid-cols-3 md:gap-3.5">
            {[
              ["879,4 km", "de distância total"],
              ["+11.094 m", "de ganho de elevação acumulado"],
              ["7 Etapas", "cruzando o país de norte a sul"],
            ].map(([n, l]) => (
              <li key={n} className={cn(card, "px-[22px] py-5")}>
                <b className="block font-display text-[30px] font-black tabular-nums md:text-[40px]">{n}</b>
                <span className="text-sm text-[hsl(var(--ryh-muted))]">{l}</span>
              </li>
            ))}
          </ul>
          <div className="grid items-stretch gap-3.5 lg:grid-cols-[1fr_1.1fr]">
            <div className={cn(card, "p-4 md:p-[22px]")}>
              <RouteMap label="Traçado da rota de Matosinhos a Faro, 7 etapas" />
            </div>
            <div className={cn(card, "p-4 md:p-[22px]")}>
              <StageTable rows={STAGE_ROWS} headers={["Etapa", "Distância", "Elevação Acumulada"]} />
            </div>
          </div>
          {RYH.komootUrl ? (
            <a href={RYH.komootUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--ryh-ink))]">
              <RouteIcon className="h-[15px] w-[15px]" aria-hidden />
              Rota GPX (Komoot)
            </a>
          ) : (
            <Placeholder className="mt-4 inline-grid">[LINK: Rota GPX no Komoot]</Placeholder>
          )}
        </section>

        {/* 4 · Transparência */}
        <section id="transparencia" className="border-t border-[hsl(var(--ryh-border))] px-[18px] py-11 md:px-16 md:py-[72px]">
          <span className={kicker}>03 · Transparência</span>
          <h2 className={h2}>COMPROMISSO E TRANSPARÊNCIA TOTAL</h2>
          <p className="max-w-[720px] text-[17px] text-[hsl(var(--ryh-muted))]">Cada cêntimo doado transforma-se diretamente em alimento na mesa de quem precisa.</p>
          <ol className="mt-7 grid gap-3.5 md:grid-cols-3">
            {[
              ["100% Revertido em Alimentos", "Todos os custos logísticos da viagem — incluindo alojamento, combustível e alimentação da equipa — são custeados integralmente com recursos próprios. As doações destinam-se exclusivamente à compra de mantimentos nos supermercados locais."],
              ["Conexão com Redes Locais", "Trabalhamos lado a lado com líderes comunitários, pastores e entidades sociais nas vilas e cidades da rota (como Gaia, Chaves e Castro Daire) para garantir que a ajuda chegue de forma discreta e respeitosa a quem realmente precisa."],
              ["Prestação de Contas Aberta", "Todas as compras e faturas são registadas e partilhadas publicamente nos vlogs da expedição, garantindo total clareza sobre o destino de cada contribuição."],
            ].map(([title, body], i) => (
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
          <span className={kicker}>04 · Histórias da estrada</span>
          <h2 className={h2}>PESSOAS QUE ENCONTRÁMOS PELO CAMINHO</h2>
          <p className="max-w-[720px] text-[17px] text-[hsl(var(--ryh-muted))]">
            Mais do que quilómetros percorridos, o que marca esta jornada são as vidas tocadas em cada paragem.
          </p>
          <div className="mt-7 grid items-start gap-5 lg:grid-cols-[1.1fr_1fr]">
            <div className="aspect-video overflow-hidden rounded-[20px] border border-[hsl(var(--ryh-border))]">
              <YouTubeFacade videoId={RYH.episode1VideoId} list={RYH.playlistId} title="Raise Your Hands" />
            </div>
            <ul className="grid gap-3.5">
              {[
                { icon: MapPin, title: "Apoio em Vila Nova de Gaia e Chaves", body: "Entregas de compras completas para famílias e mães em situação de vulnerabilidade, realizadas com apoio da comunidade local." },
                { icon: HandHelping, title: "Parceria com a Igreja e Bombeiros", body: "Em conjunto com lideranças locais, levámos mantimentos e palavras de encorajamento para casais a enfrentar graves problemas de saúde após regressarem do estrangeiro." },
                { icon: Mountain, title: "Solidariedade no Interior", body: "Ao chegarmos a pequenas vilas durante alertas meteorológicos, encontrámos um pai com deficiência visual que cria sozinho os seus três filhos — e pudemos abastecer a sua casa com mantimentos essenciais." },
              ].map((s) => (
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
            Assistir aos Episódios no YouTube
          </a>
        </section>

        {/* 6 · Chamada final */}
        <section className="relative border-t border-[hsl(var(--ryh-border))] bg-[hsl(var(--ryh-card))] px-[18px] py-[52px] text-center md:px-16 md:py-[88px]">
          <Topo />
          <div className="relative mx-auto max-w-[760px]">
            <h2 className={h2}>FAÇA PARTE DESTA MISSÃO</h2>
            <p className="text-[17px] text-[hsl(var(--ryh-muted))]">
              Não precisa de pedalar quase 900 quilómetros para transformar a vida de uma família. Pode impulsionar este projeto apoiando as nossas próximas rotas, partilhando os vídeos ou enviando uma mensagem de incentivo.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <a href={RYH.subscribeUrl} target="_blank" rel="noopener noreferrer" className={btnPrimary}>
                <Youtube className="h-4 w-4" aria-hidden />
                Subscrever o Canal
              </a>
              <button type="button" onClick={() => void share()} className={btnSecondary}>
                <Share2 className="h-4 w-4" aria-hidden />
                Partilhar
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="flex flex-col items-start justify-between gap-6 border-t border-[hsl(var(--ryh-border))] px-[18px] py-6 text-sm text-[hsl(var(--ryh-muted))] md:flex-row md:items-center md:px-16 md:py-7">
        <div>
          <b className="tracking-[0.08em] text-[hsl(var(--ryh-fg))]">RAISE YOUR HANDS</b> — Um projeto de Edgar Alan Zanin.
          <br />
          <i>Fé, Ciclismo de Longa Distância e Ação Social.</i>
        </div>
        <nav aria-label="Links" className="flex flex-wrap gap-[18px]">
          {footerLinks.map((l) =>
            l.href ? (
              <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="font-semibold text-[hsl(var(--ryh-fg))] hover:underline">
                {l.label}
              </a>
            ) : showPlaceholders ? (
              <span key={l.label} className="font-semibold text-[hsl(var(--ryh-ink))]">{l.label} [LINK]</span>
            ) : null
          )}
          <Link to="/contact" className="font-semibold text-[hsl(var(--ryh-fg))] hover:underline">
            Contacto
          </Link>
        </nav>
      </footer>
    </div>
  );
};

export default RaiseYourHands;
