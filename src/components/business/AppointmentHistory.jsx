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
  AlertCircle,
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

export default function AppointmentHistory({ businessId }) {
  // Traduções
  const txtCompleted = useAutoTranslate('Concluído', 'pt');
  const txtCancelled = useAutoTranslate('Cancelado', 'pt');
  const txtNoShow = useAutoTranslate('Falta', 'pt');
  const txtSearch = useAutoTranslate('Pesquisar...', 'pt');
  const txtAll = useAutoTranslate('Todos', 'pt');
  const txtClearHistory = useAutoTranslate('Limpar Histórico', 'pt');
  const txtClearHistoryTitle = useAutoTranslate('Limpar Histórico de Marcações', 'pt');
  const txtConfirmClear = useAutoTranslate('Tem certeza que deseja remover todas as', 'pt');
  const txtAppointments = useAutoTranslate('marcações do histórico? Esta ação não pode ser desfeita.', 'pt');
  const txtYesClear = useAutoTranslate('Sim, limpar histórico', 'pt');
  const txtCancel = useAutoTranslate('Cancelar', 'pt');
  const txtAppointmentRemoved = useAutoTranslate('marcação removida', 'pt');
  const txtAppointmentsRemoved = useAutoTranslate('marcações removidas', 'pt');
  const txtFromHistory = useAutoTranslate('do histórico', 'pt');
  const txtErrorClearingHistory = useAutoTranslate('Erro ao limpar histórico', 'pt');
  const txtNoHistory = useAutoTranslate('Sem histórico', 'pt');
  const txtNoAppointmentsFound = useAutoTranslate('Nenhuma marcação encontrada', 'pt');
  const txtCompletedAppointmentsAppearHere = useAutoTranslate('Marcações concluídas aparecerão aqui', 'pt');
  const txtAdjustFilters = useAutoTranslate('Tente ajustar os filtros', 'pt');
  const txtAppointment = useAutoTranslate('marcação', 'pt');
  const txtAppointmentsCount = useAutoTranslate('marcações', 'pt');
  const txtClearing = useAutoTranslate('Limpando...', 'pt');
  const txtClear = useAutoTranslate('Limpar', 'pt');
  const txtService = useAutoTranslate('Serviço', 'pt');
  const txtStatus = useAutoTranslate('Estado', 'pt');
  const txtLoadingHistory = useAutoTranslate('Carregando histórico...', 'pt');
  const txtCompletedLabel = useAutoTranslate('Concluídas', 'pt');
  const txtCancelledLabel = useAutoTranslate('Canceladas', 'pt');
  const txtNoShows = useAutoTranslate('Faltas', 'pt');
  const txtSearchPlaceholder = useAutoTranslate('Procurar...', 'pt');
  const txtFilter = useAutoTranslate('Filtrar', 'pt');
  const txtAllLabel = useAutoTranslate('Todos', 'pt');
  const txtCompletedFilter = useAutoTranslate('Concluídos', 'pt');
  const txtCancelledFilter = useAutoTranslate('Cancelados', 'pt');
  const txtNoShowsFilter = useAutoTranslate('Faltas', 'pt');

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
    },
    falta: { 
      icon: AlertCircle, 
      color: "bg-orange-100 text-orange-700 border-orange-200", 
      label: txtNoShow 
    }
  };
  const queryClient = useQueryClient();
  const { ConfirmDialog, confirm } = useConfirm();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['business-appointment-history', businessId],
    queryFn: () => base44.entities.Appointment.filter({ 
      business_id: businessId,
      status: { $in: ['concluido', 'cancelado', 'falta'] }
    }, '-appointment_date'),
    initialData: [],
    enabled: !!businessId,
  });

  const { data: services = [] } = useQuery({
    queryKey: ['business-services', businessId],
    queryFn: () => base44.entities.Service.filter({ business_id: businessId }),
    initialData: [],
    enabled: !!businessId,
  });

  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      const appointmentsToDelete = appointments.filter(a => 
        a && ['concluido', 'cancelado', 'falta'].includes(a.status)
      );
      
      for (const appointment of appointmentsToDelete) {
        await base44.entities.Appointment.delete(appointment.id);
      }
      
      return appointmentsToDelete.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['business-appointment-history'] });
      queryClient.invalidateQueries({ queryKey: ['business-appointments'] });
      toast.success(`${count} ${count === 1 ? txtAppointmentRemoved : txtAppointmentsRemoved} ${txtFromHistory}`);
    },
    onError: () => {
      toast.error(txtErrorClearingHistory);
    }
  });

  const handleClearHistory = async () => {
    const confirmed = await confirm({
      title: txtClearHistoryTitle,
      description: `${txtConfirmClear} ${appointments.length} ${txtAppointments}`,
      confirmText: txtYesClear,
      cancelText: txtCancel
    });

    if (confirmed) {
      clearHistoryMutation.mutate();
    }
  };

  const getServiceName = (serviceId) => {
    return services.find(s => s && s.id === serviceId)?.name || 'Serviço';
  };

  const filteredAppointments = appointments.filter(appointment => {
    if (!appointment) return false;

    const matchesStatus = statusFilter === "all" || appointment.status === statusFilter;

    if (!searchTerm) return matchesStatus;

    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      appointment.user_email?.toLowerCase().includes(searchLower) ||
      appointment.user_phone?.toLowerCase().includes(searchLower) ||
      appointment.user_name?.toLowerCase().includes(searchLower) ||
      getServiceName(appointment.service_id).toLowerCase().includes(searchLower);

    return matchesStatus && matchesSearch;
  });

  const completedAppointments = appointments.filter(a => a?.status === 'concluido');
  const cancelledAppointments = appointments.filter(a => a?.status === 'cancelado');
  const noShowAppointments = appointments.filter(a => a?.status === 'falta');

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
                <p className="text-lg font-bold text-slate-900">{completedAppointments.length}</p>
                <p className="text-xs text-slate-600">{txtCompletedLabel}</p>
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
                <p className="text-lg font-bold text-slate-900">{cancelledAppointments.length}</p>
                <p className="text-xs text-slate-600">{txtCancelledLabel}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-100 rounded-full">
                <AlertCircle className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">{noShowAppointments.length}</p>
                <p className="text-xs text-slate-600">{txtNoShows}</p>
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
                <SelectItem value="all">{txtAllLabel}</SelectItem>
                <SelectItem value="concluido">{txtCompletedFilter}</SelectItem>
                <SelectItem value="cancelado">{txtCancelledFilter}</SelectItem>
                <SelectItem value="falta">{txtNoShowsFilter}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {filteredAppointments.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-8 text-center">
            <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {searchTerm || statusFilter !== "all" 
                ? txtNoAppointmentsFound
                : txtNoHistory
              }
            </h3>
            <p className="text-sm text-slate-600">
              {searchTerm || statusFilter !== "all"
                ? txtAdjustFilters
                : txtCompletedAppointmentsAppearHere
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-600">
              {filteredAppointments.length} {filteredAppointments.length === 1 ? txtAppointment : txtAppointmentsCount}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearHistory}
              disabled={clearHistoryMutation.isPending || appointments.length === 0}
              className="border-red-200 text-red-600 hover:bg-red-50 h-7 text-xs"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              {clearHistoryMutation.isPending ? txtClearing : txtClear}
            </Button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredAppointments.map(appointment => {
              if (!appointment) return null;
              
              const status = statusConfig[appointment.status];
              const StatusIcon = status.icon;

              return (
                <Card key={appointment.id} className="border-slate-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-sky-600" />
                          <span className="text-sm font-bold text-slate-900">
                            {(() => {
                              try {
                                if (!appointment.appointment_date) return 'Data não disponível';
                                const date = new Date(appointment.appointment_date);
                                if (isNaN(date.getTime())) return 'Data não disponível';
                                return format(date, "dd/MM/yyyy", { locale: pt });
                              } catch (e) {
                                return 'Data não disponível';
                              }
                            })()} {appointment.appointment_time ? `às ${appointment.appointment_time}` : ''}
                          </span>
                        </div>
                        <Badge className={`${status.color} text-xs`}>
                          <StatusIcon className="w-2.5 h-2.5 mr-1" />
                          {status.label}
                        </Badge>
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
                          <span>{getServiceName(appointment.service_id)}</span>
                        </div>

                        {appointment.user_name && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <User className="w-3 h-3" />
                            <span>{appointment.user_name}</span>
                          </div>
                        )}

                        {appointment.user_email && (
                          <div className="flex items-center gap-1.5 text-slate-600 truncate">
                            <span className="text-xs truncate">{appointment.user_email}</span>
                          </div>
                        )}

                        {appointment.user_phone && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Phone className="w-3 h-3" />
                            <span>{appointment.user_phone}</span>
                          </div>
                        )}

                        {appointment.notes && (
                          <div className="mt-1 p-1.5 bg-slate-50 rounded text-xs text-slate-600">
                            <span className="font-semibold">Notas:</span> {appointment.notes}
                          </div>
                        )}

                        {appointment.rating && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <span className="text-xs">Avaliação:</span>
                            <span className="text-sm font-bold text-amber-600">{appointment.rating}/5</span>
                            {appointment.feedback && (
                              <span className="text-xs italic text-slate-500 truncate">"{appointment.feedback}"</span>
                            )}
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
