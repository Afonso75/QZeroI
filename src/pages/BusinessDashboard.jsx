import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Capacitor } from "@capacitor/core";
import { 
  LayoutDashboard,
  Clock,
  Users,
  Settings,
  BarChart3,
  CheckCircle2,
  Crown,
  CreditCard,
  MessageSquare,
  ChevronRight,
  Ticket,
  Calendar,
  Globe
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import QueueManager from "../components/business/QueueManager";
import Statistics from "../components/business/Statistics";
import AppointmentManager from "../components/business/AppointmentManager";
import AppointmentReminders from "../components/business/AppointmentReminders";
import FeedbackManager from "../components/business/FeedbackManager";
import { PaymentPendingBanner } from "../components/business/PaymentPendingBanner";
import { BusinessFeatureGuard } from "../components/business/BusinessFeatureGuard";
import { useBusinessAccess } from "../hooks/useBusinessAccess";
import { ExpiredBanner } from "../components/business/ExpiredBanner";
import { TranslatedText } from "@/components/translation/TranslatedText";
import { useAutoTranslate } from "@/hooks/useTranslate";

// 🌐 URL externa para compra B2B (Apple/Google compliance)
const EXTERNAL_SUBSCRIPTION_URL = 'https://waitless-qzero.com';

export default function BusinessDashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const { hasAccess, companyProfile, isLoading: loadingAccess, isExpired } = useBusinessAccess();
  
  // 🍎🤖 B2B COMPLIANCE: Detectar app nativa (iOS/Android)
  const isNativeApp = Capacitor.isNativePlatform();
  
  // Traduções dinâmicas via Google Translate
  const txtDashboard = useAutoTranslate('Painel Empresa', 'pt');
  const txtYourCompany = useAutoTranslate('Sua Empresa', 'pt');
  const txtTrialActive = useAutoTranslate('Período de Teste Ativo', 'pt');
  const txtFreeTrialUntil = useAutoTranslate('Teste grátis até', 'pt');
  const txtSubscription = useAutoTranslate('Subscrição', 'pt');
  const txtActivatePro = useAutoTranslate('Ativar Pro', 'pt');
  const txtConfig = useAutoTranslate('Config', 'pt');
  const txtQueues = useAutoTranslate('Senhas', 'pt');
  const txtPeople = useAutoTranslate('Pessoas', 'pt');
  const txtIssued = useAutoTranslate('Emitidas', 'pt');
  const txtCompleted = useAutoTranslate('Concluídas', 'pt');
  const txtActive = useAutoTranslate('Ativas', 'pt');
  const txtToday = useAutoTranslate('Hoje', 'pt');
  const txtNoQueues = useAutoTranslate('Nenhuma senha configurada', 'pt');
  const txtAppointments = useAutoTranslate('Marcações', 'pt');
  const txtBusinessPanel = useAutoTranslate('o painel empresarial', 'pt');
  const txtSubscriptionRequired = useAutoTranslate('Subscrição Necessária', 'pt');
  const txtActivateProQueues = useAutoTranslate('Ative a subscrição Pro para gerir senhas', 'pt');
  const txtActivateProAppointments = useAutoTranslate('Ative a subscrição Pro para gerir marcações', 'pt');
  const txtViewPlans = useAutoTranslate('Ver Planos', 'pt');
  const txtSubscriptionExpired = useAutoTranslate('Subscrição Expirada', 'pt');
  const txtSubscriptionExpiredDesc = useAutoTranslate('A sua subscrição expirou. Renove para continuar a usar todas as funcionalidades.', 'pt');
  const txtRenewNow = useAutoTranslate('Renovar Agora', 'pt');
  const txtVisitWebsite = useAutoTranslate('Visite waitless-qzero.com', 'pt');
  const txtManageOnWebsite = useAutoTranslate('Gestão disponível em waitless-qzero.com', 'pt');

  useEffect(() => {
    base44.auth.me().then(userData => {
      setUser(userData);
      console.log('User loaded:', {
        email: userData.email,
        is_business_user: userData.is_business_user,
        has_business_subscription: userData.has_business_subscription,
        business_id: userData.business_id
      });
      
      if (!userData.is_business_user || !userData.business_id) {
        navigate(createPageUrl("Home"));
      }
    }).catch(() => {
      base44.auth.redirectToLogin();
    });
  }, [navigate]);

  const { data: subscription, isLoading: loadingSubscription } = useQuery({
    queryKey: ['business-subscription', user?.email],
    queryFn: async () => {
      if (!user) return null;
      const subs = await base44.entities.Subscription.filter({
        user_email: user.email,
        plan: "business"
      });
      const activeSub = subs.find(s => s.status === 'active' || s.status === 'trialing');
      return activeSub || null;
    },
    enabled: !!user,
    staleTime: 60000, // Cache por 60 segundos
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  const { data: queues = [] } = useQuery({
    queryKey: ['business-queues', user?.business_id],
    queryFn: () => base44.entities.Queue.filter({ business_id: user.business_id }),
    enabled: !!user?.business_id,
    staleTime: 30000, // Cache por 30 segundos
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ['business-tickets', user?.business_id],
    queryFn: () => base44.entities.Ticket.filter({ business_id: user.business_id }, '-created_date'),
    enabled: !!user?.business_id,
    staleTime: 15000, // Cache por 15 segundos
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  if (!user || loadingSubscription) {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 p-2 sm:p-4 lg:p-6">
        <div className="max-w-full mx-auto px-1.5">
          <Skeleton className="h-10 w-40 mb-3" />
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
          </div>
        </div>
      </div>
    );
  }

  // Verificar subscrição: user tem flag OU existe subscription ativa
  // ✅ Subscrição ATIVA se status é active ou trialing
  const hasActiveSubscription = companyProfile?.subscriptionStatus === 'active' || companyProfile?.subscriptionStatus === 'trialing';
  const hasSubscription = user.has_business_subscription || !!subscription;
  const isTrialing = subscription?.status === 'trialing';

  const activeQueues = queues.filter(q => q.is_active && q.status === "aberta");
  const todayTickets = tickets.filter(t => {
    const created = new Date(t.created_date);
    const today = new Date();
    return created.toDateString() === today.toDateString();
  });
  const activeTickets = tickets.filter(t => ['aguardando', 'chamado', 'atendendo'].includes(t.status));
  const todayCompleted = todayTickets.filter(t => t.status === "concluido");

  return (
    <BusinessFeatureGuard 
      companyProfile={companyProfile}
      hasAccess={hasAccess}
      isExpired={isExpired}
      feature={txtBusinessPanel}
      isLoading={loadingAccess}
    >
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 w-full overflow-x-hidden">
        {user?.business_id && <AppointmentReminders businessId={user.business_id} />}
        
        <div className="w-full max-w-full px-2 sm:px-3 lg:px-8 py-2 sm:py-3 lg:py-6">
          <div className="mb-2 sm:mb-3 lg:mb-6 animate-slide-in-down">
            <h1 className="text-base sm:text-lg lg:text-2xl xl:text-3xl font-bold text-slate-900 mb-0.5 lg:mb-1">
              {txtDashboard}
            </h1>
            <p className="text-xs lg:text-base text-slate-500 truncate">
              {companyProfile?.name || txtYourCompany}
            </p>
          </div>

        {/* 🚫 BANNER DE SUBSCRIÇÃO EXPIRADA */}
        {isExpired && (
          <Card className="border-0 shadow-lg bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 mb-3 animate-slide-in-left">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-red-900">{txtSubscriptionExpired}</h3>
                    <p className="text-sm text-red-700">{txtSubscriptionExpiredDesc}</p>
                  </div>
                </div>
                {/* 🍎🤖 B2B COMPLIANCE: Apps nativas redirecionam para website externo */}
                {isNativeApp ? (
                  <Button 
                    className="bg-red-600 hover:bg-red-700 text-white whitespace-nowrap"
                    onClick={() => window.open(EXTERNAL_SUBSCRIPTION_URL, '_system')}
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    {txtVisitWebsite}
                  </Button>
                ) : (
                  <Button 
                    className="bg-red-600 hover:bg-red-700 text-white whitespace-nowrap"
                    onClick={() => navigate(createPageUrl("BusinessSubscription"), { state: { isReactivation: true, existingProfileId: companyProfile?.id } })}
                  >
                    {txtRenewNow}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {isTrialing && subscription?.trial_end_date && (
          <Card className="border-0 shadow-sm bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 mb-2 animate-slide-in-left">
            <CardContent className="p-2">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-600 flex-shrink-0 animate-pulse-slow" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700">
                    <span className="font-medium">{txtTrialActive}</span> · {txtFreeTrialUntil} {new Date(subscription.trial_end_date).toLocaleDateString('pt-PT')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        <div className="flex gap-1.5 sm:gap-2 lg:gap-3 mb-2 sm:mb-3 lg:mb-4 overflow-x-auto pb-1 hide-scrollbar animate-slide-in-right">
          {/* 🍎🤖 B2B COMPLIANCE: Botões de subscrição escondidos em apps nativas */}
          {!isNativeApp && (
            hasActiveSubscription ? (
              <Link to={createPageUrl("BusinessManageSubscription")}>
                <Button size="sm" variant="outline" className="gap-1 lg:gap-2 text-xs lg:text-sm h-7 lg:h-10 whitespace-nowrap px-2 lg:px-4 smooth-transition hover-lift">
                  <CreditCard className="w-3 h-3 lg:w-4 lg:h-4" />
                  {txtSubscription}
                </Button>
              </Link>
            ) : (
              <Button 
                size="sm" 
                className="gap-1 lg:gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-xs lg:text-sm h-7 lg:h-10 whitespace-nowrap px-2 lg:px-4 smooth-transition hover-lift"
                onClick={() => navigate(createPageUrl("BusinessSubscription"), { state: { isReactivation: true, existingProfileId: companyProfile?.id } })}
              >
                <Crown className="w-3 h-3 lg:w-4 lg:h-4" />
                {txtActivatePro}
              </Button>
            )
          )}
          <Link to={createPageUrl("BusinessSettings")}>
            <Button size="sm" variant="outline" className="gap-1 lg:gap-2 text-xs lg:text-sm h-7 lg:h-10 whitespace-nowrap px-2 lg:px-4 smooth-transition hover-lift">
              <Settings className="w-3 h-3 lg:w-4 lg:h-4" />
              {txtConfig}
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4 mb-3 lg:mb-6 w-full max-w-full">
          {[
            { icon: LayoutDashboard, value: hasAccess ? activeQueues.length : '—', label: txtQueues, color: 'from-green-500 to-emerald-500' },
            { icon: Users, value: hasAccess ? activeTickets.length : '—', label: txtPeople, color: 'from-blue-500 to-cyan-500' },
            { icon: Clock, value: hasAccess ? todayTickets.length : '—', label: txtIssued, color: 'from-purple-500 to-pink-500' },
            { icon: CheckCircle2, value: hasAccess ? todayCompleted.length : '—', label: txtCompleted, color: 'from-amber-500 to-orange-500' }
          ].map((stat, idx) => (
            <Card key={idx} className="border-0 shadow-sm lg:shadow-md stagger-item" style={{ animationDelay: `${idx * 0.05}s` }}>
              <CardContent className="p-3 lg:p-4">
                <div className={`w-7 h-7 lg:w-10 lg:h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-1.5 lg:mb-2`}>
                  <stat.icon className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                </div>
                <div className="text-lg lg:text-2xl xl:text-3xl font-bold text-slate-900 leading-tight">
                  {stat.value}
                </div>
                <p className="text-slate-500 text-xs lg:text-sm truncate">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="senhas" className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-2 lg:mb-4 h-auto p-0.5 lg:p-1 bg-white/80 backdrop-blur-sm shadow-sm rounded-lg lg:rounded-xl">
            <TabsTrigger 
              value="senhas" 
              className="flex items-center gap-1 lg:gap-2 text-xs lg:text-base py-1.5 lg:py-3 rounded-md lg:rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white"
            >
              <Ticket className="w-3 h-3 lg:w-5 lg:h-5" />
              {txtQueues}
            </TabsTrigger>
            <TabsTrigger 
              value="marcacoes" 
              className="flex items-center gap-1 lg:gap-2 text-xs lg:text-base py-1.5 lg:py-3 rounded-md lg:rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white"
            >
              <Calendar className="w-3 h-3 lg:w-5 lg:h-5" />
              {txtAppointments}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="senhas" className="mt-0 w-full">
            {hasAccess ? (
              queues.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4 text-center">
                    <Ticket className="w-10 h-10 text-slate-300 mx-auto mb-1.5" />
                    <p className="text-xs text-slate-600">{txtNoQueues}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-1.5 w-full">
                  {queues.map(queue => (
                    <QueueManager 
                      key={queue.id} 
                      queue={queue} 
                      tickets={tickets.filter(t => t.queue_id === queue.id)}
                      hasAccess={hasAccess}
                    />
                  ))}
                </div>
              )
            ) : (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <Crown className="w-10 h-10 text-amber-600 mx-auto mb-1.5 animate-pulse-slow" />
                  <h3 className="font-semibold text-xs text-slate-900 mb-0.5">{txtSubscriptionRequired}</h3>
                  <p className="text-[10px] text-slate-600 mb-2">{txtActivateProQueues}</p>
                  <Link to={createPageUrl("BusinessSubscription")}>
                    <Button size="sm" className="bg-gradient-to-r from-amber-500 to-orange-600 text-xs h-7 hover-lift">
                      {txtViewPlans}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="marcacoes" className="mt-0 w-full">
            {hasAccess ? (
              <AppointmentManager businessId={user.business_id} hasAccess={hasAccess} companyProfile={companyProfile} />
            ) : (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <Crown className="w-10 h-10 text-amber-600 mx-auto mb-1.5 animate-pulse-slow" />
                  <h3 className="font-semibold text-xs text-slate-900 mb-0.5">{txtSubscriptionRequired}</h3>
                  <p className="text-[10px] text-slate-600 mb-2">{txtActivateProAppointments}</p>
                  <Link to={createPageUrl("BusinessSubscription")}>
                    <Button size="sm" className="bg-gradient-to-r from-amber-500 to-orange-600 text-xs h-7 hover-lift">
                      {txtViewPlans}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
    </BusinessFeatureGuard>
  );
}