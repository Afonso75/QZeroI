import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getUploadUrl } from "@/utils/apiConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Clock, 
  MapPin, 
  Users, 
  TrendingUp,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Phone,
  ArrowLeft,
  Star,
  Timer
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useConfirm } from "@/hooks/useConfirm";
import { toast } from "sonner";
import { useAutoTranslate } from "@/hooks/useTranslate";
import { navigateBackOrFallback } from '@/hooks/useNavigateBack';

const statusColors = {
  aguardando: { icon: Clock, color: "bg-blue-100 text-blue-700 border-blue-200" },
  chamado: { icon: Phone, color: "bg-amber-100 text-amber-700 border-amber-200" },
  atendendo: { icon: Users, color: "bg-purple-100 text-purple-700 border-purple-200" },
  concluido: { icon: CheckCircle2, color: "bg-green-100 text-green-700 border-green-200" },
  cancelado: { icon: XCircle, color: "bg-red-100 text-red-700 border-red-200" }
};

export default function TicketViewPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const ticketId = urlParams.get('id');
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [, forceUpdate] = useState(0);
  const { confirm, ConfirmDialog } = useConfirm();

  const txtWaiting = useAutoTranslate('Aguardando', 'pt');
  const txtCalled = useAutoTranslate('Chamado', 'pt');
  const txtInService = useAutoTranslate('Em Atendimento', 'pt');
  const txtCompleted = useAutoTranslate('Concluído', 'pt');
  const txtCancelled = useAutoTranslate('Cancelado', 'pt');
  const txtCancelSuccess = useAutoTranslate('Senha cancelada com sucesso', 'pt');
  const txtCancelError = useAutoTranslate('Erro ao cancelar senha', 'pt');
  const txtBack = useAutoTranslate('Anterior', 'pt');
  const txtBackToDashboard = useAutoTranslate('Voltar ao Dashboard', 'pt');
  const txtCancelTicket = useAutoTranslate('Cancelar Senha', 'pt');
  const txtCancelTicketConfirm = useAutoTranslate('Tem certeza que deseja cancelar esta senha? Esta ação não pode ser desfeita.', 'pt');
  const txtTicketNotFound = useAutoTranslate('Senha não encontrada', 'pt');
  const txtTicketNotFoundDesc = useAutoTranslate('Não foi possível encontrar esta senha', 'pt');
  const txtCanceling = useAutoTranslate('Cancelando...', 'pt');
  const txtHowWasService = useAutoTranslate('Como foi o atendimento?', 'pt');
  const txtRating = useAutoTranslate('Avaliação', 'pt');
  const txtCommentOptional = useAutoTranslate('Comentário (opcional)', 'pt');
  const txtTellExperience = useAutoTranslate('Conte-nos sobre sua experiência...', 'pt');
  const txtSending = useAutoTranslate('Enviando...', 'pt');
  const txtSubmitRating = useAutoTranslate('Enviar Avaliação', 'pt');
  const txtYourRating = useAutoTranslate('Sua avaliação:', 'pt');
  const txtTips = useAutoTranslate('Dicas', 'pt');
  const txtAutoUpdate = useAutoTranslate('Esta página atualiza automaticamente', 'pt');
  const txtAutoUpdateDesc = useAutoTranslate('Não precisa recarregar, as informações são atualizadas em tempo real', 'pt');
  const txtStayAlert = useAutoTranslate('Fique atento às notificações', 'pt');
  const txtStayAlertDesc = useAutoTranslate('Você receberá um aviso quando estiver próximo da sua vez', 'pt');
  const txtCanLeave = useAutoTranslate('Pode sair e voltar', 'pt');
  const txtCanLeaveDesc = useAutoTranslate('Aproveite o tempo de espera para fazer outras coisas', 'pt');
  const txtInQueue = useAutoTranslate('Você está na fila', 'pt');
  const txtYourTurn = useAutoTranslate('É a sua vez! Dirija-se ao atendimento', 'pt');
  const txtBeingServed = useAutoTranslate('Você está sendo atendido', 'pt');
  const txtServiceFinished = useAutoTranslate('Atendimento finalizado', 'pt');
  const txtTicketCancelled = useAutoTranslate('Senha cancelada', 'pt');
  const txtAheadOfYou = useAutoTranslate('Na sua frente', 'pt');
  const txtMinutes = useAutoTranslate('Minutos', 'pt');
  const txtBeingAttended = useAutoTranslate('Sendo atendido', 'pt');
  const txtItsYourTurn = useAutoTranslate('É A SUA VEZ!', 'pt');
  const txtGoToService = useAutoTranslate('Dirija-se ao local de atendimento agora', 'pt');
  const txtTimeRemaining = useAutoTranslate('Tempo restante', 'pt');
  const txtMinutesToPresent = useAutoTranslate('minutos para se apresentar', 'pt');
  const txtSecondsRemaining = useAutoTranslate('segundos restantes', 'pt');

  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate(prev => prev + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const { data: ticket, isLoading: loadingTicket } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: async () => {
      const tickets = await base44.entities.Ticket.filter({ id: ticketId });
      const t = tickets[0];
      
      if (t?.status === 'concluido' && !t.rating) {
        setShowFeedback(true);
      }
      
      return t;
    },
    enabled: !!ticketId,
    refetchInterval: 5000,
  });

  const { data: business } = useQuery({
    queryKey: ['business', ticket?.business_id],
    queryFn: async () => {
      const businesses = await base44.entities.Business.filter({ id: ticket.business_id });
      return businesses[0];
    },
    enabled: !!ticket?.business_id,
  });

  const { data: queue } = useQuery({
    queryKey: ['queue', ticket?.queue_id],
    queryFn: async () => {
      const queues = await base44.entities.Queue.filter({ id: ticket.queue_id });
      return queues[0];
    },
    enabled: !!ticket?.queue_id,
    refetchInterval: 5000,
  });

  const { data: allTickets } = useQuery({
    queryKey: ['queue-tickets', ticket?.queue_id],
    queryFn: () => base44.entities.Ticket.filter({ 
      queue_id: ticket.queue_id,
      status: { $in: ['aguardando', 'chamado', 'atendendo'] }
    }),
    enabled: !!ticket?.queue_id,
    refetchInterval: 5000,
    initialData: [],
  });

  const expireTicketMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Ticket.update(ticketId, {
        status: 'cancelado',
        completed_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket'] });
    }
  });

  useEffect(() => {
    if (!ticket || !queue || !['aguardando', 'chamado'].includes(ticket.status)) return;

    const checkExpiration = () => {
      const now = new Date();

      if (ticket.status === 'chamado' && ticket.called_at) {
        const calledAt = new Date(ticket.called_at);
        const toleranceMs = (queue.tolerance_time || 15) * 60 * 1000;
        if (now - calledAt > toleranceMs) {
          expireTicketMutation.mutate();
        }
      }

      if (ticket.status === 'aguardando') {
        const currentNumber = queue.current_number;
        if (ticket.ticket_number < currentNumber) {
          expireTicketMutation.mutate();
        }
      }
    };

    checkExpiration();
    const interval = setInterval(checkExpiration, 5000);

    return () => clearInterval(interval);
  }, [ticket, queue, expireTicketMutation]);

  const cancelMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Ticket.update(ticketId, {
        status: 'cancelado'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket'] });
      toast.success(txtCancelSuccess);
    },
    onError: () => {
      toast.error(txtCancelError);
    }
  });

  const submitFeedbackMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Ticket.update(ticketId, {
        rating,
        feedback
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket'] });
      setShowFeedback(false);
    },
  });

  const handleCancel = async () => {
    const confirmed = await confirm({
      title: txtCancelTicket,
      description: txtCancelTicketConfirm,
    });
    if (confirmed) {
      cancelMutation.mutate();
    }
  };

  if (loadingTicket) {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 px-4 sm:px-6 py-4 sm:py-6 lg:py-8">
        <div className="max-w-2xl mx-auto">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 px-4 sm:px-6 py-4 sm:py-6 lg:py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="py-12 sm:py-16 text-center px-4 sm:px-6">
              <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">{txtTicketNotFound}</h3>
              <p className="text-sm sm:text-base text-slate-600 mb-6">{txtTicketNotFoundDesc}</p>
              <Button className="sm:h-11" onClick={() => navigate(createPageUrl('Dashboard'))}>
                {txtBackToDashboard}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const statusInfo = statusColors[ticket.status] || statusColors.aguardando;
  const StatusIcon = statusInfo.icon;
  
  // Mapeamento dinâmico de labels e descrições traduzidas
  const statusLabels = {
    aguardando: txtWaiting,
    chamado: txtCalled,
    atendendo: txtInService,
    concluido: txtCompleted,
    cancelado: txtCancelled
  };
  
  const statusDescriptions = {
    aguardando: txtInQueue,
    chamado: txtYourTurn,
    atendendo: txtBeingServed,
    concluido: txtServiceFinished,
    cancelado: txtTicketCancelled
  };
  
  const currentLabel = statusLabels[ticket.status] || txtWaiting;
  const currentDescription = statusDescriptions[ticket.status] || txtInQueue;
  
  const position = queue ? Math.max(0, ticket.ticket_number - queue.current_number) : 0;
  
  const elapsedMinutes = ticket.created_date 
    ? Math.floor((Date.now() - new Date(ticket.created_date).getTime()) / (1000 * 60))
    : 0;
  const baseEstimatedTime = queue ? (position * (queue.average_service_time || 10)) : 0;
  const estimatedTime = Math.max(0, baseEstimatedTime - elapsedMinutes);

  // Calcular tempo de tolerância restante quando chamado
  const toleranceTimeMinutes = queue?.tolerance_time || 15;
  const toleranceRemainingSeconds = ticket.status === 'chamado' && ticket.called_at
    ? Math.max(0, (toleranceTimeMinutes * 60) - Math.floor((Date.now() - new Date(ticket.called_at).getTime()) / 1000))
    : toleranceTimeMinutes * 60;
  const toleranceMinutes = Math.floor(toleranceRemainingSeconds / 60);
  const toleranceSeconds = toleranceRemainingSeconds % 60;

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">
        <Button
          variant="outline"
          className="mb-3 sm:mb-6 gap-2 h-9 sm:h-11 text-sm"
          onClick={() => navigateBackOrFallback(navigate, '/dashboard')}
        >
          <ArrowLeft className="w-4 h-4" />
          {txtBack}
        </Button>

        <Card className="border-0 shadow-2xl mb-3 sm:mb-6 overflow-hidden">
          <div className={`h-1.5 sm:h-2 bg-gradient-to-r ${
            ticket.status === 'aguardando' ? 'from-blue-500 to-cyan-500' :
            ticket.status === 'chamado' ? 'from-amber-500 to-orange-500' :
            ticket.status === 'atendendo' ? 'from-purple-500 to-pink-500' :
            ticket.status === 'concluido' ? 'from-green-500 to-emerald-500' :
            'from-red-500 to-rose-500'
          }`} />
          
          <CardContent className="p-4 sm:p-6">
            <div className="text-center mb-4 sm:mb-6">
              <div className="inline-flex items-center justify-center w-18 h-18 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 mb-3 sm:mb-4" style={{width: '72px', height: '72px'}}>
                <span className="text-2xl sm:text-4xl font-bold text-white">#{ticket.ticket_number}</span>
              </div>
              
              <Badge className={`${statusInfo.color} text-sm px-3 py-1 mb-1.5 sm:mb-2`}>
                <StatusIcon className="w-3.5 h-3.5 mr-1.5" />
                {currentLabel}
              </Badge>
              
              <p className="text-slate-600 text-sm sm:text-lg">{currentDescription}</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 sm:p-6 mb-3 sm:mb-6">
              <div className="flex items-start gap-3">
                {business?.logo_url && (
                  <img 
                    src={getUploadUrl(business.logo_url)} 
                    alt={business.name}
                    className="w-10 h-10 sm:w-16 sm:h-16 rounded-lg object-contain bg-white p-1 sm:p-2 flex-shrink-0"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base sm:text-xl text-slate-900 mb-0.5 sm:mb-1 truncate">{business?.name}</h3>
                  <p className="text-xs sm:text-base text-slate-600 mb-1 sm:mb-2 truncate">{queue?.name}</p>
                  {business?.address && (
                    <div className="flex items-center gap-1.5 text-[11px] sm:text-sm text-slate-500">
                      <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="truncate">{business.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {['aguardando', 'chamado'].includes(ticket.status) && (
              <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-3 sm:mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-2.5 sm:p-4 text-center">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mx-auto mb-1 sm:mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-blue-600">{position}</div>
                  <div className="text-[10px] sm:text-xs text-slate-600 leading-tight">{txtAheadOfYou}</div>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-2.5 sm:p-4 text-center">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 mx-auto mb-1 sm:mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-purple-600">~{estimatedTime}</div>
                  <div className="text-[10px] sm:text-xs text-slate-600 leading-tight">{txtMinutes}</div>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-2.5 sm:p-4 text-center">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mx-auto mb-1 sm:mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-green-600">#{queue?.current_number || 0}</div>
                  <div className="text-[10px] sm:text-xs text-slate-600 leading-tight">{txtBeingAttended}</div>
                </div>
              </div>
            )}

            {ticket.status === 'chamado' && (
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl p-4 sm:p-6 mb-3 sm:mb-6 text-center animate-pulse">
                <Phone className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3" />
                <h4 className="text-lg sm:text-2xl font-bold mb-1.5 sm:mb-2">{txtItsYourTurn}</h4>
                <p className="text-sm sm:text-lg mb-2 sm:mb-4">{txtGoToService}</p>
                
                <div className="bg-white/20 rounded-lg p-2.5 sm:p-4 mt-2 sm:mt-4">
                  <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                    <Timer className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                    <span className="text-xs sm:text-base font-medium">{txtTimeRemaining}</span>
                  </div>
                  <div className="text-xl sm:text-3xl font-bold">
                    {toleranceMinutes}:{toleranceSeconds.toString().padStart(2, '0')}
                  </div>
                  <div className="text-[10px] sm:text-sm opacity-90">{txtMinutesToPresent}</div>
                </div>
              </div>
            )}

            {['aguardando', 'chamado'].includes(ticket.status) && (
              <Button
                variant="outline"
                className="w-full border-red-200 text-red-600 hover:bg-red-50 h-10 sm:h-11 text-sm"
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
              >
                <XCircle className="w-4 h-4 mr-2" />
                {cancelMutation.isPending ? txtCanceling : txtCancelTicket}
              </Button>
            )}

            {showFeedback && (
              <div className="mt-3 sm:mt-6 p-3 sm:p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl">
                <h4 className="font-bold text-sm sm:text-lg text-slate-900 mb-2 sm:mb-4">{txtHowWasService}</h4>
                
                <Label className="mb-1.5 block text-xs sm:text-base">{txtRating}</Label>
                <div className="flex gap-1 sm:gap-2 mb-3 sm:mb-4">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className={`p-2 rounded-lg transition-all min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center ${
                        rating >= star 
                          ? 'bg-amber-500 text-white' 
                          : 'bg-white text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      <Star className="w-4 h-4 sm:w-6 sm:h-6" fill={rating >= star ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>

                <Label htmlFor="feedback" className="mb-1.5 block text-xs sm:text-base">{txtCommentOptional}</Label>
                <Textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder={txtTellExperience}
                  rows={2}
                  className="mb-3 sm:mb-4 text-sm sm:text-base"
                />

                <Button
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 h-10 sm:h-11 text-sm"
                  onClick={() => submitFeedbackMutation.mutate()}
                  disabled={rating === 0 || submitFeedbackMutation.isPending}
                >
                  {submitFeedbackMutation.isPending ? txtSending : txtSubmitRating}
                </Button>
              </div>
            )}

            {ticket.rating && !showFeedback && (
              <div className="mt-3 sm:mt-6 p-3 sm:p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                  <span className="text-xs text-slate-600">{txtYourRating}</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star 
                        key={star} 
                        className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${ticket.rating >= star ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`}
                      />
                    ))}
                  </div>
                </div>
                {ticket.feedback && (
                  <p className="text-xs sm:text-sm text-slate-700 italic">&quot;{ticket.feedback}&quot;</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {['aguardando', 'chamado'].includes(ticket.status) && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="px-4 py-3 sm:py-4">
              <CardTitle className="text-sm sm:text-lg">{txtTips}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3 px-4 pb-4 pt-0">
              <div className="flex gap-2 sm:gap-3">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-xs sm:text-base text-slate-900">{txtAutoUpdate}</p>
                  <p className="text-[10px] sm:text-sm text-slate-600">{txtAutoUpdateDesc}</p>
                </div>
              </div>
              
              <div className="flex gap-2 sm:gap-3">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-xs sm:text-base text-slate-900">{txtStayAlert}</p>
                  <p className="text-[10px] sm:text-sm text-slate-600">{txtStayAlertDesc}</p>
                </div>
              </div>
              
              <div className="flex gap-2 sm:gap-3">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-xs sm:text-base text-slate-900">{txtCanLeave}</p>
                  <p className="text-[10px] sm:text-sm text-slate-600">{txtCanLeaveDesc}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <ConfirmDialog />
    </div>
  );
}