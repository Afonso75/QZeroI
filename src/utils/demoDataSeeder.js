import { companyProfileStorage, CompanyProfile } from '@/models/companyProfile';
import { base44 } from '@/api/base44Client';

// ✅ CONTROLE: Desabilitar dados demo para produção
// Mudar para false para começar com base limpa
const ENABLE_DEMO_DATA = false;

export async function seedDemoCompanyProfile() {
  if (!ENABLE_DEMO_DATA) {
    return null;
  }
  
  const demoEmail = 'demo@example.com';
  
  const existingProfile = companyProfileStorage.getByUserId(demoEmail);
  if (existingProfile) {
    console.log('Demo company profile already exists');
    
    // ✅ CORRIGIR SUBSCRIÇÃO AUTOMATICAMENTE se não existir válida
    try {
      const subs = await base44.entities.Subscription.filter({
        user_email: demoEmail,
        plan: 'business'
      });
      
      const validSub = subs.find(s => 
        (s.status === 'active' || s.status === 'trialing') && 
        s.end_date && 
        s.created_date
      );
      
      if (!validSub) {
        console.log('⚠️ Subscrição inválida detectada - corrigindo automaticamente...');
        
        // Atualizar subscrições antigas para cancelled (em vez de deletar)
        for (const sub of subs) {
          try {
            await base44.entities.Subscription.update(sub.id, {
              status: 'cancelled',
              auto_renew: false
            });
          } catch (err) {
            console.warn('Não conseguiu cancelar subscrição antiga:', err.message);
          }
        }
        
        // Criar nova subscrição válida com trial
        const now = new Date();
        const trialEnd = new Date(now);
        trialEnd.setDate(trialEnd.getDate() + 7); // +7 dias trial
        
        const endDate = new Date(trialEnd);
        endDate.setMonth(endDate.getMonth() + 1); // +1 mês após trial
        
        await base44.entities.Subscription.create({
          user_email: demoEmail,
          plan: 'business',
          status: 'trialing',
          amount: 49.99,
          currency: 'EUR',
          payment_method: 'stripe',
          stripe_subscription_id: `sub_trial_${Date.now()}`,
          created_date: now.toISOString(),
          trial_end_date: trialEnd.toISOString(),
          end_date: endDate.toISOString(),
          auto_renew: true
        });
        
        console.log('✅ Subscrição demo criada com período de teste de 7 dias');
      }
    } catch (error) {
      console.warn('⚠️ Não foi possível verificar/corrigir subscrição:', error.message);
    }
    
    return existingProfile;
  }
  
  const demoProfile = new CompanyProfile({
    companyName: 'Clínica Saúde+',
    companyVAT: 'PT123456789',
    companyCountry: 'PT',
    companyAddress: 'Rua da Saúde, 123',
    companyCity: 'Lisboa',
    companyPostalCode: '1000-100',
    companyPhone: '+351912345678',
    companyEmail: 'clinica@saudeplus.pt',
    companyCategory: 'Clínica',
    companyCoordinates: { lat: 38.7223, lng: -9.1393 },
    adminUserId: demoEmail,
    status: 'active',
    subscriptionStatus: 'active',
    subscriptionId: 'sub_demo_123',
    stripeCustomerId: 'cus_demo_123'
  });
  
  companyProfileStorage.save(demoProfile);
  console.log('✅ Demo company profile seeded:', demoProfile.companyName);
  
  return demoProfile;
}
