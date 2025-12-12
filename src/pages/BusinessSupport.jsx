import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { SupportContent } from "@/components/support/SupportContent";
import { Skeleton } from "@/components/ui/skeleton";
import { TranslatedText } from "@/components/translation/TranslatedText";

export default function BusinessSupportPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(userData => {
      setUser(userData);
      if (!userData.is_business_user || !userData.business_id) {
        navigate(createPageUrl("Home"));
      }
      setLoading(false);
    }).catch(() => {
      base44.auth.redirectToLogin();
    });
  }, [navigate]);

  if (!user || loading) {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 p-3 md:p-4">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-16 w-64 mb-8" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50">
      <div className="max-w-4xl mx-auto px-3 md:px-4 py-4 pb-24 md:pb-4">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-slate-900 mb-2">
            <TranslatedText text="Suporte" sourceLang="pt" />
          </h1>
          <p className="text-sm md:text-xl text-slate-600">
            <TranslatedText text="Estamos aqui para ajudar" sourceLang="pt" />
          </p>
        </div>

        <SupportContent />
      </div>
    </div>
  );
}
