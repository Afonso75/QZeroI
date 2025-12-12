import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getUploadUrl } from "@/utils/apiConfig";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Star, Clock, Building2 } from "lucide-react";
import { TranslatedText } from "@/components/translation/TranslatedText";
import { useAutoTranslate } from '@/hooks/useTranslate';

const categoryColors = {
  saude: "from-red-500 to-pink-500",
  financeiro: "from-green-500 to-emerald-500",
  governo: "from-blue-500 to-indigo-500",
  restauracao: "from-orange-500 to-amber-500",
  beleza: "from-purple-500 to-pink-500",
  retalho: "from-cyan-500 to-blue-500",
  outros: "from-slate-500 to-gray-500"
};

const categoryIcons = {
  saude: "🏥",
  financeiro: "🏦",
  governo: "🏛️",
  restauracao: "🍽️",
  beleza: "💇",
  retalho: "🛍️",
  outros: "📍"
};

export default function BusinessCard({ business, showWaitTime = false, waitTime = 0 }) {
  const [logoError, setLogoError] = useState(false);
  
  // Translations
  const txtDefaultDescription = useAutoTranslate('Serviço de qualidade com atendimento rápido e eficiente', 'pt');
  const txtLocationAvailable = useAutoTranslate('Localização disponível', 'pt');
  const txtNoQueue = useAutoTranslate('Sem fila', 'pt');
  const txtViewDetails = useAutoTranslate('Ver Detalhes', 'pt');

  const getWaitTimeColor = (time) => {
    if (time <= 10) return "bg-green-100 text-green-700 border-green-200";
    if (time <= 30) return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-red-100 text-red-700 border-red-200";
  };

  const getWaitTimeLabel = (time) => {
    if (time === 0) return txtNoQueue;
    if (time <= 10) return `~${time} min`;
    return `~${time} min`;
  };

  return (
    <Card className="group hover:shadow-2xl transition-all duration-300 border-0 overflow-hidden">
      <div className={`h-40 bg-gradient-to-br ${categoryColors[business.category]} relative`}>
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-7xl opacity-90">
            {categoryIcons[business.category] || '📍'}
          </div>
        </div>
        {business.logo_url && !logoError && (
          <img 
            src={getUploadUrl(business.logo_url)} 
            alt={business.name} 
            className="absolute top-4 right-4 w-14 h-14 rounded-xl bg-white/95 p-2 object-contain shadow-lg"
            onError={() => setLogoError(true)}
          />
        )}
        {(!business.logo_url || logoError) && (
          <div className="absolute top-4 right-4 w-14 h-14 rounded-xl bg-white/95 p-2 shadow-lg flex items-center justify-center">
            <Building2 className="w-8 h-8 text-slate-400" />
          </div>
        )}
      </div>
      
      <CardContent className="p-6">
        <h3 className="font-bold text-xl text-slate-900 mb-2 group-hover:text-purple-600 transition-colors">
          <TranslatedText text={business.name} />
        </h3>
        
        <p className="text-sm text-slate-600 mb-4 line-clamp-2">
          {business.description ? (
            <TranslatedText text={business.description} />
          ) : (
            txtDefaultDescription
          )}
        </p>

        <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{business.address || txtLocationAvailable}</span>
        </div>

        <div className="flex items-center justify-between mb-4">
          {business.rating && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-slate-900">{business.rating.toFixed(1)}</span>
            </div>
          )}
          {showWaitTime && (
            <Badge className={getWaitTimeColor(waitTime)}>
              <Clock className="w-3 h-3 mr-1" />
              {getWaitTimeLabel(waitTime)}
            </Badge>
          )}
        </div>

        <Link to={createPageUrl(`BusinessDetail?id=${business.id}`)}>
          <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700">
            {txtViewDetails}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}