import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { openConsentSettings } from "@/lib/consent";

/** Privacy policy (pt-BR / en). The text is a draft: see privacy._reviewStatus in the translations. */
const Privacy = () => {
  const { t } = useLanguage();
  const p = t.privacy;
  usePageTitle(p.title);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-28 pb-16">
        <article className="container mx-auto max-w-3xl px-4">
          <header className="mb-10">
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">{p.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{p.lastUpdated}</p>
            <p className="mt-6 text-base leading-relaxed">{p.intro}</p>
          </header>

          <div className="space-y-8">
            {p.sections.map((section) => (
              <section key={section.title} aria-labelledby={`privacy-${section.title}`}>
                <h2 id={`privacy-${section.title}`} className="text-xl font-semibold">
                  {section.title}
                </h2>
                <div className="mt-3 space-y-3 text-muted-foreground leading-relaxed">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <Button variant="outline" className="mt-10 h-11" onClick={openConsentSettings}>
            {t.consent.settings}
          </Button>
        </article>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
