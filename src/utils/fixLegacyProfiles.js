/**
 * Corrigir perfis legados criando Business entities faltantes
 * Uso: Executar via createBusinessForLegacyProfiles() no console
 */

import { companyProfileStorage, normalizeCategory, normalizeCountry } from '@/models/companyProfile';
import { base44 } from '@/api/base44Client';

export async function createBusinessForLegacyProfiles() {
  console.log('🔧 CORRIGINDO PERFIS LEGADOS - Criando Business entities...');
  
  try {
    // Buscar todos os perfis do PostgreSQL
    const { safeFetch } = await import('@/utils/apiConfig');
    const { response, data: profiles } = await safeFetch('/api/company-profiles');
    if (!response.ok) {
      throw new Error('Erro ao buscar perfis');
    }
    
    console.log(`📊 Encontrados ${profiles?.length || 0} perfis`);
    
    if (!profiles || profiles.length === 0) {
      console.log('⚠️ Nenhum perfil encontrado para processar');
      return { created: 0, updated: 0, skipped: 0 };
    }
    
    let created = 0;
    let updated = 0;
    let skipped = 0;
    
    for (const profile of profiles) {
      try {
        console.log(`\n🔍 Processando: ${profile.companyName} (ID: ${profile.id})`);
        
        // Verificar se Business já existe
        const existingBusinesses = await base44.entities.Business.filter({ id: profile.id });
        
        if (existingBusinesses.length > 0) {
          console.log(`  ⏭️  Business já existe, pulando...`);
          skipped++;
          continue;
        }
        
        // Criar Business entity
        const businessData = {
          id: profile.id,
          name: profile.companyName || 'Sem Nome',
          description: profile.companyDescription || '',
          category: normalizeCategory(profile.companyCategory || 'outros'),
          address: profile.companyAddress || `${profile.companyStreetName || ''} ${profile.companyDoorNumber || ''}`.trim(),
          street_name: profile.companyStreetName || '',
          door_number: profile.companyDoorNumber || '',
          postal_code: profile.companyPostalCode || '',
          city: profile.companyCity || '',
          district: profile.companyDistrict || '',
          country: normalizeCountry(profile.companyCountry || 'PT'),
          phone: profile.companyPhone || '',
          email: profile.companyEmail || '',
          logo_url: profile.logoUrl || '',
          photo_url: profile.photoUrl || '',
          is_active: profile.status === 'active',
          owner_email: profile.adminUserId,
          latitude: profile.companyCoordinates?.lat || null,
          longitude: profile.companyCoordinates?.lng || null
        };
        
        await base44.entities.Business.create(businessData);
        console.log(`  ✅ Business criada com sucesso!`);
        created++;
        
      } catch (error) {
        console.error(`  ❌ Erro ao processar ${profile.companyName}:`, error.message);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMO:');
    console.log(`  ✅ Criadas: ${created}`);
    console.log(`  🔄 Atualizadas: ${updated}`);
    console.log(`  ⏭️  Puladas: ${skipped}`);
    console.log('='.repeat(50));
    
    if (created > 0) {
      console.log('\n🎉 Correção concluída! Recarregue a página para ver as mudanças.');
      setTimeout(() => window.location.reload(), 2000);
    }
    
    return { created, updated, skipped };
    
  } catch (error) {
    console.error('❌ Erro ao corrigir perfis legados:', error);
    throw error;
  }
}

// Expor globalmente
if (typeof window !== 'undefined') {
  window.createBusinessForLegacyProfiles = createBusinessForLegacyProfiles;
}
