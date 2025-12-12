import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Crown, Save, Phone, Shield, FileText, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { LanguageSelector } from "@/components/settings/LanguageSelector";
import { TranslatedText } from "@/components/translation/TranslatedText";
import { useAutoTranslate } from "@/hooks/useTranslate";

export default function ProfileManager({ user, onUpdate }) {
  const navigate = useNavigate();
  const displayName = user.nome_completo || user.full_name || '';
  
  const [formData, setFormData] = useState({
    nome_completo: displayName,
    phone: user.phone || ''
  });
  
  const successMsg = useAutoTranslate('Perfil atualizado com sucesso!', 'pt');
  const errorMsg = useAutoTranslate('Erro ao atualizar perfil', 'pt');
  const requiredMsg = useAutoTranslate('Nome completo é obrigatório', 'pt');
  const namePlaceholder = useAutoTranslate('Seu nome', 'pt');

  useEffect(() => {
    const newDisplayName = user.nome_completo || user.full_name || '';
    setFormData({
      nome_completo: newDisplayName,
      phone: user.phone || ''
    });
  }, [user.id, user.nome_completo, user.full_name, user.phone]);

  const { data: subscription } = useQuery({
    queryKey: ['user-subscription', user.email],
    queryFn: async () => {
      const subs = await base44.entities.Subscription.filter({ 
        user_email: user.email,
        status: "active"
      });
      return subs[0] || null;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates) => {
      return await base44.auth.updateMe(updates);
    },
    onSuccess: async () => {
      toast.success(successMsg);
      if (onUpdate) {
        await onUpdate();
      }
    },
    onError: (error) => {
      console.error('Erro ao atualizar:', error);
      toast.error(errorMsg);
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nome_completo.trim()) {
      toast.error(requiredMsg);
      return;
    }
    
    updateMutation.mutate({
      nome_completo: formData.nome_completo.trim(),
      phone: formData.phone.trim()
    });
  };

  const isPremium = subscription?.plan === "premium";

  return (
    <div className="space-y-3 sm:space-y-4 w-full max-w-full overflow-hidden px-2 sm:px-0">
      {/* Seletor de Idioma */}
      <LanguageSelector />
      
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <User className="w-4 h-4" />
            <TranslatedText text="Informações da Conta" sourceLang="pt" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="flex flex-col gap-2 p-2 sm:p-3 bg-slate-50 rounded-lg">
            <div className="flex flex-wrap items-center gap-2">
              <Mail className="w-4 h-4 text-slate-600 flex-shrink-0" />
              <span className="font-semibold text-xs sm:text-sm text-slate-900 break-all overflow-wrap-anywhere min-w-0">{user.email}</span>
              {isPremium && (
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-600 text-white border-0 text-xs flex-shrink-0">
                  <Crown className="w-3 h-3 mr-1" />
                  Premium
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-600">
              <TranslatedText text="Membro desde" sourceLang="pt" /> {new Date(user.created_date).toLocaleDateString('pt-PT', { 
                month: 'long', 
                year: 'numeric' 
              })}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-3" noValidate>
            <div>
              <Label htmlFor="nome_completo" className="text-xs sm:text-sm">
                <TranslatedText text="Nome Completo" sourceLang="pt" /> *
              </Label>
              <Input
                id="nome_completo"
                value={formData.nome_completo}
                onChange={(e) => setFormData(prev => ({ ...prev, nome_completo: e.target.value }))}
                placeholder={namePlaceholder}
                className="mt-1 text-sm"
                autoComplete="name"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-xs sm:text-sm">
                <TranslatedText text="Telefone" sourceLang="pt" /> *
              </Label>
              <div className="flex gap-2 items-center">
                <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+351 912 345 678"
                    className="w-full text-sm"
                    autoComplete="tel"
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 py-5 sm:py-6 text-sm sm:text-base"
            >
              <Save className="w-4 h-4 mr-2" />
              <TranslatedText 
                text={updateMutation.isPending ? 'A guardar...' : 'Guardar Alterações'} 
                sourceLang="pt" 
              />
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-sm sm:text-base">
            <TranslatedText text="Informação Legal" sourceLang="pt" />
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 space-y-2">
          <button
            onClick={() => navigate('/privacy-policy')}
            className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-slate-700">
                <TranslatedText text="Política de Privacidade" sourceLang="pt" />
              </span>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-400" />
          </button>
          
          <button
            onClick={() => navigate('/terms-of-use')}
            className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-slate-700">
                <TranslatedText text="Termos de Utilização" sourceLang="pt" />
              </span>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-400" />
          </button>
        </CardContent>
      </Card>
    </div>
  );
}