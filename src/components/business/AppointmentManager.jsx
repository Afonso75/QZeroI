
import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Calendar, 
  Clock, 
  User, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  UserPlus,
  Trash2,
  Edit
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import AppointmentHistory from "./AppointmentHistory";
import { useAutoTranslate } from "@/hooks/useTranslate";

export default function AppointmentManager({ businessId, companyProfile }) {
  // Traduções
  const txtScheduled = useAutoTranslate('Agendado', 'pt');
  const txtConfirmed = useAutoTranslate('Confirmado', 'pt');
  const txtInService = useAutoTranslate('Em Atendimento', 'pt');
  const txtCompleted = useAutoTranslate('Concluído', 'pt');
  const txtCancelled = useAutoTranslate('Cancelado', 'pt');
  const txtNoShow = useAutoTranslate('Faltou', 'pt');
  const txtLoading = useAutoTranslate('A carregar...', 'pt');
  const txtToday = useAutoTranslate('Hoje', 'pt');
  const txtUpcoming = useAutoTranslate('Próximas', 'pt');
  const txtHistory = useAutoTranslate('Histórico', 'pt');
  const txtName = useAutoTranslate('Nome', 'pt');
  const txtNameOptional = useAutoTranslate('Nome (opcional)', 'pt');
  const txtEmail = useAutoTranslate('Email', 'pt');
  const txtEmailOptional = useAutoTranslate('Email (opcional)', 'pt');
  const txtService = useAutoTranslate('Serviço', 'pt');
  const txtServiceRequired = useAutoTranslate('Serviço *', 'pt');
  const txtDate = useAutoTranslate('Data', 'pt');
  const txtDateRequired = useAutoTranslate('Data *', 'pt');
  const txtTime = useAutoTranslate('Hora', 'pt');
  const txtTimeRequired = useAutoTranslate('Hora *', 'pt');
  const txtNotes = useAutoTranslate('Notas', 'pt');
  const txtObservations = useAutoTranslate('Observações...', 'pt');
  const txtSelect = useAutoTranslate('Selecione', 'pt');
  const txtCreate = useAutoTranslate('Criar', 'pt');
  const txtEdit = useAutoTranslate('Editar', 'pt');
  const txtDelete = useAutoTranslate('Eliminar marcação', 'pt');
  const txtCancel = useAutoTranslate('Cancelar', 'pt');
  const txtSave = useAutoTranslate('Guardar', 'pt');
  const txtAvailableTime = useAutoTranslate('Horário Disponível *', 'pt');
  const txtNoAvailableSlots = useAutoTranslate('Sem horários disponíveis', 'pt');
  const txtEmailPlaceholder = useAutoTranslate('email@exemplo.com', 'pt');
  const txtNamePlaceholder = useAutoTranslate('Nome do cliente', 'pt');
  const txtNoAppointmentsToday = useAutoTranslate('Sem marcações hoje', 'pt');
  const txtNoUpcomingAppointments = useAutoTranslate('Sem marcações futuras', 'pt');
  const txtManualAppointment = useAutoTranslate('Marcação Manual', 'pt');
  const txtNewAppointment = useAutoTranslate('Nova Marcação', 'pt');

  const statusConfig = {
    agendado: { icon: Calendar, color: "bg-blue-100 text-blue-700", label: txtScheduled },
    confirmado: { icon: CheckCircle2, color: "bg-green-100 text-green-700", label: txtConfirmed },
    em_atendimento: { icon: Clock, color: "bg-purple-100 text-purple-700", label: txtInService },
    concluido: { icon: CheckCircle2, color: "bg-green-100 text-green-700", label: txtCompleted },
    cancelado: { icon: XCircle, color: "bg-red-100 text-red-700", label: txtCancelled },
    falta: { icon: AlertCircle, color: "bg-orange-100 text-orange-700", label: txtNoShow }
  };
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("hoje");
  const [showManualForm, setShowManualForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [manualData, setManualData] = useState({
    user_email: "",
    user_phone: "",
    service_id: "",
    appointment_date: "",
    appointment_time: "",
    notes: "",
    user_name: ""
  });

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['business-appointments', businessId],
    queryFn: () => base44.entities.Appointment.filter({ business_id: businessId }, '-appointment_date'),
    initialData: [],
    refetchInterval: 30000,
  });

  const { data: services } = useQuery({
    queryKey: ['services', businessId],
    queryFn: () => base44.entities.Service.filter({ business_id: businessId }),
    initialData: [],
  });

  const { data: dateAppointments } = useQuery({
    queryKey: ['appointments-for-date', businessId, manualData.service_id, manualData.appointment_date],
    queryFn: async () => {
      if (!manualData.service_id || !manualData.appointment_date) return [];
      return await base44.entities.Appointment.filter({
        business_id: businessId,
        service_id: manualData.service_id,
        appointment_date: manualData.appointment_date,
        status: { $in: ['agendado', 'confirmado'] }
      });
    },
    enabled: !!manualData.service_id && !!manualData.appointment_date,
    initialData: [],
  });

  const sendSMS = async (phone, message) => {
    console.log('📱 SMS enviado para:', phone);
    console.log('   Mensagem:', message);
    
    if (companyProfile?.sms_gateway && companyProfile.sms_gateway !== 'none') {
      await base44.integrations.Core.SendEmail({
        to: companyProfile.companyEmail,
        subject: 'SMS Enviado',
        body: `[SMS] Para: ${phone}\nMensagem: ${message}\nGateway: ${companyProfile.sms_gateway}`
      });
    }
  };

  const getScheduleForDate = (date) => {
    const selectedService = services.find(s => s.id === manualData.service_id);
    if (!selectedService || !date) return null;
    
    const dateObj = new Date(date + 'T00:00:00');
    const dayOfWeek = dateObj.getDay();
    
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    
    const daySchedule = selectedService.working_hours?.[dayName];
    
    console.log('📅 getScheduleForDate:', {
      date,
      dayOfWeek,
      dayName,
      serviceName: selectedService.name,
      daySchedule,
      working_hours: selectedService.working_hours
    });
    
    if (daySchedule && daySchedule.enabled) {
      const breaks = [];
      if (daySchedule.break_start && daySchedule.break_end) {
        breaks.push({
          start: daySchedule.break_start,
          end: daySchedule.break_end
        });
      }
      
      return {
        start: daySchedule.start,
        end: daySchedule.end,
        breaks: breaks
      };
    }
    
    return null;
  };

  const isTimeInBreak = (timeStr, breaks) => {
    if (!breaks || breaks.length === 0) return false;
    
    const [hour, min] = timeStr.split(':').map(Number);
    const timeMinutes = hour * 60 + min;
    
    return breaks.some(brk => {
      const [startHour, startMin] = brk.start.split(':').map(Number);
      const [endHour, endMin] = brk.end.split(':').map(Number);
      const breakStart = startHour * 60 + startMin;
      const breakEnd = endHour * 60 + endMin;
      
      return timeMinutes >= breakStart && timeMinutes < breakEnd;
    });
  };

  const availableTimeSlots = useMemo(() => {
    if (!manualData.service_id || !manualData.appointment_date) return [];

    const selectedService = services.find(s => s.id === manualData.service_id);
    if (!selectedService) return [];

    const schedule = getScheduleForDate(manualData.appointment_date);
    if (!schedule || !schedule.start || !schedule.end) return [];

    const slots = [];
    const [startHour, startMin] = schedule.start.split(':').map(Number);
    const [endHour, endMin] = schedule.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    const duration = selectedService.duration;
    const bufferTime = selectedService.buffer_time || 0;
    const slotInterval = duration + bufferTime;

    for (let time = startTime; time < endTime; time += slotInterval) {
      const hour = Math.floor(time / 60);
      const min = time % 60;
      const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      
      if (isTimeInBreak(timeStr, schedule.breaks)) {
        continue;
      }
      
      const isBooked = dateAppointments.some(apt => {
        const aptTime = apt.appointment_time;
        const [aptHour, aptMin] = aptTime.split(':').map(Number);
        const aptMinutes = aptHour * 60 + aptMin;
        
        const aptSlotInterval = apt.duration + (apt.buffer_time || 0);

        const overlaps = (time < (aptMinutes + aptSlotInterval) && aptMinutes < (time + slotInterval));
        return overlaps;
      });
      
      slots.push({
        time: timeStr,
        available: !isBooked
      });
    }

    return slots;
  }, [manualData.service_id, manualData.appointment_date, services, dateAppointments]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const appointment = await base44.entities.Appointment.update(id, { status });
      return appointment;
    },
    onSuccess: (appointment, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['business-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['business-appointment-history'] });
      if (status === 'confirmado') {
        const hasValidEmail = appointment.user_email && 
          appointment.user_email.includes('@') && 
          !appointment.user_email.includes('@temp.local');
        if (hasValidEmail) {
          toast.success('Marcação confirmada! Email enviado.');
        } else {
          toast.success('Marcação confirmada!');
        }
      }
    },
  });

  const createManualAppointmentMutation = useMutation({
    mutationFn: async () => {
      const selectedService = services.find(s => s.id === manualData.service_id);
      
      const appointment = await base44.entities.Appointment.create({
        business_id: businessId,
        service_id: manualData.service_id,
        user_email: manualData.user_email || `presencial_${Date.now()}@temp.local`,
        appointment_date: manualData.appointment_date,
        appointment_time: manualData.appointment_time,
        status: "agendado",
        notes: manualData.notes || `Cliente: ${manualData.user_name || 'Presencial'}`,
        is_manual: true,
        manual_name: manualData.user_name || 'Cliente Presencial',
        duration: selectedService?.duration,
        buffer_time: selectedService?.buffer_time || 0
      });

      return appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['business-appointment-history'] });
      queryClient.invalidateQueries({ queryKey: ['appointments-for-date'] });
      toast.success('Marcação criada com sucesso!');
      setManualData({
        user_email: "",
        user_phone: "",
        service_id: "",
        appointment_date: "",
        appointment_time: "",
        notes: "",
        user_name: ""
      });
      setShowManualForm(false);
    },
    onError: () => {
      toast.error('Erro ao criar marcação');
    },
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.Appointment.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['business-appointment-history'] });
      queryClient.invalidateQueries({ queryKey: ['appointments-for-date'] });
      toast.success('Marcação atualizada com sucesso!');
      setEditingAppointment(null);
    },
    onError: () => {
      toast.error('Erro ao atualizar marcação');
    },
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: async (appointmentId) => {
      await base44.entities.Appointment.delete(appointmentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['business-appointment-history'] });
      toast.success('Marcação eliminada com sucesso');
    },
    onError: () => {
      toast.error('Erro ao eliminar marcação');
    },
  });

  const getServiceName = (serviceId) => {
    return services.find(s => s.id === serviceId)?.name || 'Serviço';
  };

  const upcomingAppointments = appointments.filter(apt => {
    const aptDate = new Date(`${apt.appointment_date}T${apt.appointment_time}`);
    return ['agendado', 'confirmado'].includes(apt.status) && aptDate >= new Date();
  });

  const todayAppointments = appointments.filter(apt => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return apt.appointment_date === today && ['agendado', 'confirmado', 'em_atendimento'].includes(apt.status);
  });


  const renderAppointment = (appointment) => {
    const status = statusConfig[appointment.status];
    const StatusIcon = status.icon;

    return (
      <Card key={appointment.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-3">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <h4 className="font-bold text-slate-900 text-xs truncate">{getServiceName(appointment.service_id)}</h4>
                <Badge className={`${status.color} text-xs h-4 px-1`}>
                  <StatusIcon className="w-2.5 h-2.5 mr-0.5" />
                  {status.label}
                </Badge>
                {appointment.is_manual && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs h-4 px-1">
                    Presencial
                  </Badge>
                )}
              </div>
              <div className="space-y-0.5 text-xs text-slate-600">
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span className="truncate">{appointment.manual_name || appointment.user_email}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {(() => {
                    try {
                      if (!appointment.appointment_date) return 'Data não disponível';
                      const date = new Date(appointment.appointment_date + 'T00:00:00');
                      if (isNaN(date.getTime())) return 'Data não disponível';
                      return format(date, 'dd/MM/yyyy');
                    } catch (e) {
                      console.warn('Erro ao formatar data da marcação:', e);
                      return 'Data não disponível';
                    }
                  })()}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {appointment.appointment_time}
                </div>
              </div>
            </div>
          </div>

          {appointment.notes && (
            <div className="mb-2 p-1.5 bg-slate-50 rounded text-xs text-slate-600 line-clamp-2">
              <strong>Notas:</strong> {appointment.notes}
            </div>
          )}

          <div className="flex flex-wrap gap-1">
            {appointment.status === 'agendado' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateStatusMutation.mutate({ id: appointment.id, status: 'confirmado' })}
                  className="h-7 text-xs flex-1"
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Confirmar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50 h-7 text-xs flex-1"
                  onClick={() => updateStatusMutation.mutate({ id: appointment.id, status: 'cancelado' })}
                >
                  <XCircle className="w-3 h-3 mr-1" />
                  Cancelar
                </Button>
                {appointment.is_manual && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-100 h-7 w-7 p-0"
                    onClick={() => {
                      if (confirm(`Eliminar marcação de ${appointment.manual_name || 'Cliente'}?`)) {
                        deleteAppointmentMutation.mutate(appointment.id);
                      }
                    }}
                    title="Eliminar marcação"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </>
            )}

            {appointment.status === 'confirmado' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingAppointment(appointment)}
                  className="h-7 text-xs"
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateStatusMutation.mutate({ id: appointment.id, status: 'em_atendimento' })}
                  className="h-7 text-xs flex-1"
                >
                  <Clock className="w-3 h-3 mr-1" />
                  Iniciar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-orange-200 text-orange-600 hover:bg-orange-50 h-7 text-xs"
                  onClick={() => updateStatusMutation.mutate({ id: appointment.id, status: 'falta' })}
                >
                  Faltou
                </Button>
              </>
            )}

            {appointment.status === 'em_atendimento' && (
              <Button
                size="sm"
                variant="outline"
                className="border-green-200 text-green-600 hover:bg-green-50 h-7 text-xs w-full"
                onClick={() => updateStatusMutation.mutate({ id: appointment.id, status: 'concluido' })}
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Concluir
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return <div className="text-center py-6 text-xs">{txtLoading}</div>;
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardContent className="p-2">
            <div className="text-lg font-bold text-slate-900">{todayAppointments.length}</div>
            <div className="text-xs text-slate-600">{txtToday}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2">
            <div className="text-lg font-bold text-slate-900">{upcomingAppointments.length}</div>
            <div className="text-xs text-slate-600">{txtUpcoming}</div>
          </CardContent>
        </Card>
      </div>

      <Button
        onClick={() => setShowManualForm(!showManualForm)}
        className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 h-9 text-xs"
      >
        <UserPlus className="w-3 h-3 mr-1" />
        {txtManualAppointment}
      </Button>

      {showManualForm && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <UserPlus className="w-4 h-4" />
              {txtNewAppointment}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-3">
            <div>
              <Label htmlFor="userName" className="text-xs">{txtNameOptional}</Label>
              <Input
                id="userName"
                value={manualData.user_name}
                onChange={(e) => setManualData({...manualData, user_name: e.target.value})}
                placeholder={txtName}
                className="h-8 text-xs"
              />
            </div>

            <div>
              <Label htmlFor="userEmail" className="text-xs">{txtEmailOptional}</Label>
              <Input
                id="userEmail"
                type="text"
                inputMode="email"
                value={manualData.user_email}
                onChange={(e) => setManualData({...manualData, user_email: e.target.value})}
                placeholder={txtEmailPlaceholder}
                className="h-8 text-xs"
                autoComplete="off"
              />
            </div>

            <div>
              <Label htmlFor="service" className="text-xs">{txtServiceRequired}</Label>
              <Select
                value={manualData.service_id}
                onValueChange={(value) => setManualData({...manualData, service_id: value, appointment_date: '', appointment_time: ''})}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder={txtSelect} />
                </SelectTrigger>
                <SelectContent>
                  {services.map(service => (
                    <SelectItem key={service.id} value={service.id} className="text-xs">
                      {service.name} ({service.duration} min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date" className="text-xs">{txtDateRequired}</Label>
              <Input
                id="date"
                type="date"
                value={manualData.appointment_date}
                onChange={(e) => setManualData({...manualData, appointment_date: e.target.value, appointment_time: ''})}
                className="h-8 text-xs"
              />
            </div>

            {manualData.service_id && manualData.appointment_date && (
              <div>
                <Label className="text-xs">{txtAvailableTime}</Label>
                {availableTimeSlots.length === 0 ? (
                  <div className="bg-amber-50 border border-amber-200 rounded p-2 mt-1">
                    <p className="text-xs text-amber-700 font-medium mb-1">⚠️ {txtNoAvailableSlots}</p>
                    <p className="text-xs text-amber-600 mb-1">
                      O serviço selecionado não tem horários configurados {(() => {
                        const dateObj = new Date(manualData.appointment_date + 'T00:00:00');
                        const dayNames = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
                        return `para ${dayNames[dateObj.getDay()]}`;
                      })()}.
                    </p>
                    <p className="text-xs text-amber-600 font-medium">
                      → Vá a Serviços e configure os horários de funcionamento.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 mt-2">
                    {availableTimeSlots.map(slot => (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => setManualData({...manualData, appointment_time: slot.time})}
                        className={`
                          relative px-2 py-2 rounded-lg text-xs font-semibold
                          transition-all duration-200 ease-out
                          ${manualData.appointment_time === slot.time
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/25 scale-105'
                            : slot.available
                              ? 'bg-white text-slate-700 hover:bg-slate-50 hover:scale-105 border border-slate-200 hover:border-blue-300'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50 line-through'
                          }
                        `}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="notes" className="text-xs">{txtNotes}</Label>
              <Textarea
                id="notes"
                value={manualData.notes}
                onChange={(e) => setManualData({...manualData, notes: e.target.value})}
                placeholder={txtObservations}
                rows={2}
                className="resize-none text-xs"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => createManualAppointmentMutation.mutate()}
                disabled={!manualData.service_id || !manualData.appointment_date || !manualData.appointment_time || createManualAppointmentMutation.isPending}
                className="flex-1 h-8 text-xs"
              >
                {createManualAppointmentMutation.isPending ? `${txtCreate}...` : txtCreate}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowManualForm(false)}
                className="h-8 text-xs"
              >
                {txtCancel}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {editingAppointment && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4" />
                Editar Marcação
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingAppointment(null)}
                className="h-6 w-6 p-0"
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-3">
            <div>
              <Label htmlFor="editName" className="text-xs">Nome</Label>
              <Input
                id="editName"
                defaultValue={editingAppointment.manual_name || ''}
                onChange={(e) => setEditingAppointment({...editingAppointment, manual_name: e.target.value})}
                placeholder="Nome do cliente"
                className="h-8 text-xs"
              />
            </div>

            <div>
              <Label htmlFor="editEmail" className="text-xs">Email</Label>
              <Input
                id="editEmail"
                type="text"
                inputMode="email"
                defaultValue={editingAppointment.user_email || ''}
                onChange={(e) => setEditingAppointment({...editingAppointment, user_email: e.target.value})}
                placeholder="email@exemplo.com"
                className="h-8 text-xs"
                autoComplete="off"
              />
            </div>

            <div>
              <Label htmlFor="editDate" className="text-xs">Data *</Label>
              <Input
                id="editDate"
                type="date"
                defaultValue={editingAppointment.appointment_date}
                onChange={(e) => setEditingAppointment({...editingAppointment, appointment_date: e.target.value})}
                className="h-8 text-xs"
              />
            </div>

            <div>
              <Label htmlFor="editTime" className="text-xs">Hora *</Label>
              <Input
                id="editTime"
                type="time"
                defaultValue={editingAppointment.appointment_time}
                onChange={(e) => setEditingAppointment({...editingAppointment, appointment_time: e.target.value})}
                className="h-8 text-xs"
              />
            </div>

            <div>
              <Label htmlFor="editNotes" className="text-xs">Notas</Label>
              <Textarea
                id="editNotes"
                defaultValue={editingAppointment.notes}
                onChange={(e) => setEditingAppointment({...editingAppointment, notes: e.target.value})}
                placeholder="Observações..."
                rows={2}
                className="resize-none text-xs"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => updateAppointmentMutation.mutate({ 
                  id: editingAppointment.id, 
                  data: {
                    manual_name: editingAppointment.manual_name,
                    user_email: editingAppointment.user_email,
                    appointment_date: editingAppointment.appointment_date,
                    appointment_time: editingAppointment.appointment_time,
                    notes: editingAppointment.notes
                  }
                })}
                disabled={updateAppointmentMutation.isPending}
                className="flex-1 h-8 text-xs bg-amber-600 hover:bg-amber-700"
              >
                {updateAppointmentMutation.isPending ? 'A guardar...' : 'Guardar Alterações'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditingAppointment(null)}
                className="h-8 text-xs"
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border border-slate-200 w-full">
          <TabsTrigger value="hoje" className="text-xs">{txtToday} ({todayAppointments.length})</TabsTrigger>
          <TabsTrigger value="proximas" className="text-xs">{txtUpcoming} ({upcomingAppointments.length})</TabsTrigger>
          <TabsTrigger value="historico" className="text-xs">{txtHistory}</TabsTrigger>
        </TabsList>

        <TabsContent value="hoje">
          {todayAppointments.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center text-slate-500 text-xs">
                {txtNoAppointmentsToday}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {todayAppointments.map(renderAppointment)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="proximas">
          {upcomingAppointments.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center text-slate-500 text-xs">
                {txtNoUpcomingAppointments}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {upcomingAppointments.map(renderAppointment)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="historico">
          <AppointmentHistory businessId={businessId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
