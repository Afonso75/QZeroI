import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getUploadUrl, safeFetch } from "@/utils/apiConfig";
import {
  ArrowLeft,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Info,
  Star,
  MessageSquare,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Play
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import AppointmentBooking from "../components/appointments/AppointmentBooking";
import BusinessInfo from "../components/business/BusinessInfo";
import Reviews from "../components/business/Reviews";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TranslatedText } from "@/components/translation/TranslatedText";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { validateQueueOperating } from "@/utils/queueValidation";
import { checkAndResetQueueForNewDay } from "@/utils/queueReset";
import { useAutoTranslate } from "@/hooks/useTranslate";

function useTranslations() {
  const txtBack = useAutoTranslate('Anterior', 'pt');
  const txtBusinessNotFound = useAutoTranslate('Empresa não encontrada', 'pt');
  const txtVideo = useAutoTranslate('Vídeo', 'pt');
  const txtBrowserNotSupported = useAutoTranslate('Seu navegador não suporta vídeos.', 'pt');
  const txtThumbnail = useAutoTranslate('Miniatura', 'pt');
  const txtCurrent = useAutoTranslate('Atual', 'pt');
  const txtMin = useAutoTranslate('min', 'pt');
  const txtQueue = useAutoTranslate('fila', 'pt');
  const txtOpen = useAutoTranslate('Aberta', 'pt');
  const txtClosed = useAutoTranslate('fechada', 'pt');
  const txtQueueNoName = useAutoTranslate('Fila sem nome', 'pt');
  const txtPhoneOptional = useAutoTranslate('Telefone (opcional, para SMS)', 'pt');
  const txtIssuing = useAutoTranslate('Emitindo...', 'pt');
  const txtUnavailable = useAutoTranslate('Indisponível', 'pt');
  const txtGetTicket = useAutoTranslate('Retirar Ticket', 'pt');
  const txtTickets = useAutoTranslate('Tickets', 'pt');
  const txtBook = useAutoTranslate('Marcar', 'pt');
  const txtReviews = useAutoTranslate('Aval.', 'pt');
  const txtAvailableQueues = useAutoTranslate('Filas Disponíveis', 'pt');
  const txtSelectTicket = useAutoTranslate('Selecione e retire o seu ticket', 'pt');
  const txtSearchQueue = useAutoTranslate('Pesquisar fila...', 'pt');
  const txtNoQueueFound = useAutoTranslate('Nenhuma fila encontrada', 'pt');
  const txtNoQueueAvailable = useAutoTranslate('Nenhuma fila disponível', 'pt');
  const txtTryOtherSearch = useAutoTranslate('Tente outro termo de pesquisa', 'pt');
  const txtBusinessNoQueues = useAutoTranslate('Esta empresa ainda não configurou filas', 'pt');
  const txtClearSearch = useAutoTranslate('Limpar pesquisa', 'pt');
  const txtBookService = useAutoTranslate('Marcar Serviço', 'pt');
  const txtScheduleAppointment = useAutoTranslate('Agende com hora marcada', 'pt');
  const txtPhotoGallery = useAutoTranslate('Galeria de Fotos', 'pt');
  const txtInfo = useAutoTranslate('Info', 'pt');
  const txtNoServiceAvailable = useAutoTranslate('Nenhum serviço disponível', 'pt');
  const txtBusinessNoServices = useAutoTranslate('Esta empresa ainda não configurou serviços para marcação', 'pt');
  const txtLoginRequired = useAutoTranslate('Login Necessário', 'pt');
  const txtLoginToBook = useAutoTranslate('Faça login para marcar', 'pt');
  const txtDoLogin = useAutoTranslate('Fazer Login', 'pt');
  const txtAlreadyHaveTicket = useAutoTranslate('Já tem uma senha ativa para este serviço', 'pt');
  const txtTicketSuccess = useAutoTranslate('Senha retirada com sucesso!', 'pt');
  const txtTicketError = useAutoTranslate('Erro ao retirar senha. Tente novamente.', 'pt');
  
  return { 
    txtBack, txtBusinessNotFound, txtVideo, txtBrowserNotSupported, txtThumbnail, txtCurrent, txtMin, txtQueue, txtOpen, txtClosed, txtQueueNoName, txtPhoneOptional, txtIssuing, txtUnavailable, txtGetTicket,
    txtTickets, txtBook, txtReviews, txtAvailableQueues, txtSelectTicket, txtSearchQueue, txtNoQueueFound, txtNoQueueAvailable, txtTryOtherSearch, txtBusinessNoQueues, txtClearSearch,
    txtBookService, txtScheduleAppointment, txtPhotoGallery, txtInfo, txtNoServiceAvailable, txtBusinessNoServices, txtLoginRequired, txtLoginToBook, txtDoLogin,
    txtAlreadyHaveTicket, txtTicketSuccess, txtTicketError
  };
}

function MediaGalleryCarousel({ media, businessName, txtVideo, txtBrowserNotSupported, txtThumbnail }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState({});

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % media.length);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
  };

  const handleImageError = (index) => {
    setImageErrors(prev => ({ ...prev, [index]: true }));
  };

  const currentMediaRaw = media[currentIndex];
  const currentMedia = getUploadUrl(currentMediaRaw);
  const isVideo = currentMediaRaw?.match(/\.(mp4|webm|ogg)$/i);
  const hasMainImageError = imageErrors[currentIndex];

  return (
    <div className="space-y-3">
      <div className="relative aspect-video bg-slate-100 rounded-lg overflow-hidden shadow-md">
        {isVideo ? (
          <video 
            src={currentMedia} 
            controls
            className="w-full h-full object-cover"
            key={currentMedia}
          >
            <source src={currentMedia} type="video/mp4" />
            {txtBrowserNotSupported}
          </video>
        ) : hasMainImageError ? (
          <div className="w-full h-full flex items-center justify-center bg-slate-200">
            <div className="text-center text-slate-500 p-4">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 text-slate-400" />
              <p className="text-sm">{txtThumbnail} {currentIndex + 1}</p>
            </div>
          </div>
        ) : (
          <img 
            src={currentMedia} 
            alt={`${businessName} - ${txtThumbnail} ${currentIndex + 1}`}
            className="w-full h-full object-cover"
            onError={() => handleImageError(currentIndex)}
          />
        )}
        
        {media.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all shadow-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all shadow-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
        
        {isVideo && (
          <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <Play className="w-3 h-3" />
            {txtVideo}
          </div>
        )}
        
        <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
          {currentIndex + 1} / {media.length}
        </div>
      </div>
      
      {media.length > 1 && (
        <div className="relative">
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 min-w-max pb-2">
              {media.map((item, idx) => {
                const isVideoThumb = item?.match(/\.(mp4|webm|ogg)$/i);
                const thumbUrl = getUploadUrl(item);
                const hasThumbError = imageErrors[idx];
                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      idx === currentIndex 
                        ? 'border-sky-600 ring-2 ring-sky-200 scale-105' 
                        : 'border-slate-200 hover:border-sky-400 opacity-70 hover:opacity-100'
                    }`}
                  >
                    {isVideoThumb ? (
                      <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                        <Play className="w-6 h-6 text-slate-500" />
                      </div>
                    ) : hasThumbError ? (
                      <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                        <AlertCircle className="w-6 h-6 text-slate-400" />
                      </div>
                    ) : (
                      <img 
                        src={thumbUrl} 
                        alt={`${txtThumbnail} ${idx + 1}`}
                        className="w-full h-full object-cover"
                        onError={() => handleImageError(idx)}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BusinessDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const businessId = urlParams.get('id');
  const [user, setUser] = useState(null);
  const [userPhone, setUserPhone] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  const { 
    txtBack, txtBusinessNotFound, txtVideo, txtBrowserNotSupported, txtThumbnail, txtCurrent, txtMin, txtQueue, txtOpen, txtClosed, txtQueueNoName, txtPhoneOptional, txtIssuing, txtUnavailable, txtGetTicket,
    txtTickets, txtBook, txtReviews, txtAvailableQueues, txtSelectTicket, txtSearchQueue, txtNoQueueFound, txtNoQueueAvailable, txtTryOtherSearch, txtBusinessNoQueues, txtClearSearch,
    txtBookService, txtScheduleAppointment, txtPhotoGallery, txtInfo, txtNoServiceAvailable, txtBusinessNoServices, txtLoginRequired, txtLoginToBook, txtDoLogin,
    txtAlreadyHaveTicket, txtTicketSuccess, txtTicketError
  } = useTranslations();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: business, isLoading: loadingBusiness } = useQuery({
    queryKey: ['business', businessId],
    queryFn: async () => {
      // Buscar da API PostgreSQL (mesma fonte que lista de empresas)
      const { response, data } = await safeFetch(`/api/public/businesses/${businessId}`);
      if (!response.ok) {
        console.error('❌ Empresa não encontrada:', businessId);
        return null;
      }
      return data;
    },
    enabled: !!businessId,
  });

  const { data: queues, isLoading: loadingQueues } = useQuery({
    queryKey: ['queues', businessId],
    queryFn: () => base44.entities.Queue.filter({ business_id: businessId, is_active: true }),
    initialData: [],
    enabled: !!businessId,
  });

  const { data: services } = useQuery({
    queryKey: ['services', businessId],
    queryFn: () => base44.entities.Service.filter({ business_id: businessId, is_active: true }),
    initialData: [],
    enabled: !!businessId,
  });

  const { data: userTickets } = useQuery({
    queryKey: ['user-tickets', user?.email],
    queryFn: () => base44.entities.Ticket.filter({ 
      user_email: user.email,
      status: { $in: ['aguardando', 'chamado', 'atendendo'] }
    }),
    initialData: [],
    enabled: !!user?.email,
  });

  const createTicketMutation = useMutation({
    mutationFn: async (queueId) => {
      console.log('🎫 Iniciando criação de ticket...');
      console.log('📍 queueId:', queueId);
      console.log('👤 user:', user?.email);
      
      if (!user) {
        console.log('❌ Utilizador não autenticado');
        base44.auth.redirectToLogin(window.location.href);
        return;
      }

      console.log('🔍 Verificando tickets existentes...');
      const existingTickets = await base44.entities.Ticket.filter({
        user_email: user.email,
        queue_id: queueId
      });
      console.log('📋 Tickets existentes:', existingTickets.length);

      const hasActiveTicket = existingTickets.some(t => 
        ['aguardando', 'chamado', 'atendendo'].includes(t.status)
      );

      if (hasActiveTicket) {
        console.log('❌ Já tem ticket ativo');
        toast.error(txtAlreadyHaveTicket);
        throw new Error('already_has_ticket');
      }

      // Buscar fila atualizada do servidor (não do cache) para ter definições mais recentes
      const freshQueues = await base44.entities.Queue.filter({ business_id: businessId, is_active: true });
      let queue = freshQueues.find(q => q.id === queueId);
      
      if (!queue) {
        throw new Error('Fila não encontrada');
      }
      
      console.log('📊 Fila encontrada:', queue?.name, 'status:', queue?.status);
      console.log('📅 working_hours:', JSON.stringify(queue?.working_hours));
      
      const validation = validateQueueOperating(queue);
      console.log('✅ Validação:', validation);
      if (!validation.isOperating) {
        console.log('❌ Fila não operacional:', validation.reason);
        toast.error(validation.reason);
        throw new Error(validation.reason);
      }
      
      console.log('🔄 Verificando reset de dia...');
      queue = await checkAndResetQueueForNewDay(queue);
      
      queryClient.setQueryData(['queues', businessId], (oldQueues) => 
        oldQueues?.map(q => q.id === queue.id ? queue : q) || oldQueues
      );
      
      const ticketNumber = queue.last_issued_number + 1;
      const position = ticketNumber - queue.current_number;
      const estimatedTime = position * queue.average_service_time;
      console.log('🎫 Novo ticket:', { ticketNumber, position, estimatedTime });

      console.log('📤 Criando ticket no servidor...');
      const ticket = await base44.entities.Ticket.create({
        queue_id: queueId,
        business_id: businessId,
        user_email: user.email,
        user_phone: userPhone || user.phone || null,
        ticket_number: ticketNumber,
        status: "aguardando",
        estimated_time: estimatedTime,
        position: position,
        is_premium: false
      });
      console.log('✅ Ticket criado:', ticket?.id);

      // Atualizar last_issued_number da fila (não crítico - senha já foi criada)
      try {
        await base44.entities.Queue.update(queueId, {
          last_issued_number: ticketNumber
        });
      } catch (err) {
        console.warn('Erro ao atualizar fila (senha já criada, ignorado):', err);
      }

      // ✅ Notificações são geridas via Firebase Push Notifications (não via entity local)
      // O sistema envia push notifications automaticamente quando o ticket é chamado

      return ticket;
    },
    onSuccess: (ticket) => {
      if (ticket) {
        queryClient.invalidateQueries({ queryKey: ['queues', businessId] });
        queryClient.invalidateQueries({ queryKey: ['customer-tickets'] });
        queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
        toast.success(txtTicketSuccess);
        navigate(createPageUrl(`TicketView?id=${ticket.id}`));
      }
    },
    onError: (error) => {
      console.error('❌ Erro ao criar ticket:', error);
      console.error('📍 Mensagem:', error.message);
      
      if (!error.message.includes('already_has_ticket') && !error.message.includes('operando')) {
        // Mostrar mensagem mais específica se disponível
        const errorMsg = error.message && error.message !== 'Failed to fetch' 
          ? error.message 
          : txtTicketError;
        toast.error(errorMsg);
      }
    }
  });

  if (loadingBusiness) {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 p-2 md:p-4">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-8 w-24 mb-3" />
          <Skeleton className="h-40 w-full mb-3 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 p-2 md:p-4">
        <div className="max-w-4xl mx-auto text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">{txtBusinessNotFound}</h2>
          <Button size="sm" onClick={() => navigate(createPageUrl("Businesses"))}>
            {txtBack}
          </Button>
        </div>
      </div>
    );
  }

  const filteredQueues = queues.filter(queue => 
    queue && ( // ✅ PROTEÇÃO: Verificar se queue existe
      queue.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      queue.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50">
      <div className="max-w-4xl mx-auto px-2 md:px-4 py-2 md:py-4">
        <Button
          variant="outline"
          size="sm"
          className="mb-2 gap-1 h-8 text-xs"
          onClick={() => navigate(createPageUrl("Businesses"))}
        >
          <ArrowLeft className="w-3 h-3" />
          {txtBack}
        </Button>

        <Card className="mb-3 border-0 shadow-lg overflow-hidden">
          <div className="h-24 bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 relative">
            <div className="absolute inset-0 bg-black/20" />
            {business.logo_url && (
              <img
                src={getUploadUrl(business.logo_url)}
                alt={business.name}
                className="absolute bottom-2 left-2 w-12 h-12 rounded-lg bg-white p-1.5 object-contain shadow-lg"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
          </div>

          <CardContent className="pt-3 pb-3">
            <div className="mb-3">
              <h1 className="text-lg font-bold text-slate-900 mb-1">
                <TranslatedText text={business.name} />
              </h1>
              <div className="flex items-center gap-2 mb-1.5">
                {business.rating && (
                  <div className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span className="font-semibold text-sm">{business.rating.toFixed(1)}</span>
                  </div>
                )}
                <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs h-5">
                  {business.category}
                </Badge>
              </div>
            </div>

            <p className="text-xs text-slate-700 mb-3 leading-relaxed">
              <TranslatedText 
                text={business.description || 'Serviço de qualidade com atendimento personalizado.'} 
              />
            </p>
          </CardContent>
        </Card>

        <Tabs defaultValue="filas" className="space-y-3">
          <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
            <TabsList className="bg-white border border-slate-200 w-full flex flex-nowrap min-w-max sm:min-w-0 sm:grid sm:grid-cols-4 p-0.5 gap-0.5">
              <TabsTrigger value="filas" className="text-xs flex-1 min-w-[70px] sm:min-w-0 px-2 sm:px-3">{txtTickets}</TabsTrigger>
              <TabsTrigger value="agendamento" className="text-xs flex-1 min-w-[70px] sm:min-w-0 px-2 sm:px-3">{txtBook}</TabsTrigger>
              <TabsTrigger value="info" className="text-xs flex-1 min-w-[70px] sm:min-w-0 px-2 sm:px-3">
                <Info className="w-3 h-3 mr-0.5" />
                {txtInfo}
              </TabsTrigger>
              <TabsTrigger value="avaliacoes" className="text-xs flex-1 min-w-[70px] sm:min-w-0 px-2 sm:px-3">
                <MessageSquare className="w-3 h-3 mr-0.5" />
                {txtReviews}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="filas">
            <div className="mb-3">
              <h2 className="text-base font-bold text-slate-900 mb-0.5">{txtAvailableQueues}</h2>
              <p className="text-xs text-slate-600">{txtSelectTicket}</p>
            </div>

            {queues.length > 0 && (
              <div className="relative mb-3">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder={txtSearchQueue}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>
            )}

            {loadingQueues ? (
              <div className="space-y-2">
                {[1, 2].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
              </div>
            ) : filteredQueues.length === 0 ? (
              <Card className="border-0 shadow-md">
                <CardContent className="py-8 text-center">
                  <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-slate-900 mb-1">
                    {searchTerm ? txtNoQueueFound : txtNoQueueAvailable}
                  </h3>
                  <p className="text-xs text-slate-600">
                    {searchTerm ? txtTryOtherSearch : txtBusinessNoQueues}
                  </p>
                  {searchTerm && (
                    <Button size="sm" variant="outline" className="mt-3 h-7 text-xs" onClick={() => setSearchTerm('')}>
                      {txtClearSearch}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredQueues.map(queue => {
                  // ✅ PROTEÇÃO EXTRA: Garantir que queue existe E tem propriedades válidas
                  if (!queue || !queue.id) return null;
                  
                  const peopleWaiting = (queue.last_issued_number || 0) - (queue.current_number || 0);
                  const estimatedTime = peopleWaiting * (queue.average_service_time || 5);
                  const isAvailable = queue.status === "aberta" && peopleWaiting < (queue.max_capacity || 999);

                  return (
                    <Card key={queue.id} className={`border-0 shadow-md hover:shadow-lg transition-all ${!isAvailable && 'opacity-60'}`}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-sm mb-0.5 truncate">{queue.name || txtQueueNoName}</CardTitle>
                            {queue.description && (
                              <p className="text-slate-600 text-xs line-clamp-1">{queue.description}</p>
                            )}
                          </div>
                          {queue.status === "aberta" ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200 text-xs flex-shrink-0 h-5">
                              <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                              {txtOpen}
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700 border-red-200 text-xs flex-shrink-0 h-5">
                              {queue.status || txtClosed}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
                          <div className="p-2 bg-gradient-to-br from-blue-50 to-sky-50 rounded-lg text-center">
                            <Clock className="w-3 h-3 text-sky-600 mx-auto mb-0.5" />
                            <div className="text-base sm:text-lg font-bold text-sky-600">~{estimatedTime}</div>
                            <div className="text-xs text-slate-600">{txtMin}</div>
                          </div>

                          <div className="p-2 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg text-center">
                            <Users className="w-3 h-3 text-purple-600 mx-auto mb-0.5" />
                            <div className="text-base sm:text-lg font-bold text-purple-600">{peopleWaiting}</div>
                            <div className="text-xs text-slate-600">{txtQueue}</div>
                          </div>

                          <div className="p-2 bg-slate-50 rounded-lg text-center col-span-2 sm:col-span-1">
                            <div className="text-xs text-slate-600 mb-0.5">{txtCurrent}</div>
                            <div className="text-sm font-bold text-slate-900">#{queue.current_number || 0}</div>
                          </div>
                        </div>

                        {user && business?.sms_gateway && business.sms_gateway !== 'none' && (
                          <Input
                            type="tel"
                            placeholder={txtPhoneOptional}
                            value={userPhone}
                            onChange={(e) => setUserPhone(e.target.value)}
                            className="mb-2 h-8 text-xs"
                          />
                        )}

                        <Button
                          size="sm"
                          className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 h-9 text-xs"
                          disabled={!isAvailable || createTicketMutation.isPending}
                          onClick={() => createTicketMutation.mutate(queue.id)}
                        >
                          {createTicketMutation.isPending ? (
                            txtIssuing
                          ) : !isAvailable ? (
                            txtUnavailable
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3 mr-1" />
                              {txtGetTicket}
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="agendamento">
            {services.length === 0 ? (
              <Card className="border-0 shadow-md">
                <CardContent className="py-8 text-center">
                  <Calendar className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-slate-900 mb-1">{txtNoServiceAvailable}</h3>
                  <p className="text-xs text-slate-600">{txtBusinessNoServices}</p>
                </CardContent>
              </Card>
            ) : !user ? (
              <Card className="border-0 shadow-md">
                <CardContent className="py-8 text-center">
                  <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-slate-900 mb-1">{txtLoginRequired}</h3>
                  <p className="text-xs text-slate-600 mb-3">
                    {txtLoginToBook}
                  </p>
                  <Button size="sm" onClick={() => base44.auth.redirectToLogin(window.location.href)} className="h-8 text-xs">
                    {txtDoLogin}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="mb-3">
                  <h2 className="text-base font-bold text-slate-900 mb-0.5">{txtBookService}</h2>
                  <p className="text-xs text-slate-600">{txtScheduleAppointment}</p>
                </div>
                <AppointmentBooking
                  business={business}
                  user={user}
                  onComplete={() => {
                    navigate(createPageUrl("MyAppointments"));
                  }}
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="info">
            {(() => {
              // Usar media_gallery se existir, caso contrário usar apenas photo_url (NÃO o logo)
              const media = business.media_gallery?.length 
                ? business.media_gallery 
                : business.photo_url ? [business.photo_url] : [];
              
              return media.length > 0 && (
                <Card className="mb-3 border-0 shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{txtPhotoGallery}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MediaGalleryCarousel 
                      media={media} 
                      businessName={business.name} 
                      txtVideo={txtVideo}
                      txtBrowserNotSupported={txtBrowserNotSupported}
                      txtThumbnail={txtThumbnail}
                    />
                  </CardContent>
                </Card>
              );
            })()}
            
            <BusinessInfo business={business} />
          </TabsContent>

          <TabsContent value="avaliacoes">
            <Reviews business={business} user={user} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}