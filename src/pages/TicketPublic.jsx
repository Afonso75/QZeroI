import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, AlertCircle, CheckCircle2, Phone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAutoTranslate } from "@/hooks/useTranslate";
import { getUploadUrl } from "@/utils/apiConfig";

export default function TicketPublicPage() {
  const txtTicketNotFound = useAutoTranslate('Senha não encontrada', 'pt');
  const txtVerifyLink = useAutoTranslate('Verifique o link ou contacte o estabelecimento', 'pt');
  const txtWaiting = useAutoTranslate('Aguardando', 'pt');
  const txtYourTurn = useAutoTranslate('É a sua vez!', 'pt');
  const txtInService = useAutoTranslate('Em atendimento', 'pt');
  const txtCompleted = useAutoTranslate('Concluído', 'pt');
  const txtCancelled = useAutoTranslate('Cancelado', 'pt');
  const txtPositionInQueue = useAutoTranslate('Posição na fila', 'pt');
  const txtCurrentTicket = useAutoTranslate('Senha atual', 'pt');
  const txtEstimatedTime = useAutoTranslate('Tempo estimado', 'pt');
  const txtWaitToBeCalled = useAutoTranslate('Aguarde ser chamado', 'pt');
  const txtKeepPageOpen = useAutoTranslate('Mantenha esta página aberta', 'pt');
  const txtGoToService = useAutoTranslate('Dirija-se ao atendimento agora', 'pt');
  const txtYouHaveMinutes = useAutoTranslate('Tem', 'pt');
  const txtMinutesToAppear = useAutoTranslate('minutos para comparecer', 'pt');
  const txtServiceCompleted = useAutoTranslate('Atendimento Concluído', 'pt');
  const txtThanksForVisit = useAutoTranslate('Obrigado pela visita!', 'pt');
  const txtTicketCancelled = useAutoTranslate('Senha Cancelada', 'pt');
  const txtContactEstablishment = useAutoTranslate('Contacte o estabelecimento', 'pt');
  const [now, setNow] = useState(new Date());
  const urlParams = new URLSearchParams(window.location.search);
  const ticketId = urlParams.get('id');

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const { data: ticket, isLoading: loadingTicket } = useQuery({
    queryKey: ['public-ticket', ticketId],
    queryFn: async () => {
      const tickets = await base44.entities.Ticket.filter({ id: ticketId });
      return tickets[0];
    },
    enabled: !!ticketId,
    refetchInterval: 3000,
  });

  const { data: queue } = useQuery({
    queryKey: ['queue', ticket?.queue_id],
    queryFn: async () => {
      const queues = await base44.entities.Queue.filter({ id: ticket.queue_id });
      return queues[0];
    },
    enabled: !!ticket?.queue_id,
    refetchInterval: 3000,
  });

  const { data: business } = useQuery({
    queryKey: ['business', ticket?.business_id],
    queryFn: async () => {
      const businesses = await base44.entities.Business.filter({ id: ticket.business_id });
      return businesses[0];
    },
    enabled: !!ticket?.business_id,
  });

  const { data: service } = useQuery({
    queryKey: ['service', queue?.service_id],
    queryFn: async () => {
      const services = await base44.entities.Service.filter({ id: queue.service_id });
      return services[0];
    },
    enabled: !!queue?.service_id,
  });

  if (loadingTicket) {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 p-3 sm:p-6">
        <div className="max-w-md mx-auto">
          <Skeleton className="h-40 w-full mb-3 rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 flex items-center justify-center p-3 sm:p-6">
        <Card className="border-0 shadow-lg max-w-md w-full">
          <CardContent className="py-12 sm:py-16 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">{txtTicketNotFound}</h2>
            <p className="text-slate-600">{txtVerifyLink}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusConfig = {
    aguardando: { 
      icon: Clock, 
      color: 'from-amber-500 to-orange-500',
      bg: 'bg-amber-100',
      text: 'text-amber-700',
      label: txtWaiting 
    },
    chamado: { 
      icon: Phone, 
      color: 'from-green-500 to-emerald-500',
      bg: 'bg-green-100',
      text: 'text-green-700',
      label: txtYourTurn 
    },
    atendendo: { 
      icon: Users, 
      color: 'from-blue-500 to-cyan-500',
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      label: txtInService 
    },
    concluido: { 
      icon: CheckCircle2, 
      color: 'from-green-500 to-emerald-500',
      bg: 'bg-green-100',
      text: 'text-green-700',
      label: txtCompleted 
    },
    cancelado: { 
      icon: AlertCircle, 
      color: 'from-red-500 to-pink-500',
      bg: 'bg-red-100',
      text: 'text-red-700',
      label: txtCancelled 
    }
  };

  const status = statusConfig[ticket.status] || statusConfig.aguardando;
  const StatusIcon = status.icon;
  const position = queue ? (ticket.ticket_number - queue.current_number) : 0;
  
  const elapsedMinutes = Math.floor((now - new Date(ticket.created_date)) / (1000 * 60));
  const baseEstimatedTime = queue ? (position * queue.average_service_time) : 0;
  const estimatedTime = Math.max(0, baseEstimatedTime - elapsedMinutes);

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 w-full overflow-x-hidden">
      <div className="w-full max-w-md mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">
        {business && (
          <div className="text-center mb-3 sm:mb-4">
            {business.logo_url && (
              <img 
                src={getUploadUrl(business.logo_url)} 
                alt={business.name}
                className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-2 rounded-xl object-contain bg-white p-1"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate px-2">{business.name}</h1>
            {queue && (
              <p className="text-xs sm:text-sm text-slate-600 truncate">{queue.name}</p>
            )}
          </div>
        )}

        <Card className="border-0 shadow-2xl mb-3 sm:mb-4 overflow-hidden">
          <div className={`h-1.5 sm:h-2 bg-gradient-to-r ${status.color}`} />
          <CardContent className="py-6 sm:py-8 text-center px-4">
            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br ${status.color} flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-xl`}>
              <StatusIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            
            <div className="mb-3 sm:mb-4">
              <div className="text-5xl sm:text-6xl font-bold text-slate-900 mb-2">
                #{ticket.ticket_number}
              </div>
              <Badge className={`${status.bg} ${status.text} border-0 text-sm sm:text-base px-3 sm:px-4 py-1`}>
                {status.label}
              </Badge>
            </div>

            {ticket.manual_name && (
              <p className="text-sm sm:text-base text-slate-700 mb-2 truncate">{ticket.manual_name}</p>
            )}
          </CardContent>
        </Card>

        {ticket.status === 'aguardando' && queue && (
          <div className="space-y-2 sm:space-y-3">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-3 sm:p-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-blue-50 rounded-lg p-2 sm:p-3">
                    <div className="text-xl sm:text-2xl font-bold text-blue-600">{position}</div>
                    <div className="text-[10px] sm:text-xs text-slate-600 leading-tight">{txtPositionInQueue}</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2 sm:p-3">
                    <div className="text-xl sm:text-2xl font-bold text-slate-900">#{queue.current_number}</div>
                    <div className="text-[10px] sm:text-xs text-slate-600 leading-tight">{txtCurrentTicket}</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-2 sm:p-3">
                    <div className="text-xl sm:text-2xl font-bold text-purple-600">~{estimatedTime}</div>
                    <div className="text-[10px] sm:text-xs text-slate-600 leading-tight">{txtEstimatedTime}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-sky-50">
              <CardContent className="p-3 sm:p-4 text-center">
                <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 mx-auto mb-1.5 sm:mb-2" />
                <p className="text-xs sm:text-sm text-slate-700 font-medium">
                  {txtWaitToBeCalled}
                </p>
                <p className="text-[10px] sm:text-xs text-slate-600 mt-0.5 sm:mt-1">
                  {txtKeepPageOpen}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {ticket.status === 'chamado' && (
          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 animate-pulse">
            <CardContent className="p-4 sm:p-6 text-center">
              <Phone className="w-10 h-10 sm:w-12 sm:h-12 text-green-600 mx-auto mb-2 sm:mb-3" />
              <h3 className="text-lg sm:text-xl font-bold text-green-700 mb-1.5 sm:mb-2">
                {txtYourTurn}
              </h3>
              <p className="text-sm sm:text-base text-slate-700 mb-2">
                {txtGoToService}
              </p>
              {service && service.tolerance_time && (
                <p className="text-xs sm:text-sm text-green-700 font-medium flex items-center justify-center gap-1 mt-2 sm:mt-3">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {txtYouHaveMinutes} {service.tolerance_time} {txtMinutesToAppear}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {ticket.status === 'concluido' && (
          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-4 sm:p-6 text-center">
              <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-green-600 mx-auto mb-2 sm:mb-3" />
              <h3 className="text-lg sm:text-xl font-bold text-green-700 mb-1.5 sm:mb-2">
                {txtServiceCompleted}
              </h3>
              <p className="text-sm sm:text-base text-slate-700">
                {txtThanksForVisit}
              </p>
            </CardContent>
          </Card>
        )}

        {ticket.status === 'cancelado' && (
          <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-pink-50">
            <CardContent className="p-4 sm:p-6 text-center">
              <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-red-600 mx-auto mb-2 sm:mb-3" />
              <h3 className="text-lg sm:text-xl font-bold text-red-700 mb-1.5 sm:mb-2">
                {txtTicketCancelled}
              </h3>
              <p className="text-sm sm:text-base text-slate-700">
                {txtContactEstablishment}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}