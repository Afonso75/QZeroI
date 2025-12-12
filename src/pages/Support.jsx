import React from "react";
import { SupportContent } from "@/components/support/SupportContent";
import { useAutoTranslate } from '@/hooks/useTranslate';

export default function SupportPage() {
  const txtSupport = useAutoTranslate('Suporte', 'pt');
  const txtHereToHelp = useAutoTranslate('Estamos aqui para ajudar', 'pt');

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50">
      <div className="max-w-4xl mx-auto px-3 md:px-6 py-4 md:py-6 pb-6 md:pb-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-slate-900 mb-2">
            {txtSupport}
          </h1>
          <p className="text-sm md:text-xl text-slate-600">
            {txtHereToHelp}
          </p>
        </div>

        <SupportContent />
      </div>
    </div>
  );
}
