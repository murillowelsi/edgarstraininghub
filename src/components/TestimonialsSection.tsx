import { useLanguage } from '@/contexts/LanguageContext';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { useState } from 'react';

const TestimonialsSection = () => {
  const { t } = useLanguage();
  const testimonials = [
    {
      name: "Murillo Welsi",
      role: "Triathlete",
      image: "/lovable-uploads/murillo.png",
      text: "Working with Edgar transformed my running performance. I shaved 15 minutes off my marathon time and improved my overall technique. His approach is scientific yet approachable.",
      stars: 5
    },
    {
      name: "João Oliveira",
      role: "Fitness Enthusiast",
      image: "https://randomuser.me/api/portraits/men/32.jpg",
      text: "After struggling with inconsistent training for years, Edgar helped me establish a sustainable routine that fits my busy schedule. I've seen amazing progress in just 3 months.",
      stars: 5
    },
    {
      name: "Ana Costa",
      role: "Triathlon Beginner",
      image: "https://randomuser.me/api/portraits/women/68.jpg",
      text: "As someone new to triathlons, I needed guidance across all three disciplines. Edgar's expertise helped me complete my first sprint triathlon with confidence.",
      stars: 5
    }
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  const nextTestimonial = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section className="section bg-gray-50">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t.testimonials.title} <span className="text-primary">{t.testimonials.titleHighlight}</span></h2>
          <div className="h-1 w-20 bg-secondary mx-auto mb-6"></div>
          <p className="max-w-2xl mx-auto text-gray-700">
            {t.testimonials.subtitle}
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="relative bg-white rounded-xl shadow-md p-8 md:p-12">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="w-32 h-32 rounded-full overflow-hidden flex-shrink-0 border-4 border-primary">
                <img
                  src={testimonials[currentIndex].image}
                  alt={testimonials[currentIndex].name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1">
                <div className="flex mb-3">
                  {[...Array(testimonials[currentIndex].stars)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>

                <p className="text-gray-700 italic mb-6">
                  "{testimonials[currentIndex].text}"
                </p>

                <div>
                  <h4 className="font-bold text-lg">{testimonials[currentIndex].name}</h4>
                  <p className="text-primary">{testimonials[currentIndex].role}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-center mt-8 gap-4">
              <button
                onClick={prevTestimonial}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                aria-label="Previous testimonial"
              >
                <ChevronLeft className="h-6 w-6 text-brand-dark" />
              </button>

              <button
                onClick={nextTestimonial}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                aria-label="Next testimonial"
              >
                <ChevronRight className="h-6 w-6 text-brand-dark" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
