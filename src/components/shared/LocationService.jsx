import { useState, useEffect, useCallback } from 'react';
import { safeFetch } from '@/utils/apiConfig';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

// Calcular distância entre duas coordenadas (Haversine formula)
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Detectar se estamos no Capacitor (app nativa)
const isNative = Capacitor.isNativePlatform();

// ✅ CACHE A NÍVEL DE MÓDULO - persiste entre navegações
let locationCache = {
  location: null,
  country: null,
  timestamp: null,
  error: null
};

// Tempo máximo do cache (30 minutos)
const CACHE_MAX_AGE_MS = 30 * 60 * 1000;

// Verificar se o cache é válido
const isCacheValid = () => {
  if (!locationCache.location || !locationCache.timestamp) return false;
  const age = Date.now() - locationCache.timestamp;
  return age < CACHE_MAX_AGE_MS;
};

// Invalidar cache (chamado quando app volta do background)
const invalidateCache = () => {
  console.log('🔄 Cache de localização invalidado');
  locationCache = {
    location: null,
    country: null,
    timestamp: null,
    error: null
  };
};

// ✅ Listener para app state (Capacitor) - invalida cache quando app volta do background
let appStateListenerRegistered = false;

const registerAppStateListener = () => {
  if (appStateListenerRegistered || !isNative) return;
  
  App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) {
      console.log('📱 App voltou ao foreground - invalidando cache de localização');
      invalidateCache();
    }
  });
  
  appStateListenerRegistered = true;
  console.log('📱 App state listener registado para localização');
};

// Hook para geolocalização - suporta Web e Capacitor (Android/iOS)
// ✅ OPTIMIZADO: Usa cache para evitar pedidos repetidos de GPS
export function useUserLocation() {
  const [location, setLocation] = useState(locationCache.location);
  const [country, setCountry] = useState(locationCache.country);
  const [loading, setLoading] = useState(!isCacheValid());
  const [error, setError] = useState(locationCache.error);

  const fetchLocation = useCallback(async (force = false) => {
    // Se cache válido e não forçado, não fazer nada
    if (!force && isCacheValid()) {
      console.log('📍 Usando localização do cache');
      setLocation(locationCache.location);
      setCountry(locationCache.country);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let latitude, longitude;

      if (isNative) {
        console.log('📱 Usando Capacitor Geolocation (nativo)');
        
        const permStatus = await Geolocation.checkPermissions();
        console.log('📍 Status permissões:', permStatus);
        
        if (permStatus.location !== 'granted') {
          const requestResult = await Geolocation.requestPermissions();
          console.log('📍 Resultado pedido permissões:', requestResult);
          
          if (requestResult.location !== 'granted') {
            const errorMsg = 'Permissão de localização negada';
            setError(errorMsg);
            locationCache.error = errorMsg;
            setLoading(false);
            return;
          }
        }
        
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000
        });
        
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
        console.log('✅ Localização obtida (Capacitor):', { latitude, longitude });
        
      } else {
        console.log('🌐 Usando navigator.geolocation (web)');
        
        if (!navigator.geolocation) {
          const errorMsg = 'Geolocalização não suportada pelo navegador';
          setError(errorMsg);
          locationCache.error = errorMsg;
          setLoading(false);
          return;
        }

        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
          });
        });
        
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
        console.log('✅ Localização obtida (Web):', { latitude, longitude });
      }

      const newLocation = { lat: latitude, lng: longitude };
      setLocation(newLocation);
      locationCache.location = newLocation;
      locationCache.timestamp = Date.now();
      locationCache.error = null;

      // Reverse geocoding para obter país
      try {
        const { externalFetch } = await import('@/utils/apiConfig');
        const response = await externalFetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=3&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'QZero-App/1.0'
            }
          }
        );
        const data = await response.json();
        const countryCode = data.address?.country_code?.toUpperCase();
        const countryName = data.address?.country;
        
        const newCountry = { code: countryCode, name: countryName };
        setCountry(newCountry);
        locationCache.country = newCountry;
        console.log('✅ País detectado:', { code: countryCode, name: countryName });
      } catch (err) {
        console.error('❌ Erro ao obter país:', err);
      }
      
    } catch (err) {
      console.error('❌ Erro de localização:', err);
      let errorMsg;
      if (err.code === 1 || err.message?.includes('denied') || err.message?.includes('permission')) {
        errorMsg = 'Acesso à localização negado';
      } else if (err.code === 2 || err.message?.includes('unavailable')) {
        errorMsg = 'Localização indisponível';
      } else if (err.code === 3 || err.message?.includes('timeout')) {
        errorMsg = 'Tempo esgotado ao obter localização';
      } else {
        errorMsg = 'Erro ao obter localização';
      }
      setError(errorMsg);
      locationCache.error = errorMsg;
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    // Registar listener de app state (apenas uma vez)
    registerAppStateListener();
    
    // Se cache válido, usar imediatamente
    if (isCacheValid()) {
      console.log('📍 Localização carregada do cache');
      setLocation(locationCache.location);
      setCountry(locationCache.country);
      setLoading(false);
      return;
    }
    
    // Caso contrário, buscar nova localização
    fetchLocation();
  }, [fetchLocation]);

  return { location, country, loading, error, refetch: () => fetchLocation(true) };
}

// Geocoding de morada para coordenadas usando Google Maps API
export async function geocodeAddress(addressStr, city = null, postalCode = null, country = null) {
  try {
    console.log('🗺️ Geocoding endereço com Google Maps:', { addressStr, city, postalCode, country });
    
    const { response, data } = await safeFetch('/api/geocode-address', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        address: addressStr,
        city,
        postalCode,
        country
      })
    });

    if (!response.ok) {
      console.error('❌ Geocoding falhou:', data);
      return null;
    }
    
    console.log('✅ Geocoding bem-sucedido:', {
      lat: data?.lat,
      lng: data?.lng,
      precision: data?.precision,
      locationType: data?.locationType
    });
    
    return {
      lat: data?.lat,
      lng: data?.lng,
      precision: data?.precision,
      locationType: data?.locationType,
      formattedAddress: data?.formattedAddress
    };
  } catch (error) {
    console.error('❌ Erro no geocoding:', error);
    return null;
  }
}
