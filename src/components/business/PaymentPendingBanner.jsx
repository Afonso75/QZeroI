import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, CreditCard, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAutoTranslate } from '@/hooks/useTranslate';
import { isCapacitorApp } from '@/utils/apiConfig';

export function PaymentPendingBanner({ companyProfile }) {
  const isNativeApp = isCapacitorApp();
  
  const txtPlanCancelled = useAutoTranslate('Plano Empresarial cancelado', 'pt');
  const txtPlanPending = useAutoTranslate('Falta ativar o seu plano!', 'pt');
  const txtReactivateMessage = useAutoTranslate('Reative o seu plano empresarial para continuar a ter acesso a todas as funcionalidades.', 'pt');
  const txtActivateMessage = useAutoTranslate('Ative o plano (€49,99/mês) para desbloquear: Painel, Gestão de Senhas, Reporting e mais.', 'pt');
  const txtReactivate = useAutoTranslate('Reativar Plano', 'pt');
  const txtPayPlan = useAutoTranslate('Ativar Agora', 'pt');
  
  const txtMobileActivateMessage = useAutoTranslate('Para desbloquear tudo, visite waitless-qzero.com', 'pt');
  const txtMobileReactivateMessage = useAutoTranslate('Para reativar, visite waitless-qzero.com', 'pt');

  const navigate = useNavigate();

  if (!companyProfile) {
    return null;
  }

  const isCancelled = companyProfile.status === 'cancelled' || companyProfile.subscriptionStatus === 'canceled';
  const isActive = companyProfile.status === 'active' && !isCancelled;
  
  if (isActive) {
    return null;
  }

  const handlePayNow = () => {
    navigate(createPageUrl('BusinessManageSubscription'));
  };

  return (
    <Alert className="mb-4 border-amber-300 bg-amber-50 shadow-md">
      {isNativeApp ? (
        <Globe className="h-5 w-5 text-amber-600" />
      ) : (
        <AlertCircle className="h-5 w-5 text-amber-600" />
      )}
      <AlertDescription className="flex flex-col gap-2">
        <div>
          <p className="font-semibold text-amber-900">
            {isCancelled ? txtPlanCancelled : txtPlanPending}
          </p>
          <p className="text-sm text-amber-800">
            {isNativeApp 
              ? (isCancelled ? txtMobileReactivateMessage : txtMobileActivateMessage)
              : (isCancelled ? txtReactivateMessage : txtActivateMessage)
            }
          </p>
        </div>
        
        {!isNativeApp && (
          <Button
            onClick={handlePayNow}
            size="sm"
            className="w-fit bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            {isCancelled ? txtReactivate : txtPayPlan}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
