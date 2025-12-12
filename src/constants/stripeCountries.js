export const STRIPE_SUPPORTED_COUNTRIES = [
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', currency: 'EUR', defaultLanguage: 'pt' },
  { code: 'ES', name: 'Espanha', flag: '🇪🇸', currency: 'EUR', defaultLanguage: 'es' },
  { code: 'FR', name: 'França', flag: '🇫🇷', currency: 'EUR', defaultLanguage: 'fr' },
  { code: 'GB', name: 'Reino Unido', flag: '🇬🇧', currency: 'GBP', defaultLanguage: 'en' },
  { code: 'DE', name: 'Alemanha', flag: '🇩🇪', currency: 'EUR', defaultLanguage: 'de' },
  { code: 'IT', name: 'Itália', flag: '🇮🇹', currency: 'EUR', defaultLanguage: 'it' },
  { code: 'NL', name: 'Holanda', flag: '🇳🇱', currency: 'EUR', defaultLanguage: 'nl' },
  { code: 'BE', name: 'Bélgica', flag: '🇧🇪', currency: 'EUR', defaultLanguage: 'nl' },
  { code: 'CH', name: 'Suíça', flag: '🇨🇭', currency: 'CHF', defaultLanguage: 'de' },
  { code: 'AT', name: 'Áustria', flag: '🇦🇹', currency: 'EUR', defaultLanguage: 'de' },
  { code: 'LU', name: 'Luxemburgo', flag: '🇱🇺', currency: 'EUR', defaultLanguage: 'fr' },
  { code: 'IE', name: 'Irlanda', flag: '🇮🇪', currency: 'EUR', defaultLanguage: 'en' },
  { code: 'SE', name: 'Suécia', flag: '🇸🇪', currency: 'SEK', defaultLanguage: 'sv' },
  { code: 'NO', name: 'Noruega', flag: '🇳🇴', currency: 'NOK', defaultLanguage: 'no' },
  { code: 'DK', name: 'Dinamarca', flag: '🇩🇰', currency: 'DKK', defaultLanguage: 'da' },
  { code: 'FI', name: 'Finlândia', flag: '🇫🇮', currency: 'EUR', defaultLanguage: 'fi' },
  { code: 'PL', name: 'Polónia', flag: '🇵🇱', currency: 'PLN', defaultLanguage: 'pl' },
  { code: 'CZ', name: 'República Checa', flag: '🇨🇿', currency: 'CZK', defaultLanguage: 'cs' },
  { code: 'GR', name: 'Grécia', flag: '🇬🇷', currency: 'EUR', defaultLanguage: 'el' },
  { code: 'RO', name: 'Roménia', flag: '🇷🇴', currency: 'RON', defaultLanguage: 'ro' },
  { code: 'HU', name: 'Hungria', flag: '🇭🇺', currency: 'HUF', defaultLanguage: 'hu' },
  { code: 'BG', name: 'Bulgária', flag: '🇧🇬', currency: 'BGN', defaultLanguage: 'bg' },
  { code: 'HR', name: 'Croácia', flag: '🇭🇷', currency: 'EUR', defaultLanguage: 'hr' },
  { code: 'CY', name: 'Chipre', flag: '🇨🇾', currency: 'EUR', defaultLanguage: 'el' },
  { code: 'EE', name: 'Estónia', flag: '🇪🇪', currency: 'EUR', defaultLanguage: 'en' },
  { code: 'LV', name: 'Letónia', flag: '🇱🇻', currency: 'EUR', defaultLanguage: 'en' },
  { code: 'LT', name: 'Lituânia', flag: '🇱🇹', currency: 'EUR', defaultLanguage: 'en' },
  { code: 'MT', name: 'Malta', flag: '🇲🇹', currency: 'EUR', defaultLanguage: 'en' },
  { code: 'SK', name: 'Eslováquia', flag: '🇸🇰', currency: 'EUR', defaultLanguage: 'sk' },
  { code: 'SI', name: 'Eslovénia', flag: '🇸🇮', currency: 'EUR', defaultLanguage: 'sl' },
  { code: 'LI', name: 'Liechtenstein', flag: '🇱🇮', currency: 'CHF', defaultLanguage: 'de' },
  { code: 'IS', name: 'Islândia', flag: '🇮🇸', currency: 'ISK', defaultLanguage: 'is' },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸', currency: 'USD', defaultLanguage: 'en' },
  { code: 'CA', name: 'Canadá', flag: '🇨🇦', currency: 'CAD', defaultLanguage: 'en' },
  { code: 'MX', name: 'México', flag: '🇲🇽', currency: 'MXN', defaultLanguage: 'es' },
  { code: 'AU', name: 'Austrália', flag: '🇦🇺', currency: 'AUD', defaultLanguage: 'en' },
  { code: 'NZ', name: 'Nova Zelândia', flag: '🇳🇿', currency: 'NZD', defaultLanguage: 'en' },
  { code: 'SG', name: 'Singapura', flag: '🇸🇬', currency: 'SGD', defaultLanguage: 'en' },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰', currency: 'HKD', defaultLanguage: 'en' },
  { code: 'JP', name: 'Japão', flag: '🇯🇵', currency: 'JPY', defaultLanguage: 'ja' },
  { code: 'MY', name: 'Malásia', flag: '🇲🇾', currency: 'MYR', defaultLanguage: 'en' },
  { code: 'TH', name: 'Tailândia', flag: '🇹🇭', currency: 'THB', defaultLanguage: 'th' },
  { code: 'IN', name: 'Índia', flag: '🇮🇳', currency: 'INR', defaultLanguage: 'en' },
  { code: 'AE', name: 'Emirados Árabes Unidos', flag: '🇦🇪', currency: 'AED', defaultLanguage: 'en' },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷', currency: 'BRL', defaultLanguage: 'pt' },
  { code: 'ZA', name: 'África do Sul', flag: '🇿🇦', currency: 'ZAR', defaultLanguage: 'en' }
];

export const SUPPORTED_COUNTRY_CODES = STRIPE_SUPPORTED_COUNTRIES.map(c => c.code);

export const isCountrySupported = (countryCode) => {
  return SUPPORTED_COUNTRY_CODES.includes(countryCode?.toUpperCase());
};

export const getCountryData = (countryCode) => {
  return STRIPE_SUPPORTED_COUNTRIES.find(c => c.code === countryCode?.toUpperCase());
};
