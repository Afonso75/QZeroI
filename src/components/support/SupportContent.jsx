import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Clock, MessageSquare, HelpCircle } from "lucide-react";
import { TranslatedText } from "@/components/translation/TranslatedText";

export function SupportContent() {
  return (
    <div className="space-y-4 md:space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Mail className="w-5 h-5 text-blue-600" />
            Email
          </CardTitle>
        </CardHeader>
        <CardContent>
          <a 
            href="mailto:suporteqzero@gmail.com"
            className="text-base md:text-lg text-blue-600 hover:text-blue-700 hover:underline"
          >
            suporteqzero@gmail.com
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Clock className="w-5 h-5 text-blue-600" />
            <TranslatedText text="Horário de Suporte" sourceLang="pt" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="text-sm md:text-base text-slate-700">
            <TranslatedText text="Segunda a Sexta: 9h - 18h" sourceLang="pt" />
          </p>
          <p className="text-sm md:text-base text-slate-700">
            <TranslatedText text="Sábado e Domingo: Fechado" sourceLang="pt" />
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <TranslatedText text="Tempo de Resposta" sourceLang="pt" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm md:text-base text-slate-700">
            <TranslatedText text="Normalmente respondemos em 24 horas" sourceLang="pt" />
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <HelpCircle className="w-5 h-5 text-blue-600" />
            <TranslatedText text="Tipos de Suporte" sourceLang="pt" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm md:text-base text-slate-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <TranslatedText text="Dúvidas técnicas" sourceLang="pt" as="span" />
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <TranslatedText text="Problemas de funcionamento" sourceLang="pt" as="span" />
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <TranslatedText text="Sugestões de melhorias" sourceLang="pt" as="span" />
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <TranslatedText text="Pedidos de funcionalidades" sourceLang="pt" as="span" />
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
