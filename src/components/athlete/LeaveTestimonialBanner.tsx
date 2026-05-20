import { useEffect, useState } from "react";
import { ChevronRight, MessageSquareQuote } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { getTestimonialByAthlete } from "@/services/testimonialsService";
import type { Testimonial } from "@/types/testimonial";

interface LeaveTestimonialBannerProps {
  /**
   * "home": banner disappears as soon as the athlete submits any testimonial.
   * "profile": banner stays visible and lets the athlete edit it later.
   */
  mode: "home" | "profile";
}

export function LeaveTestimonialBanner({ mode }: LeaveTestimonialBannerProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const tt = t.athlete.testimonial;

  const [myTestimonial, setMyTestimonial] = useState<Testimonial | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    getTestimonialByAthlete(user.uid)
      .then((data) => {
        if (active) setMyTestimonial(data);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [user]);

  if (!loaded) return null;
  if (mode === "home" && myTestimonial) return null;

  const ctaLabel = myTestimonial ? tt.editCta : tt.cta;
  const hintCopy = !myTestimonial
    ? tt.subtitle
    : myTestimonial.approved
      ? tt.publishedHint
      : tt.pendingHint;

  return (
    <Card
      onClick={() => navigate("/athlete/testimonial")}
      className="relative overflow-hidden bg-gradient-to-br from-primary to-primary/80 border-primary/40 shadow-md hover:shadow-xl transition-all cursor-pointer text-primary-foreground"
    >
      <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-8 -left-4 h-20 w-20 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex items-center gap-3 p-4">
        <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm shrink-0 ring-1 ring-white/30">
          <MessageSquareQuote className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-bold text-base leading-tight truncate">
            {ctaLabel}
          </h3>
          <p className="text-xs text-primary-foreground/85 mt-0.5 line-clamp-2">
            {hintCopy}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-primary-foreground/90 shrink-0" />
      </div>
    </Card>
  );
}
