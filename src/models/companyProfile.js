export const SUBSCRIPTION_STATUS = {
  PENDING_PAYMENT: 'pending_payment',
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  CANCELLED: 'cancelled',
  TRIAL: 'trial'
};

// Mapeamento de categorias: label PT → código
export const COMPANY_CATEGORIES = {
  'saude': 'Saúde',
  'financeiro': 'Financeiro',
  'governo': 'Governo',
  'restauracao': 'Restauração',
  'beleza': 'Beleza',
  'retalho': 'Retalho',
  'outros': 'Outros'
};

// Lista legada (retrocompatibilidade) - usar apenas para migração
const LEGACY_CATEGORIES = [
  'Clínica',
  'Restaurante',
  'Repartição Pública',
  'Barbearia',
  'Salão de Beleza',
  'Consultório',
  'Loja',
  'Banco',
  'Outros'
];

// Normalizar categoria (label legado ou novo código → código)
export const normalizeCategory = (category) => {
  if (!category) return 'outros';
  
  // Se já é um código válido, retornar
  if (COMPANY_CATEGORIES[category]) return category;
  
  // Mapear labels legados para códigos
  const legacyMap = {
    'Clínica': 'saude',
    'Consultório': 'saude',
    'Restaurante': 'restauracao',
    'Repartição Pública': 'governo',
    'Barbearia': 'beleza',
    'Salão de Beleza': 'beleza',
    'Loja': 'retalho',
    'Banco': 'financeiro',
    'Outros': 'outros'
  };
  
  return legacyMap[category] || 'outros';
};

// Normalizar país (nome completo ou código ISO)
export const normalizeCountry = (country) => {
  if (!country) return 'PT';
  
  // Se já é código ISO válido, retornar
  if (country.length === 2) return country.toUpperCase();
  
  // Mapear nomes completos para códigos ISO
  const countryMap = {
    'Portugal': 'PT',
    'Brasil': 'BR',
    'Espanha': 'ES',
    'França': 'FR',
    'Alemanha': 'DE',
    'Itália': 'IT',
    'Reino Unido': 'UK',
    'Estados Unidos': 'US',
    'Canadá': 'CA',
    'Outro': 'PT'
  };
  
  return countryMap[country] || 'PT';
};

export class CompanyProfile {
  constructor(data = {}) {
    this.id = data.id || `company_${Date.now()}`;
    this.companyName = data.companyName || '';
    this.companyVAT = data.companyVAT || '';
    this.companyCountry = data.companyCountry || 'PT';
    this.companyCity = data.companyCity || '';
    this.companyPostalCode = data.companyPostalCode || '';
    this.companyStreetName = data.companyStreetName || '';
    this.companyDoorNumber = data.companyDoorNumber || '';
    this.companyDistrict = data.companyDistrict || '';
    this.companyPhone = data.companyPhone || '';
    this.companyEmail = data.companyEmail || '';
    this.companyCategory = data.companyCategory || '';
    this.companyDescription = data.companyDescription || '';
    this.companyCoordinates = data.companyCoordinates || null;
    this.logoUrl = data.logoUrl || null;
    this.photoUrl = data.photoUrl || null;
    
    // Campo calculado: companyAddress (retrocompatibilidade)
    if (data.companyAddress) {
      this.companyAddress = data.companyAddress;
    } else if (this.companyStreetName && this.companyDoorNumber) {
      this.companyAddress = `${this.companyStreetName} ${this.companyDoorNumber}, ${this.companyPostalCode} ${this.companyCity}`;
    } else {
      this.companyAddress = '';
    }
    this.adminUserId = data.adminUserId || '';
    this.status = data.status || SUBSCRIPTION_STATUS.PENDING_PAYMENT;
    this.subscriptionId = data.subscriptionId || null;
    this.stripeCustomerId = data.stripeCustomerId || null;
    this.subscriptionStatus = data.subscriptionStatus || null;
    this.currentPeriodEnd = data.currentPeriodEnd || null;  // ✅ Data de fim do período atual
    this.trialEnd = data.trialEnd || null;  // ✅ Data de fim do trial
    this.temporaryAccess = data.temporaryAccess || {
      enabled: false,
      expiresAt: null,
      grantedBy: null,
      reason: null
    };
    // NOVO: Tracking persistente de erros de pagamento
    this.paymentRetry = data.paymentRetry || {
      failureCount: 0,
      lastFailureAt: null,
      lastFailureReason: null,
      canRetry: true
    };
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  get featuresEnabled() {
    // ❌ VERIFICAR EXPIRAÇÃO PRIMEIRO
    if (this.subscriptionStatus === 'expired') {
      console.log('❌ featuresEnabled: Subscrição expirada');
      return false;
    }
    
    // ❌ Verificar se currentPeriodEnd já passou
    if (this.currentPeriodEnd) {
      const now = new Date();
      const periodEnd = new Date(this.currentPeriodEnd);
      if (now > periodEnd) {
        console.log('❌ featuresEnabled: Período expirado em', periodEnd.toISOString());
        return false;
      }
    }
    
    // ❌ Status cancelled sem tempo restante = sem acesso
    if (this.status === SUBSCRIPTION_STATUS.CANCELLED || this.status === 'cancelled') {
      const now = new Date();
      const periodEnd = this.currentPeriodEnd ? new Date(this.currentPeriodEnd) : null;
      if (!periodEnd || now > periodEnd) {
        console.log('❌ featuresEnabled: Cancelado e expirado');
        return false;
      }
    }
    
    if (this.temporaryAccess.enabled && this.temporaryAccess.expiresAt) {
      const now = new Date();
      const expiresAt = new Date(this.temporaryAccess.expiresAt);
      if (now <= expiresAt) {
        return true;
      }
    }
    
    // ✅ Aceitar tanto 'active' quanto 'trialing' (período de teste grátis de 7 dias)
    return this.status === SUBSCRIPTION_STATUS.ACTIVE || 
           this.subscriptionStatus === 'active' ||
           this.subscriptionStatus === 'trialing';
  }

  toJSON() {
    return {
      id: this.id,
      companyName: this.companyName,
      companyVAT: this.companyVAT,
      companyCountry: this.companyCountry,
      companyAddress: this.companyAddress,
      companyCity: this.companyCity,
      companyPostalCode: this.companyPostalCode,
      companyStreetName: this.companyStreetName,
      companyDoorNumber: this.companyDoorNumber,
      companyDistrict: this.companyDistrict,
      companyPhone: this.companyPhone,
      companyEmail: this.companyEmail,
      companyCategory: this.companyCategory,
      companyDescription: this.companyDescription,
      companyCoordinates: this.companyCoordinates,
      logoUrl: this.logoUrl,
      photoUrl: this.photoUrl,
      adminUserId: this.adminUserId,
      status: this.status,
      subscriptionId: this.subscriptionId,
      stripeCustomerId: this.stripeCustomerId,
      subscriptionStatus: this.subscriptionStatus,
      currentPeriodEnd: this.currentPeriodEnd,  // ✅ Incluir data de fim do período
      trialEnd: this.trialEnd,  // ✅ Incluir data de fim do trial
      temporaryAccess: this.temporaryAccess,
      paymentRetry: this.paymentRetry,
      featuresEnabled: this.featuresEnabled,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static fromJSON(json) {
    return new CompanyProfile(json);
  }
}

export const companyProfileStorage = {
  STORAGE_KEY: 'company_profiles',
  
  async getAll() {
    try {
      // ✅ SEMPRE buscar do PostgreSQL via API
      // Nota: Endpoint /api/public/businesses lista empresas ativas publicamente
      // Para administração completa, implementar /api/company-profiles GET
      console.log('⚠️ getAll() não implementado - use /api/public/businesses para listagem pública');
      return [];
    } catch (error) {
      console.error('❌ Erro ao carregar perfis:', error);
      return [];
    }
  },
  
  async getById(id) {
    try {
      const { safeFetch } = await import('@/utils/apiConfig');
      const { response, data } = await safeFetch(`/api/company-profiles/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          console.log('⚠️ Perfil não encontrado no PostgreSQL para ID:', id);
          return null;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      return CompanyProfile.fromJSON(data);
    } catch (error) {
      console.error('❌ Erro ao buscar perfil por ID:', error);
      return null;
    }
  },
  
  async getByUserId(userId) {
    // Validação defensiva: detectar se foi passado email em vez de ID
    if (userId && userId.includes('@')) {
      console.error('⚠️ ERRO: getByUserId() recebeu EMAIL em vez de USER ID:', userId);
      console.error('💡 FIX: Use user.id em vez de user.email');
      console.trace('Stack trace:');
      return null;
    }
    
    try {
      const { safeFetch } = await import('@/utils/apiConfig');
      const { response, data } = await safeFetch(`/api/company-profiles/user/${userId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      // ✅ APENAS PostgreSQL - SEM fallback para localStorage
      if (data?.profile) {
        return CompanyProfile.fromJSON(data.profile);
      }
      
      console.log('⚠️ Perfil não encontrado no PostgreSQL para userId:', userId);
      return null;
    } catch (error) {
      console.error('❌ Erro ao buscar perfil por userId:', error);
      return null;
    }
  },
  
  // ❌ DEPRECATED: Não usar mais localStorage
  getLocalStorageProfiles() {
    console.warn('⚠️ getLocalStorageProfiles() DEPRECATED - dados devem vir do PostgreSQL');
    return [];
  },
  
  async save(profile) {
    try {
      // Verificar se já existe
      const existing = await this.getById(profile.id);
      
      if (existing) {
        return await this.update(profile.id, profile);
      } else {
        return await this.create(profile);
      }
    } catch (error) {
      console.error('❌ Erro ao salvar perfil:', error);
      throw error; // ✅ Propagar erro em vez de fallback silencioso
    }
  },
  
  async create(profile) {
    try {
      const { safeFetch } = await import('@/utils/apiConfig');
      const { response, data } = await safeFetch('/api/company-profiles', {
        method: 'POST',
        body: JSON.stringify(profile)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return CompanyProfile.fromJSON(data);
    } catch (error) {
      console.error('Error creating profile:', error);
      throw error;
    }
  },
  
  async update(id, updates) {
    try {
      const { safeFetch } = await import('@/utils/apiConfig');
      const { response, data } = await safeFetch(`/api/company-profiles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return CompanyProfile.fromJSON(data);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },
  
  async delete(id) {
    try {
      const { safeFetch } = await import('@/utils/apiConfig');
      const { response, data } = await safeFetch(`/api/company-profiles/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error('Error deleting profile:', error);
      throw error;
    }
  },
  
  // ❌ DEPRECATED: NÃO USAR - dados devem ser salvos no PostgreSQL via API
  saveToLocalStorage(profile) {
    console.error('❌ saveToLocalStorage() DEPRECATED - use companyProfileStorage.save() que persiste no PostgreSQL');
    throw new Error('localStorage desabilitado - use PostgreSQL API');
  },
  
  // ❌ DEPRECATED: Migração manual já não é necessária (limpeza automática ativa)
  async migrateFromLocalStorage() {
    console.warn('⚠️ migrateFromLocalStorage() DEPRECATED - limpeza automática ativa no login/bootstrap');
    return { migrated: 0, errors: [], message: 'Migração desabilitada - localStorage limpo automaticamente' };
  }
};
