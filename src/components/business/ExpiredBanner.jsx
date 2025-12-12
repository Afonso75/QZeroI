import { Button } from '@/components/ui/button';
import { CreditCard, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Capacitor } from '@capacitor/core';
import { useAutoTranslate } from '@/hooks/useTranslate';

export function ExpiredBanner({ companyProfileId }) {
  const navigate = useNavigate();
  const isNativeApp = Capacitor.isNativePlatform();
  
  const txtExpired = useAutoTranslate('Subscrição Expirada', 'pt');
  const txtRenewNow = useAutoTranslate('Renovar Agora', 'pt');
  const txtVisitWebsite = useAutoTranslate('Renove em waitless-qzero.com', 'pt');

  return (
    <div className="bg-red-600 text-white p-4 text-center">
      <p className="font-bold text-lg mb-2">{txtExpired}</p>
      
      {/* 🍎🤖 B2B COMPLIANCE: Apps nativas NÃO podem ter botões de pagamento */}
      {isNativeApp ? (
        <div className="flex items-center justify-center gap-2 text-white/90">
          <Globe className="w-5 h-5" />
          <span className="font-semibold">{txtVisitWebsite}</span>
        </div>
      ) : (
        <Button
          onClick={() => navigate(createPageUrl('BusinessSubscription'), { 
            state: { isReactivation: true, existingProfileId: companyProfileId } 
          })}
          className="bg-white text-red-600 hover:bg-red-50 font-bold"
        >
          <CreditCard className="w-5 h-5 mr-2" />
          {txtRenewNow} - €49,99/mês
        </Button>
      )}
    </div>
  );
}
