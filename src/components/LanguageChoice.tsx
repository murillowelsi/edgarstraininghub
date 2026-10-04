import GB from "country-flag-icons/react/3x2/GB";
import PT from "country-flag-icons/react/3x2/PT";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Two-up language picker used in the athlete portal (profile drawer and
 * the settings card on the profile page).
 */
export const LanguageChoice = ({ className }: { className?: string }) => {
  const { language, changeLanguage } = useLanguage();

  const option = (code: "en" | "pt", Flag: typeof GB, label: string) => (
    <button
      onClick={() => changeLanguage(code)}
      aria-pressed={language === code}
      className={cn(
        "flex items-center justify-center gap-2 flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors",
        language === code
          ? "bg-accent border-primary/30"
          : "border-border text-muted-foreground hover:bg-accent/50"
      )}
    >
      <Flag className="w-5 h-4 rounded-sm shrink-0" />
      {label}
    </button>
  );

  return (
    <div className={cn("flex gap-2", className)}>
      {option("en", GB, "English")}
      {option("pt", PT, "Português")}
    </div>
  );
};

export default LanguageChoice;
