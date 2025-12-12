import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getUploadUrl } from "@/utils/apiConfig";
import { useAutoTranslate } from "@/hooks/useTranslate";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Clock, 
  Calendar, 
  TrendingUp, 
  Shield,
  Search,
  ArrowRight,
  MapPin,
  Star,
  Sparkles
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage() {
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);
  const [searchTerm, setSearchTerm] = React.useState("");

  const txtSystemActive = useAutoTranslate('Sistema Ativo', 'pt');
  const txtTitle = useAutoTranslate('Gestão de Filas e Marcações Simplificada', 'pt');
  const txtSubtitle = useAutoTranslate('Elimine as filas e otimize o tempo dos seus clientes', 'pt');
  const txtViewBusinesses = useAutoTranslate('Ver Empresas', 'pt');
  const txtSearchPlaceholder = useAutoTranslate('Procurar empresas...', 'pt');
  const txtAvailableBusinesses = useAutoTranslate('Empresas Disponíveis', 'pt');
  const txtBusinessFound = useAutoTranslate('empresa encontrada', 'pt');
  const txtBusinessesFound = useAutoTranslate('empresas encontradas', 'pt');
  const txtNoBusinesses = useAutoTranslate('Nenhuma empresa encontrada', 'pt');
  const txtAdjustFilters = useAutoTranslate('Tente ajustar os seus filtros de pesquisa', 'pt');
  const txtReadyToStart = useAutoTranslate('Pronto para começar?', 'pt');
  const txtJoinUsers = useAutoTranslate('Junte-se a milhares de utilizadores que já otimizaram o seu tempo', 'pt');
  const txtNoQueuesTitle = useAutoTranslate('Sem Filas', 'pt');
  const txtNoQueuesDesc = useAutoTranslate('Receba senhas virtuais e acompanhe em tempo real', 'pt');
  const txtAppointmentsTitle = useAutoTranslate('Marcações Online', 'pt');
  const txtAppointmentsDesc = useAutoTranslate('Agende serviços com facilidade', 'pt');
  const txtRealTimeTitle = useAutoTranslate('Tempo Real', 'pt');
  const txtRealTimeDesc = useAutoTranslate('Notificações instantâneas sobre o seu atendimento', 'pt');
  const txtSecureTitle = useAutoTranslate('Seguro e Confiável', 'pt');
  const txtSecureDesc = useAutoTranslate('Seus dados protegidos com tecnologia de ponta', 'pt');

  React.useEffect(() => {
    base44.auth.me().then(userData => {
      setUser(userData);
      
      // Redirecionar se for conta empresarial pura
      if (userData.account_type === 'empresa') {
        navigate(createPageUrl("BusinessHome"));
      }
    }).catch(() => {});
  }, [navigate]);

  const { data: businesses, isLoading } = useQuery({
    queryKey: ['active-businesses'],
    queryFn: () => base44.entities.Business.filter({ is_active: true }),
    initialData: [],
  });

  const filteredBusinesses = businesses.filter(b => 
    // ✅ PROTEÇÃO: Verificar se business existe antes de acessar propriedades
    b && b.name && (
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const features = [
    {
      icon: Clock,
      title: txtNoQueuesTitle,
      description: txtNoQueuesDesc,
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: Calendar,
      title: txtAppointmentsTitle,
      description: txtAppointmentsDesc,
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: TrendingUp,
      title: txtRealTimeTitle,
      description: txtRealTimeDesc,
      color: "from-amber-500 to-orange-500"
    },
    {
      icon: Shield,
      title: txtSecureTitle,
      description: txtSecureDesc,
      color: "from-green-500 to-emerald-500"
    }
  ];

  const handleStartButton = () => {
    if (user) {
      navigate(createPageUrl("Businesses"));
    } else {
      base44.auth.redirectToLogin();
    }
  };

  // Não mostrar para contas empresariais puras
  if (user?.account_type === 'empresa') {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50">
      <div className="px-3 py-4 md:px-6 md:py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-4 md:mb-8">
            <div className="inline-flex items-center gap-1.5 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-full mb-2 shadow-sm">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-slate-700">{txtSystemActive}</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">
              {txtTitle}
            </h1>
            <p className="text-sm md:text-base text-slate-600 max-w-2xl mx-auto mb-3 px-2">
              {txtSubtitle}
            </p>
            <div className="flex justify-center px-2">
              <Button 
                size="sm"
                onClick={handleStartButton}
                className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 h-8 text-xs"
              >
                {txtViewBusinesses}
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4 md:mb-8">
            {features.map((feature, idx) => (
              <Card key={idx} className="border-0 shadow-sm">
                <CardContent className="p-2 md:p-3 text-center">
                  <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mx-auto mb-1`}>
                    <feature.icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-xs text-slate-900 mb-0.5">{feature.title}</h3>
                  <p className="text-[10px] md:text-xs text-slate-600 leading-tight">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mb-3">
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input
                placeholder={txtSearchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
          </div>

          <div className="mb-2">
            <h2 className="text-base md:text-lg font-bold text-slate-900 mb-0.5">
              {txtAvailableBusinesses}
            </h2>
            <p className="text-xs md:text-sm text-slate-600">
              {filteredBusinesses.length} {filteredBusinesses.length === 1 ? txtBusinessFound : txtBusinessesFound}
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-24 md:h-32" />
              ))}
            </div>
          ) : filteredBusinesses.length === 0 ? (
            <Card className="border-0 shadow-md">
              <CardContent className="py-8 text-center">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Search className="w-5 h-5 text-slate-400" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  {txtNoBusinesses}
                </h3>
                <p className="text-xs text-slate-600">
                  {txtAdjustFilters}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {filteredBusinesses.map(business => {
                if (!business || !business.id) return null;
                
                return <Card key={business.id} className="border-0 shadow-sm hover:shadow-md transition-all">
                  <CardContent className="p-3">
                    <div className="flex gap-2 mb-2">
                      {business.logo_url && (
                        <img 
                          src={getUploadUrl(business.logo_url)} 
                          alt={business.name || 'Business'}
                          className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-cover flex-shrink-0"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-xs md:text-sm text-slate-900 truncate">
                          {business.name || 'Empresa sem nome'}
                        </h3>
                        {business.description && (
                          <p className="text-[10px] md:text-xs text-slate-600 line-clamp-1">
                            {business.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          {business.address && (
                            <Badge variant="outline" className="gap-0.5 text-[10px] px-1 py-0 h-4">
                              <MapPin className="w-2.5 h-2.5" />
                              {business.address.split(',')[0]}
                            </Badge>
                          )}
                          {business.rating && (
                            <Badge variant="outline" className="gap-0.5 text-[10px] px-1 py-0 h-4">
                              <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                              {business.rating.toFixed(1)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => navigate(createPageUrl(`BusinessDetail?id=${business.id}`))}
                      className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 h-7 text-[10px] gap-0.5"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      Ver Detalhes
                    </Button>
                  </CardContent>
                </Card>
              })}
            </div>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-r from-sky-600 to-blue-700 px-3 py-6 md:py-10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-lg md:text-2xl font-bold text-white mb-2">
            {txtReadyToStart}
          </h2>
          <p className="text-sm md:text-base text-blue-100 mb-3 md:mb-4">
            {txtJoinUsers}
          </p>
          <Button 
            size="sm"
            onClick={handleStartButton}
            className="bg-white text-sky-600 hover:bg-blue-50 h-8 text-xs"
          >
            {txtViewBusinesses}
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}