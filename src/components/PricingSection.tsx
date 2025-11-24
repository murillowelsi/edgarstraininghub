import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Check, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PricingSection = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const plans = [
    {
      key: "basic",
      ...t.pricing.plans.basic,
      features: t.pricing.plans.basic.features,
      popular: false,
    },
    {
      key: "standard",
      ...t.pricing.plans.standard,
      features: t.pricing.plans.standard.features,
      popular: t.pricing.plans.standard.popular || false,
    },
    {
      key: "premium",
      ...t.pricing.plans.premium,
      features: t.pricing.plans.premium.features,
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="section bg-gray-50">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t.pricing.title}{" "}
            <span className="text-primary">{t.pricing.titleHighlight}</span>
          </h2>
          <div className="h-1 w-20 bg-secondary mx-auto mb-6"></div>
          <p className="max-w-2xl mx-auto text-gray-700">
            {t.pricing.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={plan.key}
              className={`relative bg-white rounded-xl shadow-lg p-8 flex flex-col h-full ${
                plan.popular
                  ? "border-2 border-primary transform scale-105"
                  : "border border-gray-200"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-primary text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-1">
                    <Star className="h-4 w-4" />
                    MAIS POPULAR
                  </div>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <div className="text-3xl font-bold text-primary mb-2">
                  {plan.price || "Preço a consultar"}
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-grow">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="text-center mt-auto">
                <Button
                  className={`w-full h-12 text-white font-semibold ${
                    plan.popular
                      ? "bg-primary hover:bg-primary/90"
                      : "bg-gray-900 hover:bg-gray-800"
                  }`}
                  onClick={() => {
                    navigate("/contact");
                  }}
                >
                  {t.pricing.cta}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
