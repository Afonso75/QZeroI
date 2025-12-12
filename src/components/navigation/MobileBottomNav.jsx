import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, LayoutDashboard, Clock, Calendar, Building2, User, MessageSquare } from 'lucide-react';
import { createPageUrl } from '@/utils';

export function MobileBottomNav({ isBusinessMode = false, user, isRedirecting = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isNavigating, setIsNavigating] = React.useState(false);
  
  const currentPath = location.pathname;
  
  const isActive = (paths) => {
    return paths.some(path => {
      const normalizedPath = currentPath.toLowerCase();
      const normalizedTarget = path.toLowerCase();
      
      // Exact match
      if (normalizedPath === normalizedTarget) {
        return true;
      }
      
      // For paths with "/", use startsWith to avoid false positives
      // e.g., "/support" should not match "/business-support"
      if (normalizedTarget.startsWith('/')) {
        return normalizedPath === normalizedTarget || normalizedPath.startsWith(normalizedTarget + '/');
      }
      
      // For other paths, check if it's part of the current path
      return normalizedPath.includes('/' + normalizedTarget);
    });
  };
  
  const navItems = isBusinessMode ? [
    {
      icon: Home,
      label: 'Home',
      path: createPageUrl('BusinessHome'),
      activePaths: ['business-home', 'businesshome']
    },
    {
      icon: LayoutDashboard,
      label: 'Painel',
      path: createPageUrl('BusinessDashboard'),
      activePaths: ['business-dashboard', 'businessdashboard']
    },
    {
      icon: Clock,
      label: 'Senhas',
      path: createPageUrl('BusinessQueues'),
      activePaths: ['business-queues', 'businessqueues']
    },
    {
      icon: Calendar,
      label: 'Marcações',
      path: createPageUrl('BusinessServices'),
      activePaths: ['business-services', 'businessservices']
    },
    {
      icon: Building2,
      label: 'Configurações',
      path: createPageUrl('BusinessSettings'),
      activePaths: ['business-settings', 'businesssettings']
    },
    {
      icon: User,
      label: 'Perfil',
      path: createPageUrl('Profile'),
      activePaths: ['/profile', '/perfil']
    },
    {
      icon: MessageSquare,
      label: 'Suporte',
      path: createPageUrl('BusinessSupport'),
      activePaths: ['/business-support', '/businesssupport']
    }
  ] : [
    {
      icon: Home,
      label: 'Home',
      path: createPageUrl('Home'),
      activePaths: ['/home']
    },
    {
      icon: User,
      label: 'Portal',
      path: createPageUrl('CustomerPortal'),
      activePaths: ['customer-portal', 'customerportal']
    },
    {
      icon: Building2,
      label: 'Empresas',
      path: createPageUrl('Businesses'),
      activePaths: ['businesses', 'empresas']
    },
    {
      icon: User,
      label: 'Perfil',
      path: createPageUrl('Profile'),
      activePaths: ['/profile', '/perfil']
    },
    {
      icon: MessageSquare,
      label: 'Suporte',
      path: createPageUrl('Support'),
      activePaths: ['/support', '/suporte']
    }
  ];

  const handleNavigation = (path) => {
    // 🛡️ PROTEÇÃO SAFARI iOS: Prevenir navegação durante redirects ou navegação em progresso
    if (path === '#' || isNavigating || isRedirecting) {
      console.log('⚠️ MobileBottomNav: Navegação bloqueada', { 
        isNavigating, 
        isRedirecting,
        reason: isRedirecting ? 'Layout está redirecionando' : 'Navegação em progresso'
      });
      return;
    }
    
    console.log('📱 MobileBottomNav: Navegando para', path);
    setIsNavigating(true);
    
    // Resetar flag após navegação completar
    setTimeout(() => setIsNavigating(false), 1000);
    
    navigate(path);
  };

  return (
    <nav 
      className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 lg:hidden"
      style={{ 
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)',
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.08)'
      }}
    >
      <div className="flex items-center justify-around h-[60px] px-2">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const active = isActive(item.activePaths);
          
          return (
            <button
              key={index}
              onClick={() => handleNavigation(item.path)}
              className="flex items-center justify-center flex-1 h-full min-w-[44px] min-h-[44px] transition-colors focus:outline-none"
              aria-label={item.label}
            >
              <Icon 
                className={`w-6 h-6 transition-all ${
                  active 
                    ? isBusinessMode 
                      ? 'text-indigo-600 stroke-[2.5]' 
                      : 'text-sky-600 stroke-[2.5]'
                    : 'text-gray-400 stroke-[1.5]'
                }`}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
