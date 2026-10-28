import GB from "country-flag-icons/react/3x2/GB";
import PT from "country-flag-icons/react/3x2/PT";
import { useLanguage } from "../contexts/LanguageContext";

const LanguageSwitcher = () => {
  const { language, changeLanguage } = useLanguage();

  // 40px button for the hit area; the inner pill keeps the original compact look
  const pill = (active: boolean) =>
    `p-1.5 rounded-md transition-all ${
      active ? "bg-accent" : "opacity-50 group-hover:opacity-100 group-hover:bg-accent/50"
    }`;

  return (
    <div className="flex items-center">
      <button
        onClick={() => changeLanguage("en")}
        className="group h-10 w-10 flex items-center justify-center"
        title="English"
        aria-label="English"
        aria-pressed={language === "en"}
      >
        <span className={pill(language === "en")}>
          <GB className="w-5 h-4 rounded-sm" />
        </span>
      </button>
      <button
        onClick={() => changeLanguage("pt")}
        className="group h-10 w-10 flex items-center justify-center"
        title="Português"
        aria-label="Português"
        aria-pressed={language === "pt"}
      >
        <span className={pill(language === "pt")}>
          <PT className="w-5 h-4 rounded-sm" />
        </span>
      </button>
    </div>
  );
};

export default LanguageSwitcher;
