import React, { useState, useEffect, useRef, useCallback } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import Autocomplete from 'react-google-autocomplete';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, AlertCircle, AlertTriangle, Loader2, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { useAutoTranslate } from '@/hooks/useTranslate';
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

export function AddressAutocomplete({ 
  onAddressSelect, 
  countryCode = 'PT',
  placeholder = "Comece a escrever a morada...",
  error,
  className = "",
  compact = false,
  initialValues = null
}) {
  const txtStreetName = useAutoTranslate('Nome da Rua', 'pt');
  const txtNumber = useAutoTranslate('Número', 'pt');
  const txtPostalCode = useAutoTranslate('Código Postal', 'pt');
  const txtCity = useAutoTranslate('Cidade', 'pt');
  const txtDistrictRegion = useAutoTranslate('Distrito/Região', 'pt');
  const txtSearchAddressOptional = useAutoTranslate('Pesquisar Morada (opcional)', 'pt');
  const txtLoadingGoogleMaps = useAutoTranslate('A carregar Google Maps...', 'pt');
  const txtAutoFillHint = useAutoTranslate('Pesquise para preencher automaticamente', 'pt');
  const txtSearchingAddresses = useAutoTranslate('A procurar moradas...', 'pt');
  const txtNoAddressesFound = useAutoTranslate('Nenhuma morada encontrada', 'pt');
  const txtTryDifferentSearch = useAutoTranslate('Tente pesquisar de forma diferente', 'pt');
  const txtAddressDetails = useAutoTranslate('Detalhes da Morada', 'pt');
  const txtShowSearch = useAutoTranslate('Pesquisar morada', 'pt');
  const txtHideSearch = useAutoTranslate('Ocultar pesquisa', 'pt');
  const txtUseMyLocation = useAutoTranslate('Usar minha localização', 'pt');
  const txtGettingLocation = useAutoTranslate('A obter localização...', 'pt');
  const txtLocationError = useAutoTranslate('Erro ao obter localização', 'pt');
  const txtLocationFilled = useAutoTranslate('Localização preenchida!', 'pt');

  const isCapacitor = isCapacitorApp();
  
  const [apiKeyAvailable, setApiKeyAvailable] = useState(true);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [loadingFailed, setLoadingFailed] = useState(false);
  
  const [inputValue, setInputValue] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSelectingPlace, setIsSelectingPlace] = useState(false);
  const [showSearchBox, setShowSearchBox] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  
  const debouncedInput = useDebounce(inputValue, 400);

  const [manualAddress, setManualAddress] = useState({
    streetName: initialValues?.streetName || '',
    streetNumber: initialValues?.streetNumber || '',
    city: initialValues?.city || '',
    district: initialValues?.district || '',
    postalCode: initialValues?.postalCode || ''
  });
  
  const [lastLoadedValues, setLastLoadedValues] = useState(null);
  const [userHasEdited, setUserHasEdited] = useState(false);
  
  useEffect(() => {
    if (initialValues) {
      const valuesKey = JSON.stringify(initialValues);
      if (valuesKey !== lastLoadedValues) {
        setManualAddress({
          streetName: initialValues.streetName || '',
          streetNumber: initialValues.streetNumber || '',
          city: initialValues.city || '',
          district: initialValues.district || '',
          postalCode: initialValues.postalCode || ''
        });
        setLastLoadedValues(valuesKey);
        setUserHasEdited(false);
      }
    }
  }, [initialValues, lastLoadedValues]);

  const handleUseCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      toast.error(txtLocationError);
      return;
    }

    setIsGettingLocation(true);
    
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const { latitude, longitude } = position.coords;
      
      const { response, data } = await safeFetch(
        `/api/places/reverse-geocode?lat=${latitude}&lng=${longitude}`
      );

      if (response.ok && data?.result) {
        const place = data.result;
        const addressData = extractAddressComponents(place.address_components || []);
        
        const completeAddress = {
          ...addressData,
          formattedAddress: place.formatted_address || '',
          geometry: { lat: latitude, lng: longitude }
        };

        onAddressSelect(completeAddress);
        toast.success(txtLocationFilled);
      } else {
        onAddressSelect({
          geometry: { lat: latitude, lng: longitude }
        });
        toast.success(txtLocationFilled);
      }
    } catch (err) {
      console.error('❌ Erro ao obter localização:', err);
      toast.error(txtLocationError);
    } finally {
      setIsGettingLocation(false);
    }
  }, [onAddressSelect, txtLocationError, txtLocationFilled]);

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

  const [autocompleteError, setAutocompleteError] = useState(false);
  
  useEffect(() => {
    if (!isCapacitor || !showSearchBox || !debouncedInput || debouncedInput.length < 3) {
      setPredictions([]);
      return;
    }

    const fetchPredictions = async () => {
      setIsSearching(true);
      setAutocompleteError(false);
      try {
        const { response, data } = await safeFetch(
          `/api/places/autocomplete?input=${encodeURIComponent(debouncedInput)}&country=${countryCode}`
        );
        
        if (response.ok && data?.predictions) {
          setPredictions(data.predictions);
          setShowDropdown(true);
        } else {
          setPredictions([]);
          setAutocompleteError(true);
        }
      } catch (err) {
        console.error('❌ Erro ao buscar moradas:', err);
        setPredictions([]);
        setAutocompleteError(true);
      } finally {
        setIsSearching(false);
      }
    };

    fetchPredictions();
  }, [isCapacitor, showSearchBox, debouncedInput, countryCode]);

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

  const handleManualFieldChange = useCallback((field, value) => {
    setUserHasEdited(true);
    setManualAddress(prev => {
      const updated = { ...prev, [field]: value };
      return updated;
    });
  }, []);

  // Debounced callback for manual address changes - only fires when user stops typing
  const manualAddressTimeoutRef = useRef(null);
  useEffect(() => {
    // Only trigger for manual entry when user has actually edited AND required fields have values
    if (userHasEdited && manualAddress.streetName && manualAddress.city) {
      if (manualAddressTimeoutRef.current) {
        clearTimeout(manualAddressTimeoutRef.current);
      }
      manualAddressTimeoutRef.current = setTimeout(() => {
        onAddressSelect({
          ...manualAddress,
          country: countryCode,
          isManualEntry: true
        });
      }, 1000); // 1 second debounce
    }
    return () => {
      if (manualAddressTimeoutRef.current) {
        clearTimeout(manualAddressTimeoutRef.current);
      }
    };
  }, [userHasEdited, manualAddress, countryCode, onAddressSelect]);

  const handlePredictionSelect = useCallback(async (prediction) => {
    setIsSelectingPlace(true);
    setShowDropdown(false);
    setInputValue(prediction.description);
    
    try {
      // Verificar se é uma prediction do OpenStreetMap (tem osm_data)
      if (prediction.osm_data) {
        // Usar dados OSM diretamente + fazer reverse geocode para detalhes
        const { lat, lng, address } = prediction.osm_data;
        
        let detailsUrl = `/api/places/details?place_id=${encodeURIComponent(prediction.place_id)}`;
        if (lat && lng) {
          detailsUrl += `&osm_lat=${lat}&osm_lng=${lng}`;
        }
        if (address) {
          detailsUrl += `&osm_address=${encodeURIComponent(JSON.stringify(address))}`;
        }
        
        const { response, data } = await safeFetch(detailsUrl);
        
        if (response.ok && data?.result) {
          const place = data.result;
          const addressComponents = place.address_components || [];
          const addressData = extractAddressComponents(addressComponents);
          
          const newManualAddress = {
            streetName: addressData.streetName || '',
            streetNumber: addressData.streetNumber || '',
            city: addressData.city || '',
            district: addressData.district || '',
            postalCode: addressData.postalCode || ''
          };
          
          setManualAddress(newManualAddress);
          
          const completeAddress = {
            ...addressData,
            formattedAddress: place.formatted_address || prediction.description,
            placeId: prediction.place_id,
            geometry: { lat, lng }
          };
          
          console.log('✅ Dados extraídos da morada (OpenStreetMap):', completeAddress);
          onAddressSelect(completeAddress);
          setShowSearchBox(false);
        }
      } else {
        // Google Places - usar API normal
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
          
          const newManualAddress = {
            streetName: addressData.streetName || '',
            streetNumber: addressData.streetNumber || '',
            city: addressData.city || '',
            district: addressData.district || '',
            postalCode: addressData.postalCode || ''
          };
          
          setManualAddress(newManualAddress);
          
          const completeAddress = {
            ...addressData,
            formattedAddress: place.formatted_address || prediction.description,
            placeId: prediction.place_id,
            geometry: place.geometry?.location ? {
              lat: place.geometry.location.lat,
              lng: place.geometry.location.lng
            } : null
          };

          console.log('✅ Dados extraídos da morada (Google):', completeAddress);
          onAddressSelect(completeAddress);
          setShowSearchBox(false);
        }
      }
    } catch (err) {
      console.error('❌ Erro ao buscar detalhes:', err);
    } finally {
      setIsSelectingPlace(false);
    }
  }, [onAddressSelect, countryCode]);

  const handlePlaceSelected = useCallback((place) => {
    if (!place || !place.address_components) {
      console.warn('⚠️ Morada inválida selecionada');
      return;
    }

    const addressData = extractAddressComponents(place.address_components);
    
    const newManualAddress = {
      streetName: addressData.streetName || '',
      streetNumber: addressData.streetNumber || '',
      city: addressData.city || '',
      district: addressData.district || '',
      postalCode: addressData.postalCode || ''
    };
    
    setManualAddress(newManualAddress);
    
    const completeAddress = {
      ...addressData,
      formattedAddress: place.formatted_address || '',
      placeId: place.place_id || '',
      geometry: place.geometry ? {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng()
      } : null
    };
    
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
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-600" />
            {txtAddressDetails}
          </Label>
          <button
            type="button"
            onClick={() => setShowSearchBox(!showSearchBox)}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors active:bg-blue-100"
          >
            <Search className="h-4 w-4" />
            {showSearchBox ? txtHideSearch : txtShowSearch}
            {showSearchBox ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
        
        {showSearchBox && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
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
                    {txtSearchingAddresses}
                  </div>
                </div>
              )}
              
              {showDropdown && !isSearching && predictions.length === 0 && debouncedInput.length >= 3 && (
                <div className="absolute z-50 w-full mt-2 bg-amber-50 border border-amber-200 rounded-xl shadow-lg p-4">
                  <p className="text-base text-amber-800 font-medium">{txtNoAddressesFound}</p>
                  <p className="text-sm text-amber-600 mt-1">{txtTryDifferentSearch}</p>
                </div>
              )}
            </div>
            <p className="text-sm text-blue-600 mt-3 text-center">
              {txtAutoFillHint}
            </p>
          </div>
        )}
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="cap-street" className="text-sm font-medium mb-1.5 block">{txtStreetName} *</Label>
            <Input
              id="cap-street"
              value={manualAddress.streetName}
              onChange={(e) => handleManualFieldChange('streetName', e.target.value)}
              placeholder="Ex: Rua das Flores"
              className={`h-12 text-base ${error && !manualAddress.streetName ? 'border-red-500' : ''}`}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cap-number" className="text-sm font-medium mb-1.5 block">{txtNumber}</Label>
              <Input
                id="cap-number"
                value={manualAddress.streetNumber}
                onChange={(e) => handleManualFieldChange('streetNumber', e.target.value)}
                placeholder="123"
                className="h-12 text-base"
              />
            </div>
            <div>
              <Label htmlFor="cap-postal" className="text-sm font-medium mb-1.5 block">{txtPostalCode} *</Label>
              <Input
                id="cap-postal"
                value={manualAddress.postalCode}
                onChange={(e) => handleManualFieldChange('postalCode', e.target.value)}
                placeholder="1000-001"
                className={`h-12 text-base ${error && !manualAddress.postalCode ? 'border-red-500' : ''}`}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cap-city" className="text-sm font-medium mb-1.5 block">{txtCity} *</Label>
              <Input
                id="cap-city"
                value={manualAddress.city}
                onChange={(e) => handleManualFieldChange('city', e.target.value)}
                placeholder="Lisboa"
                className={`h-12 text-base ${error && !manualAddress.city ? 'border-red-500' : ''}`}
              />
            </div>
            <div>
              <Label htmlFor="cap-district" className="text-sm font-medium mb-1.5 block">{txtDistrictRegion}</Label>
              <Input
                id="cap-district"
                value={manualAddress.district}
                onChange={(e) => handleManualFieldChange('district', e.target.value)}
                placeholder="Lisboa"
                className="h-12 text-base"
              />
            </div>
          </div>
        </div>
        
        {error && (
          <p className="text-sm text-red-600 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" />
            {error}
          </p>
        )}
      </div>
    );
  }

  if (!apiKeyAvailable || loadingFailed) {
    return (
      <div className={className}>
        <Alert className="mb-4 border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800 text-sm">
            Preencha os campos manualmente abaixo.
          </AlertDescription>
        </Alert>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="manual-street" className="text-sm font-medium mb-1.5 block">{txtStreetName}</Label>
            <Input
              id="manual-street"
              value={manualAddress.streetName}
              onChange={(e) => handleManualFieldChange('streetName', e.target.value)}
              placeholder="Ex: Rua das Flores"
              className="h-12 text-base"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="manual-number" className="text-sm font-medium mb-1.5 block">{txtNumber}</Label>
              <Input
                id="manual-number"
                value={manualAddress.streetNumber}
                onChange={(e) => handleManualFieldChange('streetNumber', e.target.value)}
                placeholder="123"
                className="h-12 text-base"
              />
            </div>
            <div>
              <Label htmlFor="manual-postal" className="text-sm font-medium mb-1.5 block">{txtPostalCode}</Label>
              <Input
                id="manual-postal"
                value={manualAddress.postalCode}
                onChange={(e) => handleManualFieldChange('postalCode', e.target.value)}
                placeholder="1000-001"
                className="h-12 text-base"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="manual-city" className="text-sm font-medium mb-1.5 block">{txtCity}</Label>
              <Input
                id="manual-city"
                value={manualAddress.city}
                onChange={(e) => handleManualFieldChange('city', e.target.value)}
                placeholder="Lisboa"
                className="h-12 text-base"
              />
            </div>
            <div>
              <Label htmlFor="manual-district" className="text-sm font-medium mb-1.5 block">{txtDistrictRegion}</Label>
              <Input
                id="manual-district"
                value={manualAddress.district}
                onChange={(e) => handleManualFieldChange('district', e.target.value)}
                placeholder="Lisboa"
                className="h-12 text-base"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!scriptsLoaded) {
    return (
      <div className={className}>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400 z-10" />
          <Input
            disabled
            placeholder={txtLoadingGoogleMaps}
            className={compact ? "pl-10 bg-slate-50 h-8 text-xs" : "pl-10 bg-slate-50"}
          />
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-blue-500 z-10 pointer-events-none" />
            <Autocomplete
              apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
              onPlaceSelected={handlePlaceSelected}
              options={{
                types: ['address'],
                componentRestrictions: getComponentRestrictions(),
                fields: ['address_components', 'geometry', 'formatted_address', 'place_id']
              }}
              placeholder={placeholder}
              className="flex h-8 w-full rounded-md border border-blue-200 bg-white px-2 py-1 pl-8 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1"
            />
          </div>
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isGettingLocation}
            className="flex items-center gap-1.5 px-2.5 h-8 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {isGettingLocation ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <MapPin className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">{isGettingLocation ? txtGettingLocation : txtUseMyLocation}</span>
          </button>
        </div>
        
        <div className="space-y-2">
          <div>
            <Label htmlFor="compact-street" className="text-[10px] text-slate-500 uppercase tracking-wide">{txtStreetName} *</Label>
            <Input
              id="compact-street"
              value={manualAddress.streetName}
              onChange={(e) => handleManualFieldChange('streetName', e.target.value)}
              placeholder="Ex: Rua das Flores"
              className={`mt-0.5 h-8 text-xs ${error && !manualAddress.streetName ? 'border-red-500' : ''}`}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="compact-number" className="text-[10px] text-slate-500 uppercase tracking-wide">{txtNumber}</Label>
              <Input
                id="compact-number"
                value={manualAddress.streetNumber}
                onChange={(e) => handleManualFieldChange('streetNumber', e.target.value)}
                placeholder="123"
                className="mt-0.5 h-8 text-xs"
              />
            </div>
            <div>
              <Label htmlFor="compact-postal" className="text-[10px] text-slate-500 uppercase tracking-wide">{txtPostalCode} *</Label>
              <Input
                id="compact-postal"
                value={manualAddress.postalCode}
                onChange={(e) => handleManualFieldChange('postalCode', e.target.value)}
                placeholder="1000-001"
                className={`mt-0.5 h-8 text-xs ${error && !manualAddress.postalCode ? 'border-red-500' : ''}`}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="compact-city" className="text-[10px] text-slate-500 uppercase tracking-wide">{txtCity} *</Label>
              <Input
                id="compact-city"
                value={manualAddress.city}
                onChange={(e) => handleManualFieldChange('city', e.target.value)}
                placeholder="Lisboa"
                className={`mt-0.5 h-8 text-xs ${error && !manualAddress.city ? 'border-red-500' : ''}`}
              />
            </div>
            <div>
              <Label htmlFor="compact-district" className="text-[10px] text-slate-500 uppercase tracking-wide">{txtDistrictRegion}</Label>
              <Input
                id="compact-district"
                value={manualAddress.district}
                onChange={(e) => handleManualFieldChange('district', e.target.value)}
                placeholder="Lisboa"
                className="mt-0.5 h-8 text-xs"
              />
            </div>
          </div>
        </div>
        
        {error && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <Label className="mb-2 block text-sm font-medium text-blue-800">
          {txtSearchAddressOptional}
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-blue-500 z-10" />
            <Autocomplete
              apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
              onPlaceSelected={handlePlaceSelected}
              options={{
                types: ['address'],
                componentRestrictions: getComponentRestrictions(),
                fields: ['address_components', 'geometry', 'formatted_address', 'place_id']
              }}
              placeholder={placeholder}
              className="flex h-10 w-full rounded-md border border-blue-200 bg-white px-3 py-2 pl-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
            />
          </div>
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isGettingLocation}
            className="flex items-center gap-2 px-4 h-10 text-sm font-medium text-blue-600 bg-white hover:bg-blue-100 rounded-md border border-blue-200 transition-colors disabled:opacity-50"
          >
            {isGettingLocation ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MapPin className="h-4 w-4" />
            )}
            {isGettingLocation ? txtGettingLocation : txtUseMyLocation}
          </button>
        </div>
        <p className="text-xs text-blue-600 mt-2">
          {txtAutoFillHint}
        </p>
      </div>
      
      <div className="space-y-4">
        <Label className="text-base font-semibold flex items-center gap-2">
          <MapPin className="h-4 w-4 text-blue-600" />
          {txtAddressDetails}
        </Label>
        
        <div>
          <Label htmlFor="web-street" className="text-sm font-medium mb-1.5 block">{txtStreetName} *</Label>
          <Input
            id="web-street"
            value={manualAddress.streetName}
            onChange={(e) => handleManualFieldChange('streetName', e.target.value)}
            placeholder="Ex: Rua das Flores"
            className={`h-10 ${error && !manualAddress.streetName ? 'border-red-500' : ''}`}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="web-number" className="text-sm font-medium mb-1.5 block">{txtNumber}</Label>
            <Input
              id="web-number"
              value={manualAddress.streetNumber}
              onChange={(e) => handleManualFieldChange('streetNumber', e.target.value)}
              placeholder="123"
              className="h-10"
            />
          </div>
          <div>
            <Label htmlFor="web-postal" className="text-sm font-medium mb-1.5 block">{txtPostalCode} *</Label>
            <Input
              id="web-postal"
              value={manualAddress.postalCode}
              onChange={(e) => handleManualFieldChange('postalCode', e.target.value)}
              placeholder="1000-001"
              className={`h-10 ${error && !manualAddress.postalCode ? 'border-red-500' : ''}`}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="web-city" className="text-sm font-medium mb-1.5 block">{txtCity} *</Label>
            <Input
              id="web-city"
              value={manualAddress.city}
              onChange={(e) => handleManualFieldChange('city', e.target.value)}
              placeholder="Lisboa"
              className={`h-10 ${error && !manualAddress.city ? 'border-red-500' : ''}`}
            />
          </div>
          <div>
            <Label htmlFor="web-district" className="text-sm font-medium mb-1.5 block">{txtDistrictRegion}</Label>
            <Input
              id="web-district"
              value={manualAddress.district}
              onChange={(e) => handleManualFieldChange('district', e.target.value)}
              placeholder="Lisboa"
              className="h-10"
            />
          </div>
        </div>
      </div>
      
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}
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

export default AddressAutocomplete;
