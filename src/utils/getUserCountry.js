import { isCountrySupported } from '@/constants/stripeCountries';
import { externalFetch } from '@/utils/apiConfig';

export async function getUserCountry() {
  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 5000,
        enableHighAccuracy: false
      });
    });

    const { latitude, longitude } = position.coords;
    
    const response = await externalFetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=en`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch country from coordinates');
    }
    
    const data = await response.json();
    const countryCode = data.address?.country_code?.toUpperCase();
    
    if (countryCode) {
      return {
        code: countryCode,
        isSupported: isCountrySupported(countryCode),
        latitude,
        longitude
      };
    }
    
    throw new Error('No country code in geocoding response');
  } catch (error) {
    console.error('getUserCountry error:', error);
    
    const storedCountry = localStorage.getItem('user_country');
    if (storedCountry) {
      return {
        code: storedCountry,
        isSupported: isCountrySupported(storedCountry),
        fromCache: true
      };
    }
    
    return {
      code: 'PT',
      isSupported: true,
      fromFallback: true
    };
  }
}

export async function getUserCountryWithCache() {
  const cached = localStorage.getItem('user_country');
  const cacheTime = localStorage.getItem('user_country_timestamp');
  
  const ONE_DAY = 24 * 60 * 60 * 1000;
  if (cached && cacheTime && Date.now() - parseInt(cacheTime) < ONE_DAY) {
    return {
      code: cached,
      isSupported: isCountrySupported(cached),
      fromCache: true
    };
  }
  
  const result = await getUserCountry();
  
  if (result.code && !result.fromCache) {
    localStorage.setItem('user_country', result.code);
    localStorage.setItem('user_country_timestamp', Date.now().toString());
  }
  
  return result;
}
