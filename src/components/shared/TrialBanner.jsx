import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Clock, AlertCircle, Crown, Globe } from "lucide-react";
import { useAutoTranslate } from "@/hooks/useTranslate";
import { Capacitor } from "@capacitor/core";

export default function TrialBanner({ user }) {
  const isNativeApp = Capacitor.isNativePlatform();
  
  // Traduções
  const txtTrialExpired = useAutoTranslate('Trial Expirado', 'pt');
  const txtTrialExpiredDesc = useAutoTranslate('O seu período gratuito terminou. Subscreva para continuar a usar a plataforma.', 'pt');
  const txtSubscribeMonth = useAutoTranslate('Subscrever', 'pt');
  const txtFreeTrial = useAutoTranslate('Trial Gratuito', 'pt');
  const txtDay = useAutoTranslate('dia', 'pt');
  const txtDays = useAutoTranslate('dias', 'pt');
  const txtRemaining = useAutoTranslate('restantes', 'pt');
  const txtEnjoyPremium = useAutoTranslate('Aproveite todas as funcionalidades premium gratuitamente.', 'pt');
  const txtThenOnly = useAutoTranslate('Depois apenas', 'pt');
  const txtSubscribeNow = useAutoTranslate('Subscrever Agora', 'pt');
  const txtVisitWebsite = useAutoTranslate('Subscreva em waitless-qzero.com', 'pt');
  // CORREÇÃO: Mover useQuery ANTES do early return para garantir que hooks são sempre chamados
  const { data: subscription } = useQuery({
    queryKey: ['subscription', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const subs = await base44.entities.Subscription.filter({ 
        user_email: user.email,
        status: "active"
      });
      return subs[0] || null;
    },
    enabled: !!user?.email, // Só executar quando user existe
  });

  // Early return DEPOIS de todos os hooks
  if (!user) return null;

  // User already has active subscription
  if (subscription) return null;

  // Calculate trial days remaining
  const trialStarted = user.trial_started_at ? new Date(user.trial_started_at) : new Date(user.created_date);
  const now = new Date();
  const daysElapsed = Math.floor((now - trialStarted) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, 7 - daysElapsed);
  const trialExpired = daysRemaining === 0;

  // Don't show if trial just started (give them time to explore)
  if (daysElapsed < 1 && !trialExpired) return null;

  const isBusinessUser = user.is_business_user;
  const planPrice = isBusinessUser ? 50 : 5;
  const planType = isBusinessUser ? 'business' : 'premium';

  if (trialExpired) {
    return (
      <Card className="border-2 border-red-200 bg-gradient-to-r from-red-50 to-orange-50 mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-red-900">{txtTrialExpired}</h3>
                <p className="text-sm text-red-700">
                  {txtTrialExpiredDesc}
                </p>
              </div>
            </div>
            
            {/* 🍎🤖 B2B COMPLIANCE: Apps nativas NÃO podem ter botões de pagamento */}
            {isNativeApp ? (
              <div className="flex items-center gap-2 text-red-700">
                <Globe className="w-5 h-5" />
                <span className="text-sm font-semibold whitespace-nowrap">{txtVisitWebsite}</span>
              </div>
            ) : (
              <Link to={createPageUrl(`StripeCheckout?plan=${planType}`)}>
                <Button className="bg-red-600 hover:bg-red-700 whitespace-nowrap">
                  {txtSubscribeMonth} €{planPrice}/mês
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-amber-600 flex-shrink-0" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-amber-900">{txtFreeTrial}</h3>
                <Badge className="bg-amber-600 text-white">
                  {daysRemaining} {daysRemaining === 1 ? txtDay : txtDays} {txtRemaining}
                </Badge>
              </div>
              <p className="text-sm text-amber-700">
                {txtEnjoyPremium} {!isNativeApp && `${txtThenOnly} €${planPrice}/mês.`}
              </p>
            </div>
          </div>
          
          {/* 🍎🤖 B2B COMPLIANCE: Apps nativas NÃO podem ter botões de pagamento */}
          {isNativeApp ? (
            <div className="flex items-center gap-2 text-amber-700">
              <Globe className="w-5 h-5" />
              <span className="text-sm font-semibold whitespace-nowrap">{txtVisitWebsite}</span>
            </div>
          ) : (
            <Link to={createPageUrl(`StripeCheckout?plan=${planType}`)}>
              <Button className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 whitespace-nowrap">
                <Crown className="w-4 h-4 mr-2" />
                {txtSubscribeNow}
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}