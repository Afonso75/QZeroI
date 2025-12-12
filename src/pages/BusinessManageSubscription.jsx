import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { safeFetch } from "@/utils/apiConfig";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  CheckCircle2, 
  Building2, 
  Calendar,
  CreditCard,
  AlertCircle,
  Crown,
  ArrowLeft,
  AlertTriangle,
  XCircle,
  Globe
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/useConfirm";
import { useAutoTranslate } from "@/hooks/useTranslate";
import { Capacitor } from "@capacitor/core";

// 🌐 URL externa para compra B2B (Apple/Google compliance)
const EXTERNAL_SUBSCRIPTION_URL = 'https://waitless-qzero.com';

export default function BusinessManageSubscriptionPage() {
  // Traduções
  const txtBack = useAutoTranslate('Voltar ao Painel', 'pt');
  const txtBusinessSubscription = useAutoTranslate('Subscrição Empresarial', 'pt');
  const txtManagePlan = useAutoTranslate('Gerir plano e faturação', 'pt');
  const txtFreeTrialActive = useAutoTranslate('Período de Teste Gratuito Ativo', 'pt');
  const txtTrialEndsIn = useAutoTranslate('O período de teste termina em', 'pt');
  const txtDaysRemaining = useAutoTranslate('dias restantes', 'pt');
  const txtDayRemaining = useAutoTranslate('dia restante', 'pt');
  const txtAfterTrial = useAutoTranslate('Após o período de teste, será cobrado €49,99/mês automaticamente', 'pt');
  const txtCancelAnytime = useAutoTranslate('Pode cancelar a qualquer momento sem qualquer cobrança', 'pt');
  const txtSubscriptionCancelled = useAutoTranslate('Subscrição Cancelada', 'pt');
  const txtAccessUntilTrial = useAutoTranslate('O seu período de teste gratuito foi cancelado', 'pt');
  const txtAccessUntil = useAutoTranslate('Tem acesso às funcionalidades até', 'pt');
  const txtNoCharge = useAutoTranslate('Não será cobrado nada', 'pt');
  const txtAfterDate = useAutoTranslate('Após essa data, perderá acesso ao plano empresarial', 'pt');
  const txtReactivateQuestion = useAutoTranslate('Reativar Subscrição?', 'pt');
  const txtReactivateDescription = useAutoTranslate('Deseja reativar o seu plano empresarial? A renovação automática será retomada', 'pt');
  const txtYesReactivate = useAutoTranslate('Sim, Reativar', 'pt');
  const txtCancel = useAutoTranslate('Cancelar', 'pt');
  const txtReactivating = useAutoTranslate('A reativar...', 'pt');
  const txtReactivateNow = useAutoTranslate('Reativar Plano Agora', 'pt');
  const txtBusinessPlan = useAutoTranslate('Plano Empresarial', 'pt');
  const txtCancelledAccessUntil = useAutoTranslate('Cancelado (acesso até', 'pt');
  const txtActive = useAutoTranslate('Ativo', 'pt');
  const txtPerMonth = useAutoTranslate('por mês', 'pt');
  const txtNextBilling = useAutoTranslate('Próxima Faturação', 'pt');
  const txtRenewsIn = useAutoTranslate('Renova em', 'pt');
  const txtDays = useAutoTranslate('dias', 'pt');
  const txtDay = useAutoTranslate('dia', 'pt');
  const txtPaymentMethod = useAutoTranslate('Método de Pagamento', 'pt');
  const txtAutoRenewal = useAutoTranslate('Renovação automática', 'pt');
  const txtCancelled = useAutoTranslate('Cancelada', 'pt');
  const txtFeaturesIncluded = useAutoTranslate('Funcionalidades Incluídas', 'pt');
  const txtBillingHistory = useAutoTranslate('Histórico de Faturação', 'pt');
  const txtMonthly = useAutoTranslate('Mensalmente', 'pt');
  const txtPending = useAutoTranslate('Pendente', 'pt');
  const txtPaid = useAutoTranslate('Paga', 'pt');
  const txtCancelSubscription = useAutoTranslate('Cancelar Subscrição', 'pt');
  const txtOnCancelLoseAccess = useAutoTranslate('Ao cancelar, perde acesso imediato a', 'pt');
  const txtQueueManagement = useAutoTranslate('Gestão de Senhas e Filas', 'pt');
  const txtAppointmentSystem = useAutoTranslate('Sistema de Marcações', 'pt');
  const txtTVPanel = useAutoTranslate('Painel TV para Sala de Espera', 'pt');
  const txtTeamManagement = useAutoTranslate('Gestão de Equipa', 'pt');
  const txtMarketingMaterials = useAutoTranslate('Material de Marketing Personalizado', 'pt');
  const txtFullHistory = useAutoTranslate('Histórico Completo de Atendimentos', 'pt');
  const txtWhatHappens = useAutoTranslate('O que acontece depois do cancelamento', 'pt');
  const txtYouWillHaveAccess = useAutoTranslate('Terá acesso até', 'pt');
  const txtNoChargeTrial = useAutoTranslate('Não será cobrado', 'pt');
  const txtAfterLoseAccess = useAutoTranslate('Após essa data, volta ao modo básico (apenas visualização)', 'pt');
  const txtCanReactivate = useAutoTranslate('Pode reativar o plano a qualquer momento', 'pt');
  const txtConfirmCancel = useAutoTranslate('Confirmar Cancelamento', 'pt');
  const txtCancelDescription = useAutoTranslate('Tem a certeza que deseja cancelar o plano empresarial', 'pt');
  const txtCancelling = useAutoTranslate('A cancelar...', 'pt');
  const txtNoActiveSubscription = useAutoTranslate('Sem Subscrição Ativa', 'pt');
  const txtNoBusinessSubscription = useAutoTranslate('Não tem uma subscrição empresarial ativa', 'pt');
  const txtViewPlans = useAutoTranslate('Ver Planos', 'pt');
  const txtLoading = useAutoTranslate('A carregar...', 'pt');
  const txtProfileNotFound = useAutoTranslate('Perfil da empresa não encontrado', 'pt');
  const txtErrorCancelling = useAutoTranslate('Erro ao cancelar subscrição', 'pt');
  const txtCancelSuccess = useAutoTranslate('Subscrição cancelada com sucesso', 'pt');
  const txtErrorReactivating = useAutoTranslate('Erro ao reativar subscrição. Tente novamente', 'pt');
  const txtReactivateSuccess = useAutoTranslate('Subscrição reativada com sucesso!', 'pt');
  const txtCreatingNewSubscription = useAutoTranslate('Vamos criar uma nova subscrição para a sua empresa', 'pt');
  const txtTestingPlanFree = useAutoTranslate('Está a experimentar o plano empresarial gratuitamente!', 'pt');
  const txtTrialEndPeriod = useAutoTranslate('fim do período de teste', 'pt');
  const txtCancelFreeInTrial = useAutoTranslate('o cancelamento é gratuito durante o período de teste', 'pt');
  const txtConfirmCancelTitle = useAutoTranslate('Cancelar Subscrição Empresarial', 'pt');
  const txtConfirmCancelTrialDesc = useAutoTranslate('Tem certeza que deseja cancelar o período de teste gratuito? Perderá acesso a TODAS as funcionalidades empresariais após', 'pt');
  const txtConfirmCancelDesc = useAutoTranslate('Tem certeza que deseja cancelar? Perderá acesso a TODAS as funcionalidades empresariais (gestão de filas, marcações, analytics, painel TV, notificações) após', 'pt');
  const txtRemainingDays = useAutoTranslate('restantes', 'pt');
  const txtWillNotBeCharged = useAutoTranslate('Não será cobrado nada', 'pt');
  const txtBasicPanelOnly = useAutoTranslate('Ficará apenas com acesso ao painel básico', 'pt');
  const txtReactivateFromPage = useAutoTranslate('Pode reativar indo à página de subscrição', 'pt');
  const txtReactivatePlan = useAutoTranslate('Reativar Plano', 'pt');
  const txtVisitWebsite = useAutoTranslate('Visite waitless-qzero.com', 'pt');
  const txtManageOnWebsite = useAutoTranslate('Gestão disponível em waitless-qzero.com', 'pt');
  const txtUnlimitedQueues = useAutoTranslate('Gestão de filas ilimitadas', 'pt');
  const txtAppointmentSys = useAutoTranslate('Sistema de marcações', 'pt');
  const txtAnalytics = useAutoTranslate('Análise e estatísticas', 'pt');
  const txtAutoNotifications = useAutoTranslate('Notificações automáticas', 'pt');
  const txtPrioritySupportFeature = useAutoTranslate('Suporte prioritário', 'pt');
  const txtDateNotAvailable = useAutoTranslate('Data não disponível', 'pt');
  
  const txtJanuary = useAutoTranslate('janeiro', 'pt');
  const txtFebruary = useAutoTranslate('fevereiro', 'pt');
  const txtMarch = useAutoTranslate('março', 'pt');
  const txtApril = useAutoTranslate('abril', 'pt');
  const txtMay = useAutoTranslate('maio', 'pt');
  const txtJune = useAutoTranslate('junho', 'pt');
  const txtJuly = useAutoTranslate('julho', 'pt');
  const txtAugust = useAutoTranslate('agosto', 'pt');
  const txtSeptember = useAutoTranslate('setembro', 'pt');
  const txtOctober = useAutoTranslate('outubro', 'pt');
  const txtNovember = useAutoTranslate('novembro', 'pt');
  const txtDecember = useAutoTranslate('dezembro', 'pt');
  
  const monthNames = [txtJanuary, txtFebruary, txtMarch, txtApril, txtMay, txtJune, txtJuly, txtAugust, txtSeptember, txtOctober, txtNovember, txtDecember];
  
  const formatMonthYear = (date) => {
    if (!date || isNaN(date.getTime())) return txtDateNotAvailable;
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${month} ${year}`;
  };

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const { confirm, ConfirmDialog } = useConfirm();
  
  // 🍎🤖 B2B COMPLIANCE: Detectar app nativa (iOS/Android)
  const isNativeApp = Capacitor.isNativePlatform();
  
  // Função para abrir website externo (B2B compliance)
  const handleExternalPurchase = () => {
    if (isNativeApp) {
      window.open(EXTERNAL_SUBSCRIPTION_URL, '_system');
    } else {
      window.open(EXTERNAL_SUBSCRIPTION_URL, '_blank');
    }
  };

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {
      base44.auth.redirectToLogin();
    });
  }, []);

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['business-subscription', user?.email],
    queryFn: async () => {
      if (!user || !user.business_id) return null;
      
      // Buscar dados direto do perfil da empresa (fonte confiável)
      const { response, data: profile } = await safeFetch(`/api/company-profiles/${user.business_id}`);
      
      if (!response.ok) {
        console.error('Erro ao buscar perfil da empresa');
        return null;
      }
      
      // Converter perfil para formato de subscrição
      // ✅ Verificar se está cancelado (aceitar ambas grafias: 'canceled' e 'cancelled')
      const isCancelledStatus = profile.subscriptionStatus === 'canceled' || 
                                 profile.subscriptionStatus === 'cancelled' ||
                                 profile.status === 'cancelled' ||
                                 profile.status === 'canceled';
      
      console.log('📊 BusinessManageSubscription - Dados do perfil:', {
        subscriptionStatus: profile.subscriptionStatus,
        status: profile.status,
        isCancelledStatus,
        currentPeriodEnd: profile.currentPeriodEnd,
        trialEnd: profile.trialEnd
      });
      
      return {
        id: profile.subscriptionId,
        user_email: user.email,
        plan: 'business',
        status: profile.subscriptionStatus || profile.status,
        auto_renew: !isCancelledStatus,  // ✅ Corrigido: false se cancelado
        trial_end_date: profile.trialEnd,
        end_date: profile.currentPeriodEnd,
        created_date: profile.createdAt,
        amount: 4999,
        currency: 'EUR'
      };
    },
    enabled: !!user,
  });

  // ✅ CANCELAMENTO REAL VIA STRIPE API
  const cancelMutation = useMutation({
    mutationFn: async () => {
      // ✅ Usar business_id do utilizador (já vem do /api/auth/me)
      const companyProfileId = user.business_id;
      
      if (!companyProfileId) {
        throw new Error(txtProfileNotFound);
      }
      
      // ✅ CANCELAR NO STRIPE (NÃO apenas no DB local)
      const { response, data } = await safeFetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        body: JSON.stringify({ companyProfileId })
      });
      
      if (!response.ok) {
        throw new Error(data?.error || txtErrorCancelling);
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['business-subscription'] });
      
      // Mostrar mensagem de sucesso com data de acesso
      if (data.message) {
        toast.success(data.message);
      } else {
        toast.success(txtCancelSuccess);
      }
    },
    onError: (error) => {
      console.error('Erro ao cancelar subscrição:', error);
      toast.error(error.message || txtErrorReactivating);
    }
  });

  // ✅ REATIVAÇÃO DE SUBSCRIÇÃO CANCELADA
  const reactivateMutation = useMutation({
    mutationFn: async () => {
      const companyProfileId = user.business_id;
      
      if (!companyProfileId) {
        throw new Error(txtProfileNotFound);
      }
      
      const { response, data } = await safeFetch('/api/stripe/reactivate-subscription', {
        method: 'POST',
        body: JSON.stringify({ companyProfileId })
      });
      
      if (!response.ok) {
        throw new Error(data?.error || 'Erro ao reativar subscrição');
      }
      
      return data;
    },
    onSuccess: (data) => {
      if (data.requires_new_checkout) {
        // Redirecionar para criar nova subscrição PARA A MESMA EMPRESA
        navigate(createPageUrl("BusinessSubscription"), {
          state: { 
            existingProfileId: data.existing_profile_id,
            isReactivation: true 
          }
        });
        toast.info(data.message || txtCreatingNewSubscription);
      } else {
        queryClient.invalidateQueries({ queryKey: ['business-subscription'] });
        toast.success(data.message || txtReactivateSuccess);
        // Recarregar página para atualizar estado
        window.location.reload();
      }
    },
    onError: (error) => {
      console.error('Erro ao reativar subscrição:', error);
      toast.error(error.message || txtErrorReactivating);
    }
  });

  if (!user || isLoading) {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 flex items-center justify-center p-4">
        <p>{txtLoading}</p>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 p-4">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl("BusinessDashboard"))}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {txtBack}
          </Button>

          <Card className="border-0 shadow-xl">
            <CardContent className="py-16 text-center">
              <AlertCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                {txtNoActiveSubscription}
              </h2>
              <p className="text-slate-600 mb-6">
                {txtNoBusinessSubscription}
              </p>
              
              {/* 🍎🤖 B2B COMPLIANCE: Apps nativas redirecionam para website externo */}
              {isNativeApp ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2 text-slate-600">
                    <Globe className="w-5 h-5" />
                    <span className="font-semibold">{txtVisitWebsite}</span>
                  </div>
                  <Button
                    onClick={handleExternalPurchase}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    {txtVisitWebsite}
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => navigate(createPageUrl("BusinessSubscription"))}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                >
                  {txtViewPlans}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ✅ Validar e calcular datas com segurança
  const today = new Date();
  const isCancelled = subscription.auto_renew === false;
  
  // ✅ Verificar se está em período de trial com validação
  const isTrialing = subscription.status === 'trialing';
  let trialEndDate = null;
  let trialDaysRemaining = 0;
  let trialEndFormatted = '';
  
  if (isTrialing && subscription.trial_end_date) {
    try {
      trialEndDate = new Date(subscription.trial_end_date);
      if (!isNaN(trialEndDate.getTime())) {
        trialDaysRemaining = differenceInDays(trialEndDate, today);
        trialEndFormatted = format(trialEndDate, "dd 'de' MMMM 'de' yyyy", { locale: pt });
      } else {
        trialEndDate = null;
      }
    } catch (e) {
      console.warn('Data de fim de trial inválida:', subscription.trial_end_date);
      trialEndDate = null;
    }
  }
  
  // ✅ LÓGICA AJUSTADA: Se cancelar durante trial, termina no fim do trial (não no próximo mês)
  let endDate = null;
  let nextBillingDate = '';
  let daysRemaining = 0;
  let isExpiringSoon = false;
  
  // Se estiver em trial E cancelado → usar trial_end_date
  if (isTrialing && isCancelled && trialEndDate) {
    endDate = trialEndDate;
    nextBillingDate = trialEndFormatted;
    daysRemaining = trialDaysRemaining;
    isExpiringSoon = daysRemaining <= 2;
  } else {
    // Caso contrário, usar end_date normal (próximo mês)
    // Tentar obter end_date da subscription
    if (subscription.end_date) {
      try {
        endDate = new Date(subscription.end_date);
        if (isNaN(endDate.getTime())) {
          endDate = null;
        }
      } catch (e) {
        console.warn('Data de fim inválida:', subscription.end_date);
        endDate = null;
      }
    }
    
    // Se não tiver end_date válida, calcular baseado em created_date
    if (!endDate && subscription.created_date) {
      try {
        const createdDate = new Date(subscription.created_date);
        if (!isNaN(createdDate.getTime())) {
          endDate = new Date(createdDate);
          endDate.setMonth(endDate.getMonth() + 1);
        }
      } catch (e) {
        console.warn('Data de criação inválida:', subscription.created_date);
      }
    }
    
    // Se ainda não tiver data válida, usar hoje + 30 dias (fallback)
    if (!endDate) {
      endDate = new Date(today);
      endDate.setMonth(endDate.getMonth() + 1);
    }
    
    // Calcular dias restantes e formatar data
    daysRemaining = differenceInDays(endDate, today);
    isExpiringSoon = daysRemaining <= 7;
    nextBillingDate = format(endDate, "dd 'de' MMMM 'de' yyyy", { locale: pt });
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 p-4">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="outline"
          onClick={() => navigate(createPageUrl("BusinessDashboard"))}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {txtBack}
        </Button>

        <div className="mb-6">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            {txtBusinessSubscription}
          </h1>
          <p className="text-slate-600">{txtManagePlan}</p>
        </div>

        {/* Banner de Trial */}
        {isTrialing && trialDaysRemaining >= 0 && (
          <Card className="border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 mb-6">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-bold text-green-900 mb-2">🎉 {txtFreeTrialActive}</h3>
                  <p className="text-green-800 text-sm mb-2">
                    {txtTestingPlanFree} 
                    {txtTrialEndsIn} <strong>{trialEndFormatted}</strong> ({trialDaysRemaining} {trialDaysRemaining === 1 ? txtDayRemaining : txtDaysRemaining}).
                  </p>
                  <p className="text-green-700 text-xs">
                    {txtAfterTrial}. 
                    {txtCancelAnytime}.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Alerta de Cancelamento */}
        {isCancelled && (
          <Card className="border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 mb-6">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-amber-900 mb-2">{txtSubscriptionCancelled}</h3>
                  <p className="text-amber-800 text-sm mb-3">
                    {isTrialing ? (
                      <>
                        {txtAccessUntilTrial}. 
                        {txtAccessUntil} <strong>{nextBillingDate}</strong> ({txtTrialEndPeriod}).
                        {txtNoCharge}.
                      </>
                    ) : (
                      <>
                        {txtAccessUntil} <strong>{nextBillingDate}</strong>. 
                        {txtAfterDate}.
                      </>
                    )}
                  </p>
                  {/* 🍎🤖 B2B COMPLIANCE: Apps nativas redirecionam para website externo */}
                  <div className="flex gap-3">
                    {isNativeApp ? (
                      <Button
                        onClick={handleExternalPurchase}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                      >
                        <Globe className="w-4 h-4 mr-2" />
                        {txtVisitWebsite}
                      </Button>
                    ) : (
                      <Button
                        onClick={async () => {
                          const confirmed = await confirm({
                            title: txtReactivateQuestion,
                            description: txtReactivateDescription,
                            confirmText: txtYesReactivate,
                            cancelText: txtCancel
                          });
                          
                          if (confirmed) {
                            reactivateMutation.mutate();
                          }
                        }}
                        disabled={reactivateMutation.isPending}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                      >
                        <Crown className="w-4 h-4 mr-2" />
                        {reactivateMutation.isPending ? txtReactivating : txtReactivateNow}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Card */}
        <Card className="border-0 shadow-xl mb-6">
          <CardContent className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-1">
                    {txtBusinessPlan}
                  </h3>
                  {isCancelled ? (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {txtCancelledAccessUntil} {nextBillingDate})
                    </Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {txtActive}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-slate-900">€49,99</div>
                <div className="text-sm text-slate-600">{txtPerMonth}</div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-slate-600" />
                  <span className="text-sm text-slate-600">{txtNextBilling}</span>
                </div>
                <div className="text-lg font-semibold text-slate-900">
                  {nextBillingDate}
                </div>
                {isExpiringSoon && (
                  <div className="text-sm text-amber-600 mt-1">
                    {txtRenewsIn} {daysRemaining} {daysRemaining === 1 ? txtDay : txtDays}
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-5 h-5 text-slate-600" />
                  <span className="text-sm text-slate-600">{txtPaymentMethod}</span>
                </div>
                <div className="text-lg font-semibold text-slate-900">
                  {subscription.payment_method || 'Stripe'}
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  {txtAutoRenewal}: {subscription.auto_renew ? txtActive : txtCancelled}
                </div>
              </div>
            </div>

            <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
              <h4 className="font-semibold text-slate-900 mb-3">{txtFeaturesIncluded}:</h4>
              <div className="grid md:grid-cols-2 gap-2">
                {subscription.features?.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                    {feature}
                  </div>
                )) || [
                  txtUnlimitedQueues,
                  txtAppointmentSys,
                  txtAnalytics,
                  txtAutoNotifications,
                  txtPrioritySupportFeature
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Billing History */}
        <Card className="border-0 shadow-xl mb-6">
          <CardHeader>
            <CardTitle>{txtBillingHistory}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                <div>
                  <div className="font-semibold text-slate-900">
                    {(() => {
                      try {
                        const startDate = subscription.start_date || subscription.created_date;
                        if (!startDate) return txtDateNotAvailable;
                        
                        const date = new Date(startDate);
                        return formatMonthYear(date);
                      } catch (e) {
                        console.warn('Erro ao formatar data de início:', e);
                        return txtDateNotAvailable;
                      }
                    })()}
                  </div>
                  <div className="text-sm text-slate-600">
                    {txtBusinessPlan} • {txtMonthly}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900">
                    {isTrialing ? '€0,00 EUR' : '€49,99'}
                  </div>
                  {isTrialing ? (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 mt-1">
                      {txtPending} €49,99
                    </Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-700 border-green-200 mt-1">
                      {txtPaid}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 🌐 BOTÃO CANCELAR - SÓ APARECE NO WEBSITE (não em iOS/Android) */}
        {!isCancelled && !Capacitor.isNativePlatform() && (
          <Card className="border-2 border-red-200 bg-red-50/50 mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-red-900 mb-1">{txtCancelSubscription}</h4>
                  <p className="text-sm text-red-700">
                    {isTrialing ? txtCancelFreeInTrial : txtOnCancelLoseAccess}
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-100 hover:text-red-800 gap-2 whitespace-nowrap"
                  onClick={async () => {
                    const endDateFormatted = isTrialing && trialEndDate 
                      ? trialEndFormatted 
                      : nextBillingDate;
                    
                    const confirmed = await confirm({
                      title: txtConfirmCancelTitle,
                      description: `${isTrialing ? txtConfirmCancelTrialDesc : txtConfirmCancelDesc} ${endDateFormatted}. ${txtWillNotBeCharged}. ${txtBasicPanelOnly}. ${txtReactivateFromPage}.`,
                      confirmText: txtConfirmCancel,
                      cancelText: txtCancel,
                      variant: 'destructive'
                    });
                    
                    if (confirmed) {
                      cancelMutation.mutate();
                    }
                  }}
                  disabled={cancelMutation.isPending}
                >
                  <XCircle className="w-4 h-4" />
                  {cancelMutation.isPending ? txtCancelling : txtCancelSubscription}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
      <ConfirmDialog />
    </div>
  );
}