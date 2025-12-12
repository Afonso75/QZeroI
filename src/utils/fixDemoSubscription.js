/**
 * Corrigir subscrição do utilizador demo
 * Uso: Executar via fixDemoSubscription() no console
 */

import { base44 } from '@/api/base44Client';

export async function fixDemoSubscription() {
  console.log('🔧 CORRIGINDO SUBSCRIÇÃO DO UTILIZADOR DEMO...');
  
  try {
    const userEmail = 'demo@example.com';
    
    // Buscar subscriptions existentes
    const existingSubs = await base44.entities.Subscription.filter({
      user_email: userEmail,
      plan: 'business'
    });
    
    console.log(`📊 Encontradas ${existingSubs.length} subscrições existentes`);
    
    // Cancelar todas as subscrições antigas
    for (const sub of existingSubs) {
      console.log(`  🗑️ Cancelando subscrição antiga: ${sub.id} (status: ${sub.status})`);
      await base44.entities.Subscription.delete(sub.id);
    }
    
    // Criar nova subscrição válida com período de teste
    const now = new Date();
    const trialEndDate = new Date(now);
    trialEndDate.setDate(trialEndDate.getDate() + 7); // +7 dias de trial
    
    const endDate = new Date(trialEndDate);
    endDate.setMonth(endDate.getMonth() + 1); // +1 mês após trial
    
    const newSub = await base44.entities.Subscription.create({
      user_email: userEmail,
      plan: 'business',
      status: 'trialing', // Status de período de teste
      amount: 49.99,
      currency: 'EUR',
      payment_method: 'stripe',
      stripe_subscription_id: `sub_trial_${Date.now()}`,
      created_date: now.toISOString(),
      trial_end_date: trialEndDate.toISOString(),
      end_date: endDate.toISOString(),
      auto_renew: true
    });
    
    console.log('✅ Nova subscrição criada com sucesso!');
    console.log('📊 Detalhes:', {
      id: newSub.id,
      status: newSub.status,
      created: newSub.created_date,
      trial_end: newSub.trial_end_date,
      end: newSub.end_date,
      auto_renew: newSub.auto_renew
    });
    
    console.log('\n🎉 Correção concluída! Recarregue a página para ver as mudanças.');
    setTimeout(() => window.location.reload(), 2000);
    
    return newSub;
    
  } catch (error) {
    console.error('❌ Erro ao corrigir subscrição:', error);
    throw error;
  }
}

// Expor globalmente
if (typeof window !== 'undefined') {
  window.fixDemoSubscription = fixDemoSubscription;
}
