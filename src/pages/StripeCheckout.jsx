import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Sparkles, CheckCircle2, Shield, CreditCard, Lock, Loader2 } from "lucide-react";
import { useAutoTranslate } from "@/hooks/useTranslate";

export default function StripeCheckoutPage() {
  // Traduções gerais
  const txtPremium = useAutoTranslate('Premium', 'pt');
  const txtBusiness = useAutoTranslate('Empresarial', 'pt');
  const txtCheckoutError = useAutoTranslate('Failed to create checkout session', 'pt');
  const txtPaymentError = useAutoTranslate('Erro ao processar pagamento', 'pt');
  const txtLoading = useAutoTranslate('A carregar...', 'pt');
  const txtSubscription = useAutoTranslate('Subscrição', 'pt');
  const txtPerMonth = useAutoTranslate('/mês', 'pt');
  const txtFeaturesIncluded = useAutoTranslate('Funcionalidades incluídas:', 'pt');
  const txtProcessing = useAutoTranslate('A processar...', 'pt');
  const txtPayWith = useAutoTranslate('Pagar', 'pt');
  const txtWithStripe = useAutoTranslate('com Stripe', 'pt');
  const txtSecurePayment = useAutoTranslate('Pagamento 100% seguro via Stripe', 'pt');
  const txtVisa = useAutoTranslate('Visa', 'pt');
  const txtMastercard = useAutoTranslate('Mastercard', 'pt');
  const txtMBWay = useAutoTranslate('MB Way', 'pt');
  const txtTerms = useAutoTranslate('Termos de Serviço', 'pt');
  const txtPrivacy = useAutoTranslate('Política de Privacidade', 'pt');
  const txtRefundGuarantee = useAutoTranslate('Garantia de reembolso de 30 dias.', 'pt');
  const txtAgreement = useAutoTranslate('Ao continuar, concorda com os nossos', 'pt');

  // Features Premium
  const txtFeatureAI = useAutoTranslate('🤖 IA recomenda melhores horários', 'pt');
  const txtFeatureStats = useAutoTranslate('📊 Estatísticas pessoais detalhadas', 'pt');
  const txtFeatureNotif = useAutoTranslate('⚡ Notificações prioritárias avançadas', 'pt');
  const txtFeatureMulti = useAutoTranslate('🎫 Multisenhas (várias ao mesmo tempo)', 'pt');
  const txtFeatureFav = useAutoTranslate('❤️ Guardar lugares favoritos', 'pt');
  const txtFeatureWidget = useAutoTranslate('📱 Widget no telemóvel', 'pt');
  const txtFeatureFamily = useAutoTranslate('👨‍👩‍👧 Perfil familiar', 'pt');
  const txtFeatureAlerts = useAutoTranslate('🔔 Alertas personalizados', 'pt');

  // Features Business
  const txtFeatureQueueMgmt = useAutoTranslate('🏢 Gestão completa de filas', 'pt');
  const txtFeatureBookings = useAutoTranslate('📅 Sistema de marcações', 'pt');
  const txtFeatureTeam = useAutoTranslate('👥 Gestão de equipa', 'pt');
  const txtFeatureAdvStats = useAutoTranslate('📊 Estatísticas avançadas', 'pt');
  const txtFeatureAIAnalysis = useAutoTranslate('🤖 Análise com IA', 'pt');
  const txtFeatureAutoNotif = useAutoTranslate('📧 Notificações automáticas', 'pt');
  const txtFeatureTemplates = useAutoTranslate('💬 Templates de mensagens', 'pt');
  const txtFeatureCalendar = useAutoTranslate('🔗 Integração com calendário', 'pt');

  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const urlParams = new URLSearchParams(window.location.search);
  const planType = urlParams.get('plan') || 'premium';

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {
      base44.auth.redirectToLogin(createPageUrl('StripeCheckout') + `?plan=${planType}`);
    });
  }, [planType]);

  const planDetails = {
    premium: {
      name: txtPremium,
      price: 49.99,
      icon: Crown,
      color: "from-purple-600 to-pink-600",
      features: [
        txtFeatureAI,
        txtFeatureStats,
        txtFeatureNotif,
        txtFeatureMulti,
        txtFeatureFav,
        txtFeatureWidget,
        txtFeatureFamily,
        txtFeatureAlerts
      ]
    },
    business: {
      name: txtBusiness,
      price: 49.99,
      icon: Sparkles,
      color: "from-amber-500 to-orange-600",
      features: [
        txtFeatureQueueMgmt,
        txtFeatureBookings,
        txtFeatureTeam,
        txtFeatureAdvStats,
        txtFeatureAIAnalysis,
        txtFeatureAutoNotif,
        txtFeatureTemplates,
        txtFeatureCalendar
      ]
    }
  };

  const plan = planDetails[planType];

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await base44.functions.invoke('createCheckoutSession', {
        plan: planType
      });

      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error(txtCheckoutError);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err.response?.data?.error || err.message || txtPaymentError);
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-slate-600">{txtLoading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50">
      <div className="max-w-2xl mx-auto px-4 py-4">
        <Card className="border-0 shadow-2xl overflow-hidden">
          <div className={`h-2 bg-gradient-to-r ${plan.color}`} />
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${plan.color} flex items-center justify-center mx-auto mb-4`}>
                <plan.icon className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                {txtSubscription} {plan.name}
              </h1>
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-5xl font-bold text-slate-900">€{plan.price.toFixed(2)}</span>
                <span className="text-slate-600">{txtPerMonth}</span>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-3 mb-8">
              <h3 className="font-semibold text-slate-900 mb-4">{txtFeaturesIncluded}</h3>
              {plan.features.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">{feature}</span>
                </div>
              ))}
            </div>

            <Button
              onClick={handleCheckout}
              disabled={loading}
              className={`w-full py-6 text-lg bg-gradient-to-r ${plan.color} hover:opacity-90 mb-4`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {txtProcessing}
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5 mr-2" />
                  {txtPayWith} €{plan.price.toFixed(2)} {txtWithStripe}
                </>
              )}
            </Button>

            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
                <Lock className="w-4 h-4" />
                <span>{txtSecurePayment}</span>
              </div>

              <div className="flex items-center justify-center gap-4 pt-4 border-t">
                <Badge variant="outline" className="bg-white">
                  <CreditCard className="w-3 h-3 mr-1" />
                  {txtVisa}
                </Badge>
                <Badge variant="outline" className="bg-white">
                  <CreditCard className="w-3 h-3 mr-1" />
                  {txtMastercard}
                </Badge>
                <Badge variant="outline" className="bg-white">
                  <CreditCard className="w-3 h-3 mr-1" />
                  {txtMBWay}
                </Badge>
              </div>
            </div>

            <p className="text-xs text-slate-500 text-center mt-6">
              {txtAgreement} <span className="underline cursor-pointer">{txtTerms}</span> e <span className="underline cursor-pointer">{txtPrivacy}</span>. 
              {txtRefundGuarantee}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}