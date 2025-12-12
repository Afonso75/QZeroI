import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Lock, CreditCard, ArrowRight, ArrowLeft, Globe, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAutoTranslate } from '@/hooks/useTranslate';
import { Capacitor } from '@capacitor/core';

export function BusinessFeatureGuard({ 
  companyProfile, 
  hasAccess = false,
  isExpired = false,
  children, 
  feature = 'esta funcionalidade',
  showInline = false,
  isLoading = false
}) {
  const navigate = useNavigate();
  const isNativeApp = Capacitor.isNativePlatform();
  
  const txtVerifyingAccess = useAutoTranslate('A verificar acesso...', 'pt');
  const txtProfileNotFound = useAutoTranslate('Perfil da empresa não encontrado. Por favor, complete o cadastro.', 'pt');
  const txtRestrictedAccess = useAutoTranslate('Acesso Restrito', 'pt');
  const txtToAccess = useAutoTranslate('Para aceder a', 'pt');
  const txtNeedPlan = useAutoTranslate('precisa de ativar o plano empresarial.', 'pt');
  const txtActivatePlan = useAutoTranslate('Ver Planos', 'pt');
  const txtPlanPrice = useAutoTranslate('Ver Planos - €49,99/mês', 'pt');
  const txtNeedActivate = useAutoTranslate('é necessário ativar o plano empresarial com todas as funcionalidades.', 'pt');
  const txtSubscriptionExpired = useAutoTranslate('Subscrição Expirada', 'pt');
  const txtSubscriptionExpiredDesc = useAutoTranslate('A sua subscrição expirou. Renove agora para continuar a usar todas as funcionalidades empresariais.', 'pt');
  const txtRenewNow = useAutoTranslate('Renovar Agora', 'pt');
  const txtBackToHome = useAutoTranslate('Voltar para Início', 'pt');
  const txtExternalPurchaseDesc = useAutoTranslate('Para desbloquear esta funcionalidade, visite o nosso site no seu browser ou computador.', 'pt');
  const txtExternalPurchasePromo = useAutoTranslate('7 dias grátis + €19,99 (1º mês) + €49,99/mês', 'pt');
  const txt7DaysTrial = useAutoTranslate('7 dias grátis para testar', 'pt');
  const txtUnlimitedQueues = useAutoTranslate('Gestão ilimitada de senhas', 'pt');
  const txtCompleteBooking = useAutoTranslate('Sistema completo de marcações', 'pt');
  const txtCancelAnytime = useAutoTranslate('Cancele quando quiser', 'pt');

  // Mostrar loader enquanto está a verificar acesso
  if (isLoading || companyProfile === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">{txtVerifyingAccess}</p>
        </div>
      </div>
    );
  }

  if (!companyProfile) {
    return showInline ? (
      <Alert className="border-red-300 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-900">
          {txtProfileNotFound}
        </AlertDescription>
      </Alert>
    ) : null;
  }

  // 🚫 SUBSCRIÇÃO EXPIRADA - Mostrar banner grande com opção de renovar
  const subscriptionExpired = isExpired || 
    companyProfile.subscriptionStatus === 'expired' || 
    companyProfile.status === 'expired';

  if (subscriptionExpired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-orange-50 p-4">
        <Card className="max-w-lg mx-auto border-2 border-red-300 bg-white shadow-xl mt-8">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
              <CreditCard className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-red-900 mb-3">
              {txtSubscriptionExpired}
            </h2>
            <p className="text-red-700 mb-6 text-lg">
              {txtSubscriptionExpiredDesc}
            </p>
            
            {/* 🍎🤖 B2B COMPLIANCE: Apps nativas NÃO podem ter botões de pagamento NEM preços */}
            {isNativeApp ? (
              <div className="space-y-4">
                <div className="bg-indigo-50 rounded-xl p-4 text-center">
                  <Globe className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                  <p className="text-indigo-700 text-sm mb-2">
                    {txtExternalPurchaseDesc}
                  </p>
                  <p className="text-indigo-900 font-bold text-lg">
                    waitless-qzero.com
                  </p>
                </div>
              </div>
            ) : (
              <Button
                onClick={() => navigate(createPageUrl('BusinessSubscription'), { 
                  state: { isReactivation: true, existingProfileId: companyProfile?.id } 
                })}
                className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 py-6 text-lg"
              >
                <CreditCard className="w-6 h-6 mr-3" />
                {txtRenewNow} - €49,99/mês
                <ArrowRight className="w-6 h-6 ml-3" />
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ✅ CORRIGIDO: Verificar hasAccess (inclui currentPeriodEnd para subscrições canceladas)
  const shouldAllowAccess = hasAccess === true || companyProfile.featuresEnabled === true;
  
  if (shouldAllowAccess) {
    return <>{children}</>;
  }

  const handleActivate = () => {
    navigate(createPageUrl('BusinessSubscription'), { state: { profile: companyProfile } });
  };

  if (showInline) {
    return (
      <Card className="border-amber-300 bg-amber-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0">
              <Lock className="w-6 h-6 text-amber-700" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 mb-1">
                {txtRestrictedAccess}
              </h3>
              <p className="text-sm text-amber-800 mb-3">
                {txtToAccess} {feature}, {txtNeedPlan}
              </p>
              {/* 🍎🤖 B2B COMPLIANCE: Apps nativas NÃO podem ter botões de pagamento */}
              {isNativeApp ? (
                <div className="flex items-center gap-2 text-indigo-700 mt-2">
                  <Globe className="w-4 h-4" />
                  <span className="text-sm font-semibold">waitless-qzero.com</span>
                </div>
              ) : (
                <Button
                  onClick={handleActivate}
                  className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {txtActivatePlan}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleGoHome = () => {
    navigate(createPageUrl('BusinessHome'));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50 to-orange-50 p-4">
      <div className="max-w-md mx-auto">
        <Button
          variant="ghost"
          onClick={handleGoHome}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {txtBackToHome}
        </Button>
        
        <Card className="border-0 shadow-xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-amber-600" />
            </div>
            
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              {txtRestrictedAccess}
            </h2>
            
            <p className="text-slate-600 mb-4">
              {txtToAccess} <strong>{feature}</strong>, {txtNeedActivate}
            </p>

            {/* 🍎🤖 B2B COMPLIANCE: Apps nativas NÃO podem ter botões de pagamento NEM preços */}
            {isNativeApp ? (
              <div className="space-y-4">
                <div className="bg-indigo-50 rounded-xl p-4 text-center">
                  <Globe className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                  <p className="text-indigo-700 text-sm mb-2">
                    {txtExternalPurchaseDesc}
                  </p>
                  <p className="text-indigo-900 font-bold text-lg">
                    waitless-qzero.com
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2 text-left mb-4">
                  {[txt7DaysTrial, txtUnlimitedQueues, txtCompleteBooking, txtCancelAnytime].map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span className="text-slate-700 text-sm">{feat}</span>
                    </div>
                  ))}
                </div>
                
                <Button
                  onClick={handleActivate}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {txtActivatePlan}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
            
            <Button
              variant="ghost"
              onClick={handleGoHome}
              className="w-full mt-3 text-slate-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {txtBackToHome}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
