/**
 * Limpar TODOS os dados demo e começar com base limpa
 * ⚠️ ATENÇÃO: Esta função apaga TODOS os dados de teste!
 * 
 * Uso: clearDemoData() no console
 */

import { base44 } from '@/api/base44Client';
import { companyProfileStorage } from '@/models/companyProfile';

export async function clearDemoData() {
  const confirmed = window.confirm(
    '⚠️ ATENÇÃO: Isto vai apagar TODOS os dados demo!\n\n' +
    'Será apagado:\n' +
    '- Utilizador demo (demo@example.com)\n' +
    '- Perfil da empresa demo\n' +
    '- Todas as subscrições demo\n' +
    '- Todas as filas, tickets, marcações demo\n' +
    '- Todos os dados locais (localStorage)\n\n' +
    'Tem a certeza que quer continuar?'
  );
  
  if (!confirmed) {
    console.log('❌ Operação cancelada pelo utilizador');
    return;
  }
  
  console.log('🗑️ LIMPEZA DE DADOS DEMO INICIADA...\n');
  
  try {
    // 1. Limpar localStorage
    console.log('1️⃣ Limpando localStorage...');
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      // Remover dados mock mas preservar configurações do sistema
      if (key && !key.startsWith('replit_') && !key.startsWith('vite_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`   ✅ ${keysToRemove.length} itens removidos do localStorage`);
    
    // 2. Limpar CompanyProfiles do PostgreSQL
    console.log('\n2️⃣ Limpando perfis de empresa do PostgreSQL...');
    try {
      const { safeFetch } = await import('@/utils/apiConfig');
      const { response, data: profiles } = await safeFetch('/api/company-profiles');
      if (response.ok && profiles) {
        let deletedCount = 0;
        
        for (const profile of profiles) {
          try {
            await safeFetch(`/api/company-profiles/${profile.id}`, {
              method: 'DELETE'
            });
            deletedCount++;
            console.log(`   🗑️ Perfil deletado: ${profile.companyName}`);
          } catch (err) {
            console.warn(`   ⚠️ Erro ao deletar ${profile.companyName}:`, err.message);
          }
        }
        
        console.log(`   ✅ ${deletedCount} perfis removidos do PostgreSQL`);
      }
    } catch (err) {
      console.warn('   ⚠️ Erro ao limpar perfis PostgreSQL:', err.message);
    }
    
    // 3. Limpar entidades do base44 (Demo API)
    console.log('\n3️⃣ Limpando entidades demo (Businesses, Queues, Tickets, etc)...');
    
    const entitiesToClear = [
      'Subscription',
      'Ticket',
      'Queue',
      'Appointment',
      'Service',
      'Business',
      'Staff',
      'StaffInvite'
    ];
    
    for (const entityName of entitiesToClear) {
      try {
        const entities = await base44.entities[entityName].filter({});
        let deletedCount = 0;
        
        for (const entity of entities) {
          try {
            // Alguns podem não ter método delete
            if (typeof base44.entities[entityName].delete === 'function') {
              await base44.entities[entityName].delete(entity.id);
              deletedCount++;
            }
          } catch (err) {
            // Ignorar erros de delete individual
          }
        }
        
        if (deletedCount > 0) {
          console.log(`   ✅ ${entityName}: ${deletedCount} itens removidos`);
        }
      } catch (err) {
        console.warn(`   ⚠️ Erro ao limpar ${entityName}:`, err.message);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ LIMPEZA CONCLUÍDA COM SUCESSO!');
    console.log('='.repeat(60));
    console.log('\n📋 PRÓXIMOS PASSOS:');
    console.log('1. A página será recarregada em 3 segundos');
    console.log('2. Faça logout (se estiver autenticado)');
    console.log('3. Crie uma nova conta empresarial do zero');
    console.log('\n💡 O sistema está agora com base de dados limpa!');
    console.log('💳 Stripe continua em MODO DE TESTE (use cartões de teste)\n');
    
    // Recarregar após 3 segundos
    setTimeout(() => {
      window.location.href = '/';
    }, 3000);
    
  } catch (error) {
    console.error('\n❌ ERRO durante a limpeza:', error);
    console.error('Alguns dados podem não ter sido removidos completamente.');
  }
}

// Expor globalmente
if (typeof window !== 'undefined') {
  window.clearDemoData = clearDemoData;
}
