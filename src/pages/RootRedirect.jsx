import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useBusinessAccess } from '@/hooks/useBusinessAccess';
import { useAutoTranslate } from '@/hooks/useTranslate';

export default function RootRedirect() {
  const txtLoading = useAutoTranslate('A carregar...', 'pt');
  
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const { hasAccess, loading: accessLoading } = useBusinessAccess(user);

  useEffect(() => {
    const loadUser = async () => {
      try {
        console.log('🔍 RootRedirect: Verificando autenticação...');
        const userData = await base44.auth.me();
        
        // 🧹 LIMPAR CACHE: APENAS se utilizador estiver autenticado
        if (userData) {
          try {
            localStorage.removeItem('company_profiles');
            localStorage.removeItem('businesses');
            console.log('🗑️ RootRedirect: Cache de empresas limpo (utilizador autenticado)');
          } catch (e) {
            console.warn('⚠️ RootRedirect: Erro ao limpar localStorage:', e);
          }
        }
        console.log('✅ RootRedirect: Dados do utilizador:', userData);
        
        if (!userData) {
          console.log('⚠️ RootRedirect: Sem dados de utilizador, redirecionando para login');
          navigate('/login', { replace: true });
          setIsLoading(false);
          return;
        }

        setUser(userData);
      } catch (error) {
        console.error('❌ RootRedirect: Erro ao verificar autenticação:', error);
        navigate('/login', { replace: true });
        setIsLoading(false);
      }
    };

    loadUser();
  }, [navigate]);

  useEffect(() => {
    if (!user || accessLoading) return;

    const accountType = user.account_type || 'pessoal';
    console.log('👤 RootRedirect: Tipo de conta:', accountType);

    if (accountType === 'empresa') {
      if (!user.business_id || !user.business_profile_completed) {
        console.log('🏢 RootRedirect: Redirecionando para setup empresarial');
        navigate('/business-profile-setup', { replace: true });
      } else if (!hasAccess) {
        console.log('💳 RootRedirect: Sem acesso - redirecionando para subscrição');
        navigate('/business-subscription', { replace: true });
      } else {
        console.log('🏢 RootRedirect: Com acesso - redirecionando para home empresarial');
        navigate('/business-home', { replace: true });
      }
    } else {
      console.log('👤 RootRedirect: Redirecionando para home');
      navigate('/home', { replace: true });
    }
    setIsLoading(false);
  }, [user, hasAccess, accessLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-600">{txtLoading}</p>
        </div>
      </div>
    );
  }

  return null;
}
