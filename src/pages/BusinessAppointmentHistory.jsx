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
  AlertCircle,
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

export default function BusinessAppointmentHistoryPage() {
  const txtCompleted = useAutoTranslate('Concluído', 'pt');
  const txtCancelled = useAutoTranslate('Cancelado', 'pt');
  const txtNoShow = useAutoTranslate('Falta', 'pt');
  const txtSubscriptionRequired = useAutoTranslate('Subscrição Necessária', 'pt');
  const txtSubscriptionMessage = useAutoTranslate('Para aceder ao histórico de marcações, precisa de ativar o plano empresarial.', 'pt');
  const txtPageTitle = useAutoTranslate('Histórico de Marcações', 'pt');
  const txtPageSubtitle = useAutoTranslate('Consulte o histórico completo de marcações', 'pt');
  const txtCompletedLabel = useAutoTranslate('Concluídas', 'pt');
  const txtCancelledLabel = useAutoTranslate('Canceladas', 'pt');
  const txtNoShowLabel = useAutoTranslate('Faltas', 'pt');
  const txtSearchAppointments = useAutoTranslate('Pesquisar Marcações', 'pt');
  const txtSearchPlaceholder = useAutoTranslate('Procurar por nome, telefone, email ou serviço...', 'pt');
  const txtFilterByStatus = useAutoTranslate('Filtrar por status', 'pt');
  const txtAll = useAutoTranslate('Todos', 'pt');
  const txtCompletedFilter = useAutoTranslate('Concluídos', 'pt');
  const txtCancelledFilter = useAutoTranslate('Cancelados', 'pt');
  const txtNoShowFilter = useAutoTranslate('Faltas', 'pt');
  const txtNoAppointmentFound = useAutoTranslate('Nenhuma marcação encontrada', 'pt');
  const txtNoHistory = useAutoTranslate('Sem histórico', 'pt');
  const txtAdjustFilters = useAutoTranslate('Tente ajustar os filtros de pesquisa', 'pt');
  const txtHistoryWillAppear = useAutoTranslate('O histórico de marcações concluídas aparecerá aqui', 'pt');
  const txtAppointment = useAutoTranslate('marcação', 'pt');
  const txtAppointments = useAutoTranslate('marcações', 'pt');
  const txtFound = useAutoTranslate('encontradas', 'pt');
  const txtClearHistory = useAutoTranslate('Limpar Histórico', 'pt');
  const txtClearing = useAutoTranslate('Limpando...', 'pt');
  const txtClearHistoryTitle = useAutoTranslate('Limpar Histórico de Marcações', 'pt');
  const txtConfirmClear = useAutoTranslate('Tem certeza que deseja remover todas as', 'pt');
  const txtFromHistory = useAutoTranslate('marcações do histórico? Esta ação não pode ser desfeita.', 'pt');
  const txtYesClear = useAutoTranslate('Sim, limpar histórico', 'pt');
  const txtCancel = useAutoTranslate('Cancelar', 'pt');
  const txtAppointmentRemoved = useAutoTranslate('marcação removida', 'pt');
  const txtAppointmentsRemoved = useAutoTranslate('marcações removidas', 'pt');
  const txtFromHistoryMsg = useAutoTranslate('do histórico', 'pt');
  const txtErrorClearing = useAutoTranslate('Erro ao limpar histórico', 'pt');
  const txtService = useAutoTranslate('Serviço', 'pt');
  const txtDateNotAvailable = useAutoTranslate('Data não disponível', 'pt');
  const txtNotes = useAutoTranslate('Notas:', 'pt');
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
    },
    falta: { 
      icon: AlertCircle, 
      color: "bg-orange-100 text-orange-700 border-orange-200", 
      label: txtNoShow 
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

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['business-appointment-history', user?.business_id],
    queryFn: () => base44.entities.Appointment.filter({ 
      business_id: user.business_id,
      status: { $in: ['concluido', 'cancelado', 'falta'] }
    }, '-appointment_date'),
    initialData: [],
    enabled: !!user?.business_id && hasSubscription,
  });

  const { data: services } = useQuery({
    queryKey: ['business-services', user?.business_id],
    queryFn: () => base44.entities.Service.filter({ business_id: user.business_id }),
    initialData: [],
    enabled: !!user?.business_id,
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
      toast.success(`${count} ${count === 1 ? txtAppointmentRemoved : txtAppointmentsRemoved} ${txtFromHistoryMsg}`);
    },
    onError: () => {
      toast.error(txtErrorClearing);
    }
  });

  const handleClearHistory = async () => {
    const confirmed = await confirm({
      title: txtClearHistoryTitle,
      description: `${txtConfirmClear} ${appointments.length} ${txtFromHistory}`,
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

  const getServiceName = (serviceId) => {
    return services.find(s => s && s.id === serviceId)?.name || txtService;
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
                  <p className="text-2xl font-bold text-slate-900">{completedAppointments.length}</p>
                  <p className="text-sm text-slate-600">{txtCompletedLabel}</p>
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
                  <p className="text-2xl font-bold text-slate-900">{cancelledAppointments.length}</p>
                  <p className="text-sm text-slate-600">{txtCancelledLabel}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 rounded-full">
                  <AlertCircle className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{noShowAppointments.length}</p>
                  <p className="text-sm text-slate-600">{txtNoShowLabel}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-xl mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              {txtSearchAppointments}
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
                  <SelectItem value="falta">{txtNoShowFilter}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {filteredAppointments.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-16 text-center">
              <Calendar className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                {searchTerm || statusFilter !== "all" 
                  ? txtNoAppointmentFound
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
                {filteredAppointments.length} {filteredAppointments.length === 1 ? txtAppointment : txtAppointments} {txtFound}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearHistory}
                disabled={clearHistoryMutation.isPending || appointments.length === 0}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {clearHistoryMutation.isPending ? txtClearing : txtClearHistory}
              </Button>
            </div>

            <div className="grid gap-4">
              {filteredAppointments.map(appointment => {
                if (!appointment) return null;
                
                const status = statusConfig[appointment.status];
                const StatusIcon = status.icon;

                return (
                  <Card key={appointment.id} className="border-0 shadow-lg hover:shadow-xl transition-all">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-5 h-5 text-sky-600" />
                              <span className="text-lg font-bold text-slate-900">
                                {(() => {
                                  try {
                                    if (!appointment.appointment_date) return txtDateNotAvailable;
                                    const date = new Date(appointment.appointment_date);
                                    if (isNaN(date.getTime())) return txtDateNotAvailable;
                                    return format(date, "dd/MM/yyyy", { locale: pt });
                                  } catch (e) {
                                    console.warn('Erro ao formatar data da marcação:', e);
                                    return txtDateNotAvailable;
                                  }
                                })()} {appointment.appointment_time ? `às ${appointment.appointment_time}` : ''}
                              </span>
                            </div>
                            <Badge className={status.color}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {status.label}
                            </Badge>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-slate-600 font-semibold">
                              <span>{getServiceName(appointment.service_id)}</span>
                            </div>

                            {appointment.user_name && (
                              <div className="flex items-center gap-2 text-slate-600">
                                <User className="w-4 h-4" />
                                <span>{appointment.user_name}</span>
                              </div>
                            )}

                            {appointment.user_email && (
                              <div className="flex items-center gap-2 text-slate-600">
                                <span className="text-xs">{appointment.user_email}</span>
                              </div>
                            )}

                            {appointment.user_phone && (
                              <div className="flex items-center gap-2 text-slate-600">
                                <Phone className="w-4 h-4" />
                                <span>{appointment.user_phone}</span>
                              </div>
                            )}

                            {appointment.notes && (
                              <div className="mt-2 p-2 bg-slate-50 rounded text-xs text-slate-600">
                                <span className="font-semibold">{txtNotes}</span> {appointment.notes}
                              </div>
                            )}
                          </div>
                        </div>

                        {appointment.rating && (
                          <div className="flex flex-col items-end justify-center">
                            <p className="text-xs text-slate-500 mb-1">{txtRating}</p>
                            <div className="flex items-center gap-1">
                              <span className="text-2xl font-bold text-amber-600">{appointment.rating}</span>
                              <span className="text-sm text-slate-400">/5</span>
                            </div>
                            {appointment.feedback && (
                              <p className="text-xs text-slate-500 mt-1 italic max-w-xs">"{appointment.feedback}"</p>
                            )}
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
