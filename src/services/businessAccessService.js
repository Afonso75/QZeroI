import { companyProfileStorage, normalizeCategory, normalizeCountry } from '@/models/companyProfile';
import { base44 } from '@/api/base44Client';

// 🎁 ACESSO VIP VITALÍCIO - Emails com acesso empresarial gratuito permanente
const VIP_EMAILS = [
  // Lista vazia - nenhum email com acesso VIP atualmente
];

export class BusinessAccessService {
  async getUserBusinessAccess(user) {
    const userEmail = user.email;
    const userId = user.id;
    const isStaff = user.is_staff_member === true;
    const businessId = user.business_id;
    
    // 🎁 VIP CHECK: Acesso vitalício gratuito para emails especiais
    if (VIP_EMAILS.includes(userEmail?.toLowerCase())) {
      console.log('🎁 BusinessAccessService: VIP DETECTADO - Acesso vitalício gratuito:', userEmail);
      
      // Ainda tentar obter o perfil da empresa para dados completos
      let companyProfile = null;
      if (isStaff && businessId) {
        companyProfile = await companyProfileStorage.get(businessId);
      } else {
        companyProfile = await companyProfileStorage.getByUserId(userId);
      }
      
      return {
        hasAccess: true,
        isPending: false,
        companyProfile: companyProfile,
        source: 'vip_lifetime',
        isVip: true
      };
    }
    
    console.log('🔍 BusinessAccessService: Procurando perfil para:', { 
      userId, 
      userEmail,
      isStaff,
      businessId
    });
    
    let companyProfile = null;
    
    if (isStaff && businessId) {
      console.log('👥 BusinessAccessService: Utilizador é funcionário - procurando por businessId');
      companyProfile = await companyProfileStorage.get(businessId);
    } else {
      console.log('👤 BusinessAccessService: Utilizador é criador - procurando por userId');
      companyProfile = await companyProfileStorage.getByUserId(userId);
    }
    
    if (companyProfile) {
      console.log('✅ BusinessAccessService: Perfil encontrado:', {
        id: companyProfile.id,
        name: companyProfile.companyName,
        status: companyProfile.status,
        subscriptionStatus: companyProfile.subscriptionStatus,
        featuresEnabled: companyProfile.featuresEnabled
      });
      
      // IMPORTANTE: Apenas sincronizar subscrição para o CRIADOR, não para staff
      if (!isStaff) {
        console.log('👤 BusinessAccessService: Sincronizando subscrição do criador');
        await this.syncSubscription(companyProfile, userEmail);
      } else {
        console.log('👥 BusinessAccessService: Staff member - pulando sync de subscrição (herda acesso do criador)');
      }
      
      // MIGRAÇÃO AUTOMÁTICA: Criar Business entity se não existir
      // ⚠️ DESATIVADO: Business entities são LEGACY (não existem mais no sistema atual)
      // await this.ensureBusinessEntityExists(companyProfile);
      
      // ❌ VERIFICAR EXPIRAÇÃO PRIMEIRO
      const now = new Date();
      const periodEnd = companyProfile.currentPeriodEnd ? new Date(companyProfile.currentPeriodEnd) : null;
      const isExpired = companyProfile.subscriptionStatus === 'expired' || 
                        companyProfile.status === 'expired' ||
                        (periodEnd && now > periodEnd);
      
      console.log('🔍 BusinessAccessService: Verificação de acesso:', {
        email: userEmail,
        status: companyProfile.status,
        subscriptionStatus: companyProfile.subscriptionStatus,
        currentPeriodEnd: companyProfile.currentPeriodEnd,
        isExpired: isExpired
      });
      
      // ❌ SE EXPIRADO, NÃO DAR ACESSO
      if (isExpired) {
        console.log('❌ BusinessAccessService: Subscrição EXPIRADA - sem acesso');
        return {
          hasAccess: false,
          isPending: false,
          companyProfile: companyProfile,
          source: 'expired',
          isExpired: true
        };
      }
      
      // ✅ CORRIGIDO: Dar acesso durante TRIAL, após ACTIVE, e subscrições canceladas com tempo restante
      // subscriptionStatus = 'trialing' durante período de trial (2 dias)
      // status = 'active' após primeiro pagamento bem-sucedido
      // status = 'cancelled' mas com currentPeriodEnd no futuro = acesso mantido
      let hasAccess = 
        companyProfile.status === 'active' || 
        companyProfile.subscriptionStatus === 'trialing';
      
      // ⏰ VERIFICAR SE SUBSCRIÇÃO CANCELADA AINDA TEM TEMPO RESTANTE
      if (companyProfile.status === 'cancelled' && periodEnd && now < periodEnd) {
        hasAccess = true; // ✅ Mantém acesso até fim do período pago
        console.log('⏰ Subscrição cancelada mas ainda com acesso até:', periodEnd.toISOString());
      }
      
      const isPending = 
        companyProfile.status === 'pending_payment' && 
        companyProfile.subscriptionStatus !== 'trialing'; // NÃO pending durante trial!
      
      const access = {
        hasAccess: hasAccess,
        isPending: isPending,
        companyProfile: companyProfile,
        source: 'companyProfile'
      };
      
      console.log('📊 BusinessAccessService: Retornando acesso:', {
        hasAccess: access.hasAccess,
        isPending: access.isPending,
        source: access.source
      });
      
      return access;
    }
    
    console.log('⚠️ BusinessAccessService: Nenhum perfil encontrado para', { userId, userEmail });
    
    // CRÍTICO: Se for staff member sem perfil, NÃO fazer fallback para subscrição
    // Staff members NUNCA devem criar/consultar subscrições com seu próprio email
    if (isStaff) {
      console.log('❌ BusinessAccessService: Staff member sem perfil da empresa - acesso negado');
      return {
        hasAccess: false,
        isPending: false,
        companyProfile: null,
        source: 'staff_no_profile'
      };
    }
    
    // Apenas criadores podem fazer fallback para subscriptions
    try {
      const subscriptions = await base44.entities.Subscription.filter({
        user_email: userEmail,
        plan: 'business'
      });
      
      const activeSub = subscriptions.find(s => 
        s.status === 'active' || s.status === 'trialing'
      );
      
      if (activeSub) {
        return {
          hasAccess: true,
          isPending: false,
          subscription: activeSub,
          source: 'base44'
        };
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
    
    return {
      hasAccess: false,
      isPending: false,
      companyProfile: null,
      source: 'none'
    };
  }
  
  async ensureBusinessEntityExists(companyProfile) {
    try {
      console.log('🔍 BusinessAccessService: Verificando se Business entity existe...');
      
      const existingBusinesses = await base44.entities.Business.filter({ id: companyProfile.id });
      
      if (existingBusinesses.length > 0) {
        console.log('✅ BusinessAccessService: Business entity já existe');
        return;
      }
      
      console.log('⚠️ BusinessAccessService: Business entity NÃO encontrada - criando automaticamente...');
      
      // Criar Business entity a partir do CompanyProfile
      const businessData = {
        id: companyProfile.id,
        name: companyProfile.companyName || 'Empresa',
        description: companyProfile.companyDescription || '',
        category: normalizeCategory(companyProfile.companyCategory || 'outros'),
        address: companyProfile.companyAddress || 
          `${companyProfile.companyStreetName || ''} ${companyProfile.companyDoorNumber || ''}`.trim() ||
          'Morada por definir',
        street_name: companyProfile.companyStreetName || '',
        door_number: companyProfile.companyDoorNumber || '',
        postal_code: companyProfile.companyPostalCode || '',
        city: companyProfile.companyCity || '',
        district: companyProfile.companyDistrict || '',
        country: normalizeCountry(companyProfile.companyCountry || 'PT'),
        phone: companyProfile.companyPhone || '',
        email: companyProfile.companyEmail || '',
        logo_url: companyProfile.logoUrl || '',
        photo_url: companyProfile.photoUrl || '',
        media_gallery: companyProfile.mediaGallery || [],
        custom_category: companyProfile.customCategory || null,
        is_active: companyProfile.status === 'active',
        owner_email: companyProfile.adminUserId,
        latitude: companyProfile.companyCoordinates?.lat || null,
        longitude: companyProfile.companyCoordinates?.lng || null
      };
      
      await base44.entities.Business.create(businessData);
      console.log('✅ BusinessAccessService: Business entity criada automaticamente!');
      
    } catch (error) {
      console.error('❌ BusinessAccessService: Erro ao criar Business entity:', error);
      // Não bloquear o acesso se falhar - apenas logar o erro
    }
  }

  async syncSubscription(companyProfile, userEmail) {
    try {
      const existingSubs = await base44.entities.Subscription.filter({
        user_email: userEmail,
        plan: 'business'
      });
      
      if (companyProfile.featuresEnabled && existingSubs.length === 0) {
        const now = new Date();
        const trialEndDate = new Date(now);
        trialEndDate.setDate(trialEndDate.getDate() + 7); // 7 dias grátis
        
        const endDate = new Date(now);
        endDate.setMonth(endDate.getMonth() + 1); // Renovação mensal
        
        await base44.entities.Subscription.create({
          user_email: userEmail,
          plan: 'business',
          status: 'trialing',
          amount: 49.99,
          currency: 'EUR',
          payment_method: 'stripe',
          stripe_subscription_id: companyProfile.subscriptionId || `sub_mock_${Date.now()}`,
          created_date: now.toISOString(),
          trial_end_date: trialEndDate.toISOString(),
          end_date: endDate.toISOString(),
          auto_renew: true
        });
        console.log('✅ Subscription created with 7-day trial');
      }
      
      if (!companyProfile.featuresEnabled && existingSubs.length > 0) {
        for (const sub of existingSubs) {
          await base44.entities.Subscription.update(sub.id, {
            status: 'cancelled'
          });
        }
        console.log('✅ Subscription cancelled (profile not active)');
      }
    } catch (error) {
      console.warn('Could not sync subscription:', error);
    }
  }
}

export const businessAccessService = new BusinessAccessService();
