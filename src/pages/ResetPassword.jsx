import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Lock, Eye, EyeOff } from 'lucide-react';
import { useAutoTranslate } from '@/hooks/useTranslate';
import { safeFetch } from '@/utils/apiConfig';

export default function ResetPassword() {
  // Traduções
  const txtPasswordsMismatch = useAutoTranslate('As senhas não coincidem', 'pt');
  const txtPasswordMin8 = useAutoTranslate('A senha deve ter pelo menos 8 caracteres', 'pt');
  const txtPasswordRequirements = useAutoTranslate('A senha deve conter maiúsculas, minúsculas e números', 'pt');
  const txtErrorReset = useAutoTranslate('Erro ao resetar senha', 'pt');
  const txtSuccessMessage = useAutoTranslate('Senha alterada com sucesso! Faça login com a nova senha.', 'pt');
  const txtResetPassword = useAutoTranslate('Redefinir Senha', 'pt');
  const txtEnterCodeAndPassword = useAutoTranslate('Insira o código que recebeu por email e defina uma nova senha', 'pt');
  const txtEmail = useAutoTranslate('Email', 'pt');
  const txtEmailPlaceholder = useAutoTranslate('seu@email.com', 'pt');
  const txtRecoveryCode = useAutoTranslate('Código de Recuperação', 'pt');
  const txtCodePlaceholder = useAutoTranslate('123456', 'pt');
  const txtCodeSent = useAutoTranslate('Código de 6 dígitos enviado para o seu email', 'pt');
  const txtNewPassword = useAutoTranslate('Nova Senha', 'pt');
  const txtMin8Chars = useAutoTranslate('Mínimo 8 caracteres', 'pt');
  const txtMustContain = useAutoTranslate('Deve conter maiúsculas, minúsculas e números', 'pt');
  const txtConfirmPassword = useAutoTranslate('Confirmar Nova Senha', 'pt');
  const txtRepeatPassword = useAutoTranslate('Repita a nova senha', 'pt');
  const txtProcessing = useAutoTranslate('A processar...', 'pt');
  const txtResendCode = useAutoTranslate('Não recebeu o código? Reenviar', 'pt');
  const txtBackToLogin = useAutoTranslate('Voltar ao login', 'pt');

  const location = useLocation();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState(location.state?.email || '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (location.state?.message) {
      setSuccess(location.state.message);
    }
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError(txtPasswordsMismatch);
      return;
    }

    if (newPassword.length < 8) {
      setError(txtPasswordMin8);
      return;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      setError(txtPasswordRequirements);
      return;
    }

    setLoading(true);

    try {
      const { response, data } = await safeFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, code, newPassword }),
      });

      if (!response.ok) {
        throw new Error(data?.error || txtErrorReset);
      }

      setSuccess(data.message);
      
      // Redirecionar para login após 2 segundos
      setTimeout(() => {
        navigate('/login', {
          state: { message: txtSuccessMessage }
        });
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md p-4 sm:p-6 md:p-8">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-blue-100 rounded-full mb-3 sm:mb-4">
            <Lock className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            {txtResetPassword}
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            {txtEnterCodeAndPassword}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              {txtEmail}
            </label>
            <Input
              id="email"
              type="text"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={txtEmailPlaceholder}
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
              {txtRecoveryCode}
            </label>
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder={txtCodePlaceholder}
              disabled={loading}
              maxLength={6}
              className="text-center text-2xl letter-spacing-[0.5em] font-mono"
              autoComplete="one-time-code"
            />
            <p className="text-xs text-gray-500 mt-1">
              {txtCodeSent}
            </p>
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
              {txtNewPassword}
            </label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={txtMin8Chars}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {txtMustContain}
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              {txtConfirmPassword}
            </label>
            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={txtRepeatPassword}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? txtProcessing : txtResetPassword}
          </Button>
        </form>

        <div className="mt-6 space-y-2 text-center text-sm">
          <Link
            to="/forgot-password"
            className="block text-blue-600 hover:text-blue-800"
          >
            {txtResendCode}
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            {txtBackToLogin}
          </Link>
        </div>
      </Card>
    </div>
  );
}
