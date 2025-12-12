/**
 * Utilidade para trocar para utilizador demo empresarial pré-configurado
 * Uso: Chamar switchToDemoUser() no console do browser
 */

export function switchToDemoUser() {
  console.log('🔄 Trocando para utilizador demo empresarial...');
  
  // Utilizador demo pré-configurado com perfil empresarial ativo
  const demoUser = {
    nome_completo: 'Demo User',
    full_name: 'Demo User',
    email: 'demo@example.com',
    account_type: 'empresa',
    onboarding_completed: true,
    has_business_subscription: true,
    business_profile_completed: true,
    business_id: '1',
    is_business_user: true,
    country: 'PT',
    city: 'Lisboa',
    latitude: 38.7223,
    longitude: -9.1393,
    profile_completed: true,
    phone: '912345678',
    birthdate: '1990-01-01'
  };
  
  localStorage.setItem('mock_user', JSON.stringify(demoUser));
  console.log('✅ Trocado para demo@example.com');
  console.log('📋 Perfil: Clínica Saúde+ (subscrição ativa)');
  console.log('🔄 Recarregando página...');
  
  setTimeout(() => {
    window.location.href = '/business-dashboard';
  }, 500);
}

/**
 * Criar novo utilizador empresarial com onboarding completo
 * Uso: Chamar createBusinessUser() no console
 */
export async function createBusinessUser(email, companyName) {
  console.log('🏢 Criando novo utilizador empresarial...');
  
  const userEmail = email || `business${Date.now()}@example.com`;
  const company = companyName || 'Minha Empresa';
  
  // 1. Criar utilizador
  const newUser = {
    nome_completo: 'Utilizador Empresarial',
    full_name: 'Utilizador Empresarial',
    email: userEmail,
    account_type: 'empresa',
    onboarding_completed: true,
    profile_completed: true,
    phone: '912345678',
    birthdate: '1990-01-01',
    is_business_user: true,
    country: 'PT',
    city: 'Lisboa',
    latitude: 38.7223,
    longitude: -9.1393,
    has_business_subscription: true,
    business_profile_completed: true
  };
  
  // 2. Criar perfil empresarial
  const businessId = `company_${Date.now()}`;
  const companyProfile = {
    id: businessId,
    companyName: company,
    companyEmail: userEmail,
    companyPhone: '912345678',
    companyAddress: 'Lisboa, Portugal',
    companyCategory: 'comercio',
    companyVAT: '',
    companyCity: 'Lisboa',
    companyCountry: 'Portugal',
    companyPostalCode: '',
    adminUserId: userEmail,
    status: 'active',
    subscriptionStatus: 'active',
    stripeCustomerId: `cus_mock_${Date.now()}`,
    subscriptionId: `sub_mock_${Date.now()}`
  };
  
  newUser.business_id = businessId;
  
  try {
    // 3. Salvar perfil via API
    const { safeFetch } = await import('@/utils/apiConfig');
    const { response, data: savedProfile } = await safeFetch('/api/company-profiles', {
      method: 'POST',
      body: JSON.stringify(companyProfile)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    console.log('✅ Perfil empresarial criado:', savedProfile);
    
    // 4. Atualizar utilizador local
    localStorage.setItem('mock_user', JSON.stringify(newUser));
    console.log('✅ Utilizador criado:', userEmail);
    console.log('🔄 Recarregando...');
    
    setTimeout(() => window.location.href = '/business-dashboard', 500);
    
    return { user: newUser, profile: savedProfile };
  } catch (error) {
    console.error('❌ Erro ao criar perfil:', error);
    throw error;
  }
}

/**
 * Forçar refresh dos dados do utilizador atual
 * Útil após atualizações no backend para sincronizar dados
 */
export async function refreshCurrentUser() {
  console.log('🔄 Atualizando dados do utilizador...');
  
  try {
    const { safeFetch } = await import('@/utils/apiConfig');
    const { response, data: userData } = await safeFetch('/api/auth/me');
    
    if (!response.ok) {
      console.error('❌ Erro ao buscar dados atualizados');
      console.log('💡 Dica: Faça logout e login novamente');
      return;
    }
    
    console.log('✅ Dados atualizados:', {
      email: userData?.email,
      businessId: userData?.businessId,
      isBusinessUser: userData?.isBusinessUser,
      accountType: userData?.accountType
    });
    
    console.log('🔄 Recarregando página para aplicar mudanças...');
    setTimeout(() => window.location.reload(), 500);
    
  } catch (error) {
    console.error('❌ Erro:', error);
    console.log('💡 Dica: Faça logout e login novamente');
  }
}

// Expor globalmente
if (typeof window !== 'undefined') {
  window.switchToDemoUser = switchToDemoUser;
  window.createBusinessUser = createBusinessUser;
  window.refreshCurrentUser = refreshCurrentUser;
}
