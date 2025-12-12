import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { AVAILABLE_LANGUAGES } from '@/i18n/config';
import { toast } from 'sonner';
import { useAutoTranslate } from '@/hooks/useTranslate';
import { safeFetch } from '@/utils/apiConfig';

export function LanguageSelector() {
  const { i18n } = useTranslation();
  const txtLanguage = useAutoTranslate('Idioma', 'pt');
  const txtSelectLanguage = useAutoTranslate('Selecionar idioma', 'pt');
  const txtCurrentLanguage = useAutoTranslate('Idioma atual', 'pt');
  const txtLanguageChanged = useAutoTranslate('Idioma alterado com sucesso', 'pt');
  const txtError = useAutoTranslate('Erro ao alterar idioma', 'pt');
  
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);

  const handleLanguageChange = async (languageCode) => {
    try {
      await i18n.changeLanguage(languageCode);
      setSelectedLanguage(languageCode);
      localStorage.setItem('qzero_language', languageCode);
      
      // Enviar idioma para o servidor (para emails traduzidos)
      try {
        await safeFetch('/api/auth/language', {
          method: 'PATCH',
          body: JSON.stringify({ language: languageCode })
        });
      } catch (serverError) {
        // Ignorar erro se não estiver autenticado
        console.log('Idioma guardado apenas localmente (utilizador não autenticado)');
      }
      
      toast.success(txtLanguageChanged);
      
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Failed to change language:', error);
      toast.error(txtError);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <Globe className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">{txtLanguage}</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-600 mb-2 block">
            {txtSelectLanguage}
          </label>
          <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={txtSelectLanguage} />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{lang.flag}</span>
                    <span>{lang.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm text-gray-500">
          {txtCurrentLanguage}: {AVAILABLE_LANGUAGES.find(l => l.code === selectedLanguage)?.name}
        </div>
      </div>
    </Card>
  );
}
