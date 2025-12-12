import { AlertTriangle, Globe } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { isCountrySupported } from '@/constants/stripeCountries';
import { useAutoTranslate } from '@/hooks/useTranslate';

export function CountryNotSupportedBanner({ userCountry }) {
  const txtPaymentsBlocked = useAutoTranslate('Pagamentos Bloqueados', 'pt');
  const txtCountryNotSupported = useAutoTranslate('O seu país ainda não é suportado para pagamentos. Estamos a trabalhar para adicionar mais países em breve.', 'pt');
  
  if (!userCountry || isCountrySupported(userCountry)) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        <Globe className="w-4 h-4" />
        {txtPaymentsBlocked}
      </AlertTitle>
      <AlertDescription>
        {txtCountryNotSupported}
      </AlertDescription>
    </Alert>
  );
}
