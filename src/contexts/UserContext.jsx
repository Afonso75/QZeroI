import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authFailed, setAuthFailed] = useState(false);
  const isMountedRef = useRef(true);
  const retryTimeoutIdRef = useRef(null);

  const loadUserWithRetry = useCallback(async (attempt = 1, maxAttempts = 1) => {
    if (!isMountedRef.current) {
      console.log('⚠️ UserContext: Componente desmontado, cancelando retry');
      return;
    }

    try {
      console.log(`🔄 UserContext: Carregando utilizador (tentativa ${attempt}/${maxAttempts})`);
      const userData = await base44.auth.me();
      
      if (isMountedRef.current) {
        console.log('✅ UserContext: Utilizador carregado:', userData.email);
        setUser(userData);
        setError(null);
        setAuthFailed(false);
        setLoading(false);
      }
    } catch (err) {
      // ✅ CRÍTICO: Se não há cookie (401), não fazer retry - aceitar que não está autenticado
      // Isto previne 3 tentativas falhadas desnecessárias em páginas protegidas
      if (isMountedRef.current) {
        console.log('⚠️ UserContext: Não autenticado - utilizador precisa fazer login');
        setUser(null);
        setError(err);
        setAuthFailed(true);
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    
    // ✅ CRÍTICO: Em páginas públicas, inicializar estado mas permitir refresh() posterior
    // Isto permite que após login bem-sucedido, refresh() possa carregar o utilizador
    const publicPaths = ['/login', '/register', '/reset-password', '/request-password-reset', '/business-detail'];
    const currentPath = window.location.pathname;
    const isPublicPage = publicPaths.some(path => currentPath.startsWith(path));
    
    if (isPublicPage) {
      console.log('🔓 UserContext: Página pública detectada - estado inicializado sem autenticação:', currentPath);
      setUser(null);
      setLoading(false);
      setAuthFailed(false);
      setError(null);
      // ✅ NÃO fazer return - permitir que cleanup function seja registrada
      return () => {
        isMountedRef.current = false;
        if (retryTimeoutIdRef.current) {
          clearTimeout(retryTimeoutIdRef.current);
        }
      };
    }
    
    // Apenas tentar carregar em páginas protegidas
    loadUserWithRetry();

    return () => {
      isMountedRef.current = false;
      if (retryTimeoutIdRef.current) {
        console.log('🧹 UserContext: Limpando timeout de retry pendente');
        clearTimeout(retryTimeoutIdRef.current);
      }
    };
  }, [loadUserWithRetry]);

  const refresh = useCallback(async () => {
    console.log('🔄 UserContext: Recarga silenciosa (sem limpar user atual)');
    // ✅ PERFORMANCE: Não limpar user/loading durante refresh para evitar re-renders em cascata
    // O user actual mantém-se visível enquanto carregamos os dados actualizados
    try {
      const userData = await base44.auth.me();
      if (isMountedRef.current) {
        setUser(userData);
        setError(null);
        setAuthFailed(false);
        setLoading(false);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err);
        setAuthFailed(true);
        setLoading(false);
      }
    }
  }, []);

  const logout = async () => {
    console.log('🚪 UserContext: Fazendo logout');
    await base44.auth.logout();
    setUser(null);
    setError(null);
    setAuthFailed(false);
  };

  // 🎯 MEMOIZAÇÃO: Prevenir re-renders infinitos quando user object muda mas dados são iguais
  const memoizedUser = useMemo(() => user, [user?.id, user?.email]);

  const value = useMemo(() => ({
    user: memoizedUser,
    loading,
    error,
    authFailed,
    refresh,
    logout
  }), [memoizedUser, loading, error, authFailed]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
