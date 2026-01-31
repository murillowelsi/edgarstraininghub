
import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const LanguageSwitcher = () => {
  const { language, changeLanguage } = useLanguage();
  
  return (
    <div className="flex space-x-3">
      <button 
        onClick={() => changeLanguage('en')}
        className="text-2xl cursor-pointer hover:scale-125 transition-transform"
        title="English"
      >
        🇬🇧
      </button>
      <button 
        onClick={() => changeLanguage('pt')}
        className="text-2xl cursor-pointer hover:scale-125 transition-transform"
        title="Português"
      >
        🇵🇹
      </button>
    </div>
  );
};

export default LanguageSwitcher;
