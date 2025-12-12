import { useEffect, useState } from 'react';
import { businessAccessService } from '@/services/businessAccessService';
import { useUser } from '@/contexts/UserContext';

export function useBusinessAccess() {
  // 🎯 CONTEXTO COMPARTILHADO: Consome user do contexto (UMA ÚNICA chamada a base44.auth.me())
  const { user } = useUser();
  
  const [businessAccess, setBusinessAccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const loadUserAndAccess = async () => {
      // ⚠️ GATE: Esperar user do contexto antes de carregar acesso empresarial
      if (!user) {
        setLoading(false);
        setBusinessAccess(null);
        return;
      }
      
      try {
        console.log('✅ useBusinessAccess: Usando user do contexto (sem chamada duplicada):', user.email);
        
        const access = await businessAccessService.getUserBusinessAccess(user);
        console.log('🏢 useBusinessAccess: Acesso empresarial carregado:', {
          hasAccess: access.hasAccess,
          isPending: access.isPending,
          source: access.source
        });
        
        setBusinessAccess(access);
      } catch (error) {
        // 📊 LOGGING DETALHADO para debug Safari iOS
        const errorDetails = {
          message: error?.message || 'Unknown error',
          status: error?.response?.status || 'No status',
          type: error?.name || 'Unknown type',
          stack: error?.stack?.substring(0, 200) || 'No stack trace'
        };
        
        console.error('❌ useBusinessAccess: Erro ao carregar acesso empresarial:', errorDetails);
        
        // Não fazer logout aqui - deixar Layout.jsx gerir autenticação
        // Este hook apenas gere acesso empresarial, não sessão global
      } finally {
        setLoading(false);
      }
    };

    loadUserAndAccess();
  }, [refreshKey, user]);
  
  // Função para forçar recarga (pode ser chamada externamente)
  const refresh = () => {
    console.log('🔄 useBusinessAccess: Recarga forçada');
    setRefreshKey(prev => prev + 1);
  };

  return {
    user,
    companyProfile: businessAccess?.companyProfile || null,
    subscription: businessAccess?.subscription || null,
    loading,
    isLoading: loading, // ✅ Alias para compatibilidade
    hasAccess: businessAccess?.hasAccess || false, // ✅ CORRIGIDO: Retornar hasAccess diretamente
    hasActiveSubscription: businessAccess?.hasAccess || false, // ✅ Manter para compatibilidade
    hasPendingPayment: businessAccess?.isPending || false,
    isPending: businessAccess?.isPending || false, // ✅ Alias para compatibilidade
    isExpired: businessAccess?.isExpired || false, // 🚫 Flag de expiração
    source: businessAccess?.source || 'none',
    refresh
  };
}
