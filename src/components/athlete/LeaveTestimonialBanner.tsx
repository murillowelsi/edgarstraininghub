import { useEffect, useState } from "react";
import { ChevronRight, MessageSquareQuote, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "react-router-dom";
import { getTestimonialByAthlete } from "@/services/testimonialsService";
import type { Testimonial } from "@/types/testimonial";

interface LeaveTestimonialBannerProps {
  /**
   * "home": banner disappears as soon as the athlete submits any testimonial.
   * "profile": banner stays visible and lets the athlete edit it later.
   * "nudge": one dismissible line (athlete profile); gone once a testimonial exists,
   *   and for 30 days after dismissing it.
   */
  mode: "home" | "profile" | "nudge";
}

const NUDGE_SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;
const nudgeKey = (uid: string) => `ez-testimonial-nudge-v1:${uid}`;

const isNudgeSnoozed = (uid: string, now = Date.now()): boolean => {
  try {
    const at = Number(localStorage.getItem(nudgeKey(uid)));
    return at > 0 && now - at < NUDGE_SNOOZE_MS;
  } catch {
    return false;
  }
};

const snoozeNudge = (uid: string) => {
  try {
    localStorage.setItem(nudgeKey(uid), String(Date.now()));
  } catch {
    /* private mode: it just shows again next time */
  }
};

export function LeaveTestimonialBanner({ mode }: LeaveTestimonialBannerProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const tt = t.athlete.testimonial;

  const [myTestimonial, setMyTestimonial] = useState<Testimonial | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [snoozed, setSnoozed] = useState(() => (user ? isNudgeSnoozed(user.uid) : false));

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

  if (mode === "nudge") {
    if (myTestimonial || snoozed || !user) return null;
    return (
      <div className="flex items-center gap-2.5 rounded-2xl border border-dashed bg-card py-1 pl-3.5 pr-1 text-sm">
        <MessageSquareQuote className="h-[18px] w-[18px] shrink-0 text-primary-ink" aria-hidden />
        <Link
          to="/athlete/testimonial"
          className="min-w-0 flex-1 truncate py-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {/* The question only where it fits on one line */}
          <span className="hidden min-[420px]:inline">{tt.nudgeText} </span>
          <span className="font-semibold text-primary-ink">{tt.nudgeCta}</span>
        </Link>
        <button
          type="button"
          onClick={() => {
            snoozeNudge(user.uid);
            setSnoozed(true);
          }}
          aria-label={tt.nudgeDismiss}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const ctaLabel = myTestimonial ? tt.editCta : tt.cta;
  const hintCopy = !myTestimonial
    ? tt.subtitle
    : myTestimonial.approved
      ? tt.publishedHint
      : tt.pendingHint;

  return (
    <Link
      to="/athlete/testimonial"
      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="relative overflow-hidden bg-gradient-to-br from-primary to-primary/80 border-primary/40 shadow-md hover:shadow-xl transition-all text-primary-foreground">
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
    </Link>
  );
}
