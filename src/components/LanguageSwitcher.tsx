
import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '@/components/ui/button';

const LanguageSwitcher = () => {
  const { language, changeLanguage } = useLanguage();
  
  return (
    <div className="flex space-x-2">
      <Button 
        variant={language === 'pt' ? 'default' : 'outline'}
        onClick={() => changeLanguage('pt')}
        className="px-2 py-1 h-auto text-xs"
      >
        PT
      </Button>
      <Button 
        variant={language === 'en' ? 'default' : 'outline'}
        onClick={() => changeLanguage('en')}
        className="px-2 py-1 h-auto text-xs"
      >
        EN
      </Button>
    </div>
  );
};

export default LanguageSwitcher;
