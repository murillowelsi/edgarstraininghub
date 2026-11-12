import { useLanguage } from "@/contexts/LanguageContext";
import { SectionHeading } from "./SectionHeading";

/**
 * "How it works" in 3 steps (PS-2, replacing "My services"). The steps are the
 * items the plans already promise (assessment → plan → follow-up), so no new
 * marketing copy; longer step texts come later from the user (PS-4).
 */
const HowItWorksSection = () => {
  const { t } = useLanguage();
  const premium = t.pricing.plans.premium.features as string[];
  // Assessment, personalised plan, WhatsApp follow-up: the first three items of the full plan
  const steps = premium.slice(0, 3);

  return (
    <section id="how" className="section bg-background">
      <div className="container mx-auto">
        <SectionHeading title={t.howItWorks.title} subtitle={t.services.cta.description} />
        <ol className="mx-auto grid max-w-4xl gap-4 md:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step} className="flex items-center gap-4 rounded-2xl border bg-card p-5 md:flex-col md:items-start">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary font-display text-lg font-extrabold text-primary-foreground">
                {i + 1}
              </span>
              <span className="text-base font-semibold">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default HowItWorksSection;
