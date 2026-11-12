import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { getWhatsAppLink } from "@/lib/whatsapp";
import { Check, Minus, Star } from "lucide-react";
import { SectionHeading } from "./SectionHeading";

/**
 * Comparable plans (docs/design/public-site-v2 PS-1): every plan lists the same
 * items, ✓ or —, in the same order, so the difference is visible at a glance.
 * "I want this plan" opens WhatsApp with the plan's name in the message.
 * Only the texts that exist today (names, prices, items); no invented period or rules.
 */
const PricingSection = () => {
  const { t, language } = useLanguage();
  const tp = t.pricing;

  const plans = (["basic", "standard", "premium"] as const).map((key) => ({
    key,
    name: tp.plans[key].name,
    price: tp.plans[key].price,
    features: tp.plans[key].features as string[],
    popular: key === "standard" && !!tp.plans.standard.popular,
  }));

  // One list for all plans, in the order of the most complete plan (then any item it lacks)
  const allFeatures = [...plans]
    .sort((a, b) => b.features.length - a.features.length)
    .reduce<string[]>((list, p) => [...list, ...p.features.filter((f) => !list.includes(f))], []);
  // Phones swipe through the plans: the most chosen one first
  const mobileOrder = [...plans].sort((a, b) => Number(b.popular) - Number(a.popular));

  return (
    <section id="pricing" className="section bg-muted">
      <div className="container mx-auto">
        <SectionHeading title={tp.title} highlight={tp.titleHighlight} subtitle={tp.subtitle} />

        <div
          className={cn(
            "-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 pt-4",
            "md:mx-auto md:grid md:max-w-6xl md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0"
          )}
        >
          {mobileOrder.map((plan) => (
            <article
              key={plan.key}
              aria-label={plan.name}
              className={cn(
                "relative flex w-[82%] shrink-0 snap-center flex-col rounded-2xl border bg-card p-6 md:w-auto",
                plan.popular ? "border-2 border-primary" : "border-border",
                // Desktop keeps the usual order (basic, standard, premium)
                plan.key === "basic" ? "md:order-1" : plan.key === "standard" ? "md:order-2" : "md:order-3"
              )}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase text-primary-foreground">
                  <Star className="h-3.5 w-3.5" aria-hidden />
                  {tp.mostPopular}
                </span>
              )}
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <p className="mt-1 font-display text-3xl font-extrabold text-primary-ink">{plan.price || tp.priceOnRequest}</p>

              <ul className="mt-5 flex-1 space-y-2.5">
                {allFeatures.map((feature) => {
                  const included = plan.features.includes(feature);
                  return (
                    <li key={feature} className={cn("flex items-start gap-2.5 text-sm", !included && "text-muted-foreground/70")}>
                      {included ? (
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success-ink" aria-hidden />
                      ) : (
                        <Minus className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      )}
                      <span>
                        <span className="sr-only">{included ? "✓ " : "— "}</span>
                        {feature}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <a
                href={getWhatsAppLink(language, tp.whatsappPlan.replace("{{plan}}", plan.name))}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "mt-6 flex h-12 items-center justify-center rounded-xl font-semibold transition-colors",
                  plan.popular ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-border bg-background hover:bg-accent"
                )}
              >
                {tp.wantPlan}
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
