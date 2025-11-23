import { useLanguage } from "@/contexts/LanguageContext";
import { Award } from "lucide-react";

interface CertificationBadgeProps {
  type: "ymca" | "ofqual";
  className?: string;
  variant?: "light" | "dark";
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
  const darkClasses = "bg-white/10 text-white border-white/20";

  return (
    <div
      className={`${baseClasses} ${
        variant === "dark" ? darkClasses : lightClasses
      } ${className}`}
    >
      <Award className="w-4 h-4 mr-2" />
      {t.certifications.badges[type]}
    </div>
  );
};

export default CertificationBadge;
