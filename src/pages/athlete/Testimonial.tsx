import AthletePortalLayout from "@/components/athlete/AthletePortalLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SectionSpinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  getTestimonialByAthlete,
  submitAthleteTestimonial,
  updateAthleteTestimonial,
} from "@/services/testimonialsService";
import type { Testimonial } from "@/types/testimonial";
import { ArrowLeft, Loader2, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const AthleteTestimonial = () => {
  const { user, displayName, photoURL } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const tt = t.athlete.testimonial;

  const [myTestimonial, setMyTestimonial] = useState<Testimonial | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ role: "", text: "", stars: 5 });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    getTestimonialByAthlete(user.uid)
      .then((data) => {
        if (!active) return;
        if (data) {
          setMyTestimonial(data);
          setForm({ role: data.role, text: data.text, stars: data.stars });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

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
          displayName || user.email?.split("@")[0] || "Athlete",
          photoURL ?? undefined,
          form,
        );
        toast({ title: tt.submitted });
      }
      navigate(-1);
    } catch (e) {
      console.error(e);
      toast({ title: t.common.error, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const heading = myTestimonial ? tt.editTitle : tt.modalTitle;
  const description = myTestimonial?.approved
    ? tt.editApprovedHint
    : myTestimonial
      ? tt.pendingHint
      : tt.modalDescription;

  return (
    <AthletePortalLayout title={tt.pageTitle} hideBottomNav>
      {loading ? (
        <SectionSpinner />
      ) : (
        <div className="flex-1 overflow-auto pb-6">
          <div className="relative flex items-center px-4 py-3">
            <button
              onClick={() => navigate(-1)}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-bold truncate max-w-[70%] text-center">
              {heading}
            </h1>
          </div>

          <div className="p-4 space-y-5 max-w-2xl mx-auto">
            <p className="text-sm text-muted-foreground">{description}</p>

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
              <Label htmlFor="tt-text">{tt.text}</Label>
              <Textarea
                id="tt-text"
                value={form.text}
                onChange={(e) =>
                  setForm((f) => ({ ...f, text: e.target.value }))
                }
                placeholder={tt.textPlaceholder}
                rows={6}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => navigate(-1)}>
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
        </div>
      )}
    </AthletePortalLayout>
  );
};

export default AthleteTestimonial;
