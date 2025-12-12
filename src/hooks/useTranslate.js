import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { safeFetch } from '@/utils/apiConfig';

const CACHE_STORAGE_KEY = 'qzero_translations_cache';
const CACHE_MAX_SIZE = 5000;
const CACHE_VERSION = 1;

const GLOSSARY_OVERRIDES = {
  en: {
    'Tirar Senha': 'Get Ticket',
    'Retirar Senha': 'Get Ticket',
    'Nova Senha': 'New Ticket',
    'Senha retirada com sucesso!': 'Ticket taken successfully!',
    'Erro ao retirar senha. Tente novamente.': 'Error getting ticket. Please try again.',
    'Já tem uma senha ativa para este serviço': 'You already have an active ticket for this service',
    'Gestão de Senhas': 'Ticket Management',
    'Gestão de Senhas e Filas': 'Ticket and Queue Management',
    'Crie e gerir as suas senhas de atendimento': 'Create and manage your service tickets',
    'Para criar e gerir senhas de atendimento, precisa de ativar o plano empresarial.': 'To create and manage service tickets, you need to activate the business plan.',
    'Senha eliminada com sucesso': 'Ticket deleted successfully',
    'Erro ao eliminar senha': 'Error deleting ticket',
    'Eliminar Senha': 'Delete Ticket',
    'Tem certeza que deseja eliminar esta senha de atendimento? Esta ação não pode ser desfeita.': 'Are you sure you want to delete this service ticket? This action cannot be undone.',
    'Nenhuma senha de atendimento criada': 'No service tickets created',
    'Crie a sua primeira senha de atendimento para começar a gerir o fluxo de clientes': 'Create your first service ticket to start managing customer flow',
    'Criar Primeira Senha': 'Create First Ticket',
    'Multisenhas (várias ao mesmo tempo)': 'Multi-tickets (multiple at once)',
    '🎫 Multisenhas (várias ao mesmo tempo)': '🎫 Multi-tickets (multiple at once)',
    'Receba senhas virtuais e acompanhe em tempo real': 'Get virtual tickets and track in real time',
    'Senha': 'Ticket',
    'Senhas': 'Tickets',
    'senha': 'ticket',
    'senhas': 'tickets',
    'senha de atendimento': 'service ticket',
    'senhas de atendimento': 'service tickets',
  },
  es: {
    'Tirar Senha': 'Obtener Turno',
    'Retirar Senha': 'Obtener Turno',
    'Nova Senha': 'Nuevo Turno',
    'Senha retirada com sucesso!': '¡Turno obtenido con éxito!',
    'Erro ao retirar senha. Tente novamente.': 'Error al obtener turno. Inténtelo de nuevo.',
    'Já tem uma senha ativa para este serviço': 'Ya tiene un turno activo para este servicio',
    'Gestão de Senhas': 'Gestión de Turnos',
    'Gestão de Senhas e Filas': 'Gestión de Turnos y Colas',
    'Crie e gerir as suas senhas de atendimento': 'Cree y gestione sus turnos de atención',
    'Senha': 'Turno',
    'Senhas': 'Turnos',
  },
  fr: {
    'Tirar Senha': 'Prendre un Ticket',
    'Retirar Senha': 'Prendre un Ticket',
    'Nova Senha': 'Nouveau Ticket',
    'Senha retirada com sucesso!': 'Ticket pris avec succès!',
    'Erro ao retirar senha. Tente novamente.': 'Erreur lors de la prise du ticket. Veuillez réessayer.',
    'Já tem uma senha ativa para este serviço': 'Vous avez déjà un ticket actif pour ce service',
    'Gestão de Senhas': 'Gestion des Tickets',
    'Gestão de Senhas e Filas': 'Gestion des Tickets et Files',
    'Crie e gerir as suas senhas de atendimento': 'Créez et gérez vos tickets de service',
    'Senha': 'Ticket',
    'Senhas': 'Tickets',
  },
  de: {
    'Tirar Senha': 'Ticket Nehmen',
    'Retirar Senha': 'Ticket Nehmen',
    'Nova Senha': 'Neues Ticket',
    'Senha retirada com sucesso!': 'Ticket erfolgreich genommen!',
    'Erro ao retirar senha. Tente novamente.': 'Fehler beim Nehmen des Tickets. Bitte erneut versuchen.',
    'Já tem uma senha ativa para este serviço': 'Sie haben bereits ein aktives Ticket für diesen Service',
    'Gestão de Senhas': 'Ticketverwaltung',
    'Gestão de Senhas e Filas': 'Ticket- und Warteschlangenverwaltung',
    'Crie e gerir as suas senhas de atendimento': 'Erstellen und verwalten Sie Ihre Service-Tickets',
    'Senha': 'Ticket',
    'Senhas': 'Tickets',
  },
  it: {
    'Tirar Senha': 'Prendi Biglietto',
    'Retirar Senha': 'Prendi Biglietto',
    'Nova Senha': 'Nuovo Biglietto',
    'Senha retirada com sucesso!': 'Biglietto preso con successo!',
    'Erro ao retirar senha. Tente novamente.': 'Errore nel prendere il biglietto. Riprova.',
    'Já tem uma senha ativa para este serviço': 'Hai già un biglietto attivo per questo servizio',
    'Gestão de Senhas': 'Gestione Biglietti',
    'Gestão de Senhas e Filas': 'Gestione Biglietti e Code',
    'Crie e gerir as suas senhas de atendimento': 'Crea e gestisci i tuoi biglietti di servizio',
    'Senha': 'Biglietto',
    'Senhas': 'Biglietti',
  },
};

function getGlossaryOverride(text, targetLang) {
  if (!text || targetLang === 'pt') return null;
  
  const langOverrides = GLOSSARY_OVERRIDES[targetLang];
  if (!langOverrides) return null;
  
  if (langOverrides[text]) {
    return langOverrides[text];
  }
  
  const lowerText = text.toLowerCase();
  for (const [key, value] of Object.entries(langOverrides)) {
    if (key.toLowerCase() === lowerText) {
      return value;
    }
  }
  
  return null;
}

const memoryCache = new Map();
let cacheLoadedFromStorage = false;
const pendingTranslations = new Map();
const translationSubscribers = new Map();

function loadCacheFromStorage() {
  if (cacheLoadedFromStorage) return;
  
  try {
    const stored = localStorage.getItem(CACHE_STORAGE_KEY);
    if (stored) {
      const { version, data } = JSON.parse(stored);
      if (version === CACHE_VERSION && Array.isArray(data)) {
        data.forEach(([key, value]) => {
          memoryCache.set(key, value);
        });
        console.log(`✅ Cache de traduções carregado: ${data.length} entradas`);
      }
    }
  } catch (e) {
    console.warn('Erro ao carregar cache de traduções:', e);
  }
  cacheLoadedFromStorage = true;
}

function saveCacheToStorage() {
  try {
    const entries = Array.from(memoryCache.entries());
    const trimmedEntries = entries.slice(-CACHE_MAX_SIZE);
    
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify({
      version: CACHE_VERSION,
      data: trimmedEntries
    }));
  } catch (e) {
    console.warn('Erro ao guardar cache de traduções:', e);
  }
}

let saveTimeout = null;
function debouncedSaveCache() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveCacheToStorage, 1000);
}

loadCacheFromStorage();

function getCacheKey(text, sourceLang, targetLang) {
  return `${sourceLang || 'auto'}:${targetLang}:${text}`;
}

function notifySubscribers(cacheKey, translation) {
  const subscribers = translationSubscribers.get(cacheKey);
  if (subscribers) {
    subscribers.forEach(callback => callback(translation));
  }
}

async function fetchTranslationFromAPI(text, targetLang, sourceLang, cacheKey) {
  if (pendingTranslations.has(cacheKey)) {
    return pendingTranslations.get(cacheKey);
  }

  const translationPromise = (async () => {
    try {
      const requestBody = {
        text,
        targetLang,
      };
      
      if (sourceLang) {
        requestBody.sourceLang = sourceLang;
      }

      const { response, data } = await safeFetch('/api/translate', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        console.error('Translation failed:', response.status);
        return text;
      }

      const translation = data?.translation || text;

      memoryCache.set(cacheKey, translation);
      debouncedSaveCache();
      notifySubscribers(cacheKey, translation);

      return translation;
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    } finally {
      pendingTranslations.delete(cacheKey);
    }
  })();

  pendingTranslations.set(cacheKey, translationPromise);
  return translationPromise;
}

function getCachedTranslation(text, targetLang, sourceLang) {
  if (!text || typeof text !== 'string') {
    return { value: text, isCached: true };
  }

  const glossaryOverride = getGlossaryOverride(text, targetLang);
  if (glossaryOverride) {
    return { value: glossaryOverride, isCached: true };
  }

  const cacheKey = getCacheKey(text, sourceLang, targetLang);
  if (memoryCache.has(cacheKey)) {
    return { value: memoryCache.get(cacheKey), isCached: true };
  }

  return { value: text, isCached: false, cacheKey };
}

export function useTranslate() {
  const { i18n } = useTranslation();
  const [isTranslating, setIsTranslating] = useState(false);

  const currentLang = i18n.language?.split('-')[0] || 'pt';

  const translate = useCallback(async (text, sourceLang = null) => {
    if (!text || typeof text !== 'string') {
      return text;
    }

    const glossaryOverride = getGlossaryOverride(text, currentLang);
    if (glossaryOverride) {
      return glossaryOverride;
    }

    const cacheKey = getCacheKey(text, sourceLang, currentLang);
    
    if (memoryCache.has(cacheKey)) {
      return memoryCache.get(cacheKey);
    }

    if (pendingTranslations.has(cacheKey)) {
      return pendingTranslations.get(cacheKey);
    }

    setIsTranslating(true);
    try {
      return await fetchTranslationFromAPI(text, currentLang, sourceLang, cacheKey);
    } finally {
      setIsTranslating(false);
    }
  }, [currentLang]);

  const translateBatch = useCallback(async (texts, sourceLang = null) => {
    if (!Array.isArray(texts) || texts.length === 0) {
      return texts;
    }

    const uncachedTexts = [];
    const uncachedIndices = [];
    const results = new Array(texts.length);

    texts.forEach((text, index) => {
      if (!text || typeof text !== 'string') {
        results[index] = text;
        return;
      }

      const cacheKey = getCacheKey(text, sourceLang, currentLang);
      if (memoryCache.has(cacheKey)) {
        results[index] = memoryCache.get(cacheKey);
      } else {
        uncachedTexts.push(text);
        uncachedIndices.push(index);
      }
    });

    if (uncachedTexts.length === 0) {
      return results;
    }

    setIsTranslating(true);

    try {
      const requestBody = {
        texts: uncachedTexts,
        targetLang: currentLang,
      };
      
      if (sourceLang) {
        requestBody.sourceLang = sourceLang;
      }

      const { response, data } = await safeFetch('/api/translate', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        console.error('Batch translation failed:', response.status);
        uncachedIndices.forEach(index => {
          results[index] = texts[index];
        });
        return results;
      }

      const translations = data?.translations || uncachedTexts;

      uncachedIndices.forEach((originalIndex, i) => {
        const translation = translations[i] || texts[originalIndex];
        results[originalIndex] = translation;

        const cacheKey = getCacheKey(uncachedTexts[i], sourceLang, currentLang);
        memoryCache.set(cacheKey, translation);
      });

      debouncedSaveCache();

      return results;
    } catch (error) {
      console.error('Batch translation error:', error);
      uncachedIndices.forEach(index => {
        results[index] = texts[index];
      });
      return results;
    } finally {
      setIsTranslating(false);
    }
  }, [currentLang]);

  const detectLanguage = useCallback(async (text) => {
    if (!text || typeof text !== 'string') {
      return 'pt';
    }

    try {
      const { response, data } = await safeFetch('/api/translate/detect', {
        method: 'POST',
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        return 'pt';
      }

      return data?.language || 'pt';
    } catch (error) {
      console.error('Language detection error:', error);
      return 'pt';
    }
  }, []);

  return {
    translate,
    translateBatch,
    detectLanguage,
    isTranslating,
    currentLang,
  };
}

export function useAutoTranslateBatch(textsObj, sourceLang = null) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.split('-')[0] || 'pt';
  
  const keys = useMemo(() => Object.keys(textsObj || {}), [JSON.stringify(Object.keys(textsObj || {}))]);
  const texts = useMemo(() => keys.map(k => textsObj[k]), [textsObj, keys]);
  
  const getInitialValues = useCallback(() => {
    const result = {};
    keys.forEach((key, idx) => {
      const text = texts[idx];
      const cached = getCachedTranslation(text, currentLang, sourceLang);
      result[key] = cached.value;
    });
    return result;
  }, [keys, texts, currentLang, sourceLang]);
  
  const [translations, setTranslations] = useState(getInitialValues);
  const isMountedRef = useRef(true);
  const prevLangRef = useRef(currentLang);
  const prevTextsRef = useRef(JSON.stringify(texts));
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);
  
  useEffect(() => {
    const langChanged = prevLangRef.current !== currentLang;
    const textsChanged = prevTextsRef.current !== JSON.stringify(texts);
    
    prevLangRef.current = currentLang;
    prevTextsRef.current = JSON.stringify(texts);
    
    if (langChanged || textsChanged) {
      setTranslations(getInitialValues());
    }
    
    const uncachedItems = [];
    keys.forEach((key, idx) => {
      const text = texts[idx];
      const cached = getCachedTranslation(text, currentLang, sourceLang);
      if (!cached.isCached && text && cached.cacheKey) {
        uncachedItems.push({ key, text, cacheKey: cached.cacheKey, idx });
      }
    });
    
    if (uncachedItems.length === 0) return;
    
    const fetchUncached = async () => {
      const uncachedTexts = uncachedItems.map(item => item.text);
      
      try {
        const { response, data } = await safeFetch('/api/translate', {
          method: 'POST',
          body: JSON.stringify({
            texts: uncachedTexts,
            targetLang: currentLang,
            ...(sourceLang && { sourceLang }),
          }),
        });
        
        if (response.ok && data?.translations) {
          if (isMountedRef.current) {
            setTranslations(prev => {
              const updated = { ...prev };
              uncachedItems.forEach((item, i) => {
                const translation = data.translations[i] || item.text;
                updated[item.key] = translation;
                memoryCache.set(item.cacheKey, translation);
              });
              return updated;
            });
            debouncedSaveCache();
          }
        }
      } catch (error) {
        console.error('Batch translation error:', error);
      }
    };
    
    fetchUncached();
  }, [keys, texts, currentLang, sourceLang, getInitialValues]);
  
  return translations;
}

export function useAutoTranslate(text, sourceLang = null) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.split('-')[0] || 'pt';
  
  const cacheKey = useMemo(() => {
    return getCacheKey(text, sourceLang, currentLang);
  }, [text, sourceLang, currentLang]);
  
  const getInitialValue = useCallback(() => {
    const result = getCachedTranslation(text, currentLang, sourceLang);
    return result.value;
  }, [text, currentLang, sourceLang]);
  
  const [translatedText, setTranslatedText] = useState(getInitialValue);
  
  const isMountedRef = useRef(true);
  const prevLangRef = useRef(currentLang);
  const prevTextRef = useRef(text);
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  useEffect(() => {
    const langChanged = prevLangRef.current !== currentLang;
    const textChanged = prevTextRef.current !== text;
    
    prevLangRef.current = currentLang;
    prevTextRef.current = text;
    
    if (langChanged || textChanged) {
      setTranslatedText(getInitialValue());
    }
    
    const cacheResult = getCachedTranslation(text, currentLang, sourceLang);
    
    if (cacheResult.isCached) {
      if (langChanged || textChanged) {
        setTranslatedText(cacheResult.value);
      }
      return;
    }
    
    if (!text || !cacheResult.cacheKey) {
      return;
    }
    
    const currentCacheKey = cacheResult.cacheKey;
    
    const handleTranslationUpdate = (translation) => {
      if (isMountedRef.current) {
        setTranslatedText(translation);
      }
    };
    
    if (!translationSubscribers.has(currentCacheKey)) {
      translationSubscribers.set(currentCacheKey, new Set());
    }
    translationSubscribers.get(currentCacheKey).add(handleTranslationUpdate);
    
    if (!pendingTranslations.has(currentCacheKey)) {
      fetchTranslationFromAPI(text, currentLang, sourceLang, currentCacheKey);
    } else {
      pendingTranslations.get(currentCacheKey).then((result) => {
        if (isMountedRef.current) {
          setTranslatedText(result);
        }
      });
    }
    
    return () => {
      const subscribers = translationSubscribers.get(currentCacheKey);
      if (subscribers) {
        subscribers.delete(handleTranslationUpdate);
        if (subscribers.size === 0) {
          translationSubscribers.delete(currentCacheKey);
        }
      }
    };
  }, [text, sourceLang, currentLang, getInitialValue, cacheKey]);

  return translatedText;
}
