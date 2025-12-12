import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import PageHeader from "../components/shared/PageHeader";
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

export default function BusinessTicketHistoryPage() {
  const txtCompleted = useAutoTranslate('Concluído', 'pt');
  const txtCancelled = useAutoTranslate('Cancelado', 'pt');
  const txtSubscriptionRequired = useAutoTranslate('Subscrição Necessária', 'pt');
  const txtSubscriptionMessage = useAutoTranslate('Para aceder ao histórico de senhas, precisa de ativar o plano empresarial.', 'pt');
  const txtPageTitle = useAutoTranslate('Histórico de Senhas', 'pt');
  const txtPageSubtitle = useAutoTranslate('Consulte o histórico completo de atendimentos', 'pt');
  const txtAttended = useAutoTranslate('Atendidas', 'pt');
  const txtCancelledLabel = useAutoTranslate('Canceladas', 'pt');
  const txtAvgTime = useAutoTranslate('Tempo Médio (min)', 'pt');
  const txtSearchTickets = useAutoTranslate('Pesquisar Senhas', 'pt');
  const txtSearchPlaceholder = useAutoTranslate('Procurar por número, nome, telefone, email ou fila...', 'pt');
  const txtFilterByStatus = useAutoTranslate('Filtrar por status', 'pt');
  const txtAll = useAutoTranslate('Todos', 'pt');
  const txtCompletedFilter = useAutoTranslate('Concluídos', 'pt');
  const txtCancelledFilter = useAutoTranslate('Cancelados', 'pt');
  const txtNoTicketFound = useAutoTranslate('Nenhuma senha encontrada', 'pt');
  const txtNoHistory = useAutoTranslate('Sem histórico', 'pt');
  const txtAdjustFilters = useAutoTranslate('Tente ajustar os filtros de pesquisa', 'pt');
  const txtHistoryWillAppear = useAutoTranslate('O histórico de senhas concluídas aparecerá aqui', 'pt');
  const txtTicket = useAutoTranslate('senha', 'pt');
  const txtTickets = useAutoTranslate('senhas', 'pt');
  const txtFound = useAutoTranslate('encontradas', 'pt');
  const txtClearHistory = useAutoTranslate('Limpar Histórico', 'pt');
  const txtClearing = useAutoTranslate('Limpando...', 'pt');
  const txtClearHistoryTitle = useAutoTranslate('Limpar Histórico de Senhas', 'pt');
  const txtConfirmClear = useAutoTranslate('Tem certeza que deseja remover todas as', 'pt');
  const txtFromHistory = useAutoTranslate('senhas do histórico? Esta ação não pode ser desfeita.', 'pt');
  const txtYesClear = useAutoTranslate('Sim, limpar histórico', 'pt');
  const txtCancel = useAutoTranslate('Cancelar', 'pt');
  const txtTicketRemoved = useAutoTranslate('senha removida', 'pt');
  const txtTicketsRemoved = useAutoTranslate('senhas removidas', 'pt');
  const txtFromHistoryMsg = useAutoTranslate('do histórico', 'pt');
  const txtErrorClearing = useAutoTranslate('Erro ao limpar histórico', 'pt');
  const txtQueue = useAutoTranslate('Fila', 'pt');
  const txtManual = useAutoTranslate('Manual', 'pt');
  const txtDateNotAvailable = useAutoTranslate('Data não disponível', 'pt');
  const txtServiceTime = useAutoTranslate('Tempo de atendimento:', 'pt');
  const txtTimeNotAvailable = useAutoTranslate('Tempo não disponível', 'pt');
  const txtRating = useAutoTranslate('Avaliação', 'pt');

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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { ConfirmDialog, confirm } = useConfirm();
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    base44.auth.me().then(userData => {
      setUser(userData);
      if (!userData.is_business_user || !userData.business_id) {
        navigate(createPageUrl("Home"));
      }
    }).catch(() => base44.auth.redirectToLogin());
  }, [navigate]);

  const hasSubscription = user?.has_business_subscription;

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['business-ticket-history', user?.business_id],
    queryFn: () => base44.entities.Ticket.filter({ 
      business_id: user.business_id,
      status: { $in: ['concluido', 'cancelado'] }
    }, '-completed_at'),
    initialData: [],
    enabled: !!user?.business_id && hasSubscription,
  });

  const { data: queues } = useQuery({
    queryKey: ['business-queues', user?.business_id],
    queryFn: () => base44.entities.Queue.filter({ business_id: user.business_id }),
    initialData: [],
    enabled: !!user?.business_id,
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
      toast.success(`${count} ${count === 1 ? txtTicketRemoved : txtTicketsRemoved} ${txtFromHistoryMsg}`);
    },
    onError: () => {
      toast.error(txtErrorClearing);
    }
  });

  const handleClearHistory = async () => {
    const confirmed = await confirm({
      title: txtClearHistoryTitle,
      description: `${txtConfirmClear} ${tickets.length} ${txtFromHistory}`,
      confirmText: txtYesClear,
      cancelText: txtCancel
    });

    if (confirmed) {
      clearHistoryMutation.mutate();
    }
  };

  if (!user || isLoading) {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 p-4">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-16 w-64 mb-8" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!hasSubscription) {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Card className="border-0 shadow-2xl">
            <CardContent className="p-12 text-center">
              <Clock className="w-16 h-16 text-amber-600 mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                {txtSubscriptionRequired}
              </h2>
              <p className="text-lg text-slate-600 mb-8">
                {txtSubscriptionMessage}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getQueueName = (queueId) => {
    return queues.find(q => q && q.id === queueId)?.name || txtQueue;
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

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <PageHeader
          title={txtPageTitle}
          subtitle={txtPageSubtitle}
          backTo="BusinessDashboard"
        />

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{completedTickets.length}</p>
                  <p className="text-sm text-slate-600">{txtAttended}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{cancelledTickets.length}</p>
                  <p className="text-sm text-slate-600">{txtCancelledLabel}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{averageServiceTime}</p>
                  <p className="text-sm text-slate-600">{txtAvgTime}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-xl mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              {txtSearchTickets}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder={txtSearchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder={txtFilterByStatus} />
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
          <Card className="border-0 shadow-lg">
            <CardContent className="py-16 text-center">
              <Clock className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                {searchTerm || statusFilter !== "all" 
                  ? txtNoTicketFound
                  : txtNoHistory
                }
              </h3>
              <p className="text-slate-600">
                {searchTerm || statusFilter !== "all"
                  ? txtAdjustFilters
                  : txtHistoryWillAppear
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-slate-600">
                {filteredTickets.length} {filteredTickets.length === 1 ? txtTicket : txtTickets} {txtFound}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearHistory}
                disabled={clearHistoryMutation.isPending || tickets.length === 0}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {clearHistoryMutation.isPending ? txtClearing : txtClearHistory}
              </Button>
            </div>

            <div className="grid gap-4">
              {filteredTickets.map(ticket => {
                if (!ticket) return null;
                
                const status = statusConfig[ticket.status];
                const StatusIcon = status.icon;

                return (
                  <Card key={ticket.id} className="border-0 shadow-lg hover:shadow-xl transition-all">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              <Hash className="w-4 h-4 text-slate-400" />
                              <span className="text-3xl font-bold text-sky-600">
                                {ticket.ticket_number}
                              </span>
                            </div>
                            <Badge className={status.color}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {status.label}
                            </Badge>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-slate-600">
                              <Award className="w-4 h-4" />
                              <span className="font-semibold">{getQueueName(ticket.queue_id)}</span>
                            </div>

                            {ticket.is_manual && ticket.manual_name && (
                              <div className="flex items-center gap-2 text-slate-600">
                                <User className="w-4 h-4" />
                                <span>{ticket.manual_name}</span>
                                <Badge variant="outline" className="text-xs">{txtManual}</Badge>
                              </div>
                            )}

                            {!ticket.is_manual && ticket.user_email && (
                              <div className="flex items-center gap-2 text-slate-600">
                                <User className="w-4 h-4" />
                                <span>{ticket.user_email}</span>
                              </div>
                            )}

                            {ticket.user_phone && (
                              <div className="flex items-center gap-2 text-slate-600">
                                <Phone className="w-4 h-4" />
                                <span>{ticket.user_phone}</span>
                              </div>
                            )}

                            {ticket.completed_at && (
                              <div className="flex items-center gap-2 text-slate-600">
                                <Calendar className="w-4 h-4" />
                                <span>
                                  {(() => {
                                    try {
                                      const date = new Date(ticket.completed_at);
                                      if (isNaN(date.getTime())) return txtDateNotAvailable;
                                      return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: pt });
                                    } catch (e) {
                                      console.warn('Erro ao formatar data de conclusão:', e);
                                      return txtDateNotAvailable;
                                    }
                                  })()}
                                </span>
                              </div>
                            )}

                            {ticket.status === 'concluido' && ticket.called_at && ticket.completed_at && (
                              <div className="flex items-center gap-2 text-slate-600">
                                <Clock className="w-4 h-4" />
                                <span>
                                  {(() => {
                                    try {
                                      const completedDate = new Date(ticket.completed_at);
                                      const calledDate = new Date(ticket.called_at);
                                      if (isNaN(completedDate.getTime()) || isNaN(calledDate.getTime())) {
                                        return txtTimeNotAvailable;
                                      }
                                      const minutes = Math.round((completedDate - calledDate) / 1000 / 60);
                                      return `${txtServiceTime} ${minutes} min`;
                                    } catch (e) {
                                      console.warn('Erro ao calcular tempo de atendimento:', e);
                                      return txtTimeNotAvailable;
                                    }
                                  })()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {ticket.rating && (
                          <div className="flex flex-col items-end justify-center">
                            <p className="text-xs text-slate-500 mb-1">{txtRating}</p>
                            <div className="flex items-center gap-1">
                              <span className="text-2xl font-bold text-amber-600">{ticket.rating}</span>
                              <span className="text-sm text-slate-400">/5</span>
                            </div>
                          </div>
                        )}
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
    </div>
  );
}
