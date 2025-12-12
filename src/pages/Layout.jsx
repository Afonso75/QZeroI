
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Home, Clock, Building2, User, LogOut, RefreshCw, Calendar, Menu, MessageSquare, LayoutDashboard, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { LanguageSelector } from "@/components/settings/LanguageSelector";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { useBusinessAccess } from "@/hooks/useBusinessAccess";
import { useUser } from "@/contexts/UserContext";
import { useAutoTranslateBatch } from "@/hooks/useTranslate";
import { usePushNotifications } from "@/hooks/usePushNotifications";

// Lista centralizada de páginas empresariais
const BUSINESS_PAGES = [
  'Onboarding',
  'BusinessSubscription',
  'BusinessProfileSetup',
  'BusinessHome',
  'BusinessDashboard',
  'BusinessQueues',
  'BusinessServices',
  'BusinessSettings',
  'BusinessSupport',
  'BusinessStaff',
  'BusinessManageSubscription',
  'Profile'
];

// ✅ PERFORMANCE: Textos estáticos fora do componente para evitar re-criação
const LAYOUT_TEXTS = {
  dashboard: 'Dashboard',
  queues: 'Queues',
  appointments: 'Appointments',
  settings: 'Settings',
  portal: 'Portal',
  businesses: 'Businesses',
  business: 'Business',
  noQueues: 'No queues',
  profile: 'Profile',
  support: 'Support',
  logout: 'Log out',
  loading: 'Loading...',
};

function LayoutContent({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  
  // ✅ PERFORMANCE: Uma única chamada de tradução batch em vez de 12 separadas
  const txt = useAutoTranslateBatch(LAYOUT_TEXTS, 'en');
  
  // 🎯 CONTEXTO COMPARTILHADO: Uma única fonte de verdade para user (elimina chamadas duplicadas)
  const { user, loading: loadingUser, error: userError, authFailed, logout: contextLogout } = useUser();
  
  const [currentMode, setCurrentMode] = React.useState('pessoal');
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [headerVisible, setHeaderVisible] = React.useState(true);
  const [lastScrollY, setLastScrollY] = React.useState(0);
  const [isRedirecting, setIsRedirecting] = React.useState(false);
  
  // 🔓 ADMIN OVERRIDE: Hook consome user do contexto (sem chamadas duplicadas)
  const { hasActiveSubscription, loading: loadingAccess } = useBusinessAccess();
  
  // 📱 PUSH NOTIFICATIONS: Inicializar notificações push para dispositivos nativos (iOS/Android)
  const { isSupported: pushSupported, isEnabled: pushEnabled } = usePushNotifications();

  React.useEffect(() => {
    // 🚨 CRÍTICO: Se autenticação falhou após todas tentativas, redirecionar para login
    // ✅ MAS APENAS se não estamos já na página de login/register (prevenir loop infinito!)
    // ✅ USAR startsWith para suportar query strings (ex: /login?lang=en)
    const publicPaths = ['/login', '/register', '/reset-password', '/request-password-reset'];
    const isOnPublicPage = publicPaths.some(path => location.pathname.startsWith(path));
    
    if (!loadingUser && authFailed && !isOnPublicPage) {
      console.log('❌ Layout: Autenticação falhou após todas tentativas - redirecionando para login');
      navigate(createPageUrl('Login'), { replace: true });
      return;
    }
    
    // 🎯 User agora vem do contexto - apenas aplicar lógica de navegação
    if (loadingUser || !user) {
      return;
    }
    
    const accountType = user.account_type || 'pessoal';
        
        // ⚠️ CRÍTICO: PREVENIR LOOPS - Nunca redirecionar se já estamos nas páginas de setup
        // BusinessProfileSetup e BusinessSubscription têm sua própria lógica de redirecionamento
        const onboardingPages = ['Onboarding', 'BusinessProfileSetup', 'BusinessSubscription', 'PaymentSuccess'];
        
        // 🔐 PROTEÇÃO DUPLA: Verificar tanto por currentPageName quanto por pathname
        // Essencial para Safari iOS mobile onde currentPageName pode não estar sincronizado
        const isOnboardingPage = onboardingPages.includes(currentPageName) || 
          location.pathname.includes('/business-subscription') ||
          location.pathname.includes('/business-profile-setup') ||
          location.pathname.includes('/onboarding') ||
          location.pathname.includes('/payment-success');
        
        if (isOnboardingPage) {
          console.log('🔒 Layout: Página de onboarding detectada (nome ou path), pulando guards:', currentPageName, location.pathname);
          setCurrentMode(accountType === 'empresa' ? 'empresa' : 'pessoal');
          setIsRedirecting(false);
          return;
        }
        
    // ✅ ONBOARDING PESSOAL: Apenas para contas pessoais OU empresariais sem subscrição ativa
    // Utilizadores empresariais com subscrição ativa não precisam completar perfil pessoal
    const isBusinessAccountWithSubscription = 
      accountType === 'empresa' && 
      user.has_business_subscription;
    
    if (!user.onboarding_completed && !isBusinessAccountWithSubscription) {
      setIsRedirecting(true);
      navigate(createPageUrl('Onboarding'));
      return;
    }
    
    // CONTA EMPRESARIAL
    const isBusinessAccount = accountType === 'empresa';
    
    if (isBusinessAccount) {
      setCurrentMode('empresa');
      
      // GUARD CONSOLIDADO: Uma única verificação sequencial
      // 1. Se não tem perfil → ProfileSetup
      // 2. Senão, se não tem subscrição ATIVA (verifica currentPeriodEnd) → Subscription
      // 3. Senão, permitir acesso
      
      // Perfil está completo se business_id existe (já foi linkado a um company profile)
      const needsProfile = !user.business_id;
      // ✅ CORRIGIDO: Usar hasActiveSubscription (verifica currentPeriodEnd para cancelados)
      const needsSubscription = !needsProfile && !hasActiveSubscription && !user.has_business_subscription;
          
          // Páginas protegidas que exigem subscrição ativa
          const protectedPages = [
            'BusinessDashboard', 'BusinessQueues', 'BusinessServices', 
            'BusinessSupport', 'BusinessStaff', 'BusinessManageSubscription'
          ];
          
          // Páginas que permitem acesso sem subscrição (home, settings, perfil)
          const allowedWithoutSubscription = ['BusinessHome', 'BusinessSettings', 'Profile'];
          
          if (needsProfile) {
            console.log('🚫 Layout: Perfil incompleto, redirecionando para ProfileSetup');
            setIsRedirecting(true);
            navigate(createPageUrl('BusinessProfileSetup'));
            return;
          }
          
          if (needsSubscription && protectedPages.includes(currentPageName)) {
            console.log('🚫 Layout: Subscrição necessária para', currentPageName, '- redirecionando');
            setIsRedirecting(true);
            navigate(createPageUrl('BusinessSubscription'));
            return;
          }
          
          // 🚨 PROTEÇÃO ANTI-LOOP CRÍTICA (Safari iOS + Produção)
          // NUNCA confiar em currentPageName (não-confiável em build produção!)
          // Usar APENAS location.pathname que é sempre preciso
          const isOnBusinessRoute = location.pathname.startsWith('/business-');
          const isOnPublicRoute = ['/', '/login', '/home'].includes(location.pathname);
          
          // ⚠️ NUNCA redirecionar se acabou de vir de /register (prevenir loop no mobile)
          const isComingFromRegister = location.pathname === '/register';
          
          // Se está numa rota pública mas é utilizador empresarial → redirecionar para BusinessHome
          // MAS APENAS se não está a vir de registo (dá tempo para o onboarding carregar)
          if (isOnPublicRoute && !isComingFromRegister) {
            console.log('📍 Layout: Utilizador empresarial em rota pública, redirecionando para BusinessHome');
            setIsRedirecting(true);
            navigate(createPageUrl('BusinessHome'));
            return;
          }
          
      // Se JÁ está numa rota business, NUNCA redirecionar (prevenir loop!)
      if (isOnBusinessRoute) {
        console.log('✅ Layout: Utilizador empresarial já numa rota /business-*, permitindo acesso');
        // Não redirecionar - está onde deve estar
      }
    } 
    // CONTA PESSOAL
    else {
      setCurrentMode('pessoal');
    }
    
    setIsRedirecting(false);
  }, [user, loadingUser, navigate, currentPageName]);

  React.useEffect(() => {
    const controlHeader = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < lastScrollY || currentScrollY < 10) {
        setHeaderVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setHeaderVisible(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', controlHeader);
    return () => window.removeEventListener('scroll', controlHeader);
  }, [lastScrollY]);

  const isBusinessMode = currentMode === 'empresa' || user?.account_type === 'empresa';

  // Mostrar loading se estiver a redirecionar ou ainda sem user
  if (isRedirecting || !user) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">{txt.loading}</p>
        </div>
      </div>
    );
  }

  // Layout especial para páginas de subscrição/setup empresarial (sem navegação)
  const isBusinessOnboarding = ['BusinessSubscription', 'BusinessProfileSetup'].includes(currentPageName);
  
  if (user?.account_type === 'empresa' && isBusinessOnboarding) {
    return (
      <div className="min-h-dvh flex bg-gradient-to-br from-slate-50 to-blue-50">
        <main className="flex-1 flex flex-col animate-fade-in">
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    );
  }

  // Definir itens de navegação baseado no modo e subscrição
  let navigationItems;
  
  if (isBusinessMode) {
    // 🔓 ADMIN OVERRIDE: Usar hasActiveSubscription do hook (inclui admin override)
    // Em vez de user.has_business_subscription (apenas base de dados)
    const hasSubscription = hasActiveSubscription || user?.has_business_subscription;
    
    if (hasSubscription) {
      // Com subscrição OU admin override: mostrar todas as funcionalidades
      navigationItems = [
        { title: 'Home', url: createPageUrl("BusinessHome"), icon: Home },
        { title: txt.dashboard, url: createPageUrl("BusinessDashboard"), icon: LayoutDashboard },
        { title: txt.queues, url: createPageUrl("BusinessQueues"), icon: Clock },
        { title: txt.appointments, url: createPageUrl("BusinessServices"), icon: Calendar },
        { title: txt.settings, url: createPageUrl("BusinessSettings"), icon: Building2 }
      ];
    } else {
      // Sem subscrição: apenas Home e Settings
      navigationItems = [
        { title: 'Home', url: createPageUrl("BusinessHome"), icon: Home },
        { title: txt.settings, url: createPageUrl("BusinessSettings"), icon: Building2 }
      ];
    }
  } else if (user) {
    // Modo pessoal
    navigationItems = [
      { title: 'Home', url: createPageUrl("Home"), icon: Home },
      { title: txt.portal, url: createPageUrl("CustomerPortal"), icon: User },
      { title: txt.businesses, url: createPageUrl("Businesses"), icon: Building2 }
    ];
  } else {
    // Não autenticado
    navigationItems = [
      { title: 'Home', url: createPageUrl("Home"), icon: Home }
    ];
  }

  const displayName = user?.nome_completo || user?.full_name || 'Utilizador';

  const NavContent = () => (
    <>
      <div className={`p-3 lg:p-5 border-b animate-slide-in-down ${
        isBusinessMode 
          ? 'bg-gradient-to-br from-indigo-600 to-purple-700' 
          : 'bg-gradient-to-br from-sky-500 to-blue-600'
      }`}>
        <div className="flex items-center gap-2 lg:gap-3">
          <div className="w-8 h-8 lg:w-12 lg:h-12 bg-white rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg hover-lift">
            <Clock className={isBusinessMode ? 'w-5 h-5 lg:w-7 lg:h-7 text-indigo-600' : 'w-5 h-5 lg:w-7 lg:h-7 text-sky-600'} />
          </div>
          <div>
            <h2 className="font-bold text-base lg:text-xl text-white">QZero</h2>
            <p className="text-xs lg:text-sm text-white/80">
              {isBusinessMode ? txt.business : txt.noQueues}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-2 lg:p-4">
        <div className="space-y-1 lg:space-y-2">
          {navigationItems.map((item, idx) => (
            <Link
              key={item.title}
              to={item.url}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2 lg:py-3 rounded-lg lg:rounded-xl smooth-transition text-sm lg:text-base stagger-item ${
                location.pathname === item.url 
                  ? 'bg-gradient-to-r from-sky-50 to-blue-50 text-sky-700 font-semibold shadow-sm' 
                  : 'hover:bg-slate-50 hover:scale-[1.02]'
              }`}
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              <item.icon className="w-4 h-4 lg:w-5 lg:h-5" />
              <span>{item.title}</span>
            </Link>
          ))}

          {user && (
            <>
              <Link
                to={createPageUrl("Profile")}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2 lg:py-3 rounded-lg lg:rounded-xl smooth-transition text-sm lg:text-base ${
                  location.pathname === createPageUrl("Profile") 
                    ? 'bg-gradient-to-r from-sky-50 to-blue-50 text-sky-700 font-semibold shadow-sm' 
                    : 'hover:bg-slate-50 hover:scale-[1.02]'
                }`}
              >
                <User className="w-4 h-4 lg:w-5 lg:h-5" />
                <span>{txt.profile}</span>
              </Link>

              <Link
                to={createPageUrl(isBusinessMode ? "BusinessSupport" : "Support")}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2 lg:py-3 rounded-lg lg:rounded-xl smooth-transition text-sm lg:text-base ${
                  location.pathname === createPageUrl(isBusinessMode ? "BusinessSupport" : "Support") 
                    ? 'bg-gradient-to-r from-sky-50 to-blue-50 text-sky-700 font-semibold shadow-sm' 
                    : 'hover:bg-slate-50 hover:scale-[1.02]'
                }`}
              >
                <MessageSquare className="w-4 h-4 lg:w-5 lg:h-5" />
                <span>{txt.support}</span>
              </Link>
            </>
          )}
        </div>
      </nav>

      <div className="p-2 lg:p-4 border-t">
        <LanguageSelector variant="outline" />
      </div>

      {user && (
        <div className="border-t p-3 lg:p-4 animate-slide-in-up">
          <div className="flex items-center gap-2 lg:gap-3 mb-2 lg:mb-3">
            <div className={`w-8 h-8 lg:w-12 lg:h-12 rounded-full flex items-center justify-center shadow-md relative smooth-transition hover:scale-110 ${
              isBusinessMode 
                ? 'bg-gradient-to-br from-indigo-400 to-purple-500'
                : 'bg-gradient-to-br from-sky-400 to-blue-500'
            }`}>
              <span className="text-white font-bold text-xs lg:text-base">{displayName[0] || user.email[0].toUpperCase()}</span>
              {isBusinessMode && (
                <div className="absolute -top-0.5 -right-0.5 w-4 h-4 lg:w-5 lg:h-5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center border-2 border-white animate-pulse-slow">
                  <Building2 className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-xs lg:text-sm truncate">{displayName}</p>
              <p className="text-xs lg:text-sm text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start gap-2 hover:bg-red-50 hover:text-red-600 h-8 lg:h-10 text-sm lg:text-base smooth-transition hover:scale-[1.02]"
            onClick={() => base44.auth.logout()}
          >
            <LogOut className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
            {txt.logout}
          </Button>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-dvh flex bg-gradient-to-br from-slate-50 to-blue-50">
      <aside className="hidden lg:flex lg:flex-col lg:w-72 xl:w-80 border-r border-slate-200/60 bg-white shadow-sm animate-slide-in-left">
        <NavContent />
      </aside>

      <header 
        className={`lg:hidden fixed top-0 left-0 right-0 z-50 glass-effect border-b border-slate-200/60 px-3 py-2.5 transition-transform duration-300 ${
          headerVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-sky-600" />
            <h1 className="text-base font-bold text-slate-900">QZero</h1>
          </div>
          {isBusinessMode && user && (
            <Badge className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white border-0 text-xs px-2 py-0.5 animate-scale-in">
              <Building2 className="w-3 h-3 mr-1" />
              B2B
            </Badge>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:pt-0 pt-12 pb-20 lg:pb-0 animate-fade-in">
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>

      {/* Menu inferior mobile - estilo Instagram */}
      <MobileBottomNav isBusinessMode={isBusinessMode} user={user} isRedirecting={isRedirecting} />
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  return <LayoutContent children={children} currentPageName={currentPageName} />;
}
