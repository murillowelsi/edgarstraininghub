import { useEffect, useId, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { RyhLogo } from "@/components/ryh/RyhLogo";
import { RYH, ryhPaths, showPlaceholders } from "@/config/raiseYourHands";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { ryh } from "./ryhStyles";

/*
 * Shared frame of the Raise Your Hands pages (landing + logbook): fonts, theme,
 * header, footer and page identity. Only these routes load the RYH fonts (RC-1).
 */

// Newsreader (titles + logbook text), Inter (body), Montserrat 900 (logo wordmark only)
const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Montserrat:wght@900&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&display=swap";

/** RC-1: the static HTML entries already link the fonts; client-side navigation adds them once */
function useRyhFonts() {
  useEffect(() => {
    if (document.querySelector(`link[href="${FONTS_HREF}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONTS_HREF;
    document.head.appendChild(link);
  }, []);
}

const THEME_KEY = "ryh-theme";
type RyhTheme = "light" | "dark";

/** RC-2: light by default; dark only when the person picks it (saved on this device) */
function useRyhTheme() {
  const [theme, setTheme] = useState<RyhTheme>(() => {
    try {
      return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* private mode: the choice lasts for this visit */
    }
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const prev = meta?.content;
    if (meta) meta.content = theme === "dark" ? "#1C1A17" : "#F6F2EA";
    return () => {
      if (meta && prev !== undefined) meta.content = prev;
    };
  }, [theme]);
  return [theme, setTheme] as const;
}

/** Own title, favicon, description and <html lang> while on a RYH page (the static HTML entries have them for crawlers) */
function usePageIdentity(title: string, description: string, htmlLang: string) {
  // The language context sets "pt"/"en" in its own effect (it runs after this one),
  // so this runs right after it to make it "pt-PT" / "en"
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

/** Anchor links jump straight to the section: no smooth scroll on the RYH pages (the main site keeps it) */
function useInstantScroll() {
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("ryh-instant-scroll");
    return () => html.classList.remove("ryh-instant-scroll");
  }, []);
}

/**
 * Anchors (#rota, #dia-1) also work when arriving from another page: the content is
 * rendered by React after load, and the router's scroll-to-top runs first.
 */
function useHashScroll() {
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const id = window.setTimeout(() => {
      document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
    }, 0);
    return () => window.clearTimeout(id);
  }, [hash]);
}


type NavKey = "purpose" | "route" | "transparency" | "stories" | "diary";

const BRAND = "Raise Your Hands";

function RyhHeader({ onLanding, theme, onToggleTheme }: { onLanding: boolean; theme: RyhTheme; onToggleTheme: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const { t } = useLanguage();
  const r = t.ryh;
  const [open, setOpen] = useState(false);
  const menuId = useId();
  // On the landing the sections are anchors; from the logbook they go back to the landing
  const anchor = (id: string) => (onLanding ? `#${id}` : `${ryhPaths.home}#${id}`);
  const items: { key: NavKey; href: string }[] = [
    { key: "purpose", href: anchor("proposito") },
    { key: "route", href: anchor("rota") },
    { key: "transparency", href: anchor("transparencia") },
    { key: "stories", href: anchor("historias") },
    { key: "diary", href: ryhPaths.diary },
  ];
  const linkClass = (key: NavKey) =>
    cn(
      ryh.focus,
      "transition-colors hover:text-[var(--ryh-fg)]",
      key === "diary" && !onLanding && "text-[var(--ryh-fg)] underline decoration-[var(--ryh-y)] decoration-2 underline-offset-[6px]",
    );
  const renderLink = (item: { key: NavKey; href: string }, extra?: string) =>
    item.key === "diary" ? (
      <Link key={item.key} to={item.href} className={cn(linkClass(item.key), extra)} aria-current={!onLanding ? "page" : undefined} onClick={() => setOpen(false)}>
        {r.nav[item.key]}
      </Link>
    ) : (
      <a key={item.key} href={item.href} className={cn(linkClass(item.key), extra)} onClick={() => setOpen(false)}>
        {r.nav[item.key]}
      </a>
    );

  const ThemeIcon = theme === "dark" ? Sun : Moon;
  const themeLabel = theme === "dark" ? r.nav.themeLight : r.nav.themeDark;

  return (
    // Sticky: the bar (and the mobile menu) stay reachable while reading; a hairline appears once scrolled
    <header
      className={cn(
        "sticky top-0 z-30 border-b bg-[var(--ryh-bg)] transition-colors duration-200",
        scrolled ? "border-[var(--ryh-line)]" : "border-transparent",
      )}
    >
      <div className="flex items-center gap-3.5 px-5 py-4 md:px-[72px] md:py-[22px]">
        {/* RC-19: the bar carries only the name, in the logo wordmark lettering (Montserrat 900, caps) */}
        <Link to={ryhPaths.home} aria-label={BRAND} className={cn(ryh.focus, "flex min-h-[26px] items-center")}>
          <span
            aria-hidden
            className="whitespace-nowrap font-['Montserrat',sans-serif] text-[13px] font-black uppercase leading-none tracking-[0.02em] text-[var(--ryh-fg)] md:text-[15px] md:tracking-[0.03em]"
          >
            {BRAND}
          </span>
        </Link>
        <nav aria-label={r.nav.label} className="ml-auto hidden gap-7 text-[15px] text-[var(--ryh-muted)] lg:flex">
          {items.map((item) => renderLink(item))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5 lg:ml-5">
          <LanguageSwitcher />
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={themeLabel}
            title={themeLabel}
            className={cn(ryh.focus, "grid h-9 w-9 place-items-center rounded-full text-[var(--ryh-muted)] transition-colors hover:text-[var(--ryh-fg)]")}
          >
            <ThemeIcon className="h-[17px] w-[17px]" aria-hidden />
          </button>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((o) => !o)}
            className={cn(ryh.focus, "px-1.5 py-1 text-sm text-[var(--ryh-muted)] lg:hidden")}
          >
            {r.nav.menu}
          </button>
          <a href={RYH.siteUrl} aria-label="Edgar Zanin" className={cn(ryh.focus, "ml-2 hidden text-[13px] font-semibold text-[var(--ryh-muted)] hover:text-[var(--ryh-fg)] lg:inline")}>
            EZ
          </a>
        </div>
      </div>
      {open && (
        <nav id={menuId} aria-label={r.nav.label} className="absolute inset-x-0 top-full z-20 border-y border-[var(--ryh-line)] bg-[var(--ryh-bg)] px-5 pb-3 lg:hidden">
          {items.map((item) => renderLink(item, "block border-b border-[var(--ryh-line)] py-3.5 text-base text-[var(--ryh-fg)] last:border-0"))}
          {/* eslint-disable-next-line i18next/no-literal-string -- site name */}
          <a href={RYH.siteUrl} className={cn(ryh.focus, "block py-3.5 text-base text-[var(--ryh-muted)]")}>edgarzanin.com</a>
        </nav>
      )}
    </header>
  );
}

function RyhFooter({ onLanding }: { onLanding: boolean }) {
  const { t } = useLanguage();
  const r = t.ryh;
  const links = [
    { label: "YouTube", href: RYH.channelUrl },
    { label: r.footer.instagram, href: RYH.instagramUrl },
    { label: r.footer.komoot, href: RYH.komootUrl },
  ];
  const navLink = cn(ryh.focus, "text-[var(--ryh-fg)] hover:underline hover:decoration-[var(--ryh-y)] hover:underline-offset-4");
  return (
    <footer className="border-t border-[var(--ryh-line)]">
      <div className={cn(ryh.wrap, "flex flex-col items-start justify-between gap-8 pb-16 pt-14 md:flex-row md:items-end")}>
        <div className="flex flex-col gap-6">
          {onLanding && <RyhLogo />}
          <p className="text-[15px] leading-[1.7] text-[var(--ryh-muted)]">
            {/* eslint-disable-next-line i18next/no-literal-string -- project name */}
            <b className="font-medium text-[var(--ryh-fg)]">Raise Your Hands</b> {r.footer.byline}
            <br />
            <em className="ryh-serif text-[17px]">{r.footer.tagline}</em>
          </p>
        </div>
        <nav aria-label={r.footer.linksLabel} className="flex flex-wrap gap-[22px] text-[15px]">
          {!onLanding && (
            <Link to={ryhPaths.home} className={navLink}>
              {r.footer.home}
            </Link>
          )}
          {links.map((l) =>
            l.href ? (
              <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className={navLink}>
                {l.label}
              </a>
            ) : showPlaceholders ? (
              // eslint-disable-next-line i18next/no-literal-string -- dev-only marker, never shown in production
              <span key={l.label} className="text-[var(--ryh-muted)] opacity-70">{l.label} [LINK]</span>
            ) : null,
          )}
          {onLanding && (
            <a href={RYH.contactUrl} className={navLink}>
              {r.footer.contact}
            </a>
          )}
        </nav>
      </div>
    </footer>
  );
}

/** Frame of a RYH page: tokens (.ryh / .ryh-dark), header, main content and footer */
export function RyhShell({ page, title, description, children }: { page: "landing" | "diary"; title: string; description: string; children: ReactNode }) {
  const { language } = useLanguage();
  const pageLang = language === "pt" ? "pt-PT" : "en";
  useRyhFonts();
  useHashScroll();
  useInstantScroll();
  usePageIdentity(title, description, pageLang);
  const [theme, setTheme] = useRyhTheme();
  const onLanding = page === "landing";

  return (
    <div lang={pageLang} className={cn("ryh min-h-screen bg-[var(--ryh-bg)] text-[var(--ryh-fg)]", theme === "dark" && "ryh-dark")}>
      <RyhHeader onLanding={onLanding} theme={theme} onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")} />
      <main>{children}</main>
      <RyhFooter onLanding={onLanding} />
    </div>
  );
}
