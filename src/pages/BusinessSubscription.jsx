import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { safeFetch, isCapacitorApp, getBaseUrl } from "@/utils/apiConfig";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  CheckCircle2,
  Building2,
  Users,
  BarChart3,
  Calendar,
  Clock,
  Shield,
  Zap,
  ArrowRight,
  Loader2,
  ArrowLeft,
  CreditCard,
  AlertCircle,
  Mail,
  MapPin,
  Phone,
  ExternalLink,
  Globe
} from "lucide-react";
import { toast } from "sonner";
import { companyProfileStorage } from '@/models/companyProfile';
import { stripeService } from '@/services/stripeService';
import { businessAccessService } from '@/services/businessAccessService';
import { useAutoTranslate } from '@/hooks/useTranslate';
import { navigateBackOrFallback } from '@/hooks/useNavigateBack';
import { Capacitor } from '@capacitor/core';

const EXTERNAL_SUBSCRIPTION_URL = 'https://waitless-qzero.com';

export default function BusinessSubscriptionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [companyProfile, setCompanyProfile] = useState(null);
  const [isEligibleForTrial, setIsEligibleForTrial] = useState(null);
  
  const isNativeApp = isCapacitorApp();
  const platform = Capacitor.getPlatform();

  const txtProfileNotFound = useAutoTranslate('Perfil da empresa não encontrado', 'pt');
  const txtDemoSimulating = useAutoTranslate('Modo Demo: Simulando pagamento Stripe...', 'pt');
  const txtDemoDescription = useAutoTranslate('Em produção, você seria redirecionado para o Stripe Checkout.', 'pt');
  const txtErrorCreatingSession = useAutoTranslate('Erro ao criar sessão de pagamento', 'pt');
  const txtCheckConnection = useAutoTranslate('Por favor, verifique sua conexão e tente novamente em alguns segundos.', 'pt');
  const txtErrorProcessing = useAutoTranslate('Erro ao processar pagamento', 'pt');
  const txtTryAgain = useAutoTranslate('Tentar Novamente', 'pt');
  const txtQueueManagement = useAutoTranslate('Gestão de Filas', 'pt');
  const txtQueueDesc = useAutoTranslate('Crie e gira múltiplas filas de atendimento simultaneamente', 'pt');
  const txtAppointmentSystem = useAutoTranslate('Sistema de Marcações', 'pt');
  const txtAppointmentDesc = useAutoTranslate('Permita aos clientes agendar serviços com horários personalizados', 'pt');
  const txtAdvancedAnalytics = useAutoTranslate('Análise Avançada', 'pt');
  const txtAnalyticsDesc = useAutoTranslate('Estatísticas detalhadas e previsões com IA para otimizar o atendimento', 'pt');
  const txtRealTime = useAutoTranslate('Tempo Real', 'pt');
  const txtRealTimeDesc = useAutoTranslate('Atualizações instantâneas e notificações automáticas para clientes', 'pt');
  const txtPrioritySupport = useAutoTranslate('Suporte Prioritário', 'pt');
  const txtSupportDesc = useAutoTranslate('Atendimento dedicado para resolver qualquer questão rapidamente', 'pt');
  const txtUnlimited = useAutoTranslate('Sem Limites', 'pt');
  const txtUnlimitedDesc = useAutoTranslate('Atendimentos, filas e marcações ilimitadas', 'pt');
  const txtLoading = useAutoTranslate('A carregar...', 'pt');
  const txtBack = useAutoTranslate('Anterior', 'pt');
  const txtReactivation = useAutoTranslate('Reativação de Plano', 'pt');
  const txtStep2of2 = useAutoTranslate('Passo 2 de 2', 'pt');
  const txtReactivatePlan = useAutoTranslate('Reativar Plano Empresarial', 'pt');
  const txtActivatePlan = useAutoTranslate('Ative o Plano Empresarial', 'pt');
  const txtReactivateText = useAutoTranslate('Vamos criar uma nova subscrição para a sua empresa', 'pt');
  const txtActivateText = useAutoTranslate('Após o pagamento, sua conta empresarial será ativada com todas as funcionalidades', 'pt');
  const txtProfileSummary = useAutoTranslate('Resumo do Perfil:', 'pt');
  const txtFreeTrialBadge = useAutoTranslate('🎉 7 Dias Totalmente GRÁTIS para Testar', 'pt');
  const txtMonthlyPlan = useAutoTranslate('💼 Plano Empresarial Mensal', 'pt');
  const txtPerMonth = useAutoTranslate('/mês', 'pt');
  const txtMonthlyBilling = useAutoTranslate('Faturação mensal • Cancele quando quiser', 'pt');
  const txtNoCostsNow = useAutoTranslate('✅ Sem custos agora! Teste durante 7 dias completamente grátis.', 'pt');
  const txtPaymentAfter7Days = useAutoTranslate('O pagamento só será processado após 7 dias. Cancele a qualquer momento durante o período de teste sem qualquer custo.', 'pt');
  const txtImmediateCharge = useAutoTranslate('Cobrança imediata', 'pt');
  const txtPaymentProcessedNow = useAutoTranslate('O pagamento será processado agora.', 'pt');
  const txtAlreadyUsedTrial = useAutoTranslate('Você já utilizou o período de teste gratuito anteriormente. A subscrição será ativada imediatamente após o pagamento.', 'pt');
  const txtFeature1 = useAutoTranslate('Gestão de filas ilimitadas', 'pt');
  const txtFeature2 = useAutoTranslate('Sistema completo de marcações', 'pt');
  const txtFeature3 = useAutoTranslate('Horários personalizados e pausas', 'pt');
  const txtFeature4 = useAutoTranslate('Bloqueio de datas (férias/feriados)', 'pt');
  const txtFeature5 = useAutoTranslate('Análise e estatísticas avançadas', 'pt');
  const txtFeature6 = useAutoTranslate('Notificações automáticas', 'pt');
  const txtFeature7 = useAutoTranslate('Painel de controlo completo', 'pt');
  const txtFeature8 = useAutoTranslate('Suporte prioritário', 'pt');
  const txtFeature9 = useAutoTranslate('Sem limite de atendimentos', 'pt');
  const txtProcessing = useAutoTranslate('A processar...', 'pt');
  const txtPayBusinessPlan = useAutoTranslate('Pagar Plano Empresarial', 'pt');
  const txtPayShort = useAutoTranslate('Pagar', 'pt');
  const txtSecurePayment = useAutoTranslate('Pagamento seguro via Stripe • Sem compromissos', 'pt');
  const txtFreeTrialPeriod = useAutoTranslate('Período de Teste Gratuito:', 'pt');
  const txtFreeTrialDesc = useAutoTranslate('Os primeiros 7 dias são completamente grátis! Pode cancelar a qualquer momento durante o período de teste sem qualquer cobrança. Após os 7 dias, será cobrado €49,99/mês automaticamente.', 'pt');
  const txtReactivationAlert = useAutoTranslate('Reativação de Plano', 'pt');
  const txtReactivationAlertDesc = useAutoTranslate('Está a reativar o plano para a empresa', 'pt');
  const txtDataKept = useAutoTranslate('Os dados da sua empresa serão mantidos - apenas a subscrição será renovada.', 'pt');
  const txtActiveSubscription = useAutoTranslate('Subscrição Ativa!', 'pt');
  const txtActiveSubscriptionDesc = useAutoTranslate('Você já tem uma subscrição empresarial ativa. Esta página está disponível apenas para teste do fluxo de pagamento.', 'pt');
  const txtSubscriptionActivatedSuccess = useAutoTranslate('Subscrição ativada com sucesso!', 'pt');
  const txtFAQ = useAutoTranslate('Perguntas Frequentes', 'pt');
  const txtFAQ1Question = useAutoTranslate('Posso cancelar a qualquer momento?', 'pt');
  const txtFAQ1Answer = useAutoTranslate('Sim, pode cancelar a subscrição a qualquer momento sem penalizações. O acesso permanece ativo até ao final do período pago.', 'pt');
  const txtFAQ2Question = useAutoTranslate('Há limite de atendimentos?', 'pt');
  const txtFAQ2Answer = useAutoTranslate('Não, não há qualquer limite. Pode ter quantas filas, marcações e atendimentos precisar.', 'pt');
  const txtFAQ3Question = useAutoTranslate('Como funciona o pagamento?', 'pt');
  const txtFAQ3Answer = useAutoTranslate('O pagamento é processado mensalmente de forma automática via Stripe. Pode atualizar o método de pagamento a qualquer momento na área de gestão da subscrição.', 'pt');
  const txtFAQ4Question = useAutoTranslate('O que acontece se o pagamento falhar?', 'pt');
  const txtFAQ4Answer = useAutoTranslate('Se o pagamento falhar, receberá notificações para atualizar o método de pagamento. As funcionalidades empresariais ficam bloqueadas até que o pagamento seja regularizado.', 'pt');
  
  const txtExternalPurchaseTitle = useAutoTranslate('Quase lá!', 'pt');
  const txtExternalPurchaseDesc = useAutoTranslate('Para ativar todas as funcionalidades, visite o nosso site no seu browser ou computador.', 'pt');
  const txtExternalPurchaseButton = useAutoTranslate('Ir ao Site', 'pt');
  const txtExternalPurchaseNote = useAutoTranslate('Depois de comprar lá, volte aqui e faça login. Tudo estará desbloqueado!', 'pt');
  const txtB2BNote = useAutoTranslate('A compra é feita no site waitless-qzero.com para maior segurança e comodidade.', 'pt');
  const txtExternalPurchasePromo = useAutoTranslate('7 dias grátis + €19,99 (1º mês) + €49,99/mês', 'pt');
  const txtExploreFirst = useAutoTranslate('Explorar Primeiro', 'pt');
  const txtExploreFirstDesc = useAutoTranslate('Pode explorar o painel empresarial sem pagar agora. Algumas funcionalidades terão acesso restrito.', 'pt');
  
  const txtCatHealth = useAutoTranslate('Saúde', 'pt');
  const txtCatFinance = useAutoTranslate('Financeiro', 'pt');
  const txtCatGovernment = useAutoTranslate('Governo', 'pt');
  const txtCatRestaurant = useAutoTranslate('Restauração', 'pt');
  const txtCatBeauty = useAutoTranslate('Beleza', 'pt');
  const txtCatRetail = useAutoTranslate('Retalho', 'pt');
  const txtCatOther = useAutoTranslate('Outros', 'pt');
  
  const translatedCategories = {
    'saude': txtCatHealth,
    'financeiro': txtCatFinance,
    'governo': txtCatGovernment,
    'restauracao': txtCatRestaurant,
    'beleza': txtCatBeauty,
    'retalho': txtCatRetail,
    'outros': txtCatOther
  };

  useEffect(() => {
    base44.auth.me().then(async (userData) => {
      setUser(userData);
      
      // ✅ REATIVAÇÃO: Usar perfil existente se fornecido
      let profile = null;
      
      if (location.state?.existingProfileId) {
        console.log('🔄 Reativação: Usando perfil existente:', location.state.existingProfileId);
        // Buscar perfil existente por ID
        const { response, data } = await safeFetch(`/api/company-profiles/${location.state.existingProfileId}`);
        if (response.ok) {
          profile = data;
        }
      } else {
        // Buscar perfil normal
        profile = location.state?.profile || await companyProfileStorage.getByUserId(userData.id);
      }
      
      if (!profile) {
        navigate(createPageUrl('BusinessProfileSetup'));
        return;
      }
      
      // Verificar se já tem subscrição ativa (exceto se for reativação)
      if (!location.state?.isReactivation) {
        const access = await businessAccessService.getUserBusinessAccess(userData);
        
        if (access.hasAccess) {
          console.log('✅ Subscrição ativa - redirecionando para BusinessHome');
          navigate(createPageUrl('BusinessHome'), { replace: true });
          return;
        }
      }
      
      setCompanyProfile(profile);
      
      // 🎁 Verificar se utilizador é elegível para trial de 2 dias
      try {
        const profileIdParam = profile?.id ? `&profileId=${encodeURIComponent(profile.id)}` : '';
        const { response, data } = await safeFetch(`/api/check-trial-eligibility?email=${encodeURIComponent(userData.email)}${profileIdParam}`);
        if (response.ok) {
          const { isEligibleForTrial: eligible } = data || {};
          setIsEligibleForTrial(eligible);
          console.log(`🎁 Trial eligibility: ${eligible ? 'ELIGIBLE (first time)' : 'NOT ELIGIBLE (already used)'}`);
        } else {
          // Em caso de erro, assumir que NÃO é elegível por segurança
          setIsEligibleForTrial(false);
        }
      } catch (error) {
        console.error('❌ Error checking trial eligibility:', error);
        setIsEligibleForTrial(false);
      }
    }).catch(() => {
      base44.auth.redirectToLogin();
    });
  }, [navigate, location]);

  // ✅ ABRIR SITE EXTERNO (iOS/Android - B2B)
  const handleExternalPurchase = () => {
    const url = EXTERNAL_SUBSCRIPTION_URL;
    console.log('🌐 Abrindo site externo para compra B2B:', url);
    
    if (Capacitor.isNativePlatform()) {
      window.open(url, '_system');
    } else {
      window.open(url, '_blank');
    }
  };

  // ✅ PAGAMENTO VIA STRIPE (Web browser)
  const handleStripePayment = async () => {
    if (!companyProfile) {
      toast.error(txtProfileNotFound);
      return;
    }

    setIsProcessingPayment(true);
    
    try {
      const baseUrl = getBaseUrl();
      console.log('💳 Stripe checkout - Base URL:', baseUrl);
      
      const data = await stripeService.createSubscriptionCheckout(
        companyProfile.id,
        companyProfile.companyEmail,
        `${baseUrl}${createPageUrl('PaymentSuccess')}?session_id={CHECKOUT_SESSION_ID}`,
        `${baseUrl}${createPageUrl('BusinessSubscription')}`
      );
      
      if (data.isMock) {
        const profileId = companyProfile.id;
        
        toast.info(txtDemoSimulating, {
          description: txtDemoDescription,
          duration: 3000
        });
        
        setTimeout(() => {
          console.log('💳 Modo Demo: Redirecionando para confirmação de pagamento');
          const mockSessionId = `mock_session_${Date.now()}`;
          navigate(createPageUrl('PaymentSuccess') + `?session_id=${mockSessionId}&profile_id=${profileId}`);
        }, 2000);
      } else if (data.url) {
        await companyProfileStorage.update(companyProfile.id, {
          paymentRetry: {
            failureCount: 0,
            lastFailureAt: null,
            lastFailureReason: null,
            canRetry: true
          }
        });
        
        window.location.href = data.url;
      } else {
        console.error('❌ Erro: Nenhuma URL de checkout retornada pelo backend');
        
        const updatedProfile = await companyProfileStorage.update(companyProfile.id, {
          paymentRetry: {
            failureCount: (companyProfile.paymentRetry?.failureCount || 0) + 1,
            lastFailureAt: new Date().toISOString(),
            lastFailureReason: 'No checkout URL returned from backend',
            canRetry: true
          }
        });
        
        setCompanyProfile(updatedProfile);
        
        toast.error(txtErrorCreatingSession, {
          description: txtCheckConnection,
          duration: 5000
        });
      }
    } catch (error) {
      console.error('❌ Payment error:', error);
      
      const updatedProfile = await companyProfileStorage.update(companyProfile.id, {
        paymentRetry: {
          failureCount: (companyProfile.paymentRetry?.failureCount || 0) + 1,
          lastFailureAt: new Date().toISOString(),
          lastFailureReason: error.message || 'Unknown payment error',
          canRetry: true
        }
      });
      
      setCompanyProfile(updatedProfile);
      
      toast.error(txtErrorProcessing, {
        description: error.message || txtCheckConnection,
        duration: 5000,
        action: {
          label: txtTryAgain,
          onClick: () => handlePayNow()
        }
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // ✅ HANDLER PRINCIPAL - Stripe para web (iOS/Android usa tela externa)
  const handlePayNow = async () => {
    // Web: Usar Stripe
    console.log('🌐 Web browser detectado - usando Stripe');
    await handleStripePayment();
  };

  const features = [
    {
      icon: Users,
      title: txtQueueManagement,
      description: txtQueueDesc
    },
    {
      icon: Calendar,
      title: txtAppointmentSystem,
      description: txtAppointmentDesc
    },
    {
      icon: BarChart3,
      title: txtAdvancedAnalytics,
      description: txtAnalyticsDesc
    },
    {
      icon: Clock,
      title: txtRealTime,
      description: txtRealTimeDesc
    },
    {
      icon: Shield,
      title: txtPrioritySupport,
      description: txtSupportDesc
    },
    {
      icon: Zap,
      title: txtUnlimited,
      description: txtUnlimitedDesc
    }
  ];

  if (!user || !companyProfile) {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-slate-600">{txtLoading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50">
      <div className="max-w-6xl mx-auto px-4 py-4 sm:py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('BusinessHome'))}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {txtBack}
          </Button>
        </div>

        <div className="text-center mb-6 sm:mb-8">
          <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 mb-3 sm:mb-4">
            <Building2 className="w-3 h-3 mr-1" />
            {location.state?.isReactivation ? txtReactivation : txtStep2of2}
          </Badge>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-2 px-2">
            {location.state?.isReactivation ? txtReactivatePlan : txtActivatePlan}
          </h1>
          <p className="text-base sm:text-lg text-slate-600 px-2">
            {location.state?.isReactivation 
              ? `${txtReactivateText} "${companyProfile?.name}"`
              : txtActivateText
            }
          </p>
        </div>

        {location.state?.isReactivation && (
          <Alert className="max-w-3xl mx-auto mb-8 border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <strong>{txtReactivationAlert}</strong><br />
              {txtReactivationAlertDesc} <strong>{companyProfile?.name}</strong>. 
              {txtDataKept}
            </AlertDescription>
          </Alert>
        )}

        {companyProfile?.status === 'active' && !location.state?.isReactivation && (
          <Alert className="max-w-3xl mx-auto mb-8 border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900">
              <strong>{txtActiveSubscription}</strong> {txtActiveSubscriptionDesc}
            </AlertDescription>
          </Alert>
        )}

        <Alert className="max-w-3xl mx-auto mb-6 sm:mb-8 border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
          <AlertDescription className="text-blue-900">
            <strong className="text-sm sm:text-base">{txtProfileSummary}</strong>
            <div className="mt-2 space-y-2 text-xs sm:text-sm">
              <div className="flex items-start gap-2">
                <Building2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="break-words"><strong>{companyProfile.companyName}</strong> - {translatedCategories[companyProfile.companyCategory] || companyProfile.companyCategory}</span>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="break-all overflow-wrap-anywhere">{companyProfile.companyEmail}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="break-words">{companyProfile.companyAddress}, {companyProfile.companyCity}</span>
              </div>
              {companyProfile.companyPhone && (
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="break-words">{companyProfile.companyPhone}</span>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>

        {/* ============================================ */}
        {/* iOS/Android: Tela Informativa (B2B) - Sem botão externo */}
        {/* ============================================ */}
        {isNativeApp ? (
          <Card className="border-0 shadow-2xl mb-8 sm:mb-12 overflow-hidden max-w-2xl mx-auto">
            <div className="h-2 bg-gradient-to-r from-indigo-600 to-purple-600" />
            <CardContent className="p-6 sm:p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Globe className="w-8 h-8 text-white" />
                </div>
                
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                  {txtExternalPurchaseTitle}
                </h2>
                
                <p className="text-slate-600 mb-4">
                  {txtExternalPurchaseDesc}
                </p>
                
                <div className="inline-block px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-semibold rounded-full">
                  {txtExternalPurchasePromo}
                </div>
              </div>

              <div className="bg-indigo-50 rounded-xl p-4 mb-6 text-center">
                <p className="text-indigo-900 font-semibold mb-1">
                  Visite no seu browser:
                </p>
                <p className="text-indigo-700 text-lg font-bold">
                  waitless-qzero.com
                </p>
              </div>

              <div className="space-y-3 mb-6">
                {[
                  txtFeature1,
                  txtFeature2,
                  txtFeature5,
                  txtFeature6,
                  txtFeature9
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-slate-700 text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <Alert className="border-blue-200 bg-blue-50">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900 text-sm">
                  <strong>{txtB2BNote}</strong>
                  <br /><br />
                  {txtExternalPurchaseNote}
                </AlertDescription>
              </Alert>

              {/* 🔓 BOTÃO EXPLORAR PRIMEIRO - Apps nativas também podem explorar */}
              <div className="mt-6 pt-4 border-t-2 border-dashed border-indigo-200">
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200">
                  <p className="text-center text-sm text-indigo-700 font-medium mb-3">
                    {txtExploreFirstDesc}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => navigate(createPageUrl('BusinessHome'))}
                    className="w-full border-2 border-indigo-400 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-500 font-semibold py-5 text-base"
                  >
                    {txtExploreFirst}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>
              
              <div className="mt-4 text-center text-xs text-slate-500">
                <p>Cancelamento e gestão da subscrição: waitless-qzero.com</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* ============================================ */
          /* Web: Fluxo Stripe Normal */
          /* ============================================ */
          <Card className="border-0 shadow-2xl mb-8 sm:mb-12 overflow-hidden max-w-2xl mx-auto">
            <div className="h-2 bg-gradient-to-r from-indigo-600 to-purple-600" />
            <CardContent className="p-4 sm:p-6 md:p-8">
              <div className="text-center mb-6 sm:mb-8">
                {isEligibleForTrial && (
                  <div className="inline-block px-3 sm:px-4 py-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs sm:text-sm font-semibold rounded-full mb-3">
                    {txtFreeTrialBadge}
                  </div>
                )}
                {isEligibleForTrial === false && (
                  <div className="inline-block px-3 sm:px-4 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs sm:text-sm font-semibold rounded-full mb-3">
                    {txtMonthlyPlan}
                  </div>
                )}
                {isEligibleForTrial ? (
                  <div className="mb-2">
                    <div className="flex items-center justify-center gap-3 mb-1">
                      <span className="text-2xl sm:text-3xl text-slate-400 line-through font-medium">
                        €49,99
                      </span>
                      <span className="text-4xl sm:text-5xl md:text-6xl font-bold text-green-600">
                        €19,99
                      </span>
                    </div>
                    <p className="text-sm sm:text-base text-slate-600 font-medium">
                      1º mês com <span className="text-green-600 font-bold">60% desconto</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Depois €49,99{txtPerMonth}
                    </p>
                  </div>
                ) : (
                  <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-slate-900 mb-2">
                    €49,99
                    <span className="text-xl sm:text-2xl text-slate-600 font-normal">{txtPerMonth}</span>
                  </div>
                )}
                <p className="text-sm sm:text-base text-slate-600">{txtMonthlyBilling}</p>
                
                {isEligibleForTrial && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800 font-semibold">
                      {txtNoCostsNow}
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      {txtPaymentAfter7Days}
                    </p>
                  </div>
                )}
                
                {isEligibleForTrial === false && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 font-semibold">
                      💳 <strong>{txtImmediateCharge}</strong> - {txtPaymentProcessedNow}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      {txtAlreadyUsedTrial}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4 mb-8">
                {[
                  txtFeature1,
                  txtFeature2,
                  txtFeature3,
                  txtFeature4,
                  txtFeature5,
                  txtFeature6,
                  txtFeature7,
                  txtFeature8,
                  txtFeature9
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">{feature}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={handlePayNow}
                disabled={isProcessingPayment}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 py-4 sm:py-6 text-sm sm:text-base md:text-lg"
              >
                {isProcessingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                    <span>{txtProcessing}</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    {isEligibleForTrial ? (
                      <>
                        <span className="hidden sm:inline">{txtPayBusinessPlan} - €19,99 (1º mês)</span>
                        <span className="sm:hidden">{txtPayShort} €19,99</span>
                      </>
                    ) : (
                      <>
                        <span className="hidden sm:inline">{txtPayBusinessPlan} - €49,99{txtPerMonth}</span>
                        <span className="sm:hidden">{txtPayShort} €49,99{txtPerMonth}</span>
                      </>
                    )}
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                  </>
                )}
              </Button>

              <p className="text-center text-sm text-slate-500 mt-4">
                {txtSecurePayment}
              </p>

              {/* 🔓 BOTÃO EXPLORAR PRIMEIRO - Permite ir ao BusinessHome sem pagar */}
              <div className="mt-6 pt-4 border-t-2 border-dashed border-indigo-200">
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200">
                  <p className="text-center text-sm text-indigo-700 font-medium mb-3">
                    {txtExploreFirstDesc}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => navigate(createPageUrl('BusinessHome'))}
                    className="w-full border-2 border-indigo-400 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-500 font-semibold py-5 text-base"
                  >
                    {txtExploreFirst}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>
              
              <Alert className="mt-6 border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-900 text-sm">
                  <strong>{txtFreeTrialPeriod}</strong> {txtFreeTrialDesc}
                </AlertDescription>
              </Alert>

              <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h4 className="font-semibold text-slate-900 mb-3 text-sm">
                  Termos da Subscrição (Stripe)
                </h4>
                <div className="text-xs text-slate-600 space-y-2">
                  <p><strong>Plano:</strong> Plano Empresarial QZero</p>
                  <p><strong>Duração:</strong> Mensal (renovação automática)</p>
                  <p><strong>Preço:</strong> €49,99/mês</p>
                  <p className="mt-3">O pagamento é processado de forma segura através do Stripe.</p>
                  <p>A subscrição renova-se automaticamente a menos que seja cancelada antes do fim do período atual.</p>
                  <p>Pode cancelar a qualquer momento através do seu Perfil {">"} Gerir Subscrição.</p>
                </div>
                
                <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap gap-3 text-xs">
                  <a 
                    href="/privacy-policy" 
                    target="_blank"
                    className="text-indigo-600 hover:text-indigo-700 underline"
                  >
                    Política de Privacidade
                  </a>
                  <span className="text-slate-300">|</span>
                  <a 
                    href="/terms-of-use" 
                    target="_blank"
                    className="text-indigo-600 hover:text-indigo-700 underline"
                  >
                    Termos de Utilização
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {features.map((feature, idx) => (
            <Card key={idx} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-lg text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600 text-sm">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-0 shadow-xl max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle>{txtFAQ}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">{txtFAQ1Question}</h4>
              <p className="text-slate-600">{txtFAQ1Answer}</p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">{txtFAQ2Question}</h4>
              <p className="text-slate-600">{txtFAQ2Answer}</p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">{txtFAQ3Question}</h4>
              <p className="text-slate-600">{txtFAQ3Answer}</p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">{txtFAQ4Question}</h4>
              <p className="text-slate-600">{txtFAQ4Answer}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}