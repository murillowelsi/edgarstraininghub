import { useEffect, useState } from "react";
import { ChevronRight, Loader2, MessageSquareQuote, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Textarea } from "@/components/ui/textarea";
import {
  getTestimonialByAthlete,
  submitAthleteTestimonial,
  updateAthleteTestimonial,
} from "@/services/testimonialsService";
import type { Testimonial } from "@/types/testimonial";

interface LeaveTestimonialBannerProps {
  /**
   * "home": banner disappears as soon as the athlete submits any testimonial.
   * "profile": banner stays visible and lets the athlete edit it later.
   */
  mode: "home" | "profile";
  displayName: string;
  photoURL?: string;
}

export function LeaveTestimonialBanner({
  mode,
  displayName,
  photoURL,
}: LeaveTestimonialBannerProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const tt = t.athlete.testimonial;

  const [myTestimonial, setMyTestimonial] = useState<Testimonial | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ role: "", text: "", stars: 5 });
  const [submitting, setSubmitting] = useState(false);

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

  const openSheet = () => {
    if (myTestimonial) {
      setForm({
        role: myTestimonial.role,
        text: myTestimonial.text,
        stars: myTestimonial.stars,
      });
    } else {
      setForm({ role: "", text: "", stars: 5 });
    }
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      if (myTestimonial) {
        await updateAthleteTestimonial(myTestimonial.id, form);
        toast({ title: tt.updated });
      } else {
        await submitAthleteTestimonial(
          user.uid,
          displayName,
          photoURL,
          form,
        );
        toast({ title: tt.submitted });
      }
      setOpen(false);
      const updated = await getTestimonialByAthlete(user.uid);
      setMyTestimonial(updated);
    } catch (e) {
      console.error(e);
      toast({ title: t.common.error, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const ctaLabel = myTestimonial ? tt.editCta : tt.cta;
  const hintCopy = !myTestimonial
    ? tt.subtitle
    : myTestimonial.approved
      ? tt.publishedHint
      : tt.pendingHint;

  return (
    <>
      <Card
        onClick={openSheet}
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

      <ResponsiveModal
        open={open}
        onOpenChange={setOpen}
        title={myTestimonial ? tt.editTitle : tt.modalTitle}
        description={
          myTestimonial?.approved
            ? tt.editApprovedHint
            : myTestimonial
              ? tt.pendingHint
              : tt.modalDescription
        }
      >
        <div className="space-y-4">
          <div>
            <Label>{tt.role}</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {(Object.entries(tt.roleOptions) as [string, string][]).map(
                ([key, label]) => {
                  const selected = form.role === label;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({ ...f, role: label }))
                      }
                      className={cn(
                        "px-3 py-2 rounded-md border text-sm font-medium transition",
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-input hover:bg-accent",
                      )}
                    >
                      {label}
                    </button>
                  );
                },
              )}
            </div>
          </div>
          <div>
            <Label>{tt.rating}</Label>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, stars: n }))}
                  className="p-1"
                  aria-label={`${n} stars`}
                >
                  <Star
                    className={cn(
                      "h-7 w-7 transition",
                      n <= form.stars
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-muted-foreground/40",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="tt-banner-text">{tt.text}</Label>
            <Textarea
              id="tt-banner-text"
              value={form.text}
              onChange={(e) =>
                setForm((f) => ({ ...f, text: e.target.value }))
              }
              placeholder={tt.textPlaceholder}
              rows={5}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button
              disabled={
                submitting || !form.text.trim() || !form.role.trim()
              }
              onClick={handleSubmit}
            >
              {submitting && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {myTestimonial ? tt.save : tt.submit}
            </Button>
          </div>
        </div>
      </ResponsiveModal>
    </>
  );
}
