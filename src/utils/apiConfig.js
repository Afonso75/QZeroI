// ✅ CONFIGURAÇÃO API - SUPORTA WEB E CAPACITOR (Android/iOS)
// Em DEV Web: Usa proxy Vite (/api → http://localhost:3001/api)
// Em PROD Web: Usa MESMO domínio (/api → https://waitless-qzero.com/api)
// Em Capacitor: Usa URL COMPLETO + CapacitorHttp plugin

import { Capacitor } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';

// ✅ Detectar Capacitor usando a API oficial
const isCapacitor = typeof window !== 'undefined' && Capacitor.isNativePlatform();

// URLs do servidor
const REPLIT_PUBLISHED_URL = 'https://q-zero-afonsomarques80.replit.app';

// ✅ Determinar URL base
const getApiBase = () => {
  if (isCapacitor) {
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }
    return REPLIT_PUBLISHED_URL;
  }
  return '';
};

export const API_BASE = getApiBase();

// ✅ Exportar função para verificar se está no Capacitor
export const isCapacitorApp = () => isCapacitor;

// ✅ FUNÇÃO PARA FETCH DE APIs EXTERNAS (OpenStreetMap, etc) - Usa CapacitorHttp no nativo
export const externalFetch = async (url, options = {}) => {
  if (isCapacitor) {
    try {
      const httpResponse = await CapacitorHttp.request({
        url,
        method: options.method || 'GET',
        headers: options.headers || {},
        data: options.body ? JSON.parse(options.body) : undefined
      });
      
      return {
        ok: httpResponse.status >= 200 && httpResponse.status < 300,
        status: httpResponse.status,
        json: async () => httpResponse.data,
        text: async () => typeof httpResponse.data === 'string' ? httpResponse.data : JSON.stringify(httpResponse.data)
      };
    } catch (error) {
      console.error('❌ CapacitorHttp external error:', error);
      throw error;
    }
  }
  
  // Web: usar fetch normal
  return fetch(url, options);
};

// ✅ Exportar função para obter URL base (para redirects do Stripe, etc)
export const getBaseUrl = () => {
  if (isCapacitor) {
    // No Capacitor, usar sempre o URL do servidor publicado
    return import.meta.env.VITE_API_URL || REPLIT_PUBLISHED_URL;
  }
  // Na web, usar o origin atual
  return typeof window !== 'undefined' ? window.location.origin : '';
};

// 🔍 DEBUG: Logs para diagnóstico (apenas em desenvolvimento)
if (import.meta.env.DEV) {
  console.log('🔧 API CONFIG:', {
    'isCapacitor': isCapacitor,
    'import.meta.env.PROD': import.meta.env.PROD,
    'window.location.hostname': typeof window !== 'undefined' ? window.location.hostname : 'N/A',
    'API_BASE': API_BASE || '(same origin)',
    'Exemplo URL': (API_BASE || (typeof window !== 'undefined' ? window.location.origin : '')) + '/api/auth/me'
  });
}

// Helper para construir URLs de API
export const apiUrl = (path) => {
  const fullUrl = API_BASE + path;
  if (import.meta.env.DEV) {
    console.log('🌐 API Request:', path, '→', fullUrl || (window.location.origin + path));
  }
  return fullUrl;
};

// ✅ Helper para construir URLs absolutas para uploads/imagens
// Suporta: /uploads/..., /objects/..., URLs absolutas
// Em Capacitor, precisa de URL absoluta; em web, URL relativa funciona
export const getUploadUrl = (relativePath) => {
  if (!relativePath) return null;
  
  // Se já é URL absoluta, retorna como está
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  
  // Normalizar path - garantir que começa com /
  let normalizedPath = relativePath.startsWith('/') ? relativePath : '/' + relativePath;
  
  // Garantir que paths de objects começam corretamente
  if (normalizedPath.startsWith('/objects/') || normalizedPath.startsWith('/uploads/')) {
    // Path já está correto
  } else if (normalizedPath.startsWith('/')) {
    // Outros paths - manter como estão
  }
  
  // Se está no Capacitor, precisa de URL absoluta
  if (isCapacitor) {
    const base = import.meta.env.VITE_API_URL || REPLIT_PUBLISHED_URL;
    return base + normalizedPath;
  }
  
  // Em web, URL relativa funciona (com barra inicial)
  return normalizedPath;
};

// ✅ Detectar plataforma específica (ios/android/web)
// 🍎🤖 B2B COMPLIANCE: Esta função é crítica para identificar apps nativas
export const getPlatform = () => {
  // Primeiro, verificar se o Capacitor está disponível e usar a sua API
  if (typeof window !== 'undefined' && window.Capacitor) {
    const platform = window.Capacitor.getPlatform?.() || window.Capacitor.platform;
    if (platform === 'ios' || platform === 'android') {
      return platform;
    }
    // Se Capacitor existe mas não é web, é nativo
    if (platform && platform !== 'web') {
      return platform;
    }
  }
  
  // Fallback: verificar isCapacitor e user-agent
  if (!isCapacitor) return 'web';
  
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
    return 'ios';
  }
  if (ua.includes('android')) {
    return 'android';
  }
  // Fallback para Capacitor genérico
  return 'native';
};

// ✅ FUNÇÃO SEGURA PARA FETCH - Usa CapacitorHttp no nativo para evitar CORS
export const safeFetch = async (url, options = {}) => {
  const fullUrl = apiUrl(url);
  
  // Para endpoints públicos, não enviar credentials
  const isPublicEndpoint = url.includes('/api/public/');
  
  // 🍎🤖 B2B COMPLIANCE: Enviar header X-Platform para identificar plataforma nativa
  const platform = getPlatform();
  
  const headers = {
    'Content-Type': 'application/json',
    'X-Platform': platform,
    ...options.headers
  };
  
  console.log('🌐 safeFetch:', {
    url,
    fullUrl,
    platform,
    isCapacitor,
    method: options.method || 'GET'
  });
  
  let response;
  let data;
  
  try {
    // 📱 CAPACITOR: Usar CapacitorHttp para evitar problemas de CORS/credentials
    if (isCapacitor) {
      const httpResponse = await CapacitorHttp.request({
        url: fullUrl,
        method: options.method || 'GET',
        headers,
        data: options.body ? JSON.parse(options.body) : undefined,
        webFetchExtra: {
          credentials: isPublicEndpoint ? 'omit' : 'include'
        }
      });
      
      console.log('✅ CapacitorHttp response:', httpResponse.status);
      
      // Criar objeto response compatível
      response = {
        ok: httpResponse.status >= 200 && httpResponse.status < 300,
        status: httpResponse.status,
        statusText: httpResponse.status < 300 ? 'OK' : 'Error',
        headers: {
          get: (name) => httpResponse.headers?.[name.toLowerCase()] || httpResponse.headers?.[name] || null
        }
      };
      data = httpResponse.data;
      
      // Handle empty responses
      if (httpResponse.status === 204 || !data) {
        return { response, data: undefined };
      }
      
      return { response, data };
    }
    
    // 🌐 WEB: Usar fetch normal
    const defaultOptions = {
      credentials: isPublicEndpoint ? 'omit' : 'include',
      headers
    };
    
    response = await fetch(fullUrl, { ...defaultOptions, ...options });
    console.log('✅ safeFetch response:', response.status, response.statusText);
  } catch (fetchError) {
    console.error('❌ safeFetch NETWORK ERROR:', fetchError.message);
    console.error('🔍 Detalhes:', {
      url: fullUrl,
      isCapacitor,
      API_BASE,
      error: fetchError.toString()
    });
    throw new Error(`Erro de rede: ${fetchError.message}. Verifique a ligação à internet.`);
  }
  
  // Lidar com respostas 204 No Content ou respostas vazias
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return { response, data: undefined };
  }
  
  const contentType = response.headers.get('content-type') || '';
  
  // Se não é JSON, provavelmente é uma página de erro HTML
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    
    if (!text || text.trim() === '') {
      return { response, data: undefined };
    }
    
    if (text.includes('<!DOCTYPE') || text.includes('<html')) {
      console.error('❌ API ERROR: Servidor retornou HTML em vez de JSON');
      console.error('📍 Endpoint:', url);
      console.error('🔍 Content-Type:', contentType);
      
      throw new Error(
        `Servidor indisponível. Verifique se a aplicação está publicada e acessível.`
      );
    }
    
    try {
      data = JSON.parse(text);
      return { response, data };
    } catch (e) {
      throw new Error(`Resposta inválida do servidor: ${text.substring(0, 100)}`);
    }
  }
  
  data = await response.json();
  return { response, data };
};
