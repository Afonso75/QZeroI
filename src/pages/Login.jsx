import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Mail, Lock, Shield, ArrowLeft, Globe, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { safeFetch, isCapacitorApp } from '@/utils/apiConfig';
import { useUser } from '@/contexts/UserContext';
import { useAutoTranslate } from '@/hooks/useTranslate';
import { ApiDiagnostic } from '@/components/debug/ApiDiagnostic';

const LOGIN_EMAIL_KEY = '2fa_login_email';
const LOGIN_STEP_KEY = '2fa_login_step';
const LOGIN_CHALLENGE_KEY = '2fa_challenge_token';

export default function LoginPage() {
  const navigate = useNavigate();
  const { refresh } = useUser();
  const [step, setStep] = useState(() => {
    return sessionStorage.getItem(LOGIN_STEP_KEY) || 'credentials';
  });
  const [formData, setFormData] = useState(() => {
    // Se estamos no passo de verificação, restaurar email do sessionStorage
    const currentStep = sessionStorage.getItem(LOGIN_STEP_KEY);
    const savedEmail = sessionStorage.getItem(LOGIN_EMAIL_KEY);
    
    if (currentStep === 'verification' && savedEmail) {
      return {
        email: savedEmail,
        password: ''
      };
    }
    
    return {
      email: '',
      password: ''
    };
  });
  const [verificationCode, setVerificationCode] = useState('');
  const [challengeToken, setChallengeToken] = useState(() => {
    return sessionStorage.getItem(LOGIN_CHALLENGE_KEY) || '';
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [isDemoAccount, setIsDemoAccount] = useState(false);

  const txtWelcome = useAutoTranslate('Bem-vindo ao QZero', 'pt');
  const txtSecurityVerification = useAutoTranslate('Verificação de Segurança', 'pt');
  const txtEnterAccount = useAutoTranslate('Entre na sua conta para continuar', 'pt');
  const txtEnterCode = useAutoTranslate('Introduza o código enviado para o seu email', 'pt');
  const txtEmail = useAutoTranslate('Email', 'pt');
  const txtPassword = useAutoTranslate('Palavra-passe', 'pt');
  const txtContinue = useAutoTranslate('Continuar', 'pt');
  const txtValidating = useAutoTranslate('A validar...', 'pt');
  const txtForgotPassword = useAutoTranslate('Esqueceu a senha?', 'pt');
  const txtVerificationCode = useAutoTranslate('Código de Verificação', 'pt');
  const txtEnter6Digits = useAutoTranslate('Introduza o código de 6 dígitos', 'pt');
  const txtVerify = useAutoTranslate('Verificar', 'pt');
  const txtVerifying = useAutoTranslate('A verificar...', 'pt');
  const txtResendCode = useAutoTranslate('Reenviar Código', 'pt');
  const txtBackToLogin = useAutoTranslate('Voltar ao Login', 'pt');
  const txtIncorrectCredentials = useAutoTranslate('Email ou palavra-passe incorretos', 'pt');
  const txtErrorSendingCode = useAutoTranslate('Erro ao enviar código de verificação', 'pt');
  const txtCodeSent = useAutoTranslate('Código de verificação enviado para o seu email!', 'pt');
  const txtInvalidCode = useAutoTranslate('Código inválido ou expirado', 'pt');
  const txtNewCodeSent = useAutoTranslate('Novo código enviado!', 'pt');
  const txtErrorResendingCode = useAutoTranslate('Erro ao reenviar código', 'pt');
  const txtNoAccount = useAutoTranslate('Ainda não tem conta?', 'pt');
  const txtRegisterNow = useAutoTranslate('Registar agora', 'pt');
  const txtLoginSuccess = useAutoTranslate('Login realizado com sucesso!', 'pt');
  const txtSentCodeTo = useAutoTranslate('Enviámos um código de 6 dígitos para', 'pt');
  const txtPlaceholderEmail = useAutoTranslate('seu@email.com', 'pt');
  const txtEnterEmail = useAutoTranslate('Por favor, introduza o seu email', 'pt');
  const txtEnterPassword = useAutoTranslate('Por favor, introduza a sua palavra-passe', 'pt');
  
  // 🍎🤖 B2B COMPLIANCE: Mensagens de subscrição
  const txtSubscriptionRequired = useAutoTranslate('Subscrição Necessária', 'pt');
  const txtSubscriptionRequiredMsg = useAutoTranslate('Para aceder à aplicação com conta empresarial, é necessário ter uma subscrição ativa.', 'pt');
  const txtVisitWebsite = useAutoTranslate('Visite waitless-qzero.com para ativar a sua subscrição.', 'pt');
  const txtOpenWebsite = useAutoTranslate('Abrir Website', 'pt');
  
  // Estado para mostrar erro de subscrição
  const [subscriptionError, setSubscriptionError] = useState(false);

  // 🧹 LIMPEZA AUTOMÁTICA ao montar a página
  useEffect(() => {
    // Se NÃO estamos no passo de verificação, limpar tudo
    const currentStep = sessionStorage.getItem(LOGIN_STEP_KEY);
    if (currentStep !== 'verification') {
      console.log('🧹 Login page montada - limpando sessionStorage antigo');
      sessionStorage.removeItem(LOGIN_EMAIL_KEY);
      sessionStorage.removeItem(LOGIN_STEP_KEY);
      sessionStorage.removeItem(LOGIN_CHALLENGE_KEY);
      
      // 🚨 LIMPAR COOKIES DE FORMA AGRESSIVA (Safari iOS fix)
      // Chama endpoint de emergência para garantir cookies limpos
      safeFetch('/api/auth/clear-session', {
        method: 'POST'
      }).catch(err => {
        console.warn('⚠️ Erro ao limpar sessão (não crítico):', err);
      });
    }
    
    return () => {
      if (window.location.pathname !== '/login') {
        sessionStorage.removeItem(LOGIN_EMAIL_KEY);
        sessionStorage.removeItem(LOGIN_STEP_KEY);
        sessionStorage.removeItem(LOGIN_CHALLENGE_KEY);
      }
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Step 1: Validar credenciais e enviar código
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validação personalizada (substitui validação nativa HTML5 para evitar erros Safari iOS)
    if (!formData.email || !formData.email.trim()) {
      toast.error(txtEnterEmail);
      return;
    }
    if (!formData.password || !formData.password.trim()) {
      toast.error(txtEnterPassword);
      return;
    }
    
    setLoading(true);

    try {
      // Primeiro valida email e senha (SEM emitir JWT) e recebe challenge token
      const { response: validateResponse, data: validateData } = await safeFetch('/api/auth/validate-credentials', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      if (!validateResponse.ok) {
        throw new Error(validateData?.error || txtIncorrectCredentials);
      }

      // Guardar challenge token
      const token = validateData.challengeToken;
      setChallengeToken(token);

      // Persistir email e token em sessionStorage para não perder ao sair da página
      sessionStorage.setItem(LOGIN_EMAIL_KEY, formData.email);
      sessionStorage.setItem(LOGIN_CHALLENGE_KEY, token);
      sessionStorage.setItem(LOGIN_STEP_KEY, 'verification');

      // Envia código de verificação vinculado ao challenge token
      const { response: codeResponse, data: codeData } = await safeFetch('/api/auth/send-verification-code', {
        method: 'POST',
        body: JSON.stringify({ 
          email: formData.email,
          challengeToken: token
        }),
      });

      if (!codeResponse.ok) {
        throw new Error(codeData?.error || txtErrorSendingCode);
      }

      // 🎯 Conta demo: mostrar código diretamente (toast apenas, sem popup persistente)
      if (codeData.isDemoAccount) {
        setIsDemoAccount(true);
        toast.success('Conta Demo - Código: 000000', { duration: 5000 });
      } else {
        toast.success(txtCodeSent);
      }
      setStep('verification');
    } catch (error) {
      console.error('❌ Login error:', error);
      setApiError(error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verificar código 2FA
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { response, data } = await safeFetch('/api/auth/verify-code', {
        method: 'POST',
        body: JSON.stringify({
          email: formData.email,
          code: verificationCode,
          challengeToken: challengeToken,
        }),
      });

      if (!response.ok) {
        // 🍎🤖 B2B COMPLIANCE: Verificar se é erro de subscrição necessária
        if (response.status === 403 && data?.code === 'SUBSCRIPTION_REQUIRED') {
          console.log('🚫 B2B COMPLIANCE: Subscrição necessária para login em app nativa');
          setSubscriptionError(true);
          return;
        }
        throw new Error(data?.error || txtInvalidCode);
      }

      console.log('✅ Login 2FA bem-sucedido! Tipo de conta:', data.user.accountType);
      toast.success(txtLoginSuccess);
      
      // 🍪 SAFARI iOS FIX: Guardar token no localStorage como fallback
      // Safari bloqueia cookies em iframes, então usamos localStorage + Authorization header
      if (data.token) {
        try {
          localStorage.setItem('qzero_auth_token', data.token);
          console.log('🔐 Token guardado no localStorage (Safari iOS fallback)');
        } catch (e) {
          console.warn('⚠️ Erro ao guardar token no localStorage:', e);
        }
      }
      
      // 🧹 Limpar dados de sessão E localStorage (remove dados demo/cache antigos)
      sessionStorage.removeItem(LOGIN_EMAIL_KEY);
      sessionStorage.removeItem(LOGIN_STEP_KEY);
      sessionStorage.removeItem(LOGIN_CHALLENGE_KEY);
      
      // Limpar cache de empresas do localStorage
      try {
        localStorage.removeItem('company_profiles');
        localStorage.removeItem('businesses');
        console.log('🗑️ Cache de empresas limpo do localStorage');
      } catch (e) {
        console.warn('⚠️ Erro ao limpar localStorage:', e);
      }
      
      // 🔄 CRÍTICO: Recarregar utilizador ANTES de navegar (fix loop infinito)
      console.log('🔄 Recarregando estado de autenticação com novo cookie...');
      await refresh();
      console.log('✅ Estado de autenticação recarregado com sucesso!');
      
      if (data.user.accountType === 'empresa') {
        console.log('📍 Redirecionando para BusinessHome...');
        navigate('/business-home', { replace: true });
      } else {
        console.log('📍 Redirecionando para Home...');
        navigate('/home', { replace: true });
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    try {
      const { response, data } = await safeFetch('/api/auth/send-verification-code', {
        method: 'POST',
        body: JSON.stringify({ 
          email: formData.email,
          challengeToken: challengeToken
        }),
      });

      if (!response.ok) {
        throw new Error(data?.error || txtErrorResendingCode);
      }

      toast.success(txtNewCodeSent);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToCredentials = () => {
    setStep('credentials');
    setVerificationCode('');
    setChallengeToken('');
    sessionStorage.setItem(LOGIN_STEP_KEY, 'credentials');
    sessionStorage.removeItem(LOGIN_CHALLENGE_KEY);
  };

  // 🍎🤖 B2B COMPLIANCE: Mostrar ecrã de erro de subscrição
  if (subscriptionError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 shadow-xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-full mb-4">
              <AlertTriangle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {txtSubscriptionRequired}
            </h1>
            <p className="text-gray-600 mb-6">
              {txtSubscriptionRequiredMsg}
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center gap-2 text-amber-800">
                <Globe className="w-5 h-5" />
                <span className="font-medium">{txtVisitWebsite}</span>
              </div>
            </div>
            <div className="space-y-3">
              <Button
                onClick={() => window.open('https://waitless-qzero.com', '_system')}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium py-3"
              >
                <Globe className="w-5 h-5 mr-2" />
                {txtOpenWebsite}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSubscriptionError(false);
                  setStep('credentials');
                  setVerificationCode('');
                  setChallengeToken('');
                }}
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {txtBackToLogin}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full mb-4">
            {step === 'credentials' ? (
              <LogIn className="w-8 h-8 text-white" />
            ) : (
              <Shield className="w-8 h-8 text-white" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {step === 'credentials' ? txtWelcome : txtSecurityVerification}
          </h1>
          <p className="text-gray-600">
            {step === 'credentials' ? txtEnterAccount : txtEnterCode}
          </p>
        </div>

        {step === 'credentials' ? (
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
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
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder={txtPlaceholderEmail}
                  className="pl-10"
                  autoComplete="username"
                  inputMode="email"
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
                  placeholder="••••••••"
                  className="pl-10 pr-12"
                  autoComplete="current-password"
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

            <Button
              type="submit"
              disabled={loading || !formData.email || !formData.password}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium py-3"
            >
              {loading ? txtValidating : txtContinue}
            </Button>

            <div className="text-center">
              <Link
                to="/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
              >
                {txtForgotPassword}
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-6" noValidate>
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                {txtVerificationCode}
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  value={verificationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setVerificationCode(value);
                  }}
                  placeholder="000000"
                  className="pl-10 text-center text-2xl tracking-widest font-mono"
                  maxLength={6}
                  autoComplete="one-time-code"
                  autoFocus
                />
              </div>
              <p className="mt-2 text-xs text-gray-500 text-center">
                {isDemoAccount && verificationCode.length === 0 ? (
                  <span className="text-green-600 font-medium">
                    Conta Demo - Use o código: <strong className="text-lg">000000</strong>
                  </span>
                ) : (
                  <>{txtSentCodeTo} <strong>{formData.email}</strong></>
                )}
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading || verificationCode.length !== 6}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium py-3"
            >
              {loading ? txtVerifying : txtVerify}
            </Button>

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                onClick={handleResendCode}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                {txtResendCode}
              </Button>
              
              <Button
                type="button"
                onClick={handleBackToCredentials}
                disabled={loading}
                variant="ghost"
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {txtBackToLogin}
              </Button>
            </div>
          </form>
        )}

        {step === 'credentials' && (
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              {txtNoAccount}{' '}
              <Link
                to="/register"
                className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                {txtRegisterNow}
              </Link>
            </p>
          </div>
        )}

        {apiError && <ApiDiagnostic error={apiError} />}
      </Card>
    </div>
  );
}
