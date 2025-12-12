import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Search,
  Clock, 
  CheckCircle2,
  XCircle,
  Calendar,
  User,
  Phone,
  Hash,
  TrendingUp,
  Award,
  Filter,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/useConfirm";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAutoTranslate } from "@/hooks/useTranslate";

export default function TicketHistory({ businessId }) {
  // Traduções
  const txtCompleted = useAutoTranslate('Concluído', 'pt');
  const txtCancelled = useAutoTranslate('Cancelado', 'pt');
  const txtSearch = useAutoTranslate('Pesquisar...', 'pt');
  const txtAll = useAutoTranslate('Todos', 'pt');
  const txtClearHistory = useAutoTranslate('Limpar Histórico', 'pt');
  const txtClearHistoryTitle = useAutoTranslate('Limpar Histórico de Senhas', 'pt');
  const txtConfirmClear = useAutoTranslate('Tem certeza que deseja remover todas as', 'pt');
  const txtSenhas = useAutoTranslate('senhas do histórico? Esta ação não pode ser desfeita.', 'pt');
  const txtYesClear = useAutoTranslate('Sim, limpar histórico', 'pt');
  const txtCancel = useAutoTranslate('Cancelar', 'pt');
  const txtTicketRemoved = useAutoTranslate('senha removida', 'pt');
  const txtTicketsRemoved = useAutoTranslate('senhas removidas', 'pt');
  const txtFromHistory = useAutoTranslate('do histórico', 'pt');
  const txtErrorClearingHistory = useAutoTranslate('Erro ao limpar histórico', 'pt');
  const txtNoHistory = useAutoTranslate('Sem histórico', 'pt');
  const txtNoTicketsFound = useAutoTranslate('Nenhuma senha encontrada', 'pt');
  const txtCompletedTicketsAppearHere = useAutoTranslate('Senhas concluídas aparecerão aqui', 'pt');
  const txtAdjustFilters = useAutoTranslate('Tente ajustar os filtros', 'pt');
  const txtTicket = useAutoTranslate('senha', 'pt');
  const txtTickets = useAutoTranslate('senhas', 'pt');
  const txtClearing = useAutoTranslate('Limpando...', 'pt');
  const txtClear = useAutoTranslate('Limpar', 'pt');
  const txtCompletedFilter = useAutoTranslate('Concluídos', 'pt');
  const txtCancelledFilter = useAutoTranslate('Cancelados', 'pt');
  const txtQueue = useAutoTranslate('Fila', 'pt');
  const txtStatus = useAutoTranslate('Estado', 'pt');
  const txtLoadingHistory = useAutoTranslate('Carregando histórico...', 'pt');
  const txtAttended = useAutoTranslate('Atendidas', 'pt');
  const txtCancelledLabel = useAutoTranslate('Canceladas', 'pt');
  const txtTime = useAutoTranslate('Tempo (min)', 'pt');
  const txtSearchPlaceholder = useAutoTranslate('Procurar...', 'pt');
  const txtFilter = useAutoTranslate('Filtrar', 'pt');

  const statusConfig = {
    concluido: { 
      icon: CheckCircle2, 
      color: "bg-green-100 text-green-700 border-green-200", 
      label: txtCompleted 
    },
    cancelado: { 
      icon: XCircle, 
      color: "bg-red-100 text-red-700 border-red-200", 
      label: txtCancelled 
    }
  };
  const queryClient = useQueryClient();
  const { ConfirmDialog, confirm } = useConfirm();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['business-ticket-history', businessId],
    queryFn: () => base44.entities.Ticket.filter({ 
      business_id: businessId,
      status: { $in: ['concluido', 'cancelado'] }
    }, '-completed_at'),
    initialData: [],
    enabled: !!businessId,
  });

  const { data: queues = [] } = useQuery({
    queryKey: ['business-queues', businessId],
    queryFn: () => base44.entities.Queue.filter({ business_id: businessId }),
    initialData: [],
    enabled: !!businessId,
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
      queryClient.invalidateQueries({ queryKey: ['business-ticket-history'] });
      queryClient.invalidateQueries({ queryKey: ['business-tickets'] });
      toast.success(`${count} ${count === 1 ? txtTicketRemoved : txtTicketsRemoved} ${txtFromHistory}`);
    },
    onError: () => {
      toast.error(txtErrorClearingHistory);
    }
  });

  const handleClearHistory = async () => {
    const confirmed = await confirm({
      title: txtClearHistoryTitle,
      description: `${txtConfirmClear} ${tickets.length} ${txtSenhas}`,
      confirmText: txtYesClear,
      cancelText: txtCancel
    });

    if (confirmed) {
      clearHistoryMutation.mutate();
    }
  };

  const getQueueName = (queueId) => {
    return queues.find(q => q && q.id === queueId)?.name || 'Fila';
  };

  const filteredTickets = tickets.filter(ticket => {
    if (!ticket) return false;

    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;

    if (!searchTerm) return matchesStatus;

    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      ticket.ticket_number?.toString().includes(searchLower) ||
      ticket.user_email?.toLowerCase().includes(searchLower) ||
      ticket.user_phone?.toLowerCase().includes(searchLower) ||
      ticket.manual_name?.toLowerCase().includes(searchLower) ||
      getQueueName(ticket.queue_id).toLowerCase().includes(searchLower);

    return matchesStatus && matchesSearch;
  });

  const completedTickets = tickets.filter(t => t?.status === 'concluido');
  const cancelledTickets = tickets.filter(t => t?.status === 'cancelado');

  const ticketsWithTimestamps = completedTickets.filter(t => t?.called_at && t?.completed_at);
  
  const averageServiceTime = ticketsWithTimestamps.length > 0
    ? Math.round(
        ticketsWithTimestamps.reduce((sum, t) => {
          const start = new Date(t.called_at);
          const end = new Date(t.completed_at);
          const minutes = (end - start) / 1000 / 60;
          return sum + minutes;
        }, 0) / ticketsWithTimestamps.length
      )
    : 0;

  if (isLoading) {
    return (
      <div className="p-4 text-center text-slate-600">
        <Clock className="w-8 h-8 mx-auto mb-2 animate-spin" />
        <p className="text-sm">{txtLoadingHistory}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-slate-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-full">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">{completedTickets.length}</p>
                <p className="text-xs text-slate-600">{txtAttended}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-100 rounded-full">
                <XCircle className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">{cancelledTickets.length}</p>
                <p className="text-xs text-slate-600">{txtCancelledLabel}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-full">
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">{averageServiceTime}</p>
                <p className="text-xs text-slate-600">{txtTime}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
              <Input
                placeholder={txtSearchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-32 h-8 text-xs">
                <Filter className="w-3 h-3 mr-1" />
                <SelectValue placeholder={txtFilter} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{txtAll}</SelectItem>
                <SelectItem value="concluido">{txtCompletedFilter}</SelectItem>
                <SelectItem value="cancelado">{txtCancelledFilter}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {filteredTickets.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-8 text-center">
            <Clock className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {searchTerm || statusFilter !== "all" 
                ? txtNoTicketsFound
                : txtNoHistory
              }
            </h3>
            <p className="text-sm text-slate-600">
              {searchTerm || statusFilter !== "all"
                ? txtAdjustFilters
                : txtCompletedTicketsAppearHere
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-600">
              {filteredTickets.length} {filteredTickets.length === 1 ? txtTicket : txtTickets}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearHistory}
              disabled={clearHistoryMutation.isPending || tickets.length === 0}
              className="border-red-200 text-red-600 hover:bg-red-50 h-7 text-xs"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              {clearHistoryMutation.isPending ? txtClearing : txtClear}
            </Button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredTickets.map(ticket => {
              if (!ticket) return null;
              
              const status = statusConfig[ticket.status];
              const StatusIcon = status.icon;

              return (
                <Card key={ticket.id} className="border-slate-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Hash className="w-3 h-3 text-slate-400" />
                          <span className="text-xl font-bold text-sky-600">
                            {ticket.ticket_number}
                          </span>
                        </div>
                        <Badge className={`${status.color} text-xs`}>
                          <StatusIcon className="w-2.5 h-2.5 mr-1" />
                          {status.label}
                        </Badge>
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Award className="w-3 h-3" />
                          <span className="font-semibold">{getQueueName(ticket.queue_id)}</span>
                        </div>

                        {ticket.is_manual && ticket.manual_name && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <User className="w-3 h-3" />
                            <span>{ticket.manual_name}</span>
                            <Badge variant="outline" className="text-xs">Manual</Badge>
                          </div>
                        )}

                        {!ticket.is_manual && ticket.user_email && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <User className="w-3 h-3" />
                            <span className="truncate">{ticket.user_email}</span>
                          </div>
                        )}

                        {ticket.user_phone && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Phone className="w-3 h-3" />
                            <span>{ticket.user_phone}</span>
                          </div>
                        )}

                        {ticket.completed_at && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {(() => {
                                try {
                                  const date = new Date(ticket.completed_at);
                                  if (isNaN(date.getTime())) return 'Data não disponível';
                                  return format(date, "dd/MM/yyyy HH:mm", { locale: pt });
                                } catch (e) {
                                  return 'Data não disponível';
                                }
                              })()}
                            </span>
                          </div>
                        )}

                        {ticket.status === 'concluido' && ticket.called_at && ticket.completed_at && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Clock className="w-3 h-3" />
                            <span>
                              {(() => {
                                try {
                                  const completedDate = new Date(ticket.completed_at);
                                  const calledDate = new Date(ticket.called_at);
                                  if (isNaN(completedDate.getTime()) || isNaN(calledDate.getTime())) {
                                    return 'Tempo não disponível';
                                  }
                                  const minutes = Math.round((completedDate - calledDate) / 1000 / 60);
                                  return `Atendimento: ${minutes} min`;
                                } catch (e) {
                                  return 'Tempo não disponível';
                                }
                              })()}
                            </span>
                          </div>
                        )}

                        {ticket.rating && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <span className="text-xs">Avaliação:</span>
                            <span className="text-sm font-bold text-amber-600">{ticket.rating}/5</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
      <ConfirmDialog />
    </div>
  );
}
