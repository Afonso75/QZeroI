import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Globe, Check, ArrowLeft, Lock, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAutoTranslate } from "@/hooks/useTranslate";
import { toast } from "sonner";

const languages = [
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "nl", name: "Nederlands", flag: "🇳🇱" },
  { code: "pl", name: "Polski", flag: "🇵🇱" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "sv", name: "Svenska", flag: "🇸🇪" },
  { code: "no", name: "Norsk", flag: "🇳🇴" },
  { code: "da", name: "Dansk", flag: "🇩🇰" },
  { code: "fi", name: "Suomi", flag: "🇫🇮" },
  { code: "el", name: "Ελληνικά", flag: "🇬🇷" },
  { code: "cs", name: "Čeština", flag: "🇨🇿" },
  { code: "hu", name: "Magyar", flag: "🇭🇺" },
  { code: "ro", name: "Română", flag: "🇷🇴" },
  { code: "th", name: "ไทย", flag: "🇹🇭" },
  { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
  { code: "id", name: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "ms", name: "Bahasa Melayu", flag: "🇲🇾" },
  { code: "tl", name: "Tagalog", flag: "🇵🇭" },
  { code: "uk", name: "Українська", flag: "🇺🇦" },
  { code: "he", name: "עברית", flag: "🇮🇱" },
  { code: "fa", name: "فارسی", flag: "🇮🇷" },
  { code: "bn", name: "বাংলা", flag: "🇧🇩" },
  { code: "ur", name: "اردو", flag: "🇵🇰" },
  { code: "sw", name: "Kiswahili", flag: "🇰🇪" },
  { code: "af", name: "Afrikaans", flag: "🇿🇦" },
];

export default function SettingsPage() {
  const txtBack = useAutoTranslate('Anterior', 'pt');
  const txtSettings = useAutoTranslate('Definições', 'pt');
  const txtLanguageSettings = useAutoTranslate('Configurações de Idioma', 'pt');
  const txtChooseLanguage = useAutoTranslate('Escolha o seu idioma preferido', 'pt');
  const txtSelectedLanguage = useAutoTranslate('Idioma Selecionado', 'pt');
  const txtCode = useAutoTranslate('Código', 'pt');
  const txtSearchLanguages = useAutoTranslate('Procurar idiomas...', 'pt');
  const txtAvailableLanguages = useAutoTranslate('Idiomas Disponíveis', 'pt');
  const txtNoLanguageFound = useAutoTranslate('Nenhum idioma encontrado', 'pt');
  const txtChangePassword = useAutoTranslate('Alterar Senha', 'pt');
  const txtCurrentPassword = useAutoTranslate('Senha Atual', 'pt');
  const txtNewPassword = useAutoTranslate('Nova Senha', 'pt');
  const txtConfirmNewPassword = useAutoTranslate('Confirmar Nova Senha', 'pt');
  const txtPasswordMinLength = useAutoTranslate('A senha deve ter pelo menos 6 caracteres', 'pt');
  const txtPasswordsDoNotMatch = useAutoTranslate('As senhas não coincidem', 'pt');
  const txtPasswordChanged = useAutoTranslate('Senha alterada com sucesso', 'pt');
  const txtChangingPassword = useAutoTranslate('A alterar senha...', 'pt');
  const txtSavePassword = useAutoTranslate('Guardar Nova Senha', 'pt');
  const txtPasswordSecurity = useAutoTranslate('Segurança da Conta', 'pt');
  const txtPasswordDescription = useAutoTranslate('Altere a sua senha para manter a conta segura', 'pt');

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState("pt");
  const [searchTerm, setSearchTerm] = useState("");
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    base44.auth.me().then(userData => {
      setUser(userData);
      setSelectedLanguage(userData.preferred_language || "pt");
    }).catch(() => base44.auth.redirectToLogin());
  }, []);

  const updateLanguageMutation = useMutation({
    mutationFn: async (languageCode) => {
      await base44.auth.updateMe({ preferred_language: languageCode });
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      return await base44.auth.changePassword(currentPassword, newPassword);
    },
    onSuccess: () => {
      toast.success(txtPasswordChanged);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleLanguageSelect = (code) => {
    setSelectedLanguage(code);
    updateLanguageMutation.mutate(code);
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      toast.error(txtPasswordMinLength);
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error(txtPasswordsDoNotMatch);
      return;
    }
    
    changePasswordMutation.mutate();
  };

  const filteredLanguages = languages.filter(lang => 
    lang.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lang.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) return null;

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50">
      <div className="max-w-5xl mx-auto px-4 py-4 sm:px-6 sm:py-6">
        <Button
          variant="outline"
          className="mb-6 gap-2"
          onClick={() => navigate(createPageUrl("Home"))}
        >
          <ArrowLeft className="w-4 h-4" />
          {txtBack}
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-3">
            {txtSettings}
          </h1>
          <p className="text-xl text-slate-600">
            {txtChooseLanguage}
          </p>
        </div>

        <Card className="border-0 shadow-xl mb-6">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              {txtPasswordSecurity}
            </CardTitle>
            <p className="text-sm text-slate-600 mt-1">{txtPasswordDescription}</p>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">{txtCurrentPassword}</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newPassword">{txtNewPassword}</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{txtConfirmNewPassword}</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700"
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending ? txtChangingPassword : txtSavePassword}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl mb-6">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              {txtSelectedLanguage}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-sky-50 to-blue-50 rounded-xl border-2 border-sky-200">
              <div className="text-5xl">
                {languages.find(l => l.code === selectedLanguage)?.flag}
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">
                  {languages.find(l => l.code === selectedLanguage)?.name}
                </div>
                <div className="text-sm text-slate-600">
                  {txtCode}: {selectedLanguage.toUpperCase()}
                </div>
              </div>
              <Check className="w-8 h-8 text-green-600 ml-auto" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl">
          <CardHeader className="border-b">
            <CardTitle>{txtAvailableLanguages}</CardTitle>
            <div className="mt-4">
              <input
                type="text"
                placeholder={txtSearchLanguages}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto">
              {filteredLanguages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageSelect(lang.code)}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                    selectedLanguage === lang.code
                      ? "border-sky-500 bg-gradient-to-r from-sky-50 to-blue-50 shadow-md"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <span className="text-3xl">{lang.flag}</span>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-slate-900">
                      {lang.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {lang.code.toUpperCase()}
                    </div>
                  </div>
                  {selectedLanguage === lang.code && (
                    <Check className="w-5 h-5 text-green-600" />
                  )}
                </button>
              ))}
            </div>

            {filteredLanguages.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                {txtNoLanguageFound}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
