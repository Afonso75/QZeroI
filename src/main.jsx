import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import '@/i18n/config'
import { seedDemoCompanyProfile } from '@/utils/demoDataSeeder'
import { switchToDemoUser, createBusinessUser } from '@/utils/fixUserAccess'
import { createBusinessForLegacyProfiles } from '@/utils/fixLegacyProfiles'
import { fixDemoSubscription } from '@/utils/fixDemoSubscription'
import { clearDemoData } from '@/utils/clearDemoData'
import { retryPendingConsent } from '@/utils/consentRetry'
import { safeFetch, isCapacitorApp } from '@/utils/apiConfig'
import { StatusBar, Style } from '@capacitor/status-bar'
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'

// Configurar StatusBar para ocupar ecrã todo (remover barra azul)
async function setupStatusBar() {
  if (Capacitor.isNativePlatform()) {
    try {
      await StatusBar.setOverlaysWebView({ overlay: true });
      await StatusBar.setStyle({ style: Style.Dark });
      
      // setBackgroundColor só funciona no Android, não no iOS
      if (Capacitor.getPlatform() === 'android') {
        await StatusBar.setBackgroundColor({ color: '#ffffff' });
      }
      
      console.log('✅ StatusBar configurada - overlay ativo');
    } catch (err) {
      console.warn('StatusBar setup error:', err);
    }
  }
}
setupStatusBar();

// Configurar botão de hardware back do Android
async function setupAndroidBackButton() {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        CapacitorApp.exitApp();
      }
    });
    console.log('✅ Android hardware back button configurado');
  }
}
setupAndroidBackButton();

// ✅ Detectar Capacitor/iOS/Android e adicionar classe ao html para CSS safe-area
// CRÍTICO: Só adiciona classes se realmente estiver no Capacitor nativo
// Usa window.Capacitor.isNativePlatform() como verificação definitiva
(function detectPlatformForSafeArea() {
  const html = document.documentElement;
  
  // Verificação robusta: Capacitor bridge DEVE existir E ser plataforma nativa
  // window.Capacitor existe apenas em builds Capacitor (não em browsers normais)
  const isNativeCapacitor = typeof window !== 'undefined' && 
    window.Capacitor && 
    typeof window.Capacitor.isNativePlatform === 'function' &&
    window.Capacitor.isNativePlatform();
  
  // Fallback: verificar protocolos que só existem em Capacitor
  const isCapacitorProtocol = typeof window !== 'undefined' && 
    (window.location.protocol === 'capacitor:' || 
     window.location.protocol === 'ionic:');
  
  if (isNativeCapacitor || isCapacitorProtocol) {
    html.classList.add('capacitor');
    
    // Detectar plataforma específica via Capacitor.getPlatform() se disponível
    if (window.Capacitor && typeof window.Capacitor.getPlatform === 'function') {
      const platform = window.Capacitor.getPlatform();
      if (platform === 'ios') {
        html.classList.add('ios');
      } else if (platform === 'android') {
        html.classList.add('android');
      }
    } else {
      // Fallback para user agent
      const userAgent = navigator.userAgent || '';
      if (/iPad|iPhone|iPod/.test(userAgent) || 
          (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
        html.classList.add('ios');
      } else if (/Android/.test(userAgent)) {
        html.classList.add('android');
      }
    }
    
    console.log('📱 Capacitor nativo detectado - classes:', html.className);
  }
})();

// Seed data (async mas não bloqueante)
seedDemoCompanyProfile().catch(err => console.warn('Seed error:', err));

// Retry pending consent (async, non-blocking)
retryPendingConsent().catch(err => console.warn('Consent retry error:', err));

// ✅ FUNÇÃO DE CORREÇÃO: Atualizar flags do utilizador atual
async function fixCurrentUserFlags() {
  try {
    const mockUser = JSON.parse(localStorage.getItem('mock_user') || '{}');
    console.log('🔍 Utilizador atual:', mockUser.email);
    
    // Buscar perfil da empresa
    const { response, data: profiles } = await safeFetch('/api/company-profiles');
    if (!response.ok) {
      console.log('❌ Erro ao buscar perfis empresariais');
      return;
    }
    const userProfile = profiles?.find(p => p.adminUserId === mockUser.email);
    
    if (!userProfile) {
      console.log('❌ Nenhum perfil empresarial encontrado para este utilizador');
      return;
    }
    
    console.log('✅ Perfil encontrado:', userProfile.companyName);
    console.log('📊 Status:', userProfile.status, '| Subscrição:', userProfile.subscriptionStatus);
    
    // Atualizar flags
    mockUser.has_business_subscription = userProfile.status === 'active';
    mockUser.business_profile_completed = true;
    mockUser.business_id = userProfile.id;
    mockUser.is_business_user = true;
    mockUser.account_type = mockUser.account_type || 'empresa';
    mockUser.onboarding_completed = true;
    
    localStorage.setItem('mock_user', JSON.stringify(mockUser));
    console.log('✅ Flags do utilizador atualizadas!');
    console.log('🔄 Recarregando página...');
    
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  } catch (error) {
    console.error('❌ Erro ao corrigir flags:', error);
  }
}

// Expor funções de desenvolvimento globalmente
window.switchToDemoUser = switchToDemoUser;
window.createBusinessUser = createBusinessUser;
window.createBusinessForLegacyProfiles = createBusinessForLegacyProfiles;
window.fixDemoSubscription = fixDemoSubscription;
window.clearDemoData = clearDemoData;
window.fixCurrentUserFlags = fixCurrentUserFlags;

console.log('');
console.log('🔧 UTILIDADES DE DESENVOLVIMENTO:');
console.log('  fixCurrentUserFlags() - ⚡ CORRIGIR ACESSO EMPRESARIAL (se já tem plano)');
console.log('  clearDemoData() - ⚠️ LIMPAR TODOS OS DADOS DEMO (base limpa)');
console.log('  switchToDemoUser() - Trocar para utilizador demo (se existir)');
console.log('  createBusinessUser(email, companyName) - Criar novo utilizador empresarial');
console.log('  createBusinessForLegacyProfiles() - Corrigir perfis antigos (cria Business entities)');
console.log('  fixDemoSubscription() - Corrigir subscrição do utilizador demo');
console.log('');

ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
) 