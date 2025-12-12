import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { safeFetch } from "@/utils/apiConfig";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, ArrowRight, Building2, Mail } from "lucide-react";
import { createPageUrl } from "@/utils";
import { companyProfileStorage, normalizeCategory, normalizeCountry } from '@/models/companyProfile';
import { toast } from "sonner";
import { useAutoTranslate } from '@/hooks/useTranslate';

export default function PaymentSuccessPage() {
  const [status, setStatus] = useState('checking');
  const [companyProfile, setCompanyProfile] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Translations
  const txtProcessingPayment = useAutoTranslate('A processar pagamento...', 'pt');
  const txtPleaseWait = useAutoTranslate('Por favor aguarde enquanto confirmamos o seu pagamento', 'pt');
  const txtAttempt = useAutoTranslate('Tentativa', 'pt');
  const txtPaymentProcessing = useAutoTranslate('Pagamento em Processamento', 'pt');
  const txtPaymentBeingProcessed = useAutoTranslate('O seu pagamento está a ser processado. Pode demorar alguns minutos. Por favor, tente aceder ao painel empresarial dentro de momentos.', 'pt');
  const txtGoToDashboard = useAutoTranslate('Ir para Dashboard', 'pt');
  const txtAccountActivated = useAutoTranslate('Conta Ativada!', 'pt');
  const txtCongratulations = useAutoTranslate('Parabéns! A sua conta empresarial está ativa.', 'pt');
  const txtFreeTrialActive = useAutoTranslate('Período de Teste Grátis Ativo!', 'pt');
  const txtFreeTrialDetails = useAutoTranslate('Tem 7 dias para testar todas as funcionalidades GRATUITAMENTE. O pagamento só será processado após este período. Pode cancelar a qualquer momento sem qualquer custo.', 'pt');
  const txtPlan = useAutoTranslate('Plano:', 'pt');
  const txtBusinessPlan = useAutoTranslate('Empresarial', 'pt');
  const txtStatus = useAutoTranslate('Status:', 'pt');
  const txtFreeTrial = useAutoTranslate('Teste Grátis (7 dias)', 'pt');
  const txtEmail = useAutoTranslate('Email:', 'pt');
  const txtRedirecting = useAutoTranslate('A redirecionar para o seu painel empresarial...', 'pt');
  const txtGoToBusinessPanel = useAutoTranslate('Ir para Painel Empresarial', 'pt');
  const txtErrorProfile = useAutoTranslate('Erro: Perfil empresarial não encontrado.', 'pt');
  const txtTryAgain = useAutoTranslate('Por favor, tente criar sua conta novamente.', 'pt');
  const txtGoBack = useAutoTranslate('Anterior', 'pt');
  const txtErrorConfigProfile = useAutoTranslate('Erro ao configurar perfil empresarial. Por favor, contacte o suporte.', 'pt');
  const txtSecurityError = useAutoTranslate('Erro de Segurança', 'pt');
  const txtInvalidSession = useAutoTranslate('Sessão inválida detectada. Use o fluxo de pagamento oficial.', 'pt');

  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session_id');
  const profileId = urlParams.get('profile_id'); // Para modo demo

  useEffect(() => {
    const checkPayment = async () => {
      try {
        console.log('=== PAYMENT SUCCESS - INICIANDO VERIFICAÇÃO ===');
        console.log('Session ID:', sessionId);
        console.log('Profile ID (query):', profileId);
        console.log('LocalStorage mock_user:', localStorage.getItem('mock_user'));
        console.log('LocalStorage company_profiles:', localStorage.getItem('company_profiles'));
        
        if (!sessionId) {
          console.error('❌ Sem session_id!');
          setStatus('error');
          return;
        }

        // SEGURANÇA: Verificar se é modo demo (session_id começa com "mock_")
        // EM PRODUÇÃO, mock sessions SÃO REJEITADAS automaticamente
        const isMockSession = sessionId.startsWith('mock_session_');
        const isDevelopment = import.meta.env.DEV;
        
        console.log('🔍 Verificando pagamento:', { 
          sessionId, 
          isMockSession, 
          isDevelopment,
          allowMock: isDevelopment && isMockSession 
        });

        // PROTEÇÃO DE SEGURANÇA: Rejeitar mock sessions em produção
        if (isMockSession && !isDevelopment) {
          console.error('❌ SEGURANÇA: Tentativa de usar mock session em PRODUÇÃO bloqueada!');
          console.error('Session ID suspeito:', sessionId);
          toast.error(txtSecurityError, {
            description: txtInvalidSession,
            duration: 5000
          });
          setStatus('error');
          return;
        }

        let verifyData;
        
        if (isMockSession && isDevelopment) {
          // Modo demo: APENAS em desenvolvimento
          console.log('💡 Modo Demo (DEV only): Pagamento simulado');
          
          if (!profileId) {
            console.error('❌ Modo demo mas sem profile_id no query string!');
            setStatus('error');
            return;
          }
          
          verifyData = {
            success: true,
            status: 'active',
            companyProfileId: profileId
          };
          
          console.log('✅ Modo Demo: Usando profile_id do query string:', profileId);
        } else {
          // Modo real: SEMPRE verificar com backend Stripe em produção
          console.log('🔒 Modo Produção: Verificando com Stripe backend...');
          const { response: verifyResponse, data } = await safeFetch('/api/verify-payment', {
            method: 'POST',
            body: JSON.stringify({ sessionId })
          });

          verifyData = data || {};
          console.log('📊 Resposta da verificação Stripe:', verifyData);
        }

        // ✅ Aceitar tanto 'active' quanto 'trialing' (período de teste grátis)
        const isValidStatus = verifyData.success && (
          verifyData.status === 'active' || 
          verifyData.status === 'trialing' ||
          verifyData.isTrialing === true
        );

        if (isValidStatus) {
          const paymentStatusMessage = verifyData.status === 'trialing' || verifyData.isTrialing
            ? '✅ Período de teste grátis ativado (2 dias)'
            : '✅ Pagamento verificado como PAGO';
          console.log(paymentStatusMessage);
          
          let profile = null;
          
          // No modo mock, buscar DIRETAMENTE pelo ID sem depender do email
          if (isMockSession && verifyData.companyProfileId) {
            console.log('🔍 Modo Mock: Buscando perfil diretamente pelo ID:', verifyData.companyProfileId);
            profile = await companyProfileStorage.getById(verifyData.companyProfileId);
            
            if (!profile) {
              console.error('❌ Modo Mock: Perfil não encontrado pelo ID:', verifyData.companyProfileId);
              toast.error(txtErrorProfile, {
                description: txtTryAgain,
                action: {
                  label: txtGoBack,
                  onClick: () => window.location.href = createPageUrl('BusinessProfileSetup')
                }
              });
              setStatus('error');
              return;
            }
            
            console.log('✅ Modo Mock: Perfil encontrado:', {
              id: profile.id,
              name: profile.companyName,
              status: profile.status,
              adminUserId: profile.adminUserId
            });
            
            // CRÍTICO: No modo mock, SEMPRE ativar o perfil independente do status atual
            // Isso resolve race conditions com simulateSuccessfulPayment
            console.log('💳 Modo Mock: Ativando perfil automaticamente (status atual:', profile.status + ')');
            await companyProfileStorage.update(profile.id, {
              status: 'active',
              subscriptionStatus: 'active'
            });
            
            // Recarregar o perfil atualizado
            profile = await companyProfileStorage.getById(profile.id);
            console.log('✅ Modo Mock: Perfil ativado:', profile.status);
          } else {
            // Modo real Stripe: buscar pelo ID do usuário
            const user = await base44.auth.me();
            console.log('👤 Utilizador atual:', {
              id: user.id,
              email: user.email,
              account_type: user.account_type,
              has_business_subscription: user.has_business_subscription,
              business_profile_completed: user.business_profile_completed,
              business_id: user.business_id
            });
            
            profile = await companyProfileStorage.getByUserId(user.id);
            console.log('🏢 Perfil da empresa:', profile ? {
              id: profile.id,
              name: profile.companyName,
              status: profile.status,
              adminUserId: profile.adminUserId
            } : 'NÃO ENCONTRADO');
            
            // Se não encontrar perfil para este email, procurar pelo companyProfileId retornado pela Stripe
            if (!profile && verifyData.companyProfileId) {
              console.log('🔍 Procurando perfil pelo ID retornado pela Stripe:', verifyData.companyProfileId);
              profile = await companyProfileStorage.getById(verifyData.companyProfileId);
              
              if (profile) {
                console.log('⚠️ Perfil encontrado mas com email diferente!');
                console.log('Email do perfil:', profile.adminUserId);
                console.log('Email do utilizador:', user.email);
                console.log('🔧 Corrigindo email do perfil...');
                
                // CORRIGIR: Atualizar o ID do admin do perfil para corresponder ao utilizador atual
                await companyProfileStorage.update(profile.id, {
                  adminUserId: user.id
                });
                
                // Recarregar o perfil atualizado
                profile = await companyProfileStorage.getById(profile.id);
                console.log('✅ Email do perfil corrigido para:', profile.adminUserId);
              }
            }
            
            if (!profile) {
              console.error('❌ ERRO: Perfil da empresa não encontrado!');
              console.error('Email do utilizador:', user.email);
              console.error('Company Profile ID da Stripe:', verifyData.companyProfileId);
              toast.error(txtErrorProfile + ' ' + txtTryAgain);
              setStatus('error');
              return;
            }
          }
          
          // Determinar subscriptionStatus baseado na resposta Stripe
          const subscriptionStatus = verifyData.status || 'active';
          const profileStatusMessage = subscriptionStatus === 'trialing'
            ? 'TRIAL (2 dias grátis)'
            : 'ACTIVE';
          
          console.log(`🔄 Atualizando perfil da empresa para ${profileStatusMessage}...`);
          const activatedProfile = await companyProfileStorage.update(profile.id, {
            status: 'active', // Status da conta sempre 'active' (features habilitadas)
            subscriptionStatus: subscriptionStatus // 'trialing' ou 'active' do Stripe
          });
          console.log(`✅ Perfil da empresa ativado com status: ${subscriptionStatus}`);
          
          // 🏢 CRIAR ENTIDADE BUSINESS (usada em toda a aplicação)
          console.log('🏢 Criando entidade Business a partir do CompanyProfile...');
          
          // Função de normalização: CompanyProfile (camelCase) → Business (snake_case)
          const normalizeProfileForBusiness = (profile) => {
            // Validar campos obrigatórios
            const requiredFields = {
              companyName: 'Nome da empresa',
              companyEmail: 'Email',
              companyCategory: 'Categoria',
              companyCity: 'Cidade',
              companyPostalCode: 'Código postal',
              companyStreetName: 'Nome da rua',
              companyDoorNumber: 'Número da porta',
              companyDistrict: 'Distrito/Região'
            };
            
            const missingFields = [];
            for (const [field, label] of Object.entries(requiredFields)) {
              if (!profile[field]) {
                missingFields.push(label);
              }
            }
            
            if (missingFields.length > 0) {
              throw new Error(`Campos obrigatórios faltando: ${missingFields.join(', ')}`);
            }
            
            // Mapear camelCase → snake_case com valores garantidos
            // Normalizar categoria e país (legado → códigos)
            const normalizedCategory = normalizeCategory(profile.companyCategory);
            const normalizedCountry = normalizeCountry(profile.companyCountry);
            
            return {
              id: profile.id,
              name: profile.companyName,
              description: profile.companyDescription || '',
              category: normalizedCategory,
              address: profile.companyAddress || `${profile.companyStreetName} ${profile.companyDoorNumber}`,
              street_name: profile.companyStreetName,
              door_number: profile.companyDoorNumber,
              postal_code: profile.companyPostalCode,
              city: profile.companyCity,
              district: profile.companyDistrict,
              country: normalizedCountry,
              phone: profile.companyPhone || '',
              email: profile.companyEmail,
              logo_url: profile.logoUrl || '',
              photo_url: profile.photoUrl || '',
              is_active: true,
              owner_email: profile.adminUserId,
              latitude: profile.companyCoordinates?.lat || null,
              longitude: profile.companyCoordinates?.lng || null
            };
          };
          
          try {
            // Verificar se já existe Business com este ID
            const existingBusinesses = await base44.entities.Business.filter({ id: profile.id });
            
            if (existingBusinesses.length === 0) {
              // Criar Business entity com normalização
              const businessData = normalizeProfileForBusiness(profile);
              await base44.entities.Business.create(businessData);
              console.log('✅ Entidade Business criada com sucesso:', profile.id);
            } else {
              console.log('⚠️ Business já existe, atualizando dados...');
              const businessData = normalizeProfileForBusiness(profile);
              await base44.entities.Business.update(profile.id, businessData);
              console.log('✅ Entidade Business atualizada');
            }
          } catch (businessError) {
            console.error('❌ Erro ao criar/atualizar Business:', businessError);
            toast.error(txtErrorConfigProfile);
            // Não bloquear o fluxo, mas mostrar erro ao utilizador
          }
          
          // ⚠️ CRÍTICO: Sincronizar mock_user IMEDIATAMENTE para prevenir loops
          // Layout.jsx usa mock_user.has_business_subscription para decidir redirecionamentos
          // Se não atualizarmos ANTES de redirecionar, Layout causará loop infinito
          console.log('🔄 Atualizando utilizador com todas as flags...');
          const currentUser = JSON.parse(localStorage.getItem('mock_user') || '{}');
          currentUser.has_business_subscription = true;
          currentUser.business_profile_completed = true;
          currentUser.business_id = profile.id;
          currentUser.is_business_user = true;
          currentUser.account_type = currentUser.account_type || 'empresa';
          currentUser.onboarding_completed = true;
          
          // ⚠️ IMPORTANTE: Persistir ANTES de redirecionar
          localStorage.setItem('mock_user', JSON.stringify(currentUser));
          console.log('✅ Utilizador atualizado no localStorage ANTES do redirect');
          console.log('✅ Flags atualizadas:', {
            has_business_subscription: currentUser.has_business_subscription,
            business_profile_completed: currentUser.business_profile_completed,
            business_id: currentUser.business_id
          });
          
          console.log('📊 Dados finais:', {
            profile_id: profile.id,
            profile_status: 'active',
            user_email: currentUser.email,
            has_subscription: true,
            profile_completed: true,
            account_type: currentUser.account_type
          });
          
          setCompanyProfile(activatedProfile || profile);
          setStatus('success');
          
          console.log('⏱️ Aguardando 3 segundos antes de redirecionar...');
          setTimeout(() => {
            console.log('🚀 Redirecionando para BusinessDashboard...');
            console.log('🔍 Verificação final antes do redirect:', {
              localStorage_user: JSON.parse(localStorage.getItem('mock_user') || '{}'),
              profile_id: profile.id
            });
            window.location.href = createPageUrl('BusinessDashboard');
          }, 3000);
        } else if (retryCount < 10) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 1000);
        } else {
          setStatus('pending');
        }
      } catch (error) {
        console.error('Payment check error:', error);
        if (retryCount < 5) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 2000);
        } else {
          setStatus('error');
        }
      }
    };

    checkPayment();
  }, [retryCount, sessionId]);

  if (status === 'checking') {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 flex items-center justify-center p-4">
        <Card className="border-0 shadow-2xl max-w-md w-full">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-16 h-16 animate-spin text-purple-600 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {txtProcessingPayment}
            </h2>
            <p className="text-slate-600">
              {txtPleaseWait}
            </p>
            {retryCount > 0 && (
              <p className="text-sm text-slate-500 mt-2">
                {txtAttempt} {retryCount}/5
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'pending' || status === 'error') {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 flex items-center justify-center p-4">
        <Card className="border-0 shadow-2xl max-w-md w-full">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
              <div className="text-4xl">⚠️</div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {txtPaymentProcessing}
            </h2>
            <p className="text-slate-600 mb-6">
              {txtPaymentBeingProcessed}
            </p>
            <Button 
              onClick={() => window.location.href = createPageUrl('BusinessDashboard')}
              className="w-full"
            >
              {txtGoToDashboard}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleContinue = () => {
    window.location.href = createPageUrl('BusinessDashboard');
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 flex items-center justify-center p-4">
      <Card className="border-0 shadow-2xl max-w-md w-full overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-500" />
        <CardContent className="p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-6 animate-scale-in">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3">
            {txtAccountActivated} 🎉
          </h1>
          <p className="text-lg text-slate-600 mb-4">
            {txtCongratulations}
          </p>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-800 font-semibold">
              ✨ <strong>{txtFreeTrialActive}</strong>
            </p>
            <p className="text-xs text-green-700 mt-1">
              {txtFreeTrialDetails}
            </p>
          </div>

          {companyProfile && (
            <div className="bg-slate-50 rounded-lg p-4 mb-6 text-left">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <span className="font-semibold text-slate-900">{companyProfile.companyName}</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">{txtPlan}</span>
                  <span className="font-semibold text-slate-900">{txtBusinessPlan} - €49,99/mês</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">{txtStatus}</span>
                  <span className="text-green-600 font-semibold">{txtFreeTrial}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">{txtEmail}</span>
                  <span className="font-semibold text-slate-900 text-xs flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {companyProfile.companyEmail}
                  </span>
                </div>
              </div>
            </div>
          )}

          <p className="text-sm text-slate-500 mb-6">
            {txtRedirecting}
          </p>

          <Button
            onClick={handleContinue}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            {txtGoToBusinessPanel}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}