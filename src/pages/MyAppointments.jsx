import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calendar, Clock, MapPin, XCircle, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useConfirm } from "@/hooks/useConfirm";
import { toast } from "sonner";
import { useAutoTranslate } from "@/hooks/useTranslate";

const statusConfig = {
  agendado: { icon: Calendar, color: "bg-blue-100 text-blue-700", label: "Agendado" },
  confirmado: { icon: CheckCircle2, color: "bg-green-100 text-green-700", label: "Confirmado" },
  em_atendimento: { icon: Clock, color: "bg-purple-100 text-purple-700", label: "Em Atendimento" },
  concluido: { icon: CheckCircle2, color: "bg-green-100 text-green-700", label: "Concluído" },
  cancelado: { icon: XCircle, color: "bg-red-100 text-red-700", label: "Cancelado" },
  falta: { icon: AlertCircle, color: "bg-orange-100 text-orange-700", label: "Faltou" }
};

export default function MyAppointmentsPage() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const { confirm, ConfirmDialog } = useConfirm();

  const txtScheduled = useAutoTranslate('Agendado', 'pt');
  const txtConfirmed = useAutoTranslate('Confirmado', 'pt');
  const txtInService = useAutoTranslate('Em Atendimento', 'pt');
  const txtCompleted = useAutoTranslate('Concluído', 'pt');
  const txtCancelled = useAutoTranslate('Cancelado', 'pt');
  const txtMissed = useAutoTranslate('Faltou', 'pt');
  const txtCancelSuccess = useAutoTranslate('Marcação cancelada com sucesso', 'pt');
  const txtCancelError = useAutoTranslate('Erro ao cancelar marcação', 'pt');
  const txtMyAppointments = useAutoTranslate('Minhas Marcações', 'pt');
  const txtUpcoming = useAutoTranslate('Próximas', 'pt');
  const txtPast = useAutoTranslate('Histórico', 'pt');
  const txtCancelAppointment = useAutoTranslate('Cancelar Marcação', 'pt');
  const txtCancelAppointmentConfirm = useAutoTranslate('Tem certeza que deseja cancelar esta marcação? Esta ação não pode ser desfeita.', 'pt');
  const txtCancel = useAutoTranslate('Cancelar', 'pt');
  const txtViewBusiness = useAutoTranslate('Ver Empresa', 'pt');
  const txtObservations = useAutoTranslate('Observações:', 'pt');
  const txtService = useAutoTranslate('Serviço', 'pt');
  const txtBusiness = useAutoTranslate('Empresa', 'pt');
  const txtDateNotAvailable = useAutoTranslate('Data não disponível', 'pt');
  const txtManageAppointments = useAutoTranslate('Gerir as suas marcações', 'pt');
  const txtNoScheduledAppointments = useAutoTranslate('Sem marcações agendadas', 'pt');
  const txtExploreAndSchedule = useAutoTranslate('Explore empresas e agende o seu próximo serviço', 'pt');
  const txtExploreBusiness = useAutoTranslate('Explorar Empresas', 'pt');
  const txtNoHistory = useAutoTranslate('Sem histórico de marcações', 'pt');
  const txtLoading = useAutoTranslate('A carregar...', 'pt');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => base44.auth.redirectToLogin());
  }, []);

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['my-appointments', user?.email],
    queryFn: () => user ? base44.entities.Appointment.filter({ 
      user_email: user.email 
    }, '-appointment_date') : [],
    enabled: !!user,
    initialData: [],
  });

  const { data: services } = useQuery({
    queryKey: ['appointment-services'],
    queryFn: async () => {
      const serviceIds = [...new Set(appointments.map(a => a.service_id))];
      if (serviceIds.length === 0) return [];
      const services = await Promise.all(
        serviceIds.map(id => base44.entities.Service.filter({ id }).then(s => s[0]))
      );
      return services.filter(Boolean);
    },
    enabled: appointments.length > 0,
    initialData: [],
  });

  const { data: businesses } = useQuery({
    queryKey: ['appointment-businesses'],
    queryFn: async () => {
      const businessIds = [...new Set(appointments.map(a => a.business_id))];
      if (businessIds.length === 0) return [];
      const businesses = await Promise.all(
        businessIds.map(id => base44.entities.Business.filter({ id }).then(b => b[0]))
      );
      return businesses.filter(Boolean);
    },
    enabled: appointments.length > 0,
    initialData: [],
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => base44.entities.Appointment.update(id, { status: 'cancelado' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
      toast.success(txtCancelSuccess);
    },
    onError: () => {
      toast.error(txtCancelError);
    }
  });

  const upcomingAppointments = appointments.filter(a => 
    ['agendado', 'confirmado'].includes(a.status) &&
    new Date(`${a.appointment_date}T${a.appointment_time}`) >= new Date()
  );

  const pastAppointments = appointments.filter(a =>
    ['concluido', 'cancelado', 'falta'].includes(a.status) ||
    new Date(`${a.appointment_date}T${a.appointment_time}`) < new Date()
  );

  const getServiceName = (serviceId) => {
    return services.find(s => s.id === serviceId)?.name || txtService;
  };

  const getBusinessName = (businessId) => {
    return businesses.find(b => b.id === businessId)?.name || txtBusiness;
  };

  const renderAppointment = (appointment) => {
    const status = statusConfig[appointment.status];
    const StatusIcon = status.icon;
    const isPast = (() => {
      try {
        if (!appointment.appointment_date || !appointment.appointment_time) return false;
        const dateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
        if (isNaN(dateTime.getTime())) return false;
        return dateTime < new Date();
      } catch (e) {
        console.warn('Erro ao verificar se marcação está no passado:', e);
        return false;
      }
    })();
    const canCancel = ['agendado', 'confirmado'].includes(appointment.status) && !isPast;

    return (
      <Card key={appointment.id} className="hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-bold text-lg text-slate-900 mb-1">
                {getServiceName(appointment.service_id)}
              </h3>
              <p className="text-sm text-slate-600">{getBusinessName(appointment.business_id)}</p>
            </div>
            <Badge className={status.color}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {status.label}
            </Badge>
          </div>

          <div className="space-y-2 text-sm text-slate-700 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              {(() => {
                try {
                  if (!appointment.appointment_date) return 'Data não disponível';
                  const date = new Date(appointment.appointment_date);
                  if (isNaN(date.getTime())) return 'Data não disponível';
                  return format(date, "dd 'de' MMMM 'de' yyyy", { locale: pt });
                } catch (e) {
                  console.warn('Erro ao formatar data da marcação:', e);
                  return 'Data não disponível';
                }
              })()}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              {appointment.appointment_time}
            </div>
          </div>

          {appointment.notes && (
            <div className="mb-4 p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
              <strong>{txtObservations}</strong> {appointment.notes}
            </div>
          )}

          <div className="flex gap-2">
            {canCancel && (
              <Button
                variant="outline"
                size="sm"
                className="border-red-200 text-red-600 hover:bg-red-50"
                onClick={async () => {
                  const confirmed = await confirm({
                    title: txtCancelAppointment,
                    description: txtCancelAppointmentConfirm,
                  });
                  if (confirmed) {
                    cancelMutation.mutate(appointment.id);
                  }
                }}
              >
                <XCircle className="w-3 h-3 mr-1" />
                {txtCancel}
              </Button>
            )}
            <Link to={createPageUrl(`BusinessDetail?id=${appointment.business_id}`)}>
              <Button variant="outline" size="sm">
                {txtViewBusiness}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!user) {
    return <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 flex items-center justify-center py-8">
      <div className="animate-pulse">{txtLoading}</div>
    </div>;
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50">
      <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 sm:py-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">{txtMyAppointments}</h1>
          <p className="text-xl text-slate-600">{txtManageAppointments}</p>
        </div>

        <Tabs defaultValue="proximas" className="space-y-6">
          <TabsList className="bg-white border border-slate-200">
            <TabsTrigger value="proximas">
              {txtUpcoming} ({upcomingAppointments.length})
            </TabsTrigger>
            <TabsTrigger value="historico">
              {txtPast} ({pastAppointments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="proximas">
            {upcomingAppointments.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    {txtNoScheduledAppointments}
                  </h3>
                  <p className="text-slate-600 mb-6">
                    {txtExploreAndSchedule}
                  </p>
                  <Link to={createPageUrl("Businesses")}>
                    <Button>{txtExploreBusiness}</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {upcomingAppointments.map(renderAppointment)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="historico">
            {pastAppointments.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center text-slate-500">
                  {txtNoHistory}
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {pastAppointments.map(renderAppointment)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <ConfirmDialog />
    </div>
  );
}