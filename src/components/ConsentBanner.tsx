import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { getConsent, onConsentChange, onConsentSettingsOpen, setConsent, type ConsentChoice } from "@/lib/consent";
import { disableAnalytics, enableAnalytics } from "@/lib/firebase";

const applyConsent = (choice: ConsentChoice | null) => {
  if (choice === "granted") void enableAnalytics();
  else if (choice === "denied") void disableAnalytics();
};

/**
 * Analytics consent. Shown until the visitor chooses, and again from the
 * footer ("Cookie preferences"). Accept and Decline have the same weight.
 */
const ConsentBanner = () => {
  const { t } = useLanguage();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(() => getConsent() === null);

  useEffect(() => {
    applyConsent(getConsent());
    const offChange = onConsentChange(applyConsent);
    const offOpen = onConsentSettingsOpen(() => setOpen(true));
    return () => {
      offChange();
      offOpen();
    };
  }, []);

  if (!open) return null;

  const choose = (choice: ConsentChoice) => {
    setConsent(choice);
    setOpen(false);
  };

  // Sit above the floating tab bar (60px pill + its bottom offset) so navigation
  // stays usable: athlete portal at every width, coach portal only below md.
  const onAthlete = pathname.startsWith("/athlete");
  const onAdmin = pathname.startsWith("/admin");
  const position = onAthlete || onAdmin
    ? cn(
        "bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))_+_60px_+_0.75rem)]",
        onAdmin && "md:bottom-[max(0.75rem,env(safe-area-inset-bottom))]",
      )
    : "bottom-[max(0.75rem,env(safe-area-inset-bottom))]";

  return (
    <section
      role="region"
      aria-labelledby="consent-title"
      className={cn("fixed inset-x-3 z-[60] mx-auto max-w-lg rounded-2xl border bg-card p-4 text-card-foreground shadow-lg md:p-5", position)}
    >
      <h2 id="consent-title" className="font-semibold">
        {t.consent.title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t.consent.description}{" "}
        <Link to="/privacy" className="font-medium text-foreground underline underline-offset-2">
          {t.consent.privacyLink}
        </Link>
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-11" onClick={() => choose("denied")}>
          {t.consent.decline}
        </Button>
        <Button variant="outline" className="h-11" onClick={() => choose("granted")}>
          {t.consent.accept}
        </Button>
      </div>
    </section>
  );
};

export default ConsentBanner;
