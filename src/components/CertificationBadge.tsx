import { useLanguage } from "@/contexts/LanguageContext";
import { Award } from "lucide-react";

interface CertificationBadgeProps {
  type: "ymca" | "ofqual";
  className?: string;
  /** "onPrimary": on a yellow (bg-primary) surface, navy text */
  variant?: "light" | "onPrimary";
}

const CertificationBadge = ({
  type,
  className = "",
  variant = "light",
}: CertificationBadgeProps) => {
  const { t } = useLanguage();

  const baseClasses =
    "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border";
  const lightClasses = "bg-primary/10 text-primary border-primary/20";
  const onPrimaryClasses = "bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20";

  return (
    <div
      className={`${baseClasses} ${
        variant === "onPrimary" ? onPrimaryClasses : lightClasses
      } ${className}`}
    >
      <Award className="w-4 h-4 mr-2" />
      {t.certifications.badges[type]}
    </div>
  );
};

export default CertificationBadge;
