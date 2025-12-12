import pkg from '@google-cloud/translate';
const { Translate } = pkg.v2;
import logger from '../middleware/logger.js';

const translate = new Translate({
  key: process.env.GOOGLE_TRANSLATE_API_KEY,
});

const translationCache = new Map();
const CACHE_MAX_SIZE = 10000;
const CACHE_TTL = 1000 * 60 * 60 * 24;

function getCacheKey(text, sourceLang, targetLang) {
  return `${sourceLang}:${targetLang}:${text}`;
}

function cleanCache() {
  if (translationCache.size > CACHE_MAX_SIZE) {
    const keysToDelete = Array.from(translationCache.keys()).slice(0, Math.floor(CACHE_MAX_SIZE / 2));
    keysToDelete.forEach(key => translationCache.delete(key));
    logger.info(`Translation cache cleaned: removed ${keysToDelete.length} entries`);
  }
}

export async function translateText(text, targetLang, sourceLang = null) {
  if (!text || typeof text !== 'string' || text.length > 5000) {
    return text;
  }

  if (!process.env.GOOGLE_TRANSLATE_API_KEY) {
    logger.error('GOOGLE_TRANSLATE_API_KEY not configured');
    return text;
  }

  let detectedSource = sourceLang;
  
  if (!detectedSource) {
    try {
      const [detection] = await translate.detect(text);
      detectedSource = detection.language;
    } catch (error) {
      logger.error('Language detection failed, defaulting to pt:', error);
      detectedSource = 'pt';
    }
  }
  
  if (detectedSource === targetLang) {
    return text;
  }

  const cacheKey = getCacheKey(text, detectedSource, targetLang);
  const cached = translationCache.get(cacheKey);
  
  if (cached) {
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.translation;
    } else {
      translationCache.delete(cacheKey);
    }
  }

  try {
    const [translation] = await translate.translate(text, {
      from: detectedSource,
      to: targetLang,
    });

    translationCache.set(cacheKey, {
      translation,
      timestamp: Date.now(),
    });

    cleanCache();

    logger.info(`Translated text from ${detectedSource} to ${targetLang}: "${text.substring(0, 50)}..."`);
    
    return translation;
  } catch (error) {
    logger.error('Translation error:', error);
    return text;
  }
}

export async function translateBatch(texts, targetLang, sourceLang = null) {
  if (!Array.isArray(texts) || texts.length === 0 || texts.length > 100) {
    return texts;
  }

  if (!process.env.GOOGLE_TRANSLATE_API_KEY) {
    logger.error('GOOGLE_TRANSLATE_API_KEY not configured');
    return texts;
  }

  const validTexts = texts.filter(t => t && typeof t === 'string' && t.length <= 5000);
  if (validTexts.length === 0) {
    return texts;
  }

  let detectedSource = sourceLang;
  
  if (!detectedSource && validTexts.length > 0) {
    try {
      const [detection] = await translate.detect(validTexts[0]);
      detectedSource = detection.language;
    } catch (error) {
      logger.error('Language detection failed, defaulting to pt:', error);
      detectedSource = 'pt';
    }
  }
  
  if (detectedSource === targetLang) {
    return texts;
  }

  const uncachedTexts = [];
  const uncachedIndices = [];
  const results = new Array(texts.length);

  texts.forEach((text, index) => {
    if (!text || typeof text !== 'string' || text.length > 5000) {
      results[index] = text;
      return;
    }

    const cacheKey = getCacheKey(text, detectedSource, targetLang);
    const cached = translationCache.get(cacheKey);
    
    if (cached) {
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        results[index] = cached.translation;
      } else {
        translationCache.delete(cacheKey);
        uncachedTexts.push(text);
        uncachedIndices.push(index);
      }
    } else {
      uncachedTexts.push(text);
      uncachedIndices.push(index);
    }
  });

  if (uncachedTexts.length === 0) {
    return results;
  }

  try {
    const [translations] = await translate.translate(uncachedTexts, {
      from: detectedSource,
      to: targetLang,
    });

    uncachedIndices.forEach((originalIndex, i) => {
      const translation = Array.isArray(translations) ? translations[i] : translations;
      const originalText = uncachedTexts[i];
      
      results[originalIndex] = translation;

      const cacheKey = getCacheKey(originalText, detectedSource, targetLang);
      translationCache.set(cacheKey, {
        translation,
        timestamp: Date.now(),
      });
    });

    cleanCache();

    logger.info(`Batch translated ${uncachedTexts.length} texts from ${detectedSource} to ${targetLang}`);
    
    return results;
  } catch (error) {
    logger.error('Batch translation error:', error);
    uncachedIndices.forEach(index => {
      results[index] = texts[index];
    });
    return results;
  }
}

export async function detectLanguage(text) {
  if (!text || typeof text !== 'string') {
    return 'pt';
  }

  if (!process.env.GOOGLE_TRANSLATE_API_KEY) {
    return 'pt';
  }

  try {
    const [detection] = await translate.detect(text);
    return detection.language;
  } catch (error) {
    logger.error('Language detection error:', error);
    return 'pt';
  }
}

export function clearTranslationCache() {
  translationCache.clear();
  logger.info('Translation cache cleared');
}
