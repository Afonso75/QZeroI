import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Mail } from 'lucide-react';
import { useAutoTranslate } from '@/hooks/useTranslate';
import { safeFetch } from '@/utils/apiConfig';

export default function ForgotPassword() {
  // Traduções
  const txtRecoverPassword = useAutoTranslate('Recuperar Senha', 'pt');
  const txtEnterEmail = useAutoTranslate('Insira o seu email para receber um código de recuperação', 'pt');
  const txtEmail = useAutoTranslate('Email', 'pt');
  const txtEmailPlaceholder = useAutoTranslate('seu@email.com', 'pt');
  const txtErrorRequest = useAutoTranslate('Erro ao solicitar recuperação', 'pt');
  const txtSending = useAutoTranslate('A enviar...', 'pt');
  const txtSendCode = useAutoTranslate('Enviar Código', 'pt');
  const txtBackToLogin = useAutoTranslate('Voltar ao login', 'pt');

  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { response, data } = await safeFetch('/api/auth/request-password-reset', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error(data?.error || txtErrorRequest);
      }

      // Redirecionar para página de reset com email
      navigate('/reset-password', { 
        state: { 
          email,
          message: data.message 
        } 
      });
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
            <Mail className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            {txtRecoverPassword}
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            {txtEnterEmail}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
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

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? txtSending : txtSendCode}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            {txtBackToLogin}
          </Link>
        </div>
      </Card>
    </div>
  );
}
