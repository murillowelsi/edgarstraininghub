import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

  return (
    <section
      role="region"
      aria-labelledby="consent-title"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[60] mx-auto max-w-lg rounded-2xl border bg-card p-4 text-card-foreground shadow-lg md:p-5"
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
