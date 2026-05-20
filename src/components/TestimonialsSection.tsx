import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { getApprovedTestimonials } from "@/services/testimonialsService";
import type { Testimonial } from "@/types/testimonial";

const TestimonialsSection = () => {
  const { t } = useLanguage();

  const [items, setItems] = useState<Testimonial[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    let active = true;
    getApprovedTestimonials()
      .then((data) => {
        if (!active) return;
        setItems(data);
        setCurrentIndex(0);
      })
      .catch((e) => {
        console.error("Failed to load testimonials", e);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!loaded || items.length === 0) return null;

  const next = () => setCurrentIndex((i) => (i + 1) % items.length);
  const prev = () => setCurrentIndex((i) => (i - 1 + items.length) % items.length);

  const active = items[currentIndex];

  return (
    <section className="section bg-muted pb-16 md:pb-24">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t.testimonials.title}{" "}
            <span className="text-primary">{t.testimonials.titleHighlight}</span>
          </h2>
          <div className="h-1 w-20 bg-secondary mx-auto mb-6"></div>
          <p className="max-w-2xl mx-auto text-muted-foreground">
            {t.testimonials.subtitle}
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="relative bg-card rounded-xl shadow-md p-8 md:p-12">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="w-32 h-32 rounded-full overflow-hidden flex-shrink-0 border-4 border-primary bg-muted flex items-center justify-center">
                {active.photoURL ? (
                  <img
                    src={active.photoURL}
                    alt={active.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl font-bold text-muted-foreground">
                    {active.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="flex-1">
                <div className="flex mb-3">
                  {[...Array(active.stars)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>

                <p className="text-muted-foreground italic mb-6">"{active.text}"</p>

                <div>
                  <h4 className="font-bold text-lg">{active.name}</h4>
                  <p className="text-primary">{active.role}</p>
                </div>
              </div>
            </div>

            {items.length > 1 && (
              <div className="flex justify-center mt-8 gap-4">
                <button
                  onClick={prev}
                  className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                  aria-label="Previous testimonial"
                >
                  <ChevronLeft className="h-6 w-6 text-foreground" />
                </button>

                <button
                  onClick={next}
                  className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                  aria-label="Next testimonial"
                >
                  <ChevronRight className="h-6 w-6 text-foreground" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
