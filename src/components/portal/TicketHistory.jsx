import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Clock, MapPin, Star, Eye, Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { pt, enUS, de, es, fr, it, nl, pl, sv, da, nb, fi, cs, el, ro, hu, bg, hr, sk, sl, is, ja, th } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/useConfirm";
import { useAutoTranslate } from "@/hooks/useTranslate";

export default function TicketHistory({ user }) {
  const { i18n } = useTranslation();
  
  const txtWaiting = useAutoTranslate('Aguardando', 'pt');
  const txtCalled = useAutoTranslate('Chamado', 'pt');
  const txtServing = useAutoTranslate('Em Atendimento', 'pt');
  const txtCompleted = useAutoTranslate('Concluído', 'pt');
  const txtCancelled = useAutoTranslate('Cancelado', 'pt');
  const txtTicketRemoved = useAutoTranslate('senha removida', 'pt');
  const txtTicketsRemoved = useAutoTranslate('senhas removidas', 'pt');
  const txtErrorClearHistory = useAutoTranslate('Erro ao limpar histórico', 'pt');
  const txtClearTicketHistory = useAutoTranslate('Limpar Histórico de Senhas', 'pt');
  const txtConfirmClearTickets = useAutoTranslate('Tem a certeza que deseja limpar', 'pt');
  const txtConfirmClearAction = useAutoTranslate('Sim, limpar histórico', 'pt');
  const txtCancel = useAutoTranslate('Cancelar', 'pt');
  const txtBusiness = useAutoTranslate('Empresa', 'pt');
  const txtQueue = useAutoTranslate('Fila', 'pt');
  const txtPosition = useAutoTranslate('Posição', 'pt');
  const txtEstimatedTime = useAutoTranslate('Tempo estimado', 'pt');
  const txtMinutes = useAutoTranslate('min', 'pt');
  const txtYourRating = useAutoTranslate('A sua avaliação', 'pt');
  const txtViewDetails = useAutoTranslate('Ver Detalhes', 'pt');
  const txtActive = useAutoTranslate('Ativas', 'pt');
  const txtHistory = useAutoTranslate('Histórico', 'pt');
  const txtNoActiveTickets = useAutoTranslate('Sem senhas ativas', 'pt');
  const txtGetTicketPrompt = useAutoTranslate('Tire uma senha para aparecer aqui', 'pt');
  const txtNoHistory = useAutoTranslate('Sem histórico', 'pt');
  const txtCompletedTicketsAppearHere = useAutoTranslate('As senhas concluídas aparecerão aqui', 'pt');
  const txtClearing = useAutoTranslate('A limpar...', 'pt');
  const txtClearHistory = useAutoTranslate('Limpar Histórico', 'pt');
  const txtToleranceTime = useAutoTranslate('Tolerância', 'pt');
  const txtYouWillBeCalled = useAutoTranslate('Será chamado', 'pt');
  
  const getDateLocale = () => {
    const lang = i18n.language.split('-')[0];
    const localeMap = { 
      pt, en: enUS, de, es, fr, it, nl, pl, sv, da, no: nb, fi, cs, el, ro, hu, bg, hr, sk, sl, is, ja, th
    };
    return localeMap[lang] || enUS;
  };
  
  const statusConfig = {
    aguardando: { icon: Clock, color: "bg-blue-100 text-blue-700 border-blue-200", label: txtWaiting },
    chamado: { icon: Clock, color: "bg-amber-100 text-amber-700 border-amber-200", label: txtCalled },
    atendendo: { icon: Loader2, color: "bg-purple-100 text-purple-700 border-purple-200", label: txtServing },
    concluido: { icon: Star, color: "bg-green-100 text-green-700 border-green-200", label: txtCompleted },
    cancelado: { icon: Clock, color: "bg-red-100 text-red-700 border-red-200", label: txtCancelled }
  };
  const queryClient = useQueryClient();
  const { ConfirmDialog, confirm } = useConfirm();

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['customer-tickets', user?.email],
    queryFn: () => base44.entities.Ticket.filter({ user_email: user.email }, '-created_date'),
    initialData: [],
    refetchInterval: 5000,
    enabled: !!user?.email,
  });

  const { data: businesses } = useQuery({
    queryKey: ['businesses-list'],
    queryFn: () => base44.entities.Business.list(),
    initialData: [],
  });

  const { data: queues } = useQuery({
    queryKey: ['queues-list'],
    queryFn: () => base44.entities.Queue.list(),
    initialData: [],
  });

  const expireTicketsMutation = useMutation({
    mutationFn: async (ticketIds) => {
      for (const ticketId of ticketIds) {
        await base44.entities.Ticket.update(ticketId, {
          status: 'concluido',
          completed_at: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-tickets'] });
    }
  });

  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      const ticketsToDelete = tickets.filter(t => 
        t && ['concluido', 'cancelado'].includes(t.status)
      );
      
      for (const ticket of ticketsToDelete) {
        await base44.entities.Ticket.delete(ticket.id);
      }
      
      return ticketsToDelete.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['customer-tickets'] });
      const message = count === 1 ? txtTicketRemoved : txtTicketsRemoved;
      toast.success(`${count} ${message}`);
    },
    onError: () => {
      toast.error(txtErrorClearHistory);
    }
  });

  const handleClearHistory = async () => {
    const confirmed = await confirm({
      title: txtClearTicketHistory,
      description: `${txtConfirmClearTickets} ${historyTickets.length} senhas?`,
      confirmText: txtConfirmClearAction,
      cancelText: txtCancel
    });

    if (confirmed) {
      clearHistoryMutation.mutate();
    }
  };

  useEffect(() => {
    if (!tickets?.length || !queues?.length) return;

    const checkExpiredTickets = async () => {
      const now = new Date();
      const expiredTicketIds = [];

      for (const ticket of tickets) {
        if (!ticket || !['aguardando', 'chamado', 'atendendo'].includes(ticket.status)) continue;

        const queue = queues.find(q => q && q.id === ticket.queue_id);
        if (!queue) continue;

        if (ticket.status === 'chamado' && ticket.called_at) {
          const calledAt = new Date(ticket.called_at);
          const toleranceMs = (queue.tolerance_time || 15) * 60 * 1000;
          if (now - calledAt > toleranceMs) {
            expiredTicketIds.push(ticket.id);
          }
        }

        if (ticket.status === 'aguardando' && ticket.ticket_number < queue.current_number) {
          expiredTicketIds.push(ticket.id);
        }

        if (ticket.status === 'atendendo' && ticket.called_at) {
          const startedAt = new Date(ticket.called_at);
          const serviceTimeMs = (queue.average_service_time || 10) * 60 * 1000;
          const toleranceMs = (queue.tolerance_time || 15) * 60 * 1000;
          const totalAllowedMs = serviceTimeMs + toleranceMs;
          
          if (now - startedAt > totalAllowedMs) {
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

  const activeTickets = tickets.filter(t => t && ['aguardando', 'chamado', 'atendendo'].includes(t.status));
  const historyTickets = tickets.filter(t => t && ['concluido', 'cancelado'].includes(t.status));

  const getBusinessName = (businessId) => {
    if (!businessId) return txtBusiness;
    const business = businesses.find(b => b && (b.id === businessId || String(b.id) === String(businessId)));
    return business?.name || txtBusiness;
  };

  const getQueueName = (queueId) => {
    if (!queueId) return txtQueue;
    const queue = queues.find(q => q && (q.id === queueId || String(q.id) === String(queueId)));
    return queue?.name || txtQueue;
  };

  const TicketCard = ({ ticket }) => {
    if (!ticket) return null;
    
    const status = statusConfig[ticket.status];
    const StatusIcon = status.icon;
    const queue = queues.find(q => q && q.id === ticket.queue_id);
    const toleranceTime = queue?.tolerance_time || 0;

    return (
      <Card className="border-0 shadow-lg hover:shadow-xl transition-all">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="text-4xl font-bold text-sky-600 mb-1">
                #{ticket.ticket_number}
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin className="w-4 h-4" />
                <span className="font-semibold">{getBusinessName(ticket.business_id)}</span>
              </div>
              <p className="text-sm text-slate-500">{getQueueName(ticket.queue_id)}</p>
            </div>
            <Badge className={status.color}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {status.label}
            </Badge>
          </div>

          {ticket.status === 'aguardando' && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">{txtPosition}:</span> {ticket.position || '...'}
              </p>
              <p className="text-sm text-blue-800">
                <span className="font-semibold">{txtEstimatedTime}:</span> ~{ticket.estimated_time || '...'} {txtMinutes}
              </p>
              {toleranceTime > 0 && (
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">{txtToleranceTime}:</span> {toleranceTime} {txtMinutes}
                </p>
              )}
            </div>
          )}

          {ticket.status === 'chamado' && (
            <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-800 font-semibold">
                🔔 {txtYouWillBeCalled}!
              </p>
              {toleranceTime > 0 && (
                <p className="text-xs text-amber-700 mt-1">
                  {txtToleranceTime}: {toleranceTime} {txtMinutes}
                </p>
              )}
            </div>
          )}

          {ticket.rating && (
            <div className="mb-4 flex items-center gap-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${star <= ticket.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                  />
                ))}
              </div>
              <span className="text-sm text-slate-600">{txtYourRating}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-4 border-t">
            <span className="text-xs text-slate-500">
              {format(new Date(ticket.created_date), "dd MMMM, HH:mm", { locale: getDateLocale() })}
            </span>
            <Link to={createPageUrl(`TicketView?id=${ticket.id}`)}>
              <Button size="sm" variant="outline">
                <Eye className="w-4 h-4 mr-2" />
                {txtViewDetails}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-64" />)}
      </div>
    );
  }

  return (
    <Tabs defaultValue="active">
      <TabsList className="bg-white border border-slate-200 mb-6">
        <TabsTrigger value="active">
          {txtActive} ({activeTickets.length})
        </TabsTrigger>
        <TabsTrigger value="history">
          {txtHistory} ({historyTickets.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="active">
        {activeTickets.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-16 text-center">
              <Clock className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                {txtNoActiveTickets}
              </h3>
              <p className="text-slate-600">
                {txtGetTicketPrompt}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {activeTickets.map(ticket => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="history">
        {historyTickets.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-16 text-center">
              <Clock className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                {txtNoHistory}
              </h3>
              <p className="text-slate-600">
                {txtCompletedTicketsAppearHere}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearHistory}
                disabled={clearHistoryMutation.isPending}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {clearHistoryMutation.isPending ? txtClearing : txtClearHistory}
              </Button>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {historyTickets.map(ticket => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))}
            </div>
          </div>
        )}
      </TabsContent>
      <ConfirmDialog />
    </Tabs>
  );
}