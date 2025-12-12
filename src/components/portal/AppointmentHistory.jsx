import React from "react";
import { useTranslation } from "react-i18next";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar, MapPin, Clock, X, Star, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { pt, enUS, de, es, fr, it, nl, pl, sv, da, nb, fi, cs, el, ro, hu, bg, hr, sk, sl, is, ja, th } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/useConfirm";
import { useAutoTranslate } from "@/hooks/useTranslate";

export default function AppointmentHistory({ user }) {
  const { i18n } = useTranslation();
  
  const txtScheduled = useAutoTranslate('Agendado', 'pt');
  const txtConfirmed = useAutoTranslate('Confirmado', 'pt');
  const txtServing = useAutoTranslate('Em Atendimento', 'pt');
  const txtCompleted = useAutoTranslate('Concluído', 'pt');
  const txtCancelled = useAutoTranslate('Cancelado', 'pt');
  const txtNoShow = useAutoTranslate('Falta', 'pt');
  const txtAppointmentRemoved = useAutoTranslate('marcação removida', 'pt');
  const txtAppointmentsRemoved = useAutoTranslate('marcações removidas', 'pt');
  const txtErrorClearHistory = useAutoTranslate('Erro ao limpar histórico', 'pt');
  const txtClearAppointmentHistory = useAutoTranslate('Limpar Histórico de Marcações', 'pt');
  const txtConfirmClearAppointments = useAutoTranslate('Tem a certeza que deseja limpar', 'pt');
  const txtConfirmClearAction = useAutoTranslate('Sim, limpar histórico', 'pt');
  const txtCancel = useAutoTranslate('Cancelar', 'pt');
  const txtBusiness = useAutoTranslate('Empresa', 'pt');
  const txtService = useAutoTranslate('Serviço', 'pt');
  const txtCancelAppointment = useAutoTranslate('Cancelar Marcação', 'pt');
  const txtConfirmCancelAppointment = useAutoTranslate('Tem a certeza que deseja cancelar esta marcação?', 'pt');
  const txtConfirm = useAutoTranslate('Confirmar', 'pt');
  const txtAt = useAutoTranslate('às', 'pt');
  const txtCreatedOn = useAutoTranslate('Criado a', 'pt');
  const txtAppointmentScheduled = useAutoTranslate('Marcação Agendada', 'pt');
  const txtUpcoming = useAutoTranslate('Próximas', 'pt');
  const txtHistory = useAutoTranslate('Histórico', 'pt');
  const txtNoAppointments = useAutoTranslate('Sem marcações agendadas', 'pt');
  const txtSchedulePrompt = useAutoTranslate('As suas próximas marcações aparecerão aqui', 'pt');
  const txtNoHistory = useAutoTranslate('Sem histórico', 'pt');
  const txtCompletedAppointmentsAppearHere = useAutoTranslate('As marcações concluídas aparecerão aqui', 'pt');
  const txtClearing = useAutoTranslate('A limpar...', 'pt');
  const txtClearHistory = useAutoTranslate('Limpar Histórico', 'pt');
  
  const getDateLocale = () => {
    const lang = i18n.language.split('-')[0];
    const localeMap = { 
      pt, en: enUS, de, es, fr, it, nl, pl, sv, da, no: nb, fi, cs, el, ro, hu, bg, hr, sk, sl, is, ja, th
    };
    return localeMap[lang] || enUS;
  };
  
  const statusConfig = {
    agendado: { color: "bg-blue-100 text-blue-700 border-blue-200", label: txtScheduled },
    confirmado: { color: "bg-green-100 text-green-700 border-green-200", label: txtConfirmed },
    em_atendimento: { color: "bg-purple-100 text-purple-700 border-purple-200", label: txtServing },
    concluido: { color: "bg-slate-100 text-slate-700 border-slate-200", label: txtCompleted },
    cancelado: { color: "bg-red-100 text-red-700 border-red-200", label: txtCancelled },
    falta: { color: "bg-orange-100 text-orange-700 border-orange-200", label: txtNoShow }
  };
  const queryClient = useQueryClient();
  const { ConfirmDialog, confirm } = useConfirm();

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['customer-appointments', user.email],
    queryFn: () => base44.entities.Appointment.filter({ user_email: user.email }, '-appointment_date'),
    initialData: [],
  });

  const { data: businesses } = useQuery({
    queryKey: ['businesses-list'],
    queryFn: () => base44.entities.Business.list(),
    initialData: [],
  });

  const { data: services } = useQuery({
    queryKey: ['services-list'],
    queryFn: () => base44.entities.Service.list(),
    initialData: [],
  });

  const cancelMutation = useMutation({
    mutationFn: async (appointmentId) => {
      await base44.entities.Appointment.update(appointmentId, { status: 'cancelado' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-appointments'] });
    },
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
      queryClient.invalidateQueries({ queryKey: ['customer-appointments'] });
      const message = count === 1 ? txtAppointmentRemoved : txtAppointmentsRemoved;
      toast.success(`${count} ${message}`);
    },
    onError: () => {
      toast.error(txtErrorClearHistory);
    }
  });

  const handleClearHistory = async () => {
    const confirmed = await confirm({
      title: txtClearAppointmentHistory,
      description: `${txtConfirmClearAppointments} ${pastAppointments.length} marcações?`,
      confirmText: txtConfirmClearAction,
      cancelText: txtCancel
    });

    if (confirmed) {
      clearHistoryMutation.mutate();
    }
  };

  const upcomingAppointments = appointments.filter(a => 
    ['agendado', 'confirmado'].includes(a.status) &&
    new Date(a.appointment_date) >= new Date()
  );
  
  const pastAppointments = appointments.filter(a => 
    ['concluido', 'cancelado', 'falta'].includes(a.status) ||
    (new Date(a.appointment_date) < new Date() && a.status !== 'em_atendimento')
  );

  const getBusinessName = (businessId) => {
    return businesses.find(b => b.id === businessId)?.name || txtBusiness;
  };

  const getServiceName = (serviceId) => {
    return services.find(s => s.id === serviceId)?.name || txtService;
  };

  const AppointmentCard = ({ appointment }) => {
    const status = statusConfig[appointment.status];
    const canCancel = ['agendado', 'confirmado'].includes(appointment.status) && 
                     new Date(appointment.appointment_date) > new Date();
    
    const handleCancelAppointment = async () => {
      const confirmed = await confirm({
        title: txtCancelAppointment,
        description: txtConfirmCancelAppointment,
        confirmText: txtConfirm,
        cancelText: txtCancel
      });
      if (confirmed) {
        cancelMutation.mutate(appointment.id);
      }
    };

    return (
      <Card className="border-0 shadow-lg hover:shadow-xl transition-all">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2 text-slate-900 mb-2">
                <Calendar className="w-5 h-5 text-sky-600" />
                <span className="font-bold text-lg">
                  {format(new Date(appointment.appointment_date), "dd MMMM", { locale: getDateLocale() })}
                </span>
                <span className="text-slate-600">{txtAt} {appointment.appointment_time}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 mb-1">
                <MapPin className="w-4 h-4" />
                <span className="font-semibold">{getBusinessName(appointment.business_id)}</span>
              </div>
              <p className="text-sm text-slate-500">{getServiceName(appointment.service_id)}</p>
            </div>
            <Badge className={status.color}>
              {status.label}
            </Badge>
          </div>

          {appointment.notes && (
            <div className="mb-4 p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">{appointment.notes}</p>
            </div>
          )}

          {appointment.rating && (
            <div className="mb-4 flex items-center gap-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${star <= appointment.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                  />
                ))}
              </div>
              {appointment.feedback && (
                <span className="text-sm text-slate-600">"{appointment.feedback}"</span>
              )}
            </div>
          )}

          <div className="flex justify-between items-center pt-4 border-t">
            <span className="text-xs text-slate-500">
              {appointment.created_date ? (
                <>{txtCreatedOn} {format(new Date(appointment.created_date), "dd/MM/yyyy", { locale: getDateLocale() })}</>
              ) : (
                <>{txtAppointmentScheduled}</>
              )}
            </span>
            {canCancel && (
              <Button
                size="sm"
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50"
                onClick={handleCancelAppointment}
                disabled={cancelMutation.isPending}
              >
                <X className="w-4 h-4 mr-2" />
                {txtCancel}
              </Button>
            )}
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
    <Tabs defaultValue="upcoming">
      <TabsList className="bg-white border border-slate-200 mb-6">
        <TabsTrigger value="upcoming">
          {txtUpcoming} ({upcomingAppointments.length})
        </TabsTrigger>
        <TabsTrigger value="past">
          {txtHistory} ({pastAppointments.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="upcoming">
        {upcomingAppointments.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-16 text-center">
              <Calendar className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                {txtNoAppointments}
              </h3>
              <p className="text-slate-600">
                {txtSchedulePrompt}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {upcomingAppointments.map(appointment => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="past">
        {pastAppointments.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-16 text-center">
              <Clock className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                {txtNoHistory}
              </h3>
              <p className="text-slate-600">
                {txtCompletedAppointmentsAppearHere}
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
              {pastAppointments.map(appointment => (
                <AppointmentCard key={appointment.id} appointment={appointment} />
              ))}
            </div>
          </div>
        )}
      </TabsContent>
      <ConfirmDialog />
    </Tabs>
  );
}