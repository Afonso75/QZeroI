import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Lock, Crown, ExternalLink, Globe, CheckCircle2 } from "lucide-react";
import { useAutoTranslate } from "@/hooks/useTranslate";
import { Capacitor } from "@capacitor/core";

export function RestrictedAccessOverlay({ featureName, onClose }) {
  const navigate = useNavigate();
  const isNativeApp = Capacitor.isNativePlatform();

  const txtRestrictedAccess = useAutoTranslate('Acesso Restrito', 'pt');
  const txtProFeature = useAutoTranslate('Funcionalidade Pro', 'pt');
  const txtUnlockFeature = useAutoTranslate('Desbloqueia esta funcionalidade ativando o plano empresarial.', 'pt');
  const txtViewPlans = useAutoTranslate('Ver Planos', 'pt');
  const txtClose = useAutoTranslate('Fechar', 'pt');
  const txt7DaysTrial = useAutoTranslate('7 dias grátis para testar', 'pt');
  const txtUnlimitedQueues = useAutoTranslate('Gestão ilimitada de senhas', 'pt');
  const txtCompleteBooking = useAutoTranslate('Sistema completo de marcações', 'pt');
  const txtAdvancedAnalytics = useAutoTranslate('Análises e estatísticas avançadas', 'pt');
  const txtCancelAnytime = useAutoTranslate('Cancele quando quiser', 'pt');
  
  const txtExternalPurchaseTitle = useAutoTranslate('Quase lá!', 'pt');
  const txtExternalPurchaseDesc = useAutoTranslate('Para desbloquear todas as funcionalidades, visite o nosso site no seu browser ou computador.', 'pt');
  const txtExternalPurchasePromo = useAutoTranslate('7 dias grátis + €19,99 (1º mês) + €49,99/mês', 'pt');
  const txtB2BNote = useAutoTranslate('A compra é feita no site waitless-qzero.com para maior segurança.', 'pt');

  const handleViewPlans = () => {
    navigate(createPageUrl('BusinessSubscription'));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-0 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
        <CardContent className="p-6">
          <div className="text-center mb-5">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
              <Lock className="w-7 h-7 text-amber-600" />
            </div>
            
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 mb-2">
              <Crown className="w-3 h-3 mr-1" />
              {txtProFeature}
            </Badge>
            
            <h2 className="text-xl font-bold text-slate-900 mb-1">
              {txtRestrictedAccess}
            </h2>
            
            {featureName && (
              <p className="text-sm text-slate-500 mb-2">
                {featureName}
              </p>
            )}
            
            <p className="text-slate-600 text-sm">
              {txtUnlockFeature}
            </p>
          </div>

          {/* 🍎🤖 B2B COMPLIANCE: Apps nativas NÃO mostram preços nem botões de pagamento */}
          {isNativeApp ? (
            <div className="space-y-4">
              <div className="bg-indigo-50 rounded-xl p-4 text-center">
                <Globe className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                <p className="text-indigo-900 font-semibold mb-1">
                  {txtExternalPurchaseTitle}
                </p>
                <p className="text-indigo-700 text-sm mb-2">
                  {txtExternalPurchaseDesc}
                </p>
                <p className="text-indigo-900 font-bold text-lg">
                  waitless-qzero.com
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 mb-5">
              {[txt7DaysTrial, txtUnlimitedQueues, txtCompleteBooking, txtAdvancedAnalytics, txtCancelAnytime].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-slate-700 text-sm">{feature}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2 mt-5">
            {!isNativeApp && (
              <Button 
                onClick={handleViewPlans}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold"
              >
                <Crown className="w-4 h-4 mr-2" />
                {txtViewPlans}
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              onClick={onClose}
              className="w-full text-slate-600"
            >
              {txtClose}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
