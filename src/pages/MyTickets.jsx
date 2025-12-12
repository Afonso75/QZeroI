import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Clock, CheckCircle2, XCircle, AlertCircle, Ticket as TicketIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAutoTranslate } from "@/hooks/useTranslate";

const statusConfig = {
  aguardando: { 
    icon: Clock, 
    color: "bg-blue-100 text-blue-700 border-blue-200",
    label: "Aguardando"
  },
  chamado: { 
    icon: AlertCircle, 
    color: "bg-amber-100 text-amber-700 border-amber-200",
    label: "Chamado"
  },
  atendendo: { 
    icon: Clock, 
    color: "bg-purple-100 text-purple-700 border-purple-200",
    label: "Atendendo"
  },
  concluido: { 
    icon: CheckCircle2, 
    color: "bg-green-100 text-green-700 border-green-200",
    label: "Concluído"
  },
  cancelado: { 
    icon: XCircle, 
    color: "bg-red-100 text-red-700 border-red-200",
    label: "Cancelado"
  }
};

export default function MyTicketsPage() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("ativas");
  const queryClient = useQueryClient();

  const txtWaiting = useAutoTranslate('Aguardando', 'pt');
  const txtCalled = useAutoTranslate('Chamado', 'pt');
  const txtServing = useAutoTranslate('Atendendo', 'pt');
  const txtCompleted = useAutoTranslate('Concluído', 'pt');
  const txtCancelled = useAutoTranslate('Cancelado', 'pt');
  const txtCompany = useAutoTranslate('Empresa', 'pt');
  const txtQueue = useAutoTranslate('Fila', 'pt');
  const txtTicket = useAutoTranslate('Senha', 'pt');
  const txtPosition = useAutoTranslate('Posição', 'pt');
  const txtEstimatedTime = useAutoTranslate('Tempo Estimado', 'pt');
  const txtMin = useAutoTranslate('min', 'pt');
  const txtActiveTickets = useAutoTranslate('Senhas Ativas', 'pt');
  const txtTicketHistory = useAutoTranslate('Histórico', 'pt');
  const txtNoActiveTickets = useAutoTranslate('Não tens senhas ativas no momento.', 'pt');
  const txtNoHistoricTickets = useAutoTranslate('Sem histórico de senhas.', 'pt');
  const txtExploreBusinesses = useAutoTranslate('Explorar Empresas', 'pt');
  const txtMyTickets = useAutoTranslate('Minhas Senhas', 'pt');
  const txtTrackRealtime = useAutoTranslate('Acompanhe todas as suas senhas em tempo real', 'pt');
  const txtActive = useAutoTranslate('Ativas', 'pt');
  const txtNoActiveTicketsTitle = useAutoTranslate('Nenhuma senha ativa', 'pt');
  const txtNoActiveTicketsDesc = useAutoTranslate('Você não possui senhas aguardando atendimento', 'pt');
  const txtNoHistoricTitle = useAutoTranslate('Sem histórico', 'pt');
  const txtNoHistoricDesc = useAutoTranslate('Você ainda não possui histórico de senhas', 'pt');
  const txtCreatedAt = useAutoTranslate('Criado em', 'pt');
  const txtAt = useAutoTranslate('às', 'pt');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => base44.auth.redirectToLogin());
  }, []);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['my-tickets', user?.email],
    queryFn: () => user ? base44.entities.Ticket.filter({ user_email: user.email }, '-created_date') : [],
    enabled: !!user,
    initialData: [],
    refetchInterval: 5000,
  });

  const { data: businesses } = useQuery({
    queryKey: ['businesses-for-tickets'],
    queryFn: () => base44.entities.Business.list(),
    initialData: [],
  });

  const { data: queues } = useQuery({
    queryKey: ['queues-for-tickets'],
    queryFn: () => base44.entities.Queue.filter({}),
    initialData: [],
  });

  const expireTicketsMutation = useMutation({
    mutationFn: async (ticketIds) => {
      for (const ticketId of ticketIds) {
        await base44.entities.Ticket.update(ticketId, {
          status: 'cancelado',
          completed_at: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
    }
  });

  useEffect(() => {
    if (!tickets.length || !queues.length) return;

    const checkExpiredTickets = async () => {
      const now = new Date();
      const expiredTicketIds = [];

      for (const ticket of tickets) {
        if (!['aguardando', 'chamado'].includes(ticket.status)) continue;

        const queue = queues.find(q => q.id === ticket.queue_id);
        if (!queue) continue;

        if (ticket.status === 'chamado' && ticket.called_at) {
          const calledAt = new Date(ticket.called_at);
          const toleranceMs = (queue.tolerance_time || 15) * 60 * 1000;
          if (now - calledAt > toleranceMs) {
            expiredTicketIds.push(ticket.id);
          }
        }

        if (ticket.status === 'aguardando') {
          const currentNumber = queue.current_number;
          if (ticket.ticket_number < currentNumber) {
            expiredTicketIds.push(ticket.id);
          }
        }
      }

      if (expiredTicketIds.length > 0) {
        expireTicketsMutation.mutate(expiredTicketIds);
      }
    };

    checkExpiredTickets();
    const interval = setInterval(checkExpiredTickets, 5000);

    return () => clearInterval(interval);
  }, [tickets, queues, expireTicketsMutation]);

  const activeTickets = tickets.filter(t => ['aguardando', 'chamado', 'atendendo'].includes(t.status));
  const historicTickets = tickets.filter(t => ['concluido', 'cancelado'].includes(t.status));

  const getBusinessName = (businessId) => {
    if (!businessId) return txtCompany;
    const business = businesses.find(b => b.id === businessId || String(b.id) === String(businessId));
    return business?.name || txtCompany;
  };

  const getQueueName = (queueId) => {
    if (!queueId) return txtQueue;
    const queue = queues.find(q => q.id === queueId || String(q.id) === String(queueId));
    return queue?.name || txtQueue;
  };

  const TicketCard = ({ ticket }) => {
    const [now, setNow] = useState(new Date());
    const status = statusConfig[ticket.status];
    const StatusIcon = status.icon;
    const queue = queues.find(q => q.id === ticket.queue_id);
    const position = queue ? (ticket.ticket_number - queue.current_number) : 0;
    
    const elapsedMinutes = Math.floor((now - new Date(ticket.created_date)) / (1000 * 60));
    const baseEstimatedTime = queue ? (position * queue.average_service_time) : 0;
    const estimatedTime = Math.max(0, baseEstimatedTime - elapsedMinutes);

    useEffect(() => {
      const interval = setInterval(() => {
        setNow(new Date());
      }, 60000);
      return () => clearInterval(interval);
    }, []);

    return (
      <Link to={createPageUrl(`TicketView?id=${ticket.id}`)}>
        <Card className="hover:shadow-xl transition-all duration-300 border-0 cursor-pointer">
          <CardContent className="p-4 sm:p-6">
            <div className="flex justify-between items-start mb-3 sm:mb-4 gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-xl sm:text-2xl text-slate-900 mb-1">
                  {txtTicket} #{ticket.ticket_number}
                </h3>
                <p className="text-sm sm:text-base text-slate-600 font-medium truncate">{getBusinessName(ticket.business_id)}</p>
                <p className="text-xs sm:text-sm text-slate-500 truncate">{getQueueName(ticket.queue_id)}</p>
              </div>
              <Badge className={`${status.color} text-xs sm:text-sm flex-shrink-0`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {ticket.status === 'aguardando' && txtWaiting}
                {ticket.status === 'chamado' && txtCalled}
                {ticket.status === 'atendendo' && txtServing}
                {ticket.status === 'concluido' && txtCompleted}
                {ticket.status === 'cancelado' && txtCancelled}
              </Badge>
            </div>

            {ticket.status === 'aguardando' && (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="p-2.5 sm:p-3 bg-blue-50 rounded-lg">
                  <div className="text-xs text-slate-600 mb-1">{txtPosition}</div>
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">#{position > 0 ? position : '...'}</div>
                </div>
                <div className="p-2.5 sm:p-3 bg-purple-50 rounded-lg">
                  <div className="text-xs text-slate-600 mb-1">{txtEstimatedTime}</div>
                  <div className="text-xl sm:text-2xl font-bold text-purple-600">~{estimatedTime > 0 ? estimatedTime : '...'}{txtMin}</div>
                </div>
              </div>
            )}

            <div className="text-xs text-slate-500">
              {txtCreatedAt} {new Date(ticket.created_date).toLocaleDateString('pt-PT')} {txtAt} {new Date(ticket.created_date).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

  if (!user) {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 flex items-center justify-center px-4 sm:px-6 py-8">
        <Card className="p-6 sm:p-8 text-center">
          <Skeleton className="h-10 sm:h-12 w-40 sm:w-48 mx-auto mb-4" />
          <Skeleton className="h-4 w-56 sm:w-64 mx-auto" />
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-2 sm:mb-3">
            {txtMyTickets}
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-600">
            {txtTrackRealtime}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="bg-white border border-slate-200 p-1">
            <TabsTrigger 
              value="ativas"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-sky-500 data-[state=active]:to-blue-600 data-[state=active]:text-white"
            >
              <Clock className="w-4 h-4 mr-2" />
              {txtActive} ({activeTickets.length})
            </TabsTrigger>
            <TabsTrigger 
              value="historico"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-sky-500 data-[state=active]:to-blue-600 data-[state=active]:text-white"
            >
              <TicketIcon className="w-4 h-4 mr-2" />
              {txtTicketHistory} ({historicTickets.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ativas" className="mt-4 sm:mt-6">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {[1, 2].map(i => (
                  <Skeleton key={i} className="h-44 sm:h-48 w-full rounded-xl" />
                ))}
              </div>
            ) : activeTickets.length === 0 ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="py-12 sm:py-16 text-center px-4 sm:px-6">
                  <div className="text-5xl sm:text-6xl mb-4">🎫</div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">{txtNoActiveTicketsTitle}</h3>
                  <p className="text-sm sm:text-base text-slate-600 mb-6">{txtNoActiveTicketsDesc}</p>
                  <Link to={createPageUrl("Businesses")}>
                    <button className="px-5 sm:px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl hover:from-sky-600 hover:to-blue-700 min-h-[44px] text-sm sm:text-base">
                      {txtExploreBusinesses}
                    </button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {activeTickets.map(ticket => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="historico" className="mt-4 sm:mt-6">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Skeleton key={i} className="h-36 sm:h-40 w-full rounded-xl" />
                ))}
              </div>
            ) : historicTickets.length === 0 ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="py-12 sm:py-16 text-center px-4 sm:px-6">
                  <div className="text-5xl sm:text-6xl mb-4">📋</div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">{txtNoHistoricTitle}</h3>
                  <p className="text-sm sm:text-base text-slate-600">{txtNoHistoricDesc}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {historicTickets.map(ticket => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}