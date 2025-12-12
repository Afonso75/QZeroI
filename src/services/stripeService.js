import { companyProfileStorage, SUBSCRIPTION_STATUS } from '../models/companyProfile';
import { toast } from 'sonner';
import { safeFetch } from '@/utils/apiConfig';

// SEGURANÇA: Demo mode APENAS ativo em desenvolvimento
// Em produção (import.meta.env.DEV === false), sempre usa Stripe real
// ATENÇÃO: IS_DEMO_MODE = false ativa Stripe REAL (com as chaves configuradas)
const IS_DEMO_MODE = false;

export const stripeService = {
  async createSubscriptionCheckout(companyProfileId, email, successUrl, cancelUrl) {
    // PROTEÇÃO: Verificar se está em desenvolvimento antes de permitir mock
    const isDevelopment = import.meta.env.DEV;
    const useMock = IS_DEMO_MODE && isDevelopment;
    
    console.log('🔒 Stripe Service:', { 
      IS_DEMO_MODE, 
      isDevelopment, 
      useMock,
      mode: useMock ? 'MOCK (dev)' : 'REAL (production)' 
    });
    
    if (useMock) {
      console.log('💡 Usando Mock Stripe (apenas desenvolvimento)');
      return this.mockCreateCheckout(companyProfileId, email, successUrl, cancelUrl);
    }
    
    // Produção: SEMPRE usar Stripe real
    console.log('🔒 Usando Stripe REAL (produção)');
    
    try {
      const { response, data } = await safeFetch('/api/create-subscription-checkout', {
        method: 'POST',
        body: JSON.stringify({
          companyProfileId,
          email,
          successUrl,
          cancelUrl
        })
      });

      if (!response.ok) {
        console.error('❌ Erro ao criar checkout Stripe:', {
          status: response.status,
          statusText: response.statusText,
          error: data?.error
        });
        throw new Error(`Erro ao criar sessão de pagamento: ${response.status} - ${data?.error || 'Unknown error'}`);
      }

      console.log('✅ Checkout criado com sucesso:', data);
      return data;
    } catch (error) {
      console.error('❌ Erro fatal ao criar checkout:', error);
      throw error;
    }
  },

  async mockCreateCheckout(companyProfileId, email, successUrl, cancelUrl) {
    // SEGURANÇA: Dupla verificação - esta função SÓ deve rodar em desenvolvimento
    if (!import.meta.env.DEV) {
      console.error('❌ SEGURANÇA: Tentativa de usar mock checkout em PRODUÇÃO bloqueada!');
      throw new Error('Mock checkout não disponível em produção');
    }
    
    console.log('Mock: Creating Stripe checkout session (DEV only)');
    console.log('Company Profile ID:', companyProfileId);
    console.log('Email:', email);
    
    const sessionId = `cs_test_${Date.now()}`;
    const mockCheckoutUrl = `https://checkout.stripe.com/c/pay/${sessionId}`;
    
    await companyProfileStorage.update(companyProfileId, {
      stripeCheckoutSessionId: sessionId
    });
    
    return {
      sessionId,
      url: mockCheckoutUrl,
      isMock: true
    };
  },

  async simulateSuccessfulPayment(companyProfileId) {
    if (!IS_DEMO_MODE) {
      throw new Error('This function is only available in demo mode');
    }

    console.log('Mock: Simulating successful payment for company:', companyProfileId);
    
    const customerId = `cus_mock_${Date.now()}`;
    const subscriptionId = `sub_mock_${Date.now()}`;
    
    await companyProfileStorage.update(companyProfileId, {
      status: SUBSCRIPTION_STATUS.ACTIVE,
      stripeCustomerId: customerId,
      subscriptionId: subscriptionId,
      subscriptionStatus: 'active',
    });

    toast.success('Pagamento simulado com sucesso! Conta empresarial ativada.');
    
    return {
      success: true,
      customerId,
      subscriptionId
    };
  },

  async simulateFailedPayment(companyProfileId) {
    if (!IS_DEMO_MODE) {
      throw new Error('This function is only available in demo mode');
    }

    console.log('Mock: Simulating failed payment for company:', companyProfileId);
    
    await companyProfileStorage.update(companyProfileId, {
      status: SUBSCRIPTION_STATUS.PENDING_PAYMENT,
      subscriptionStatus: null,
    });

    toast.error('Pagamento simulado como falhado.');
    
    return {
      success: false,
      error: 'Payment method declined'
    };
  }
};
