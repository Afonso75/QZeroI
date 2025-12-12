import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { safeFetch, getUploadUrl } from "@/utils/apiConfig";
import { useAutoTranslate } from "@/hooks/useTranslate";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Search, 
  MapPin, 
  Star, 
  Sparkles,
  Navigation,
  AlertCircle
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { calculateDistance, useUserLocation } from "@/components/shared/LocationService";

// Categories will be translated dynamically in the component

const categoryColors = {
  saude: 'from-red-500 to-pink-500',
  financeiro: 'from-blue-500 to-cyan-500',
  governo: 'from-purple-500 to-indigo-500',
  restauracao: 'from-orange-500 to-amber-500',
  beleza: 'from-pink-500 to-rose-500',
  outros: 'from-slate-500 to-gray-500'
};

// Categories helper moved to component

export default function BusinessesPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [user, setUser] = useState(null);
  const { location: gpsLocation, country: gpsCountry, loading: loadingLocation, error: locationError, refetch: refetchLocation } = useUserLocation();

  const txtFindBusinesses = useAutoTranslate('Encontre Empresas', 'pt');
  const txtSearchBusinesses = useAutoTranslate('Pesquisar empresas...', 'pt');
  const txtAllCategories = useAutoTranslate('Todas as Categorias', 'pt');
  const txtBusinessFound = useAutoTranslate('empresa encontrada', 'pt');
  const txtBusinessesFound = useAutoTranslate('empresas encontradas', 'pt');
  const txtNearYou = useAutoTranslate('perto de si', 'pt');
  const txtBusinessesNearYou = useAutoTranslate('Empresas perto de si', 'pt');
  const txtClosest = useAutoTranslate('mais próximas', 'pt');
  const txtNoBusinesses = useAutoTranslate('Nenhuma empresa encontrada', 'pt');
  const txtTryDifferentSearch = useAutoTranslate('Tente ajustar sua pesquisa ou categoria', 'pt');
  const txtLoading = useAutoTranslate('A carregar...', 'pt');
  const txtSeeDetails = useAutoTranslate('Ver Detalhes', 'pt');
  const txtOpenNow = useAutoTranslate('Aberto Agora', 'pt');
  const txtClosed = useAutoTranslate('Fechado', 'pt');
  const txtLocationError = useAutoTranslate('Erro ao obter localização', 'pt');
  const txtEnableLocation = useAutoTranslate('Ative a localização para ver empresas próximas', 'pt');
  const txtTryAgain = useAutoTranslate('Tentar Novamente', 'pt');
  const txtNoName = useAutoTranslate('Empresa sem nome', 'pt');
  const txtNoCountry = useAutoTranslate('Não há empresas disponíveis no seu país com os filtros selecionados', 'pt');
  const txtConfigureCountry = useAutoTranslate('Configure o seu país no perfil para ver empresas próximas', 'pt');
  
  // Categories translations
  const txtAll = useAutoTranslate('Todas', 'pt');
  const txtHealth = useAutoTranslate('Saúde', 'pt');
  const txtFinancial = useAutoTranslate('Financeiro', 'pt');
  const txtGovernment = useAutoTranslate('Governo', 'pt');
  const txtRestaurant = useAutoTranslate('Restauração', 'pt');
  const txtBeauty = useAutoTranslate('Beleza', 'pt');
  const txtOthers = useAutoTranslate('Outros', 'pt');
  
  // Location/GPS translations
  const txtGettingLocation = useAutoTranslate('A obter a sua localização...', 'pt');
  const txtLocationActiveIn = useAutoTranslate('Localização ativa em', 'pt');
  const txtShowingNearby = useAutoTranslate('- a mostrar empresas próximas', 'pt');
  const txtAllowLocation = useAutoTranslate('Permita o acesso à localização para ver empresas próximas no seu país', 'pt');
  const txtEnableLocationBtn = useAutoTranslate('Ativar Localização', 'pt');
  const txtEnableLocationDesc = useAutoTranslate('Ative a localização para ver empresas do seu país ordenadas por proximidade', 'pt');
  
  // Action buttons
  const txtTakeTicket = useAutoTranslate('Tirar Senha', 'pt');
  const txtMakeAppointment = useAutoTranslate('Fazer Marcação', 'pt');
  const txtViewBusiness = useAutoTranslate('Ver Empresa', 'pt');

  const categories = [
    { value: 'todos', label: txtAll, icon: '📍' },
    { value: 'saude', label: txtHealth, icon: '🏥' },
    { value: 'financeiro', label: txtFinancial, icon: '🏦' },
    { value: 'governo', label: txtGovernment, icon: '🏛️' },
    { value: 'restauracao', label: txtRestaurant, icon: '🍽️' },
    { value: 'beleza', label: txtBeauty, icon: '💇' },
    { value: 'outros', label: txtOthers, icon: '📍' }
  ];

  const getCategoryDisplay = (business) => {
    if (business.category === 'outros' && business.custom_category) {
      return business.custom_category;
    }
    const category = categories.find(c => c.value === business.category);
    return category ? category.label : business.category || txtOthers;
  };

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: businesses = [], isLoading: businessesLoading } = useQuery({
    queryKey: ['active-businesses'],
    queryFn: async () => {
      // 🔄 FORÇAR API em vez de localStorage
      const { response, data } = await safeFetch('/api/public/businesses', {
        method: 'GET',
      });
      
      if (!response.ok) {
        console.error('❌ Erro ao buscar empresas da API');
        return [];
      }
      
      console.log(`✅ ${data?.length || 0} empresas carregadas da API (PostgreSQL)`);
      return data || [];
    },
    initialData: [],
  });

  const { data: queues = [] } = useQuery({
    queryKey: ['all-queues'],
    queryFn: () => base44.entities.Queue.list(),
    initialData: [],
  });

  const { data: services = [] } = useQuery({
    queryKey: ['all-services'],
    queryFn: () => base44.entities.Service.list(),
    initialData: [],
  });

  // Usar país da geolocalização GPS
  const userCountry = gpsCountry?.code;

  const filteredBusinesses = useMemo(() => {
    if (!businesses.length) return [];

    let filtered = businesses;

    // ✅ FILTRO OBRIGATÓRIO: Só mostrar empresas do país do utilizador
    // Se não tiver país detectado via GPS, não mostrar nenhuma empresa
    if (userCountry) {
      filtered = filtered.filter(business => {
        if (!business) return false;
        const businessCountry = business.country?.toUpperCase();
        const userCountryUpper = userCountry.toUpperCase();
        return businessCountry === userCountryUpper;
      });
    } else {
      // Sem GPS/país detectado = não mostrar empresas (forçar activar localização)
      filtered = [];
    }

    // Filtrar por categoria (inclui categorias customizadas quando "outros" selecionado)
    if (selectedCategory !== 'todos') {
      filtered = filtered.filter(b => {
        // ✅ PROTEÇÃO: Verificar se b existe
        if (!b) return false;
        // Categoria padrão corresponde exatamente
        if (b.category === selectedCategory) return true;
        
        // Quando filtro é "outros", incluir todas as empresas com custom_category
        if (selectedCategory === 'outros' && b.custom_category) return true;
        
        return false;
      });
    }

    // Filtrar por termo de pesquisa (inclui categoria customizada)
    if (searchTerm) {
      filtered = filtered.filter(b =>
        b && ( // ✅ PROTEÇÃO: Verificar se b existe
          b.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          b.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          b.custom_category?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Ordenar por distância usando geolocalização GPS
    filtered = filtered.map(business => {
      let distance = null;
      
      // Calcular distância usando GPS em tempo real
      if (business.latitude && business.longitude && gpsLocation?.lat && gpsLocation?.lng) {
        distance = calculateDistance(gpsLocation.lat, gpsLocation.lng, business.latitude, business.longitude);
      }
      
      return { ...business, distance };
    }).sort((a, b) => {
      // Empresas sem coordenadas vão para o fim
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      // Ordenar da mais próxima para a mais longe
      return a.distance - b.distance;
    });

    return filtered;
  }, [businesses, searchTerm, selectedCategory, userCountry, gpsLocation]);

  // CORREÇÃO: Mover useMemo ANTES do early return para garantir que hooks são sempre chamados
  // Empresas mais próximas (top 4) - em destaque
  const nearbyBusinesses = useMemo(() => {
    return filteredBusinesses.filter(b => b.distance !== null).slice(0, 4);
  }, [filteredBusinesses]);
  
  // Indica se as distâncias vêm do GPS
  const hasLocationData = gpsLocation !== null;

  const formatDistance = (distance) => {
    if (!distance) return null;
    if (distance < 1) return `${Math.round(distance * 1000)}m`;
    return `${distance.toFixed(1)}km`;
  };

  // Early return DEPOIS de todos os hooks
  if (businessesLoading) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-12 w-64 mb-6" />
          <div className="grid md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {txtFindBusinesses}
          </h1>
          
          {/* Indicador de Localização GPS */}
          {loadingLocation ? (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              {txtGettingLocation}
            </div>
          ) : gpsLocation && userCountry ? (
            <p className="text-slate-600 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-green-600" />
              {txtLocationActiveIn} {gpsCountry?.name} {txtShowingNearby}
            </p>
          ) : locationError ? (
            <Alert className="mt-2 border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800 flex items-center justify-between">
                <span>{txtAllowLocation}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-2 h-7 text-xs border-orange-300 hover:bg-orange-100"
                  onClick={refetchLocation}
                >
                  {txtEnableLocationBtn}
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="mt-4 border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 flex items-center justify-between">
                <span>{txtEnableLocationDesc}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-2 h-7 text-xs border-blue-300 hover:bg-blue-100"
                  onClick={refetchLocation}
                >
                  {txtEnableLocationBtn}
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder={txtSearchBusinesses}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Seção: TOP 4 Empresas mais próximas - EM DESTAQUE */}
        {nearbyBusinesses.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-green-600" />
              <h2 className="text-xl font-bold text-slate-900">{txtBusinessesNearYou}</h2>
              <div className="ml-auto flex items-center gap-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <Navigation className="w-3 h-3 mr-1" />
                  {nearbyBusinesses.length} {txtClosest}
                </Badge>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {nearbyBusinesses.map(business => {
                // ✅ PROTEÇÃO: Garantir que business existe
                if (!business || !business.id) return null;
                
                const businessQueues = queues.filter(q => q?.business_id === business.id);
                const businessServices = services.filter(s => s?.business_id === business.id);
                const hasQueues = businessQueues.length > 0;
                const hasServices = businessServices.length > 0;

                return (
                  <Card key={business.id} className="border-2 border-green-200 shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-white to-green-50">
                    <CardContent className="p-4">
                      <div className="flex gap-3 mb-3">
                        {business.logo_url && (
                          <img 
                            src={getUploadUrl(business.logo_url)} 
                            alt={business.name}
                            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg text-slate-900 mb-1 truncate">
                            {business.name || txtNoName}
                          </h3>
                          {business.description && (
                            <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                              {business.description}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <Badge className="gap-1 bg-green-600 hover:bg-green-700">
                              <Navigation className="w-3 h-3" />
                              {formatDistance(business.distance)}
                            </Badge>
                            {business.category && (
                              <Badge variant="outline" className="gap-1">
                                {getCategoryDisplay(business)}
                              </Badge>
                            )}
                            {business.address && (
                              <Badge variant="outline" className="gap-1">
                                <MapPin className="w-3 h-3" />
                                {business.address.split(',')[0]}
                              </Badge>
                            )}
                            {business.rating && (
                              <Badge variant="outline" className="gap-1">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                {business.rating.toFixed(1)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {hasQueues && (
                          <Button
                            onClick={() => navigate(createPageUrl(`BusinessDetail?id=${business.id}`))}
                            size="sm"
                            className={`flex-1 bg-gradient-to-r ${categoryColors[business.category] || 'from-sky-500 to-blue-600'} hover:opacity-90 text-xs`}
                          >
                            {txtTakeTicket}
                          </Button>
                        )}
                        {hasServices && (
                          <Button
                            onClick={() => navigate(createPageUrl(`BusinessDetail?id=${business.id}`))}
                            size="sm"
                            variant="outline"
                            className="flex-1 text-xs"
                          >
                            {txtMakeAppointment}
                          </Button>
                        )}
                        {!hasQueues && !hasServices && (
                          <Button
                            onClick={() => navigate(createPageUrl(`BusinessDetail?id=${business.id}`))}
                            size="sm"
                            variant="outline"
                            className="flex-1 text-xs gap-1"
                          >
                            <Sparkles className="w-3 h-3" />
                            {txtViewBusiness}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        <div className="mb-4">
          <p className="text-sm text-slate-600">
            {filteredBusinesses.length} {filteredBusinesses.length === 1 ? txtBusinessFound : txtBusinessesFound}
          </p>
        </div>

        {filteredBusinesses.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                {txtNoBusinesses}
              </h3>
              <p className="text-slate-600">
                {userCountry ? txtNoCountry : txtConfigureCountry}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filteredBusinesses.map(business => {
              // ✅ PROTEÇÃO: Garantir que business existe
              if (!business || !business.id) return null;
              
              const businessQueues = queues.filter(q => q?.business_id === business.id);
              const businessServices = services.filter(s => s?.business_id === business.id);
              const hasQueues = businessQueues.length > 0;
              const hasServices = businessServices.length > 0;

              return (
                <Card key={business.id} className="border-0 shadow-md hover:shadow-xl transition-all">
                  <CardContent className="p-4">
                    <div className="flex gap-3 mb-3">
                      {business.logo_url && (
                        <img 
                          src={getUploadUrl(business.logo_url)} 
                          alt={business.name}
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg text-slate-900 mb-1 truncate">
                          {business.name || txtNoName}
                        </h3>
                        {business.description && (
                          <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                            {business.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {business.distance !== null && business.distance !== undefined && (
                            <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200">
                              <Navigation className="w-3 h-3" />
                              {formatDistance(business.distance)}
                            </Badge>
                          )}
                          {business.category && (
                            <Badge variant="outline" className="gap-1">
                              {getCategoryDisplay(business)}
                            </Badge>
                          )}
                          {business.address && (
                            <Badge variant="outline" className="gap-1">
                              <MapPin className="w-3 h-3" />
                              {business.address.split(',')[0]}
                            </Badge>
                          )}
                          {business.rating && (
                            <Badge variant="outline" className="gap-1">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              {business.rating.toFixed(1)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {hasQueues && (
                        <Button
                          onClick={() => navigate(createPageUrl(`BusinessDetail?id=${business.id}`))}
                          size="sm"
                          className={`flex-1 bg-gradient-to-r ${categoryColors[business.category] || 'from-sky-500 to-blue-600'} hover:opacity-90 text-xs`}
                        >
                          {txtTakeTicket}
                        </Button>
                      )}
                      {hasServices && (
                        <Button
                          onClick={() => navigate(createPageUrl(`BusinessDetail?id=${business.id}`))}
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs"
                        >
                          {txtMakeAppointment}
                        </Button>
                      )}
                      {!hasQueues && !hasServices && (
                        <Button
                          onClick={() => navigate(createPageUrl(`BusinessDetail?id=${business.id}`))}
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs gap-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          {txtViewBusiness}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}