import React, { useState, useEffect, useRef, useCallback } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import Autocomplete from 'react-google-autocomplete';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2, Search, AlertTriangle } from 'lucide-react';
import { isCapacitorApp, safeFetch } from '@/utils/apiConfig';

let optionsSet = false;
let loadingPromise = null;

function initializeGoogleMaps() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    return null;
  }

  if (!optionsSet) {
    setOptions({
      key: apiKey,
      version: 'weekly'
    });
    optionsSet = true;
  }

  return true;
}

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function AddressSearchBox({ 
  onAddressSelect, 
  countryCode = 'PT',
  placeholder = "Pesquisar morada..."
}) {
  const isCapacitor = isCapacitorApp();
  
  const [apiKeyAvailable, setApiKeyAvailable] = useState(true);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [loadingFailed, setLoadingFailed] = useState(false);
  
  const [inputValue, setInputValue] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSelectingPlace, setIsSelectingPlace] = useState(false);
  
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  
  const debouncedInput = useDebounce(inputValue, 400);

  useEffect(() => {
    if (!isCapacitor) {
      const initialized = initializeGoogleMaps();
      
      if (!initialized) {
        console.warn('⚠️ Google Maps API key não configurada');
        setApiKeyAvailable(false);
        return;
      }

      if (window.google && window.google.maps && window.google.maps.places) {
        setScriptsLoaded(true);
        return;
      }

      if (!loadingPromise) {
        loadingPromise = importLibrary('places')
          .then(() => {
            console.log('✅ Google Maps Places API carregado');
            setScriptsLoaded(true);
            setLoadingFailed(false);
          })
          .catch((err) => {
            console.error('❌ Erro ao carregar Google Maps:', err);
            setLoadingFailed(true);
            setApiKeyAvailable(false);
            loadingPromise = null;
          });
      } else {
        loadingPromise.then(() => {
          setScriptsLoaded(true);
          setLoadingFailed(false);
        }).catch(() => {
          setLoadingFailed(true);
          setApiKeyAvailable(false);
        });
      }
    }
  }, [isCapacitor]);

  useEffect(() => {
    if (!isCapacitor || !debouncedInput || debouncedInput.length < 3) {
      setPredictions([]);
      return;
    }

    const fetchPredictions = async () => {
      setIsSearching(true);
      try {
        const { response, data } = await safeFetch(
          `/api/places/autocomplete?input=${encodeURIComponent(debouncedInput)}&country=${countryCode}`
        );
        
        if (response.ok && data?.predictions) {
          setPredictions(data.predictions);
          setShowDropdown(true);
        } else {
          setPredictions([]);
        }
      } catch (err) {
        console.error('❌ Erro ao buscar moradas:', err);
        setPredictions([]);
      } finally {
        setIsSearching(false);
      }
    };

    fetchPredictions();
  }, [isCapacitor, debouncedInput, countryCode]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePredictionSelect = useCallback(async (prediction) => {
    setIsSelectingPlace(true);
    setShowDropdown(false);
    setInputValue(prediction.description);
    
    try {
      const { response, data } = await safeFetch(
        `/api/places/details?place_id=${encodeURIComponent(prediction.place_id)}`
      );
      
      if (response.ok && data?.result) {
        const place = data.result;
        const addressComponents = place.address_components;
        
        if (!addressComponents || addressComponents.length === 0) {
          console.warn('⚠️ Resposta sem address_components');
          return;
        }
        
        const addressData = extractAddressComponents(addressComponents);
        
        const completeAddress = {
          ...addressData,
          formattedAddress: place.formatted_address || prediction.description,
          placeId: prediction.place_id,
          geometry: place.geometry?.location ? {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng
          } : null
        };

        console.log('✅ Morada completa extraída:', completeAddress);
        onAddressSelect(completeAddress);
        setInputValue('');
      }
    } catch (err) {
      console.error('❌ Erro ao buscar detalhes:', err);
    } finally {
      setIsSelectingPlace(false);
    }
  }, [onAddressSelect]);

  const handlePlaceSelected = useCallback((place) => {
    if (!place || !place.address_components) {
      console.warn('⚠️ Morada inválida selecionada');
      return;
    }

    const addressData = extractAddressComponents(place.address_components);
    
    const completeAddress = {
      ...addressData,
      formattedAddress: place.formatted_address || '',
      placeId: place.place_id || '',
      geometry: place.geometry ? {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng()
      } : null
    };
    
    console.log('✅ Morada completa extraída:', completeAddress);
    onAddressSelect(completeAddress);
  }, [onAddressSelect]);

  const getComponentRestrictions = () => {
    if (countryCode) {
      return { country: countryCode.toLowerCase() };
    }
    return undefined;
  };

  if (isCapacitor) {
    return (
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-500 z-10" />
        {(isSearching || isSelectingPlace) && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-500 animate-spin z-10" />
        )}
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (e.target.value.length >= 3) {
              setShowDropdown(true);
            }
          }}
          onFocus={() => {
            if (predictions.length > 0) {
              setShowDropdown(true);
            }
          }}
          placeholder={placeholder}
          className="pl-11 pr-11 h-12 text-base bg-white border-blue-200 focus:border-blue-400 rounded-lg"
          disabled={isSelectingPlace}
        />
        
        {showDropdown && predictions.length > 0 && (
          <div 
            ref={dropdownRef}
            className="absolute z-50 w-full mt-2 bg-white border border-blue-200 rounded-xl shadow-lg max-h-64 overflow-auto"
          >
            {predictions.map((prediction) => (
              <button
                key={prediction.place_id}
                type="button"
                className="w-full px-4 py-4 text-left hover:bg-blue-50 active:bg-blue-100 focus:bg-blue-50 focus:outline-none border-b border-blue-100 last:border-b-0 first:rounded-t-xl last:rounded-b-xl"
                onClick={() => handlePredictionSelect(prediction)}
                disabled={isSelectingPlace}
              >
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span className="text-base text-slate-700">{prediction.description}</span>
                </div>
              </button>
            ))}
          </div>
        )}
        
        {showDropdown && isSearching && predictions.length === 0 && (
          <div className="absolute z-50 w-full mt-2 bg-white border border-blue-200 rounded-xl shadow-lg p-4">
            <div className="flex items-center gap-3 text-base text-blue-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              A procurar moradas...
            </div>
          </div>
        )}
        
        {showDropdown && !isSearching && predictions.length === 0 && debouncedInput.length >= 3 && (
          <div className="absolute z-50 w-full mt-2 bg-amber-50 border border-amber-200 rounded-xl shadow-lg p-4">
            <p className="text-base text-amber-800 font-medium">Nenhuma morada encontrada</p>
            <p className="text-sm text-amber-600 mt-1">Tente pesquisar de forma diferente</p>
          </div>
        )}
      </div>
    );
  }

  if (!apiKeyAvailable || loadingFailed) {
    return (
      <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <span>Pesquisa indisponível. Preencha os campos manualmente.</span>
      </div>
    );
  }

  if (!scriptsLoaded) {
    return (
      <div className="relative">
        <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-500 animate-spin z-10" />
        <Input
          disabled
          placeholder="A carregar pesquisa..."
          className="pl-11 h-12 bg-slate-50"
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-500 z-10 pointer-events-none" />
      <Autocomplete
        apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
        onPlaceSelected={handlePlaceSelected}
        options={{
          types: ['address'],
          componentRestrictions: getComponentRestrictions(),
          fields: ['address_components', 'geometry', 'formatted_address', 'place_id']
        }}
        placeholder={placeholder}
        className="flex h-12 w-full rounded-lg border border-blue-200 bg-white px-3 py-2 pl-11 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
      />
    </div>
  );
}

function extractAddressComponents(components) {
  const data = {
    streetNumber: '',
    streetName: '',
    city: '',
    district: '',
    postalCode: '',
    country: ''
  };

  components.forEach(component => {
    const types = component.types;
    const longName = component.long_name;
    const shortName = component.short_name;

    if (types.includes('street_number')) {
      data.streetNumber = longName;
    }

    if (types.includes('route')) {
      data.streetName = longName;
    }

    if (types.includes('locality')) {
      data.city = longName;
    } else if (types.includes('postal_town') && !data.city) {
      data.city = longName;
    } else if (types.includes('administrative_area_level_2') && !data.city) {
      data.city = longName;
    }

    if (types.includes('administrative_area_level_1')) {
      data.district = longName;
    }

    if (types.includes('postal_code')) {
      data.postalCode = longName;
    }

    if (types.includes('country')) {
      data.country = shortName;
    }
  });

  return data;
}

export default AddressSearchBox;
