// ============================================================================
// QZero - Sistema de Gestão de Filas (Standalone)
// ============================================================================
// Sistema completo e independente que usa dados locais persistidos via API.
// Não requer Base44 ou outras dependências externas.
// Dados são armazenados localmente e via backend /api/demo/*
// ============================================================================

import { Capacitor } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';

// 🔒 PRODUÇÃO: Apenas logs em desenvolvimento
const IS_DEV = import.meta.env.DEV;

if (IS_DEV) {
  console.log('🚀 QZero - Sistema Standalone Iniciado');
  console.log('💡 Dados são salvos localmente. Para limpar tudo: clearAllMockData()');
}

// ============================================================================
// API CLIENT - Persistência via backend local
// ============================================================================

// ✅ Detectar Capacitor usando a API oficial
const isCapacitor = typeof window !== 'undefined' && Capacitor.isNativePlatform();

// ✅ CONFIGURAÇÃO DE URLs
// Produção: https://waitless-qzero.com (domínio personalizado)
// Replit Published: URL do Replit quando publicado
// Desenvolvimento: URL do Replit dev
const PRODUCTION_API_URL = 'https://waitless-qzero.com';
const REPLIT_PUBLISHED_URL = 'https://q-zero-afonsomarques80.replit.app';

// ✅ DETECTAR URL DA API PARA CAPACITOR
// Ordem de prioridade:
// 1. VITE_API_URL (definido na build)
// 2. Domínio de produção (se build de produção)
// 3. URL do Replit publicado (fallback seguro)
const getApiUrl = () => {
  // 1. URL configurado manualmente (maior prioridade)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // 2. Em produção (build com npm run build)
  if (import.meta.env.PROD) {
    // Usar URL do Replit publicado como fallback seguro
    // (funciona mesmo que waitless-qzero.com não esteja configurado)
    return REPLIT_PUBLISHED_URL;
  }
  
  // 3. Fallback para URL publicado do Replit
  return REPLIT_PUBLISHED_URL;
};

// API_BASE: URL completo para Capacitor, vazio para same-origin na web
const API_BASE = isCapacitor ? getApiUrl() : '';

// ✅ FUNÇÃO PARA VERIFICAR SE RESPOSTA É HTML (ERRO)
async function parseJsonOrThrow(response, endpoint) {
  // Lidar com respostas 204 No Content ou respostas vazias
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined;
  }
  
  const contentType = response.headers.get('content-type') || '';
  
  // Se não é JSON, provavelmente é uma página de erro HTML
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    
    // Resposta vazia é válida para alguns endpoints
    if (!text || text.trim() === '') {
      return undefined;
    }
    
    // Detectar HTML (erro comum: servidor retorna 404 HTML)
    if (text.includes('<!DOCTYPE') || text.includes('<html')) {
      console.error('❌ API ERROR: Servidor retornou HTML em vez de JSON');
      console.error('📍 Endpoint:', endpoint);
      console.error('🔍 Content-Type:', contentType);
      console.error('📄 Primeiros 200 chars:', text.substring(0, 200));
      
      throw new Error(
        `API indisponível: O servidor em ${API_BASE || window.location.origin} não está respondendo corretamente. ` +
        `Verifique se o servidor está publicado e acessível.`
      );
    }
    
    // Tentar parsear mesmo assim (alguns servidores não enviam content-type correto)
    try {
      return JSON.parse(text);
    } catch (e) {
      // Se for texto simples, retornar como objeto
      return { message: text };
    }
  }
  
  // Tentar parsear JSON de forma segura
  try {
    const text = await response.text();
    if (!text || text.trim() === '') {
      return undefined;
    }
    return JSON.parse(text);
  } catch (e) {
    console.warn('⚠️ Erro ao parsear JSON:', e.message);
    return undefined;
  }
}

// ✅ SEMPRE logar em Capacitor para debug, e em DEV para web
if (IS_DEV || isCapacitor) {
  console.log('📱 Ambiente detectado:', isCapacitor ? 'CAPACITOR (App Nativa)' : 'WEB (Browser)');
  console.log('🌐 API_BASE:', API_BASE || '(same-origin)');
  console.log('🔧 VITE_API_URL:', import.meta.env.VITE_API_URL || '(não definido)');
  console.log('🏭 import.meta.env.PROD:', import.meta.env.PROD);
  if (isCapacitor) {
    console.log('📍 Capacitor Platform:', window.Capacitor?.getPlatform?.() || 'unknown');
    console.log('🌐 window.location:', window.location.href);
  }
}

// ============================================================================
// 🍪 SAFARI iOS FIX: Fallback para localStorage quando cookies bloqueados
// Safari bloqueia cookies em iframes (Replit preview), então usamos
// localStorage como fallback + Authorization header
// ============================================================================
const AUTH_TOKEN_KEY = 'qzero_auth_token';

function getAuthToken() {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch (e) {
    return null;
  }
}

function clearAuthToken() {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    console.log('🗑️ Token removido do localStorage');
  } catch (e) {
    console.warn('⚠️ Erro ao remover token:', e);
  }
}

function getAuthHeaders(additionalHeaders = {}) {
  const headers = { ...additionalHeaders };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function getAuthFetchOptions(options = {}) {
  const token = getAuthToken();
  const fetchOptions = {
    ...options,
    credentials: 'include',
  };
  if (token) {
    fetchOptions.headers = {
      ...fetchOptions.headers,
      'Authorization': `Bearer ${token}`,
    };
  }
  return fetchOptions;
}

// 🔍 DEBUG: Log da configuração da API (apenas em desenvolvimento)
if (IS_DEV) {
  console.log('🔧 base44Client API CONFIG:', {
    'API_BASE': API_BASE || '(same origin)',
    'window.location.origin': window.location.origin,
    'Exemplo URL': `${window.location.origin}/api/auth/me`
  });
}

// ✅ FUNÇÃO HELPER: Processa resposta e lança erro se não OK
// Evita consumir o body duas vezes usando clone() ou parseamento único
async function handleResponse(response, endpoint) {
  // Parsear o body uma única vez
  const data = await parseJsonOrThrow(response, endpoint);
  
  // Se resposta não é OK, lançar erro com dados parseados
  if (!response.ok) {
    const errorMessage = data?.message || data?.error || `API error: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }
  
  return data;
}

// ✅ FUNÇÃO NATIVA FETCH - Usa CapacitorHttp no nativo para evitar CORS
async function nativeFetch(url, options = {}) {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
  
  if (isCapacitor) {
    try {
      const httpResponse = await CapacitorHttp.request({
        url: fullUrl,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        data: options.body ? JSON.parse(options.body) : undefined,
        webFetchExtra: {
          credentials: 'include'
        }
      });
      
      // Criar objeto response compatível com fetch API
      return {
        ok: httpResponse.status >= 200 && httpResponse.status < 300,
        status: httpResponse.status,
        statusText: httpResponse.status < 300 ? 'OK' : 'Error',
        headers: {
          get: (name) => httpResponse.headers?.[name.toLowerCase()] || httpResponse.headers?.[name] || null
        },
        json: async () => httpResponse.data,
        text: async () => typeof httpResponse.data === 'string' ? httpResponse.data : JSON.stringify(httpResponse.data),
        _data: httpResponse.data
      };
    } catch (error) {
      console.error('❌ CapacitorHttp error:', error);
      throw error;
    }
  }
  
  // Web: usar fetch normal
  return fetch(fullUrl, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
}

const demoAPI = {
  async get(endpoint, params = {}) {
    const fullUrl = `${API_BASE}${endpoint}`;
    const url = new URL(fullUrl, window.location.origin);
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });
    try {
      const authOptions = getAuthFetchOptions();
      const response = await nativeFetch(url.toString(), {
        headers: authOptions.headers
      });
      return await handleResponse(response, endpoint);
    } catch (error) {
      console.error(`❌ demoAPI.get(${endpoint}) failed:`, error);
      throw error;
    }
  },
  
  async post(endpoint, data) {
    try {
      const authOptions = getAuthFetchOptions();
      const response = await nativeFetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: authOptions.headers,
        body: JSON.stringify(data)
      });
      return await handleResponse(response, endpoint);
    } catch (error) {
      console.error(`❌ demoAPI.post(${endpoint}) failed:`, error);
      throw error;
    }
  },
  
  async put(endpoint, data) {
    try {
      const authOptions = getAuthFetchOptions();
      const response = await nativeFetch(`${API_BASE}${endpoint}`, {
        method: 'PUT',
        headers: authOptions.headers,
        body: JSON.stringify(data)
      });
      return await handleResponse(response, endpoint);
    } catch (error) {
      console.error(`❌ demoAPI.put(${endpoint}) failed:`, error);
      throw error;
    }
  },
  
  async delete(endpoint) {
    try {
      const authOptions = getAuthFetchOptions();
      const response = await nativeFetch(`${API_BASE}${endpoint}`, {
        method: 'DELETE',
        headers: authOptions.headers
      });
      return await handleResponse(response, endpoint);
    } catch (error) {
      console.error(`❌ demoAPI.delete(${endpoint}) failed:`, error);
      throw error;
    }
  }
};

// 🔒 FUNÇÕES DE DEBUG - APENAS EM DESENVOLVIMENTO
// ⚠️ CRÍTICO: Estas funções NÃO são expostas em produção para prevenir manipulação de dados
if (IS_DEV) {
  // Função para limpar TODOS os dados mock
  window.clearAllMockData = function() {
    console.log('🧹 Limpando TODOS os dados...');
    localStorage.clear();
    console.log('✅ Dados limpos! Recarregando...');
    alert('✅ Dados limpos!\n\nRecarregando...');
    setTimeout(() => window.location.reload(), 300);
  };

  // Função para criar NOVA CONTA (simula novo utilizador)
  window.createNewAccount = function(options = {}) {
    const newUser = {
      id: `user_${Date.now()}`,
      name: options.name || 'Novo Utilizador',
      email: options.email || `user${Date.now()}@example.com`,
      account_type: options.account_type || null,
      onboarding_completed: false,
      has_business_subscription: false,
      business_profile_completed: false,
      business_id: null,
      is_business_user: false,
      country: 'PT',
      city: options.city || 'Lisboa',
      latitude: 38.7223,
      longitude: -9.1393,
      profile_completed: false
    };
    
    console.log('🧹 Limpando dados antigos...');
    localStorage.clear();
    
    console.log('👤 Criando nova conta:', newUser.email);
    localStorage.setItem('mock_user', JSON.stringify(newUser));
    
    alert('✅ Nova conta criada!\n\nEmail: ' + newUser.email + '\n\nRecarregando...');
    
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };
  
  console.log('🛠️ Funções de debug disponíveis: clearAllMockData(), createNewAccount()');
}


// Migração automática: Corrige tickets com status inválido
function migrateTicketStatuses() {
  const stored = localStorage.getItem('mock_tickets');
  if (!stored) return;
  
  const tickets = JSON.parse(stored);
  let migrated = 0;
  let attendingMigrated = 0;
  
  const updated = tickets.map(ticket => {
    const updatedTicket = { ...ticket };
    
    // Corrige status 'aberta' (de fila) para 'aguardando' (de senha)
    if (ticket.status === 'aberta') {
      updatedTicket.status = 'aguardando';
      migrated++;
      console.log(`🔧 Migrado ticket ${ticket.id}: status 'aberta' → 'aguardando'`);
    }
    
    // Adiciona attending_started_at para tickets em atendimento sem timestamp
    if (ticket.status === 'atendendo' && !ticket.attending_started_at) {
      updatedTicket.attending_started_at = new Date().toISOString();
      attendingMigrated++;
      console.log(`⏰ Migrado ticket ${ticket.id}: adicionado attending_started_at`);
    }
    
    return updatedTicket;
  });
  
  if (migrated > 0 || attendingMigrated > 0) {
    localStorage.setItem('mock_tickets', JSON.stringify(updated));
    console.log(`✅ Migração concluída: ${migrated} tickets com status corrigido, ${attendingMigrated} com timestamp adicionado`);
  }
}

// Executa migração ao carregar
migrateTicketStatuses();

console.log('💡 Para limpar TODOS os dados e começar do zero, execute no console: clearAllMockData()');

// Função para criar utilizador padrão (novo utilizador sem onboarding)
function createDefaultUser() {
  return {
    id: `user_${Date.now()}`,
    name: 'Novo Utilizador',
    email: `user${Date.now()}@example.com`,
    account_type: null,
    onboarding_completed: false,
    has_business_subscription: false,
    business_profile_completed: false,
    business_id: null,
    is_business_user: false,
    country: 'PT',
    city: 'Lisboa',
    latitude: 38.7223,
    longitude: -9.1393,
    profile_completed: false
  };
}

// Utilizador inicial (será substituído pelos dados do localStorage)
let mockUser = createDefaultUser();

const mockBusinesses = [
  {
    id: '1',
    name: 'Clínica Saúde+',
    description: 'Clínica médica com especialidades diversas',
    address: 'Rua das Flores, 123, Lisboa, Portugal',
    logo_url: '',
    is_active: true,
    rating: 4.5,
    owner_email: 'demo@example.com',
    email: 'contato@clinicasaude.com',
    phone: '+351 123 456 789',
    sms_gateway: 'none',
    subscription_status: 'active',
    subscription_plan: 'professional',
    latitude: 38.7223,
    longitude: -9.1393,
    category: 'saude'
  },
  {
    id: '2',
    name: 'Restaurante Sabor',
    description: 'Cozinha portuguesa tradicional',
    address: 'Avenida Central, 45, Porto, Portugal',
    logo_url: '',
    is_active: true,
    rating: 4.8,
    latitude: 41.1579,
    longitude: -8.6291,
    category: 'restauracao'
  },
  {
    id: '3',
    name: 'Banco Digital',
    description: 'Serviços bancários modernos',
    address: 'Praça do Comércio, 1, Lisboa, Portugal',
    logo_url: '',
    is_active: true,
    rating: 4.2,
    latitude: 38.7078,
    longitude: -9.1365,
    category: 'financas'
  }
];

// Create a comprehensive mock client (para modo demo)
const mockBase44Client = {
  auth: {
    me: async () => {
      try {
        const endpoint = '/api/auth/me';
        const authOptions = getAuthFetchOptions();
        const response = await nativeFetch(`${API_BASE}${endpoint}`, {
          headers: authOptions.headers
        });
        
        if (!response.ok) {
          // Tentar obter mensagem de erro do servidor
          const errorData = await parseJsonOrThrow(response, endpoint).catch(() => null);
          throw new Error(errorData?.message || 'Not authenticated');
        }
        
        const user = await parseJsonOrThrow(response, endpoint);
        
        // ✅ USAR VALORES DO BACKEND (já calculados corretamente)
        const formattedUser = {
          id: user.id,
          email: user.email,
          name: user.full_name,
          full_name: user.full_name,
          nome_completo: user.full_name,
          account_type: user.account_type,
          onboarding_completed: user.onboarding_completed,  // Do backend
          has_business_subscription: user.has_business_subscription,  // Do backend (calculado dinamicamente)
          business_profile_completed: !!user.business_id,
          business_id: user.business_id,
          is_business_user: user.is_business_user,
          is_staff_member: user.is_staff_member,
          staff_permissions: user.staff_permissions,
          phone: user.phone,
          birthdate: user.birthdate,
          data_nascimento: user.birthdate,
          country: user.country || 'PT',
          city: user.city || 'Lisboa',
          latitude: 38.7223,
          longitude: -9.1393,
          profile_completed: !!(user.full_name && user.phone),
          created_date: user.createdAt || new Date().toISOString()
        };
        
        mockUser = formattedUser;
        return formattedUser;
      } catch (error) {
        throw error;
      }
    },
    updateMe: async (updates) => {
      try {
        const updateData = {};
        
        // Aceitar tanto português quanto inglês
        if (updates.name !== undefined) updateData.fullName = updates.name;
        if (updates.nome_completo !== undefined) updateData.fullName = updates.nome_completo;
        if (updates.fullName !== undefined) updateData.fullName = updates.fullName;
        
        if (updates.phone !== undefined) updateData.phone = updates.phone;
        
        if (updates.birthdate !== undefined) updateData.birthdate = updates.birthdate;
        if (updates.data_nascimento !== undefined) updateData.birthdate = updates.data_nascimento;
        
        if (updates.is_business_user !== undefined) updateData.isBusinessUser = updates.is_business_user;
        if (updates.business_id !== undefined) updateData.businessId = updates.business_id;
        if (updates.staff_permissions !== undefined) updateData.staffPermissions = updates.staff_permissions;
        if (updates.is_staff_member !== undefined) updateData.isStaffMember = updates.is_staff_member;
        
        // CRÍTICO: Mapear account_type para staff invites
        if (updates.account_type !== undefined) updateData.accountType = updates.account_type;
        
        // Campos extras de localização
        if (updates.country !== undefined) updateData.country = updates.country;
        if (updates.city !== undefined) updateData.city = updates.city;
        
        if (updates.business_id && !updateData.isBusinessUser) {
          updateData.isBusinessUser = true;
        }
        
        const endpoint = '/api/auth/update-profile';
        const authOptions = getAuthFetchOptions();
        const response = await nativeFetch(`${API_BASE}${endpoint}`, {
          method: 'PUT',
          headers: authOptions.headers,
          body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
          const errorData = await parseJsonOrThrow(response, endpoint).catch(() => null);
          throw new Error(errorData?.message || 'Failed to update profile');
        }
        
        const data = await parseJsonOrThrow(response, endpoint);
        const user = data.user;
        
        // ✅ USAR VALORES DO BACKEND (já calculados corretamente)
        const formattedUser = {
          id: user.id,
          email: user.email,
          name: user.full_name,
          full_name: user.full_name,
          nome_completo: user.full_name,
          account_type: user.account_type,
          onboarding_completed: user.onboarding_completed,  // Do backend
          has_business_subscription: user.has_business_subscription,  // Do backend (calculado dinamicamente)
          business_profile_completed: !!user.business_id,
          business_id: user.business_id,
          is_business_user: user.is_business_user,
          is_staff_member: user.is_staff_member,
          staff_permissions: user.staff_permissions,
          phone: user.phone,
          birthdate: user.birthdate,
          data_nascimento: user.birthdate,
          country: user.country || 'PT',
          city: user.city || 'Lisboa',
          latitude: 38.7223,
          longitude: -9.1393,
          profile_completed: !!(user.full_name && user.phone),
          created_date: user.created_at || new Date().toISOString()
        };
        
        mockUser = formattedUser;
        return formattedUser;
      } catch (error) {
        console.error('Error updating profile:', error);
        throw error;
      }
    },
    changePassword: async (currentPassword, newPassword) => {
      try {
        const endpoint = '/api/auth/change-password';
        const authOptions = getAuthFetchOptions();
        const response = await nativeFetch(`${API_BASE}${endpoint}`, {
          method: 'POST',
          headers: authOptions.headers,
          body: JSON.stringify({ currentPassword, newPassword })
        });
        
        const data = await parseJsonOrThrow(response, endpoint);
        
        if (!response.ok) {
          throw new Error(data?.error || 'Erro ao alterar senha');
        }
        
        return data;
      } catch (error) {
        console.error('Error changing password:', error);
        throw error;
      }
    },
    redirectToLogin: () => {
      window.location.href = '/login';
    },
    logout: async () => {
      try {
        // 🧹 LIMPAR TUDO antes de fazer logout
        try {
          // Limpar sessionStorage (2FA login data)
          sessionStorage.removeItem('2fa_login_email');
          sessionStorage.removeItem('2fa_login_step');
          sessionStorage.removeItem('2fa_challenge_token');
          
          // Limpar localStorage (cache de empresas, etc)
          localStorage.removeItem('company_profiles');
          localStorage.removeItem('businesses');
          
          console.log('🧹 SessionStorage e localStorage limpos no logout');
        } catch (e) {
          console.warn('⚠️ Erro ao limpar storage:', e);
        }
        
        // 🔌 Chamar endpoint de logout (limpa cookies e DB)
        const authOptions = getAuthFetchOptions();
        await nativeFetch(`${API_BASE}/api/auth/logout`, {
          method: 'POST',
          headers: authOptions.headers
        });
        
        // 🍪 SAFARI iOS FIX: Limpar token do localStorage
        clearAuthToken();
        
        console.log('✅ Logout completo - redirecionando...');
        window.location.href = '/login';
      } catch (error) {
        console.error('Logout error:', error);
        // Mesmo com erro, redirecionar para login
        window.location.href = '/login';
      }
    },
    deleteAccount: async () => {
      try {
        // 🗑️ Eliminar conta permanentemente
        const authOptions = getAuthFetchOptions();
        const response = await nativeFetch(`${API_BASE}/api/auth/delete-account`, {
          method: 'DELETE',
          headers: authOptions.headers
        });
        
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'Erro ao eliminar conta');
        }
        
        // 🧹 Limpar TUDO localmente
        try {
          sessionStorage.clear();
          localStorage.clear();
          console.log('🧹 Storage limpo após eliminação de conta');
        } catch (e) {
          console.warn('⚠️ Erro ao limpar storage:', e);
        }
        
        // 🍪 Limpar token
        clearAuthToken();
        
        console.log('✅ Conta eliminada - redirecionando...');
        window.location.href = '/login';
        
        return { success: true };
      } catch (error) {
        console.error('Delete account error:', error);
        throw error;
      }
    }
  },
  entities: {
    Business: {
      filter: async (filters = {}) => {
        // ✅ BUSCAR DO POSTGRESQL (endpoint depende dos filtros)
        try {
          let endpoint = '/api/public/businesses';  // Default: empresas ativas públicas
          let needsAuth = false;
          
          // Se filtrar por owner_id, usar endpoint autenticado que retorna TODAS as empresas do owner (incluindo inativas)
          if (filters.owner_id !== undefined) {
            endpoint = '/api/company-profiles/my-businesses';
            needsAuth = true;
          }
          
          const fetchOptions = needsAuth ? getAuthFetchOptions() : {};
          const response = await nativeFetch(`${API_BASE}${endpoint}`, {
            headers: fetchOptions.headers
          });
          
          if (!response.ok) {
            console.warn('⚠️ Erro ao buscar empresas do PostgreSQL');
            return [];
          }
          
          let businesses = await response.json();
          
          // Aplicar filtros client-side se necessário
          if (filters.id !== undefined) {
            businesses = businesses.filter(b => b.id === filters.id);
          }
          
          // ✅ Servidor já envia campos normalizados - apenas pass-through
          return businesses.map(b => ({
            id: b.id,
            name: b.name || b.companyName || '',
            description: b.description || b.companyDescription || '',
            address: b.address || b.companyAddress || '',
            logo_url: b.logo_url || b.logoUrl || '',
            is_active: b.is_active !== undefined ? b.is_active : b.status === 'active',
            rating: b.rating || null,
            owner_id: b.owner_id || b.admin_user_id,
            email: b.email || b.companyEmail || '',
            phone: b.phone || b.companyPhone || '',
            category: b.category || b.companyCategory || '',
            latitude: b.latitude || b.companyCoordinates?.lat || 0,
            longitude: b.longitude || b.companyCoordinates?.lng || 0,
            media_gallery: b.media_gallery || b.mediaGallery || [],
            subscription_status: b.subscription_status || 'active',
            subscription_plan: 'professional'
          }));
        } catch (error) {
          console.error('❌ Erro ao buscar empresas:', error);
          return [];
        }
      },
      get: async (id) => {
        try {
          const authOptions = getAuthFetchOptions();
          const response = await nativeFetch(`${API_BASE}/api/company-profiles/${id}`, {
            headers: authOptions.headers
          });
          if (!response.ok) return null;
          
          const b = await response.json();
          
          // ✅ Servidor pode enviar campos normalizados ou originais
          return {
            id: b.id,
            name: b.name || b.companyName || '',
            description: b.description || b.companyDescription || '',
            address: b.address || b.companyAddress || '',
            logo_url: b.logo_url || b.logoUrl || '',
            is_active: b.is_active !== undefined ? b.is_active : b.status === 'active',
            rating: b.rating || null,
            owner_id: b.owner_id || b.admin_user_id,
            email: b.email || b.companyEmail || '',
            phone: b.phone || b.companyPhone || '',
            category: b.category || b.companyCategory || '',
            latitude: b.latitude || b.companyCoordinates?.lat || 0,
            longitude: b.longitude || b.companyCoordinates?.lng || 0,
            media_gallery: b.media_gallery || b.mediaGallery || [],
            subscription_status: b.subscription_status || 'active',
            subscription_plan: 'professional'
          };
        } catch (error) {
          console.error('❌ Erro ao buscar empresa:', error);
          return null;
        }
      },
      list: async () => {
        // Mesmo que filter sem filtros
        return await mockBase44Client.entities.Business.filter({});
      },
      update: async (id, data) => {
        // ✅ ATUALIZAR NO POSTGRESQL via company-profiles
        try {
          const authOptions = getAuthFetchOptions();
          const response = await nativeFetch(`${API_BASE}/api/company-profiles/${id}`, {
            method: 'PUT',
            headers: authOptions.headers,
            body: JSON.stringify(data)
          });
          
          if (!response.ok) {
            throw new Error('Failed to update business');
          }
          
          return await response.json();
        } catch (error) {
          console.error('❌ Erro ao atualizar empresa:', error);
          throw error;
        }
      },
      create: async (data) => {
        // ✅ CRIAR NO POSTGRESQL via company-profiles
        try {
          const authOptions = getAuthFetchOptions();
          const response = await nativeFetch(`${API_BASE}/api/company-profiles`, {
            method: 'POST',
            headers: authOptions.headers,
            body: JSON.stringify(data)
          });
          
          if (!response.ok) {
            throw new Error('Failed to create business');
          }
          
          return await response.json();
        } catch (error) {
          console.error('❌ Erro ao criar empresa:', error);
          throw error;
        }
      }
    },
    Queue: {
      filter: async (filters = {}) => {
        const params = {};
        if (filters.business_id) params.business_id = filters.business_id;
        if (filters.is_active !== undefined) params.is_active = filters.is_active;
        if (filters.id) params.id = filters.id;
        
        const queues = await demoAPI.get('/api/demo/queues', params);
        return queues;
      },
      create: async (data) => {
        const queue = await demoAPI.post('/api/demo/queues', data);
        return queue;
      },
      update: async (id, data) => {
        const updated = await demoAPI.put(`/api/demo/queues/${id}`, data);
        return updated;
      },
      delete: async (id) => {
        await demoAPI.delete(`/api/demo/queues/${id}`);
        return { success: true };
      }
    },
    Service: {
      filter: async (filters = {}) => {
        const params = {};
        if (filters.id) params.id = filters.id;
        if (filters.business_id) params.business_id = filters.business_id;
        if (filters.is_active !== undefined) params.is_active = filters.is_active;
        
        const services = await demoAPI.get('/api/demo/services', params);
        return services;
      },
      create: async (data) => {
        const service = await demoAPI.post('/api/demo/services', data);
        return service;
      },
      update: async (id, data) => {
        const updated = await demoAPI.put(`/api/demo/services/${id}`, data);
        return updated;
      },
      delete: async (id) => {
        await demoAPI.delete(`/api/demo/services/${id}`);
        return { success: true };
      }
    },
    Ticket: {
      filter: async (filters = {}) => {
        const params = {};
        if (filters.id) params.id = filters.id;
        if (filters.user_email) params.user_email = filters.user_email;
        if (filters.queue_id) params.queue_id = filters.queue_id;
        if (filters.business_id) params.business_id = filters.business_id;
        if (filters.status && filters.status.$in) {
          params.status = filters.status.$in.join(',');
        }
        
        return await demoAPI.get('/api/demo/tickets', params);
      },
      
      list: async () => {
        return await demoAPI.get('/api/demo/tickets');
      },
      
      create: async (data) => {
        return await demoAPI.post('/api/demo/tickets', data);
      },
      
      update: async (id, data) => {
        return await demoAPI.put(`/api/demo/tickets/${id}`, data);
      },
      
      delete: async (id) => {
        await demoAPI.delete(`/api/demo/tickets/${id}`);
        return { success: true };
      }
    },
    Appointment: {
      filter: async (filters = {}) => {
        const params = {};
        if (filters.user_email) params.user_email = filters.user_email;
        if (filters.business_id) params.business_id = filters.business_id;
        if (filters.status && filters.status.$in) {
          params.status = filters.status.$in.join(',');
        }
        
        const appointments = await demoAPI.get('/api/demo/appointments', params);
        return appointments;
      },
      list: async () => {
        const appointments = await demoAPI.get('/api/demo/appointments');
        return appointments;
      },
      create: async (data) => {
        const appointment = await demoAPI.post('/api/demo/appointments', data);
        return appointment;
      },
      update: async (id, data) => {
        const updated = await demoAPI.put(`/api/demo/appointments/${id}`, data);
        return updated;
      },
      delete: async (id) => {
        await demoAPI.delete(`/api/demo/appointments/${id}`);
        return { success: true };
      }
    },
    Review: {
      filter: async (filters = {}) => {
        const params = {};
        if (filters.business_id) params.business_id = filters.business_id;
        if (filters.user_email) params.user_email = filters.user_email;
        
        const reviews = await demoAPI.get('/api/demo/reviews', params);
        return reviews;
      },
      list: async () => {
        const reviews = await demoAPI.get('/api/demo/reviews');
        return reviews;
      },
      create: async (data) => {
        const review = await demoAPI.post('/api/demo/reviews', data);
        return review;
      },
      update: async (id, data) => {
        const updated = await demoAPI.put(`/api/demo/reviews/${id}`, data);
        return updated;
      },
      delete: async (id) => {
        await demoAPI.delete(`/api/demo/reviews/${id}`);
        return { success: true };
      }
    },
    Subscription: {
      filter: (filters = {}) => {
        console.log('Mock: Filtering subscriptions', filters);
        const stored = JSON.parse(localStorage.getItem('mock_subscriptions') || '[]');
        let filtered = stored;
        
        if (filters.user_email) {
          filtered = filtered.filter(s => s.user_email === filters.user_email);
        }
        if (filters.plan) {
          filtered = filtered.filter(s => s.plan === filters.plan);
        }
        if (filters.status) {
          filtered = filtered.filter(s => s.status === filters.status);
        }
        
        return Promise.resolve(filtered);
      },
      create: (data) => {
        console.log('Mock: Creating subscription', data);
        const newSubscription = {
          id: `sub_${Date.now()}`,
          ...data,
          created_date: new Date().toISOString()
        };
        
        const stored = JSON.parse(localStorage.getItem('mock_subscriptions') || '[]');
        stored.push(newSubscription);
        localStorage.setItem('mock_subscriptions', JSON.stringify(stored));
        
        return Promise.resolve(newSubscription);
      },
      update: (id, data) => {
        console.log('Mock: Updating subscription', id, data);
        const stored = JSON.parse(localStorage.getItem('mock_subscriptions') || '[]');
        const index = stored.findIndex(s => s.id === id);
        
        if (index !== -1) {
          stored[index] = { ...stored[index], ...data };
          localStorage.setItem('mock_subscriptions', JSON.stringify(stored));
          return Promise.resolve(stored[index]);
        }
        
        return Promise.reject(new Error('Subscription not found'));
      }
    },
    StaffInvite: {
      filter: async (filters = {}) => {
        const params = {};
        if (filters.business_id) params.business_id = filters.business_id;
        if (filters.email) params.email = filters.email;
        if (filters.status) params.status = filters.status;
        if (filters.token) params.token = filters.token;
        
        const invites = await demoAPI.get('/api/demo/staff-invites', params);
        return invites;
      },
      create: async (data) => {
        const invite = await demoAPI.post('/api/demo/staff-invites', data);
        return invite;
      },
      update: async (id, data) => {
        const updated = await demoAPI.put(`/api/demo/staff-invites/${id}`, data);
        return updated;
      },
      delete: async (id) => {
        await demoAPI.delete(`/api/demo/staff-invites/${id}`);
        return { success: true };
      }
    },
    SupportMessage: {
      filter: async (filters = {}) => {
        const params = {};
        if (filters.business_id) params.business_id = filters.business_id;
        if (filters.user_email) params.user_email = filters.user_email;
        if (filters.status) params.status = filters.status;
        
        const messages = await demoAPI.get('/api/demo/support-messages', params);
        return messages;
      },
      create: async (data) => {
        const message = await demoAPI.post('/api/demo/support-messages', data);
        return message;
      },
      update: async (id, data) => {
        const updated = await demoAPI.put(`/api/demo/support-messages/${id}`, data);
        return updated;
      },
      delete: async (id) => {
        await demoAPI.delete(`/api/demo/support-messages/${id}`);
        return { success: true };
      }
    },
    User: {
      filter: async (filters = {}) => {
        const params = {};
        if (filters.business_id) params.business_id = filters.business_id;
        if (filters.is_staff_member !== undefined) params.is_staff_member = filters.is_staff_member;
        if (filters.email) params.email = filters.email;
        
        const users = await demoAPI.get('/api/demo/users', params);
        return users;
      },
      update: async (id, data) => {
        const updated = await demoAPI.put(`/api/demo/users/${id}`, data);
        return updated;
      },
      delete: async (id) => {
        await demoAPI.delete(`/api/demo/users/${id}`);
        return { success: true };
      }
    }
  },
  // Add any other methods that might be called
  functions: {},
  integrations: {
    Core: {
      SendEmail: (data) => {
        console.log('Mock: Sending email', data);
        return Promise.resolve({ success: true, message: 'Email enviado (simulado)' });
      },
      UploadFile: async ({ file }) => {
        console.log('📤 Uploading file:', file.name, file.size, 'bytes');
        
        // 1. Tentar Object Storage primeiro (persistente)
        try {
          const authOptions = getAuthFetchOptions();
          const uploadUrlResponse = await nativeFetch(`${API_BASE}/api/objects/upload`, {
            method: 'POST',
            headers: authOptions.headers,
            body: JSON.stringify({ filename: file.name })
          });
          
          if (uploadUrlResponse.ok) {
            const { uploadURL, objectPath } = await uploadUrlResponse.json();
            
            // Upload direto para Object Storage via presigned URL (fetch normal funciona)
            const uploadResponse = await fetch(uploadURL, {
              method: 'PUT',
              headers: { 'Content-Type': file.type || 'application/octet-stream' },
              body: file
            });
            
            if (uploadResponse.ok) {
              console.log('✅ Upload concluído (Object Storage):', objectPath);
              return { file_url: objectPath };
            }
            
            console.warn('⚠️ Object Storage upload failed, falling back to local');
          } else {
            const errorData = await uploadUrlResponse.json().catch(() => ({}));
            if (errorData.fallback) {
              console.log('ℹ️ Object Storage não configurado, usando upload local');
            } else {
              console.warn('⚠️ Object Storage indisponível, usando fallback');
            }
          }
        } catch (error) {
          console.warn('⚠️ Object Storage erro:', error.message);
        }
        
        // 2. Fallback: Upload local (FormData - fetch normal interceptado por CapacitorHttp)
        const formData = new FormData();
        formData.append('file', file);
        
        const authOptions = getAuthFetchOptions();
        const response = await fetch(`${API_BASE}/api/upload`, {
          method: 'POST',
          credentials: 'include',
          headers: authOptions.headers ? { 'Authorization': authOptions.headers.Authorization } : {},
          body: formData
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erro ao fazer upload do ficheiro');
        }
        
        const data = await response.json();
        console.log('✅ Upload concluído (local):', data.file_url);
        
        return { file_url: data.file_url };
      },
      DeleteFile: async ({ fileUrl }) => {
        console.log('🗑️ Deleting file:', fileUrl);
        
        const authOptions = getAuthFetchOptions();
        const response = await nativeFetch(`${API_BASE}/api/delete-image`, {
          method: 'DELETE',
          headers: authOptions.headers,
          body: JSON.stringify({ fileUrl })
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erro ao apagar o ficheiro');
        }
        
        const data = await response.json();
        console.log('✅ Ficheiro apagado:', fileUrl);
        
        return data;
      }
    }
  }
};

// ============================================================================
// EXPORT - Cliente único para todo o sistema
// ============================================================================

// Exporta o client local (mock) como client padrão
export const base44 = mockBase44Client;

console.log('✅ QZero Client inicializado - Sistema standalone ativo');
