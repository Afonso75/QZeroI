import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loader2, AlertCircle, CreditCard, Edit, ArrowRight } from "lucide-react";
import { CompanyProfileForm } from '@/components/business/CompanyProfileForm';
import { companyProfileStorage } from '@/models/companyProfile';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAutoTranslate } from "@/hooks/useTranslate";

export default function BusinessProfileSetupPage() {
  const txtLoading = useAutoTranslate('A carregar...', 'pt');
  const txtPaymentError = useAutoTranslate('Erro ao Processar Pagamento', 'pt');
  const txtPaymentErrorDesc = useAutoTranslate('Ocorreu um problema ao processar seu pagamento. Por favor, escolha uma opção abaixo.', 'pt');
  const txtProfileFound = useAutoTranslate('Perfil encontrado:', 'pt');
  const txtEmail = useAutoTranslate('Email:', 'pt');
  const txtStatus = useAutoTranslate('Status:', 'pt');
  const txtAwaitingPayment = useAutoTranslate('Aguardando pagamento', 'pt');
  const txtFailedAttempts = useAutoTranslate('Tentativas falhadas:', 'pt');
  const txtLastError = useAutoTranslate('Último erro:', 'pt');
  const txtRetryPayment = useAutoTranslate('Tentar Pagamento Novamente', 'pt');
  const txtEditProfile = useAutoTranslate('Editar Perfil da Empresa', 'pt');
  const txtTipPersist = useAutoTranslate('Dica: Se o problema persistir, verifique se os dados da empresa estão corretos ou entre em contato com o suporte.', 'pt');
  const txtAutoHide = useAutoTranslate('Esta mensagem desaparecerá automaticamente após 5 minutos ou quando tentar novamente.', 'pt');
  const txtCreateBusinessAccount = useAutoTranslate('Criar Conta Empresarial', 'pt');
  const txtStep1 = useAutoTranslate('Passo 1 de 2: Preencha o perfil da sua empresa', 'pt');
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingProfile, setPendingProfile] = useState(null);
  const [showPaymentErrorRecovery, setShowPaymentErrorRecovery] = useState(false);

  useEffect(() => {
    base44.auth.me().then(async (userData) => {
      setUser(userData);
      
      const existingProfile = await companyProfileStorage.getByUserId(userData.id);
      
      if (existingProfile) {
        console.log('🏢 Perfil existente encontrado:', {
          id: existingProfile.id,
          name: existingProfile.companyName,
          status: existingProfile.status
        });
        
        if (existingProfile.status === 'active') {
          console.log('✅ Perfil ativo - redirecionando para Dashboard');
          navigate(createPageUrl('BusinessDashboard'));
          return;
        }
        
        if (existingProfile.status === 'pending_payment') {
          const { paymentRetry } = existingProfile;
          
          if (paymentRetry && paymentRetry.lastFailureAt && paymentRetry.failureCount > 0) {
            const lastFailureTime = new Date(paymentRetry.lastFailureAt).getTime();
            const timeSinceError = Date.now() - lastFailureTime;
            const minutesSinceError = Math.floor(timeSinceError / 60000);
            
            if (timeSinceError < 300000) {
              console.warn('⚠️ Erro de pagamento persistente detectado no profile');
              console.warn(`📊 Falhas: ${paymentRetry.failureCount}`);
              console.warn(`⏱️ Última falha: há ${minutesSinceError} minuto(s)`);
              console.warn(`❌ Razão: ${paymentRetry.lastFailureReason}`);
              
              setPendingProfile(existingProfile);
              setShowPaymentErrorRecovery(true);
              setLoading(false);
              return;
            } else {
              console.log(`🔄 Falha antiga (${minutesSinceError} min) - limpando e permitindo retry`);
              await companyProfileStorage.update(existingProfile.id, {
                paymentRetry: {
                  failureCount: 0,
                  lastFailureAt: null,
                  lastFailureReason: null,
                  canRetry: true
                }
              });
            }
          }
          
          console.log('⏳ Perfil pendente de pagamento - redirecionando para Subscrição');
          navigate(createPageUrl('BusinessSubscription'), { state: { profile: existingProfile } });
          return;
        }
      }
      
      console.log('📝 Nenhum perfil encontrado - mostrando formulário');
      setLoading(false);
    }).catch(() => {
      base44.auth.redirectToLogin();
    });
  }, [navigate]);

  const handleComplete = (profile) => {
    navigate(createPageUrl('BusinessSubscription'), { state: { profile } });
  };

  const handleRetryPayment = async () => {
    if (pendingProfile) {
      await companyProfileStorage.update(pendingProfile.id, {
        paymentRetry: {
          failureCount: 0,
          lastFailureAt: null,
          lastFailureReason: null,
          canRetry: true
        }
      });
      
      navigate(createPageUrl('BusinessSubscription'), { state: { profile: pendingProfile } });
    }
  };

  const handleEditProfile = () => {
    if (pendingProfile) {
      setPendingProfile(null);
      setShowPaymentErrorRecovery(false);
      setLoading(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-slate-600 text-lg">{txtLoading}</p>
        </div>
      </div>
    );
  }

  if (showPaymentErrorRecovery && pendingProfile) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-blue-50 py-4 sm:py-8 px-4 safe-area-inset">
        <div className="max-w-lg mx-auto">
          <Card className="border-amber-300 shadow-xl">
            <CardContent className="p-5 sm:p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-amber-600" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                  {txtPaymentError}
                </h1>
                <p className="text-sm sm:text-base text-slate-600">
                  {txtPaymentErrorDesc}
                </p>
              </div>

              <Alert className="mb-6 border-blue-300 bg-blue-50">
                <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <AlertDescription className="text-blue-900 text-sm">
                  <strong>{txtProfileFound}</strong> {pendingProfile.companyName}<br />
                  <strong>{txtEmail}</strong> {pendingProfile.companyEmail}<br />
                  <strong>{txtStatus}</strong> {txtAwaitingPayment}<br />
                  {pendingProfile.paymentRetry?.failureCount > 0 && (
                    <>
                      <strong>{txtFailedAttempts}</strong> {pendingProfile.paymentRetry.failureCount}<br />
                      <strong>{txtLastError}</strong> {pendingProfile.paymentRetry.lastFailureReason}
                    </>
                  )}
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Button
                  onClick={handleRetryPayment}
                  className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 h-14 text-base"
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  {txtRetryPayment}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>

                <Button
                  onClick={handleEditProfile}
                  variant="outline"
                  className="w-full h-14 text-base border-slate-300"
                >
                  <Edit className="w-5 h-5 mr-2" />
                  {txtEditProfile}
                </Button>
              </div>

              <p className="text-xs sm:text-sm text-slate-500 text-center mt-6">
                {pendingProfile.paymentRetry?.failureCount > 1 && (
                  <>💡 {txtTipPersist}<br /></>
                )}
                {txtAutoHide}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 py-4 sm:py-8 px-3 sm:px-4 safe-area-inset">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 mb-2">
            {txtCreateBusinessAccount}
          </h1>
          <p className="text-sm sm:text-lg text-slate-600">
            {txtStep1}
          </p>
        </div>
        
        <CompanyProfileForm onComplete={handleComplete} />
      </div>
    </div>
  );
}
