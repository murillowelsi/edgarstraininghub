import GB from "country-flag-icons/react/3x2/GB";
import PT from "country-flag-icons/react/3x2/PT";
import { useLanguage } from "../contexts/LanguageContext";

const LanguageSwitcher = () => {
  const { language, changeLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => changeLanguage("en")}
        className={`p-1.5 rounded-md transition-all ${
          language === "en" ? "bg-accent" : "opacity-50 hover:opacity-100 hover:bg-accent/50"
        }`}
        title="English"
      >
        <GB className="w-5 h-4 rounded-sm" />
      </button>
      <button
        onClick={() => changeLanguage("pt")}
        className={`p-1.5 rounded-md transition-all ${
          language === "pt" ? "bg-accent" : "opacity-50 hover:opacity-100 hover:bg-accent/50"
        }`}
        title="Português"
      >
        <PT className="w-5 h-4 rounded-sm" />
      </button>
    </div>
  );
};

export default LanguageSwitcher;
