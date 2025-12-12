import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Capacitor } from "@capacitor/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Settings,
  BarChart3,
  Crown,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Clock,
  MessageSquare,
  Tv,
  ExternalLink,
  FileImage,
  Lock,
  Globe
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusinessAccess } from "../hooks/useBusinessAccess";
import { PaymentPendingBanner } from "../components/business/PaymentPendingBanner";
import { RestrictedAccessOverlay } from "../components/business/RestrictedAccessOverlay";
import { PosterGenerator } from "../components/business/PosterGenerator";
import { TranslatedText } from "@/components/translation/TranslatedText";
import { useAutoTranslate } from "@/hooks/useTranslate";

// 🌐 URL externa para compra B2B (Apple/Google compliance)
const EXTERNAL_SUBSCRIPTION_URL = 'https://waitless-qzero.com';

export default function BusinessHomePage() {
  const navigate = useNavigate();
  const { user, hasActiveSubscription: hasAccess, companyProfile, loading: isLoading } = useBusinessAccess();
  const [showRestrictedOverlay, setShowRestrictedOverlay] = useState(false);
  const [restrictedFeatureName, setRestrictedFeatureName] = useState('');
  
  // 🍎🤖 B2B COMPLIANCE: Detectar app nativa (iOS/Android)
  const isNativeApp = Capacitor.isNativePlatform();
  
  const txtDashboardTitle = useAutoTranslate('Painel de Controlo', 'pt');
  const txtDashboardDesc = useAutoTranslate('Visão geral completa do seu negócio', 'pt');
  const txtQueuesTitle = useAutoTranslate('Gestão de Senhas', 'pt');
  const txtQueuesDesc = useAutoTranslate('Controle senhas digitais em tempo real', 'pt');
  const txtServicesTitle = useAutoTranslate('Marcações', 'pt');
  const txtServicesDesc = useAutoTranslate('Gerir marcações e serviços', 'pt');
  const txtFeedbackTitle = useAutoTranslate('Feedback', 'pt');
  const txtFeedbackDesc = useAutoTranslate('Avaliações e comentários de clientes', 'pt');
  const txtManageSubTitle = useAutoTranslate('Gerir Subscrição', 'pt');
  const txtManageSubDesc = useAutoTranslate('Cancelar ou reativar plano empresarial', 'pt');
  const txtSettingsTitle = useAutoTranslate('Configurações', 'pt');
  const txtSettingsDesc = useAutoTranslate('Gerir perfil da empresa', 'pt');
  const txtBusinessPortal = useAutoTranslate('Portal Empresarial', 'pt');
  const txtManageBusiness = useAutoTranslate('Gerir o seu negócio de forma simples e eficiente', 'pt');
  const txtActivePlan = useAutoTranslate('Plano Ativo', 'pt');
  const txtTVPanel = useAutoTranslate('Painel TV - Ecrã de Senhas', 'pt');
  const txtNew = useAutoTranslate('Novo', 'pt');
  const txtTVPanelDesc = useAutoTranslate('Exiba as senhas em tempo real num ecrã grande para a sua sala de espera', 'pt');
  const txtTVPanelFeatures = useAutoTranslate('Fullscreen • Auto-atualização • Visual limpo e profissional', 'pt');
  const txtOpenTVPanel = useAutoTranslate('Abrir Painel TV', 'pt');
  const txtPoster = useAutoTranslate('Cartaz Publicitário', 'pt');
  const txtFree = useAutoTranslate('Grátis', 'pt');
  const txtPosterDesc = useAutoTranslate('Imprima e afixe na sua empresa para informar os clientes sobre o sistema QZero', 'pt');
  const txtPosterFeatures = useAutoTranslate('Formato A4 • QR Code personalizado • Pronto para imprimir', 'pt');
  const txtActiveTickets = useAutoTranslate('Senhas Ativas', 'pt');
  const txtTodayAppointments = useAutoTranslate('Marcações Hoje', 'pt');
  const txtServedClients = useAutoTranslate('Clientes Atendidos', 'pt');
  const txtAvgRating = useAutoTranslate('Avaliação Média', 'pt');
  const txtFeatures = useAutoTranslate('Funcionalidades', 'pt');
  const txtUnlockPotential = useAutoTranslate('Desbloqueie Todo o Potencial', 'pt');
  const txtCtaDescription = useAutoTranslate('Ative o plano empresarial e aceda a todas as funcionalidades por apenas €49,99/mês', 'pt');
  const txtUnlimitedQueues = useAutoTranslate('Gestão ilimitada de senhas', 'pt');
  const txtCompleteBooking = useAutoTranslate('Sistema completo de marcações', 'pt');
  const txtTeamManagement = useAutoTranslate('Gestão de equipa e staff', 'pt');
  const txtActivateNow = useAutoTranslate('Ativar Plano Agora', 'pt');
  const txtVisitWebsite = useAutoTranslate('Visite waitless-qzero.com', 'pt');

  React.useEffect(() => {
    // Verificar se é conta empresarial quando os dados estiverem carregados
    if (!isLoading && user && !user.is_business_user) {
      navigate(createPageUrl("Home"));
    }
  }, [navigate, isLoading, user]);

  if (isLoading || !user) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 px-4 sm:px-6 py-4 sm:py-6">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  const features = [
    {
      icon: LayoutDashboard,
      titleKey: txtDashboardTitle,
      descriptionKey: txtDashboardDesc,
      color: "from-blue-500 to-cyan-500",
      route: "BusinessDashboard",
      requiresSubscription: true
    },
    {
      icon: Users,
      titleKey: txtQueuesTitle,
      descriptionKey: txtQueuesDesc,
      color: "from-purple-500 to-pink-500",
      route: "BusinessQueues",
      requiresSubscription: true
    },
    {
      icon: Calendar,
      titleKey: txtServicesTitle,
      descriptionKey: txtServicesDesc,
      color: "from-green-500 to-emerald-500",
      route: "BusinessServices",
      requiresSubscription: true
    },
    {
      icon: MessageSquare,
      titleKey: txtFeedbackTitle,
      descriptionKey: txtFeedbackDesc,
      color: "from-rose-500 to-red-500",
      route: "BusinessDashboard",
      tab: "feedback",
      requiresSubscription: true
    },
    {
      icon: Settings,
      titleKey: txtSettingsTitle,
      descriptionKey: txtSettingsDesc,
      color: "from-slate-500 to-gray-600",
      route: "BusinessSettings",
      requiresSubscription: false
    }
  ];

  const handleFeatureClick = (feature) => {
    if (feature.requiresSubscription && !hasAccess) {
      setRestrictedFeatureName(feature.titleKey);
      setShowRestrictedOverlay(true);
      return;
    }

    if (feature.tab) {
      navigate(createPageUrl(feature.route), { state: { activeTab: feature.tab } });
    } else {
      navigate(createPageUrl(feature.route));
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-3 lg:px-8 py-3 lg:py-6 space-y-3 sm:space-y-4 lg:space-y-6">
        {/* Banner de Pagamento Pendente */}
        {!hasAccess && companyProfile && (
          <PaymentPendingBanner companyProfile={companyProfile} />
        )}

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 text-white shadow-lg">
          <div className="flex flex-row items-center justify-between gap-2 lg:gap-4">
            <div className="space-y-0.5 lg:space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 lg:gap-3">
                <Sparkles className="w-5 h-5 lg:w-7 lg:h-7 flex-shrink-0" />
                <h1 className="text-base sm:text-lg lg:text-2xl xl:text-3xl font-bold truncate">
                  {companyProfile?.name || txtBusinessPortal}
                </h1>
              </div>
              <p className="text-blue-100 text-xs lg:text-base hidden sm:block">
                {txtManageBusiness}
              </p>
            </div>
            
            {hasAccess && (
              <Badge className="bg-green-500 text-white px-2 lg:px-4 py-1 lg:py-2 text-xs lg:text-sm flex-shrink-0">
                <CheckCircle2 className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2" />
                {txtActivePlan}
              </Badge>
            )}
          </div>
        </div>

        {/* Quick Actions - TV Panel & Poster */}
        {hasAccess && (
          <div className="grid grid-cols-2 gap-2 lg:gap-4">
            <Button
              onClick={() => window.open('/painel-tv', '_blank')}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white h-auto py-2.5 lg:py-4 px-3 lg:px-6"
            >
              <Tv className="w-4 h-4 lg:w-6 lg:h-6 mr-1.5 lg:mr-3 flex-shrink-0" />
              <span className="text-xs sm:text-sm lg:text-base truncate">{txtOpenTVPanel}</span>
              <ExternalLink className="w-3 h-3 lg:w-5 lg:h-5 ml-1 lg:ml-2 flex-shrink-0" />
            </Button>
            <PosterGenerator companyProfile={companyProfile} compact={true} />
          </div>
        )}

        {/* Quick Stats - 2x2 grid on mobile, 4 columns on desktop */}
        {hasAccess && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
              <CardContent className="p-3 lg:p-4">
                <div className="flex flex-col items-center text-center">
                  <Clock className="w-5 h-5 lg:w-6 lg:h-6 text-blue-500 mb-1.5 lg:mb-2" />
                  <p className="text-xl lg:text-2xl xl:text-3xl font-bold text-blue-900">-</p>
                  <p className="text-xs lg:text-sm text-blue-600 leading-tight">{txtActiveTickets}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
              <CardContent className="p-3 lg:p-4">
                <div className="flex flex-col items-center text-center">
                  <Calendar className="w-5 h-5 lg:w-6 lg:h-6 text-purple-500 mb-1.5 lg:mb-2" />
                  <p className="text-xl lg:text-2xl xl:text-3xl font-bold text-purple-900">-</p>
                  <p className="text-xs lg:text-sm text-purple-600 leading-tight">{txtTodayAppointments}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
              <CardContent className="p-3 lg:p-4">
                <div className="flex flex-col items-center text-center">
                  <Users className="w-5 h-5 lg:w-6 lg:h-6 text-green-500 mb-1.5 lg:mb-2" />
                  <p className="text-xl lg:text-2xl xl:text-3xl font-bold text-green-900">-</p>
                  <p className="text-xs lg:text-sm text-green-600 leading-tight">{txtServedClients}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
              <CardContent className="p-3 lg:p-4">
                <div className="flex flex-col items-center text-center">
                  <BarChart3 className="w-5 h-5 lg:w-6 lg:h-6 text-amber-500 mb-1.5 lg:mb-2" />
                  <p className="text-xl lg:text-2xl xl:text-3xl font-bold text-amber-900">-</p>
                  <p className="text-xs lg:text-sm text-amber-600 leading-tight">{txtAvgRating}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Features Grid */}
        <div>
          <h2 className="text-base lg:text-xl xl:text-2xl font-bold text-slate-900 mb-2 lg:mb-4">
            {txtFeatures}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3 lg:gap-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const isLocked = feature.requiresSubscription && !hasAccess;
              
              return (
                <Card
                  key={index}
                  className={`group cursor-pointer transition-all hover:shadow-md lg:hover:shadow-lg ${
                    isLocked ? 'opacity-75 border-amber-200' : 'hover:-translate-y-0.5 lg:hover:-translate-y-1'
                  }`}
                  onClick={() => handleFeatureClick(feature)}
                >
                  <CardContent className="p-3 lg:p-5">
                    <div className="flex items-start gap-2 lg:gap-4">
                      <div className={`w-8 h-8 lg:w-12 lg:h-12 rounded-lg lg:rounded-xl bg-gradient-to-r ${feature.color} p-1.5 lg:p-2.5 flex-shrink-0 group-hover:scale-105 transition-transform`}>
                        <Icon className="w-5 h-5 lg:w-7 lg:h-7 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 lg:gap-2 mb-0.5 lg:mb-1">
                          <p className="text-xs lg:text-base xl:text-lg font-semibold text-slate-900 truncate">{feature.titleKey}</p>
                          {isLocked && (
                            <Badge className="bg-amber-500 text-white text-[8px] lg:text-xs px-1 lg:px-2 py-0 lg:py-0.5">
                              Pro
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] lg:text-sm text-slate-500 line-clamp-2 leading-tight">
                          {feature.descriptionKey}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* 🍎🤖 B2B COMPLIANCE: CTA para Ativar Plano - escondido em apps nativas */}
        {!hasAccess && !isNativeApp && (
          <Card className="border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50">
            <CardContent className="p-3 lg:p-6">
              <div className="flex flex-col gap-3 lg:gap-5">
                <div>
                  <h3 className="text-sm lg:text-xl font-bold text-amber-900 mb-1 lg:mb-2">
                    {txtUnlockPotential}
                  </h3>
                  <p className="text-xs lg:text-base text-amber-800 mb-2 lg:mb-4">
                    {txtCtaDescription}
                  </p>
                  <div className="flex flex-wrap gap-x-3 lg:gap-x-6 gap-y-1 lg:gap-y-2 text-xs lg:text-sm text-amber-900">
                    <span className="flex items-center gap-1 lg:gap-2">
                      <CheckCircle2 className="w-3 h-3 lg:w-5 lg:h-5 text-green-600" />
                      {txtUnlimitedQueues}
                    </span>
                    <span className="flex items-center gap-1 lg:gap-2">
                      <CheckCircle2 className="w-3 h-3 lg:w-5 lg:h-5 text-green-600" />
                      {txtCompleteBooking}
                    </span>
                    <span className="flex items-center gap-1 lg:gap-2">
                      <CheckCircle2 className="w-3 h-3 lg:w-5 lg:h-5 text-green-600" />
                      {txtTeamManagement}
                    </span>
                  </div>
                </div>
                <Button
                  onClick={() => navigate(createPageUrl("BusinessSubscription"))}
                  className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white w-full py-2 lg:py-4 text-sm lg:text-lg"
                >
                  <Crown className="w-4 h-4 lg:w-6 lg:h-6 mr-1 lg:mr-2" />
                  {txtActivateNow}
                  <ArrowRight className="w-4 h-4 lg:w-6 lg:h-6 ml-1 lg:ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {showRestrictedOverlay && (
        <RestrictedAccessOverlay 
          featureName={restrictedFeatureName}
          onClose={() => setShowRestrictedOverlay(false)}
        />
      )}
    </div>
  );
}
