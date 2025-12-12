import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, UserPlus, Mail, Lock, User, Building2, ExternalLink, Globe, CheckCircle2, AlertCircle, ArrowRight, CreditCard, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import PhoneInput from '../components/shared/PhoneInput';
import { safeFetch, apiUrl, isCapacitorApp } from '@/utils/apiConfig';
import { useAutoTranslate } from '@/hooks/useTranslate';
import PreRegisterConsent from '@/components/PreRegisterConsent';
import { Capacitor } from '@capacitor/core';

const EXTERNAL_SUBSCRIPTION_URL = 'https://waitless-qzero.com';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    accountType: 'pessoal'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showBusinessInfo, setShowBusinessInfo] = useState(false);
  
  const isNativeApp = isCapacitorApp();

  const txtCreateAccount = useAutoTranslate('Criar Conta', 'pt');
  const txtRegisterToStart = useAutoTranslate('Registe-se para começar a usar o QZero', 'pt');
  const txtFullName = useAutoTranslate('Nome Completo', 'pt');
  const txtEmail = useAutoTranslate('Email', 'pt');
  const txtPassword = useAutoTranslate('Palavra-passe', 'pt');
  const txtConfirmPassword = useAutoTranslate('Confirmar Palavra-passe', 'pt');
  const txtMobileNumber = useAutoTranslate('Número de Telemóvel', 'pt');
  const txtAccountType = useAutoTranslate('Tipo de Conta', 'pt');
  const txtPersonal = useAutoTranslate('Conta Pessoal', 'pt');
  const txtBusiness = useAutoTranslate('Conta Empresa', 'pt');
  const txtRegister = useAutoTranslate('Registar', 'pt');
  const txtRegistering = useAutoTranslate('A registar...', 'pt');
  const txtPasswordMin6 = useAutoTranslate('A palavra-passe deve ter no mínimo 6 caracteres', 'pt');
  const txtPasswordsNotMatch = useAutoTranslate('As palavras-passe não coincidem', 'pt');
  const txtFillAllFields = useAutoTranslate('Por favor preencha todos os campos obrigatórios', 'pt');
  const txtAccountCreated = useAutoTranslate('Conta criada com sucesso!', 'pt');
  const txtErrorCreatingAccount = useAutoTranslate('Erro ao criar conta', 'pt');
  const txtAlreadyHaveAccount = useAutoTranslate('Já tem conta?', 'pt');
  const txtLoginHere = useAutoTranslate('Entre aqui', 'pt');
  const txtForCustomers = useAutoTranslate('Para clientes', 'pt');
  const txtForBusinesses = useAutoTranslate('Para negócios', 'pt');
  const txtCreatingAccount = useAutoTranslate('A criar conta...', 'pt');
  const txtPlaceholderName = useAutoTranslate('João Silva', 'pt');
  const txtPlaceholderEmail = useAutoTranslate('seu@email.com', 'pt');
  const txtPlaceholderMinChars = useAutoTranslate('Mínimo 6 caracteres', 'pt');
  const txtPlaceholderConfirmPass = useAutoTranslate('Confirme a palavra-passe', 'pt');
  
  const txtBusinessAccountInfo = useAutoTranslate('Informação Importante', 'pt');
  const txtBusinessAccountTitle = useAutoTranslate('Olá! Antes de criar a conta...', 'pt');
  const txtBusinessStep1Title = useAutoTranslate('Crie a sua conta aqui', 'pt');
  const txtBusinessStep1Desc = useAutoTranslate('É rápido e gratuito! Basta preencher o formulário abaixo.', 'pt');
  const txtBusinessStep2Title = useAutoTranslate('Compre no nosso site', 'pt');
  const txtBusinessStep2Desc = useAutoTranslate('Para ativar as funcionalidades, visite waitless-qzero.com no seu computador ou browser.', 'pt');
  const txtBusinessStep3Title = useAutoTranslate('Volte à app e aproveite!', 'pt');
  const txtBusinessStep3Desc = useAutoTranslate('Depois de comprar, faça login aqui e tudo estará desbloqueado.', 'pt');
  const txtBusinessImportantNote = useAutoTranslate('Atenção:', 'pt');
  const txtBusinessNoAccessWithoutPayment = useAutoTranslate('Sem a compra no site, a conta fica limitada. Mas não se preocupe, pode explorar a app à vontade!', 'pt');
  const txtBusinessCancellation = useAutoTranslate('Onde comprar?', 'pt');
  const txtBusinessCancellationDesc = useAutoTranslate('waitless-qzero.com - Lá pode comprar, gerir e cancelar a sua subscrição quando quiser.', 'pt');
  const txtBusinessGoToSite = useAutoTranslate('Saber mais no site', 'pt');
  const txtBusinessUnderstood = useAutoTranslate('Entendi, vamos lá!', 'pt');
  const txtBusinessWebTrialNote = useAutoTranslate('7 dias grátis para experimentar!', 'pt');
  const txtBusinessMobileNote = useAutoTranslate('Na app móvel: compra no site', 'pt');
  const txtBusinessPlanPrice = useAutoTranslate('Plano Empresarial', 'pt');
  const txtBusinessPlanPriceInfo = useAutoTranslate('7 dias grátis, depois €19,99 (1º mês) e €49,99/mês', 'pt');
  const txtClose = useAutoTranslate('Fechar', 'pt');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBusinessAccountSelect = () => {
    setFormData(prev => ({ ...prev, accountType: 'empresa' }));
    if (isNativeApp) {
      setShowBusinessInfo(true);
    }
  };

  const handleExternalPurchase = () => {
    console.log('🌐 Abrindo site externo para compra B2B:', EXTERNAL_SUBSCRIPTION_URL);
    if (Capacitor.isNativePlatform()) {
      window.open(EXTERNAL_SUBSCRIPTION_URL, '_system');
    } else {
      window.open(EXTERNAL_SUBSCRIPTION_URL, '_blank');
    }
  };

  const validatePassword = () => {
    if (formData.password.length < 6) {
      toast.error(txtPasswordMin6);
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error(txtPasswordsNotMatch);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.phone) {
      toast.error(txtFillAllFields);
      return;
    }

    if (!validatePassword()) {
      return;
    }

    setLoading(true);

    try {
      const { response, data } = await safeFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          phone: formData.phone,
          accountType: formData.accountType
        }),
      });

      if (!response.ok) {
        throw new Error(data?.error || txtErrorCreatingAccount);
      }

      console.log('✅ Conta criada com sucesso! Tipo:', data.user.accountType);
      toast.success(txtAccountCreated);
      
      // 🔄 AGUARDAR cookies sincronizarem verificando /api/auth/me
      // Garante que o cookie foi definido antes de navegar (Safari iOS)
      let cookieReady = false;
      let attempts = 0;
      const maxAttempts = 5;
      
      while (!cookieReady && attempts < maxAttempts) {
        attempts++;
        try {
          const { response: meResponse } = await safeFetch('/api/auth/me', {
            method: 'GET'
          });
          
          if (meResponse.ok) {
            console.log('✅ Cookie sincronizado após', attempts, 'tentativa(s)');
            cookieReady = true;
          } else {
            console.log('⏳ Cookie ainda não sincronizado, tentativa', attempts);
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        } catch (err) {
          console.log('⏳ Aguardando cookie sincronizar...', attempts);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      const targetPath = data.user.accountType === 'empresa' 
        ? '/business-subscription' 
        : '/home';
      
      console.log('📍 Redirecionando para', targetPath);
      window.location.href = targetPath;
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PreRegisterConsent>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full mb-4">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{txtCreateAccount}</h1>
          <p className="text-gray-600">{txtRegisterToStart}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
              {txtFullName}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="fullName"
                name="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder={txtPlaceholderName}
                className="pl-10"
                autoComplete="name"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              {txtEmail}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="email"
                name="email"
                type="text"
                inputMode="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder={txtPlaceholderEmail}
                className="pl-10"
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              {txtPassword}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange}
                placeholder={txtPlaceholderMinChars}
                className="pl-10 pr-12"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              {txtConfirmPassword}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder={txtPlaceholderConfirmPass}
                className="pl-10 pr-12"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              {txtMobileNumber}
            </label>
            <PhoneInput
              value={formData.phone}
              onChange={(value) => setFormData(prev => ({ ...prev, phone: value }))}
            />
          </div>

          {/* ============================================ */}
          {/* TIPO DE CONTA - SÓ MOSTRA NA WEB */}
          {/* iOS/Android: Apenas conta pessoal (regra Apple B2B) */}
          {/* Website: Pessoal + Empresa disponíveis */}
          {/* ============================================ */}
          {!isNativeApp && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {txtAccountType}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, accountType: 'pessoal' }))}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.accountType === 'pessoal'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <User className={`w-6 h-6 mx-auto mb-2 ${
                    formData.accountType === 'pessoal' ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                  <div className={`text-sm font-medium ${
                    formData.accountType === 'pessoal' ? 'text-blue-900' : 'text-gray-700'
                  }`}>
                    {txtPersonal}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{txtForCustomers}</div>
                </button>

                <button
                  type="button"
                  onClick={handleBusinessAccountSelect}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.accountType === 'empresa'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Building2 className={`w-6 h-6 mx-auto mb-2 ${
                    formData.accountType === 'empresa' ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                  <div className={`text-sm font-medium ${
                    formData.accountType === 'empresa' ? 'text-blue-900' : 'text-gray-700'
                  }`}>
                    {txtBusiness}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{txtForBusinesses}</div>
                </button>
              </div>
            </div>
          )}

          {/* ============================================ */}
          {/* TELA INFORMATIVA - Conta Empresa */}
          {/* SÓ MOSTRA EM iOS/ANDROID (apps nativas) */}
          {/* Na web, o utilizador pode pagar diretamente via Stripe */}
          {/* ============================================ */}
          {showBusinessInfo && formData.accountType === 'empresa' && isNativeApp && (
            <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-lg">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Globe className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h3 className="font-bold text-indigo-900 text-lg">
                      {txtBusinessAccountTitle}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowBusinessInfo(false)}
                    className="p-1 hover:bg-indigo-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-indigo-400" />
                  </button>
                </div>

                {/* Passos do processo */}
                <div className="space-y-4 mb-5">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">1</div>
                    <div>
                      <h4 className="font-semibold text-slate-800">{txtBusinessStep1Title}</h4>
                      <p className="text-sm text-slate-600">{txtBusinessStep1Desc}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">2</div>
                    <div>
                      <h4 className="font-semibold text-slate-800">{txtBusinessStep2Title}</h4>
                      <p className="text-sm text-slate-600">{txtBusinessStep2Desc}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">3</div>
                    <div>
                      <h4 className="font-semibold text-slate-800">{txtBusinessStep3Title}</h4>
                      <p className="text-sm text-slate-600">{txtBusinessStep3Desc}</p>
                    </div>
                  </div>
                </div>

                {/* Alertas importantes */}
                <Alert className="mb-4 border-amber-200 bg-amber-50">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-900 text-sm">
                    <strong>{txtBusinessImportantNote}</strong> {txtBusinessNoAccessWithoutPayment}
                  </AlertDescription>
                </Alert>
                
                <Alert className="mb-4 border-blue-200 bg-blue-50">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-900 text-sm">
                    <strong>{txtBusinessCancellation}</strong> {txtBusinessCancellationDesc}
                  </AlertDescription>
                </Alert>

                {/* Preço do plano */}
                <div className="text-center mb-4 p-3 bg-white rounded-lg border border-indigo-100">
                  <span className="inline-block px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold rounded-full mb-2">
                    {txtBusinessPlanPrice}
                  </span>
                  <p className="text-xs text-green-600 font-medium">
                    {txtBusinessPlanPriceInfo}
                  </p>
                </div>

                {/* Botão de ação único */}
                <Button
                  type="button"
                  onClick={() => setShowBusinessInfo(false)}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {txtBusinessUnderstood}
                </Button>
              </CardContent>
            </Card>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium py-3"
          >
            {loading ? txtCreatingAccount : txtCreateAccount}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            {txtAlreadyHaveAccount}{' '}
            <Link
              to="/login"
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              {txtLoginHere}
            </Link>
          </p>
        </div>
      </Card>
      </div>
    </PreRegisterConsent>
  );
}
