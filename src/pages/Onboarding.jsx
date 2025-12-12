import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Building2, User, Check, ArrowRight, Sparkles, UserCircle } from "lucide-react";
import PhoneInput from "../components/shared/PhoneInput";
import { toast } from "sonner";
import { useAutoTranslate } from "@/hooks/useTranslate";

export default function OnboardingPage() {
  const navigate = useNavigate();
  
  const txtLoading = useAutoTranslate('A carregar...', 'pt');
  const txtCompleteProfile = useAutoTranslate('Complete o Seu Perfil', 'pt');
  const txtHello = useAutoTranslate('Olá', 'pt');
  const txtNeedInfo = useAutoTranslate('! Precisamos de algumas informações para começar.', 'pt');
  const txtFullName = useAutoTranslate('Nome Completo *', 'pt');
  const txtPlaceholderName = useAutoTranslate('João Silva', 'pt');
  const txtPhone = useAutoTranslate('Número de Telemóvel *', 'pt');
  const txtSaving = useAutoTranslate('A guardar...', 'pt');
  const txtSaveContinue = useAutoTranslate('Guardar e Continuar', 'pt');
  const txtRequiredFields = useAutoTranslate('* Campos obrigatórios', 'pt');
  const txtFillAllFields = useAutoTranslate('Por favor preencha todos os campos obrigatórios', 'pt');
  const txtWelcomeQZero = useAutoTranslate('Bem-vindo ao QZero! 👋', 'pt');
  const txtHowUsePlatform = useAutoTranslate('Como deseja utilizar a plataforma', 'pt');
  const txtPersonal = useAutoTranslate('PESSOAL', 'pt');
  const txtBusiness = useAutoTranslate('EMPRESA', 'pt');
  const txtPersonalDesc = useAutoTranslate('Retire senhas digitais, acompanhe filas e evite esperas', 'pt');
  const txtBusinessDesc = useAutoTranslate('Gerir filas, atendimentos e estatísticas da sua empresa', 'pt');
  const txtPersonalFeature1 = useAutoTranslate('Retirar senhas remotamente', 'pt');
  const txtPersonalFeature2 = useAutoTranslate('Notificações em tempo real', 'pt');
  const txtPersonalFeature3 = useAutoTranslate('Histórico de atendimentos', 'pt');
  const txtPersonalFeature4 = useAutoTranslate('Acesso a todas as empresas', 'pt');
  const txtBusinessFeature1 = useAutoTranslate('Painel de gestão completo', 'pt');
  const txtBusinessFeature2 = useAutoTranslate('Estatísticas e analytics', 'pt');
  const txtBusinessFeature3 = useAutoTranslate('Gestão de múltiplas filas', 'pt');
  const txtBusinessFeature4 = useAutoTranslate('Relatórios exportáveis', 'pt');
  const txtSelected = useAutoTranslate('Selecionado', 'pt');
  const txtSelect = useAutoTranslate('Selecionar', 'pt');
  const txtConfiguring = useAutoTranslate('A configurar...', 'pt');
  const txtContinue = useAutoTranslate('Continuar', 'pt');
  const txtCanChangeSettings = useAutoTranslate('Pode alterar esta configuração a qualquer momento nas definições', 'pt');
  
  const [user, setUser] = useState(null);
  const [step, setStep] = useState('profile');
  const [selectedMode, setSelectedMode] = useState(null);
  const [profileData, setProfileData] = useState({
    full_name: '',
    phone: ''
  });

  useEffect(() => {
    base44.auth.me().then((userData) => {
      setUser(userData);
      
      if (userData.onboarding_completed) {
        if (userData.account_type === 'empresa') {
          navigate(createPageUrl("BusinessHome"));
        } else {
          navigate(createPageUrl("Home"));
        }
        return;
      }
      
      if (userData.profile_completed) {
        setStep('account_type');
      }
      
      setProfileData({
        full_name: userData.name || userData.full_name || '',
        phone: userData.phone || ''
      });
    }).catch(() => {
      base44.auth.redirectToLogin();
    });
  }, [navigate]);

  const profileMutation = useMutation({
    mutationFn: async (data) => {
      await base44.auth.updateMe({
        name: data.full_name,
        phone: data.phone,
        profile_completed: true
      });
    },
    onSuccess: () => {
      if (user && user.account_type) {
        completeMutation.mutate(user.account_type);
      } else {
        setStep('account_type');
      }
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (mode) => {
      const updates = {
        onboarding_completed: true,
        account_type: mode
      };

      if (mode === 'empresa') {
        updates.is_business_user = true;
      }

      await base44.auth.updateMe(updates);
      return mode;
    },
    onSuccess: (mode) => {
      if (mode === 'empresa') {
        navigate(createPageUrl("BusinessSubscription"));
      } else {
        navigate(createPageUrl("Home"));
      }
    },
  });

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    if (!profileData.full_name || !profileData.phone) {
      toast.error(txtFillAllFields);
      return;
    }
    profileMutation.mutate(profileData);
  };

  const handleContinue = () => {
    if (selectedMode) {
      completeMutation.mutate(selectedMode);
    }
  };

  if (!user) {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 flex items-center justify-center py-8">
        <div className="animate-pulse text-slate-600">{txtLoading}</div>
      </div>
    );
  }

  if (step === 'profile') {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50">
        <div className="max-w-2xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl mb-6">
              <UserCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              {txtCompleteProfile}
            </h1>
            <p className="text-xl text-slate-600">
              {txtHello}, <span className="font-semibold text-slate-900">{user.email}</span>{txtNeedInfo}
            </p>
          </div>

          <Card className="border-0 shadow-2xl">
            <CardContent className="p-8">
              <form onSubmit={handleProfileSubmit} className="space-y-6" noValidate>
                <div>
                  <Label htmlFor="full_name">{txtFullName}</Label>
                  <Input
                    id="full_name"
                    value={profileData.full_name}
                    onChange={(e) => setProfileData({...profileData, full_name: e.target.value})}
                    placeholder={txtPlaceholderName}
                    className="mt-2"
                    autoComplete="name"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">{txtPhone}</Label>
                  <PhoneInput
                    value={profileData.phone}
                    onChange={(value) => setProfileData({...profileData, phone: value})}
                    className="mt-2"
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={profileMutation.isPending}
                  className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 py-6 text-lg"
                >
                  {profileMutation.isPending ? (
                    txtSaving
                  ) : (
                    <>
                      {txtSaveContinue}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-sm text-slate-500 mt-6 text-center">
            {txtRequiredFields}
          </p>
        </div>
      </div>
    );
  }

  const modes = [
    {
      id: 'pessoal',
      title: txtPersonal,
      description: txtPersonalDesc,
      icon: User,
      color: 'from-blue-500 to-cyan-500',
      features: [
        txtPersonalFeature1,
        txtPersonalFeature2,
        txtPersonalFeature3,
        txtPersonalFeature4
      ]
    },
    {
      id: 'empresa',
      title: txtBusiness,
      description: txtBusinessDesc,
      icon: Building2,
      color: 'from-indigo-500 to-purple-500',
      features: [
        txtBusinessFeature1,
        txtBusinessFeature2,
        txtBusinessFeature3,
        txtBusinessFeature4
      ]
    }
  ];

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 sm:py-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl mb-6">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            {txtWelcomeQZero}
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            {txtHowUsePlatform}, <span className="font-semibold text-slate-900">{user.full_name || user.email}</span>?
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8 max-w-5xl mx-auto">
          {modes.map((mode) => {
            const Icon = mode.icon;
            const isSelected = selectedMode === mode.id;
            
            return (
              <Card 
                key={mode.id}
                className={`cursor-pointer transition-all duration-300 border-2 ${
                  isSelected 
                    ? 'border-sky-500 shadow-2xl scale-105' 
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-lg'
                }`}
                onClick={() => setSelectedMode(mode.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${mode.color} flex items-center justify-center`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 bg-sky-500 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    {mode.title}
                  </h3>
                  <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                    {mode.description}
                  </p>

                  <div className="space-y-2">
                    {mode.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-slate-700">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    className={`w-full mt-6 ${
                      isSelected
                        ? 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                    onClick={() => setSelectedMode(mode.id)}
                  >
                    {isSelected ? txtSelected : txtSelect}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center">
          <Button
            size="lg"
            disabled={!selectedMode || completeMutation.isPending}
            className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 px-12 py-6 text-lg disabled:opacity-50"
            onClick={handleContinue}
          >
            {completeMutation.isPending ? (
              txtConfiguring
            ) : (
              <>
                {txtContinue}
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
          <p className="text-sm text-slate-500 mt-4">
            {txtCanChangeSettings}
          </p>
        </div>

      </div>
    </div>
  );
}