import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'es' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800 transition-all font-bold text-xs uppercase tracking-widest text-zinc-400 hover:text-white group"
      title={i18n.language === 'en' ? 'Cambiar a Español' : 'Switch to English'}
    >
      <Globe className={`w-4 h-4 transition-transform duration-300 ${i18n.language === 'en' ? 'text-pink-500 rotate-180' : 'text-zinc-500'}`} />
      <span>{i18n.language === 'en' ? 'ES' : 'EN'}</span>
    </button>
  );
}
