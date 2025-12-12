import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { safeFetch } from "@/utils/apiConfig";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  ArrowLeft,
  Crown,
  CreditCard,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Settings,
  Bell,
  Sparkles,
  Lock
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusinessRole } from "@/hooks/useBusinessRole";
import { useAutoTranslate } from "@/hooks/useTranslate";

export default function ManageSubscriptionPage() {
  // Traduções
  const txtBack = useAutoTranslate('Anterior', 'pt');
  const txtManageSubscription = useAutoTranslate('Gerir Subscrição', 'pt');
  const txtManageAllAspects = useAutoTranslate('Controle todos os aspetos da sua conta Premium', 'pt');
  const txtSubscriptionCancelled = useAutoTranslate('Subscrição Cancelada', 'pt');
  const txtAccessUntil = useAutoTranslate('Terá acesso Premium até', 'pt');
  const txtAfterDate = useAutoTranslate('Após essa data, voltará ao plano gratuito', 'pt');
  const txtRenewsIn = useAutoTranslate('Sua subscrição renova em', 'pt');
  const txtDay = useAutoTranslate('dia', 'pt');
  const txtDays = useAutoTranslate('dias', 'pt');
  const txtPlan = useAutoTranslate('Plano', 'pt');
  const txtPremium = useAutoTranslate('Premium', 'pt');
  const txtFree = useAutoTranslate('Gratuito', 'pt');
  const txtActive = useAutoTranslate('Ativa', 'pt');
  const txtCancelled = useAutoTranslate('Cancelada', 'pt');
  const txtPerMonth = useAutoTranslate('/mês', 'pt');
  const txtStartDate = useAutoTranslate('Data de Início', 'pt');
  const txtExpiresIn = useAutoTranslate('Expira em', 'pt');
  const txtNextRenewal = useAutoTranslate('Próxima Renovação', 'pt');
  const txtPaymentMethod = useAutoTranslate('Método de Pagamento', 'pt');
  const txtCreditCard = useAutoTranslate('Cartão de Crédito', 'pt');
  const txtAutoRenewal = useAutoTranslate('Renovação Automática', 'pt');
  const txtEnabled = useAutoTranslate('Ativada', 'pt');
  const txtDisabled = useAutoTranslate('Desativada', 'pt');
  const txtFeaturesIncluded = useAutoTranslate('Funcionalidades Incluídas', 'pt');
  const txtUpdatePayment = useAutoTranslate('Atualizar Pagamento', 'pt');
  const txtDownloadInvoices = useAutoTranslate('Descarregar Faturas', 'pt');
  const txtCancelSubscription = useAutoTranslate('Cancelar Subscrição', 'pt');
  const txtAreYouSure = useAutoTranslate('Tem a certeza? Perderá todos os benefícios Premium', 'pt');
  const txtNo = useAutoTranslate('Não', 'pt');
  const txtYesCancel = useAutoTranslate('Sim, Cancelar', 'pt');
  const txtCancelling = useAutoTranslate('Cancelando...', 'pt');
  const txtReactivatePremium = useAutoTranslate('Reativar Premium', 'pt');
  const txtReactivating = useAutoTranslate('Reativando...', 'pt');
  const txtUpgradeToPremium = useAutoTranslate('Upgrade para Premium', 'pt');
  const txtUnlockFeatures = useAutoTranslate('Desbloqueie fila expressa, IA preditiva e muito mais', 'pt');
  const txtViewPremiumPlans = useAutoTranslate('Ver Planos Premium', 'pt');
  const txtNoActiveSubscription = useAutoTranslate('Sem Subscrição Ativa', 'pt');
  const txtUpgradeMessage = useAutoTranslate('Faça upgrade para Premium e desfrute de benefícios exclusivos', 'pt');
  const txtProfileNotFound = useAutoTranslate('Perfil da empresa não encontrado', 'pt');
  const txtErrorCancelling = useAutoTranslate('Erro ao cancelar subscrição', 'pt');
  
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    base44.auth.me().then(userData => {
      setUser(userData);
      const isStaff = userData.is_staff_member === true;
      if (isStaff) {
        navigate(createPageUrl("BusinessHome"), { replace: true });
      }
    }).catch(() => base44.auth.redirectToLogin());
  }, [navigate]);

  // ✅ Buscar dados REAIS do companyProfile (PostgreSQL) em vez do localStorage
  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription', user?.business_id],
    queryFn: async () => {
      if (!user || !user.business_id) return null;
      
      // Buscar company profile da API real
      const profiles = await base44.entities.CompanyProfile.filter({
        id: user.business_id
      });
      
      if (!profiles || profiles.length === 0) return null;
      
      const profile = profiles[0];
      
      // ✅ Verificar se está cancelado (aceitar ambas grafias: 'canceled' e 'cancelled')
      const isCancelledStatus = profile.subscription_status === 'canceled' || 
                                 profile.subscription_status === 'cancelled' ||
                                 profile.subscriptionStatus === 'canceled' ||
                                 profile.subscriptionStatus === 'cancelled';
      
      console.log('📊 ManageSubscription - Dados do perfil:', {
        subscription_status: profile.subscription_status,
        subscriptionStatus: profile.subscriptionStatus,
        status: profile.status,
        isCancelledStatus,
        current_period_end: profile.current_period_end
      });
      
      // Converter dados do companyProfile para formato de subscrição
      return {
        id: profile.subscription_id || profile.subscriptionId || profile.id,
        user_email: user.email,
        plan: profile.status === 'active' || profile.status === 'pending_payment' ? 'premium' : 'free',
        status: isCancelledStatus ? 'cancelled' : 
                profile.status === 'active' ? 'active' : 
                profile.status === 'pending_payment' ? 'active' : 'cancelled',
        amount: 49.99,
        currency: 'EUR',
        created_date: profile.created_at || profile.createdAt,
        start_date: profile.trial_start || profile.trialStart || profile.created_at || profile.createdAt,
        end_date: profile.current_period_end || profile.currentPeriodEnd || profile.trial_end || profile.trialEnd,
        trial_end_date: profile.trial_end || profile.trialEnd,
        auto_renew: !isCancelledStatus,  // ✅ Corrigido: false se cancelado
        stripe_subscription_id: profile.subscription_id || profile.subscriptionId,
        payment_method: 'stripe'
      };
    },
    enabled: !!user?.business_id,
  });

  const toggleAutoRenewMutation = useMutation({
    mutationFn: async (autoRenew) => {
      // Toggle auto-renew via Stripe API
      console.log('Toggle auto-renew:', autoRenew);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription', user?.business_id] });
    },
  });

  // ✅ CANCELAMENTO REAL VIA STRIPE API
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      // Buscar company profile do utilizador para obter companyProfileId
      const profiles = await base44.entities.CompanyProfile.filter({
        ownerEmail: user.email
      });
      
      if (!profiles || profiles.length === 0) {
        throw new Error(txtProfileNotFound);
      }
      
      const companyProfileId = profiles[0].id;
      
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
      queryClient.invalidateQueries({ queryKey: ['subscription', user?.business_id] });
      queryClient.invalidateQueries({ queryKey: ['company-profile'] });
      setShowCancelConfirm(false);
      
      // Mostrar mensagem de sucesso com data de acesso
      if (data.message) {
        console.log('✅ Subscrição cancelada:', data.message);
      }
    },
    onError: (error) => {
      console.error('❌ Erro ao cancelar subscrição:', error);
      alert(error.message || 'Erro ao cancelar subscrição. Por favor, tente novamente.');
    }
  });

  const reactivateSubscriptionMutation = useMutation({
    mutationFn: async () => {
      // Buscar company profile do utilizador
      const profiles = await base44.entities.CompanyProfile.filter({
        id: user.business_id
      });
      
      if (!profiles || profiles.length === 0) {
        throw new Error(txtProfileNotFound);
      }
      
      const companyProfileId = profiles[0].id;
      
      // ✅ REATIVAR VIA STRIPE API
      const { response, data } = await safeFetch('/api/stripe/reactivate-subscription', {
        method: 'POST',
        body: JSON.stringify({ companyProfileId })
      });
      
      if (!response.ok) {
        throw new Error(data?.error || 'Erro ao reativar subscrição');
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription', user?.business_id] });
      queryClient.invalidateQueries({ queryKey: ['company-profile'] });
    },
  });

  if (isLoading || !user) {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 p-4">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-12 w-64 mb-8" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 p-4">
        <div className="max-w-4xl mx-auto text-center py-8">
          <div className="text-6xl mb-4">👑</div>
          <h2 className="text-3xl font-bold text-slate-900 mb-4">{txtNoActiveSubscription}</h2>
          <p className="text-xl text-slate-600 mb-8">
            {txtUpgradeMessage}
          </p>
          <Button 
            size="lg"
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 px-8 py-6 text-lg"
            onClick={() => navigate(createPageUrl("Premium"))}
          >
            <Sparkles className="w-5 h-5 mr-2" />
            {txtViewPremiumPlans}
          </Button>
        </div>
      </div>
    );
  }

  const isPremium = subscription.plan === "premium";
  const isActive = subscription.status === "active";
  const isCancelled = subscription.status === "cancelled";
  const daysRemaining = Math.ceil((new Date(subscription.end_date) - new Date()) / (1000 * 60 * 60 * 24));

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50">
      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* Header */}
        <Button
          variant="outline"
          className="mb-6 gap-2"
          onClick={() => navigate(createPageUrl("Home"))}
        >
          <ArrowLeft className="w-4 h-4" />
          {txtBack}
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            {txtManageSubscription}
          </h1>
          <p className="text-xl text-slate-600">
            {txtManageAllAspects}
          </p>
        </div>

        {/* Alerts */}
        {isCancelled && (
          <Alert className="mb-6 border-amber-200 bg-amber-50">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <AlertDescription className="text-amber-900">
              <strong>{txtSubscriptionCancelled}:</strong> {txtAccessUntil} {new Date(subscription.end_date).toLocaleDateString('pt-PT')}. 
              {txtAfterDate}.
            </AlertDescription>
          </Alert>
        )}

        {isActive && daysRemaining <= 7 && (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <Bell className="h-5 w-5 text-blue-600" />
            <AlertDescription className="text-blue-900">
              {txtRenewsIn} <strong>{daysRemaining} {daysRemaining === 1 ? txtDay : txtDays}</strong>
            </AlertDescription>
          </Alert>
        )}

        {/* Subscription Card */}
        <Card className="mb-8 border-0 shadow-xl overflow-hidden">
          <div className={`h-3 ${
            isPremium 
              ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400' 
              : 'bg-gradient-to-r from-slate-400 to-gray-500'
          }`} />
          
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${
                  isPremium ? 'from-amber-500 to-orange-600' : 'from-slate-500 to-gray-600'
                } flex items-center justify-center shadow-xl`}>
                  <Crown className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-slate-900">
                    {txtPlan} {subscription.plan === "premium" ? txtPremium : txtFree}
                  </h2>
                  <Badge className={
                    isActive 
                      ? "bg-green-100 text-green-700 border-green-200 mt-2" 
                      : "bg-red-100 text-red-700 border-red-200 mt-2"
                  }>
                    {isActive ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        {txtActive}
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3 mr-1" />
                        {txtCancelled}
                      </>
                    )}
                  </Badge>
                </div>
              </div>

              <div className="text-right">
                <div className="text-4xl font-bold text-slate-900">
                  €{subscription.price}
                  <span className="text-lg text-slate-500">{txtPerMonth}</span>
                </div>
              </div>
            </div>

            {/* Subscription Details */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-2 text-slate-600 mb-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-medium">{txtStartDate}</span>
                </div>
                <div className="text-lg font-bold text-slate-900">
                  {new Date(subscription.start_date).toLocaleDateString('pt-PT', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-2 text-slate-600 mb-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {isCancelled ? txtExpiresIn : txtNextRenewal}
                  </span>
                </div>
                <div className="text-lg font-bold text-slate-900">
                  {new Date(subscription.end_date).toLocaleDateString('pt-PT', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-2 text-slate-600 mb-2">
                  <CreditCard className="w-4 h-4" />
                  <span className="text-sm font-medium">{txtPaymentMethod}</span>
                </div>
                <div className="text-lg font-bold text-slate-900">
                  {subscription.payment_method || txtCreditCard}
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-2 text-slate-600 mb-2">
                  <Settings className="w-4 h-4" />
                  <span className="text-sm font-medium">{txtAutoRenewal}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={subscription.auto_renew}
                    onCheckedChange={(checked) => toggleAutoRenewMutation.mutate(checked)}
                    disabled={isCancelled || toggleAutoRenewMutation.isPending}
                  />
                  <span className="font-semibold text-slate-900">
                    {subscription.auto_renew ? txtEnabled : txtDisabled}
                  </span>
                </div>
              </div>
            </div>

            {/* Features Included */}
            {subscription.features && subscription.features.length > 0 && (
              <div className="mb-8">
                <h3 className="font-bold text-lg text-slate-900 mb-4">{txtFeaturesIncluded}</h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {subscription.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-slate-700">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              {isActive ? (
                <>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => {/* Update payment method */}}
                  >
                    <CreditCard className="w-4 h-4" />
                    {txtUpdatePayment}
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => {/* Download invoice */}}
                  >
                    <Download className="w-4 h-4" />
                    {txtDownloadInvoices}
                  </Button>

                  {!showCancelConfirm ? (
                    <Button
                      variant="outline"
                      className="flex-1 border-red-200 text-red-600 hover:bg-red-50 gap-2"
                      onClick={() => setShowCancelConfirm(true)}
                    >
                      <XCircle className="w-4 h-4" />
                      {txtCancelSubscription}
                    </Button>
                  ) : (
                    <div className="flex-1 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                      <p className="text-sm text-red-900 mb-3 font-medium">
                        {txtAreYouSure}.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowCancelConfirm(false)}
                        >
                          {txtNo}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => cancelSubscriptionMutation.mutate()}
                          disabled={cancelSubscriptionMutation.isPending}
                        >
                          {cancelSubscriptionMutation.isPending ? txtCancelling : txtYesCancel}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <Button
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 gap-2 py-6 text-lg"
                  onClick={() => reactivateSubscriptionMutation.mutate()}
                  disabled={reactivateSubscriptionMutation.isPending}
                >
                  <Sparkles className="w-5 h-5" />
                  {reactivateSubscriptionMutation.isPending ? txtReactivating : txtReactivatePremium}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upgrade CTA for Free Users */}
        {!isPremium && (
          <Card className="border-0 shadow-xl bg-gradient-to-br from-amber-50 to-orange-50">
            <CardContent className="p-8 text-center">
              <Crown className="w-16 h-16 text-amber-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-slate-900 mb-2">
                {txtUpgradeToPremium}
              </h3>
              <p className="text-slate-700 mb-6">
                {txtUnlockFeatures}
              </p>
              <Button
                size="lg"
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                onClick={() => navigate(createPageUrl("Premium"))}
              >
                <Sparkles className="w-5 h-5 mr-2" />
                {txtViewPremiumPlans}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}