import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Clock, Euro, Calendar as CalendarIcon, CheckCircle2, Search } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { createPageUrl } from '@/utils';
import { toast } from "sonner";
import { useAutoTranslate } from '@/hooks/useTranslate';

export default function AppointmentBooking({ business, user, onComplete }) {
  const queryClient = useQueryClient();
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Translations
  const txtActiveAppointment = useAutoTranslate('Já tem uma marcação ativa. Aguarde alguns minutos.', 'pt');
  const txtBookingConfirmed = useAutoTranslate('Marcação confirmada com sucesso!', 'pt');
  const txtSearchService = useAutoTranslate('Pesquisar serviço...', 'pt');
  const txtNoServiceFound = useAutoTranslate('Nenhum serviço encontrado', 'pt');
  const txtClearSearch = useAutoTranslate('Limpar pesquisa', 'pt');
  const txtSelectService = useAutoTranslate('Selecione o Serviço', 'pt');
  const txtNoServicesAvailable = useAutoTranslate('Sem serviços disponíveis para agendamento', 'pt');
  const txtTolerance = useAutoTranslate('min tolerância', 'pt');
  const txtSelectDate = useAutoTranslate('Selecione a Data', 'pt');
  const txtSelectTime = useAutoTranslate('Selecione o Horário', 'pt');
  const txtNoSlotsAvailable = useAutoTranslate('Sem horários disponíveis para esta data', 'pt');
  const txtSummary = useAutoTranslate('Resumo da Marcação', 'pt');
  const txtService = useAutoTranslate('Serviço:', 'pt');
  const txtDate = useAutoTranslate('Data:', 'pt');
  const txtTime = useAutoTranslate('Hora:', 'pt');
  const txtDuration = useAutoTranslate('Duração:', 'pt');
  const txtDelayTolerance = useAutoTranslate('Tolerância de atraso:', 'pt');
  const txtPrice = useAutoTranslate('Preço:', 'pt');
  const txtNotes = useAutoTranslate('Observações (opcional)', 'pt');
  const txtAdditionalInfo = useAutoTranslate('Informações adicionais...', 'pt');
  const txtConfirmBooking = useAutoTranslate('Confirmar Marcação', 'pt');
  const txtConfirming = useAutoTranslate('A confirmar...', 'pt');

  const { data: rawServices } = useQuery({
    queryKey: ['services', business.id],
    queryFn: () => base44.entities.Service.filter({ 
      business_id: business.id,
      is_active: true 
    }),
    initialData: [],
  });

  const services = rawServices.map(service => {
    if (service.working_hours && Object.keys(service.working_hours).length > 0) {
      return service;
    }
    
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const working_hours = {};
    
    if (service.custom_schedules && Object.keys(service.custom_schedules).length > 0) {
      Object.entries(service.custom_schedules).forEach(([dayNum, schedule]) => {
        const dayName = dayNames[parseInt(dayNum)];
        working_hours[dayName] = {
          enabled: true,
          start: schedule.start || '09:00',
          end: schedule.end || '18:00',
          break_start: schedule.breaks?.[0]?.start || '',
          break_end: schedule.breaks?.[0]?.end || ''
        };
      });
      
      const available_days = [];
      dayNames.forEach((dayName, index) => {
        if (working_hours[dayName]?.enabled) {
          available_days.push(index);
        }
      });
      
      return { ...service, working_hours, available_days };
    }
    
    if (service.available_days && service.available_days.length > 0) {
      service.available_days.forEach(dayNum => {
        const dayName = dayNames[dayNum];
        working_hours[dayName] = {
          enabled: true,
          start: service.start_time || '09:00',
          end: service.end_time || '18:00',
          break_start: '',
          break_end: ''
        };
      });
      
      const available_days = [];
      dayNames.forEach((dayName, index) => {
        if (working_hours[dayName]?.enabled) {
          available_days.push(index);
        }
      });
      
      return { ...service, working_hours, available_days };
    }
    
    return service;
  });

  const { data: appointments } = useQuery({
    queryKey: ['appointments', business.id, selectedDate],
    queryFn: async () => {
      if (!selectedDate || !selectedService) return [];
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      return await base44.entities.Appointment.filter({
        business_id: business.id,
        service_id: selectedService.id,
        appointment_date: dateStr,
        status: { $in: ['agendado', 'confirmado'] }
      });
    },
    enabled: !!selectedDate && !!selectedService,
    initialData: [],
  });

  const { data: userAppointments } = useQuery({
    queryKey: ['user-appointments', user?.email],
    queryFn: () => base44.entities.Appointment.filter({
      user_email: user.email,
      status: { $in: ['agendado', 'confirmado', 'em_atendimento'] }
    }),
    initialData: [],
    enabled: !!user?.email,
  });

  const sendSMS = async (phone, message) => {
    if (!business?.sms_gateway || business.sms_gateway === 'none') {
      return;
    }

    await base44.integrations.Core.SendEmail({
      to: business.email,
      subject: 'SMS Enviado',
      body: `[SMS] Para: ${phone}\nMensagem: ${message}\nGateway: ${business.sms_gateway}`
    });
  };

  const bookMutation = useMutation({
    mutationFn: async (data) => {
      const now = new Date();
      const twentyMinutesAgo = new Date(now.getTime() - 20 * 60 * 1000);

      // ✅ CORRIGIDO: Só bloquear se for o MESMO serviço na MESMA empresa (anti-spam)
      // Permite fazer marcações em empresas diferentes sem problema
      const hasRecentSameServiceAppointment = userAppointments.some(apt => {
        const createdAt = new Date(apt.created_date);
        const isSameService = apt.service_id === data.service_id;
        const isSameBusiness = apt.business_id === data.business_id;
        const isRecent = createdAt >= twentyMinutesAgo;
        const isActive = ['agendado', 'confirmado', 'em_atendimento'].includes(apt.status);
        return isRecent && isActive && isSameService && isSameBusiness;
      });

      if (hasRecentSameServiceAppointment) {
        toast.error(txtActiveAppointment);
        throw new Error('Já tem uma marcação ativa');
      }

      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const appointment = await base44.entities.Appointment.create({
        ...data,
        management_token: token
      });

      // 🌐 Usar sempre domínio de produção para emails (Capacitor usa localhost/app.qzero.local)
      const productionDomain = 'https://waitless-qzero.com';
      const managementUrl = `${productionDomain}${createPageUrl(`AppointmentManage?token=${token}`)}`;
      
      const emailBody = business.confirmation_email_template || 
        `Olá! A sua marcação foi confirmada.\n\nDetalhes:\nServiço: ${selectedService.name}\nData: ${format(selectedDate, 'dd/MM/yyyy', { locale: pt })}\nHora: ${selectedTime}\n\nGerir marcação: ${managementUrl}`;

      await base44.integrations.Core.SendEmail({
        to: user.email,
        subject: `Confirmação de Marcação - ${business.name}`,
        body: emailBody
      });

      if (business.sms_gateway !== 'none') {
        const smsBody = business.confirmation_sms_template || 
          `Marcação confirmada: ${selectedService.name} em ${format(selectedDate, 'dd/MM/yyyy')} às ${selectedTime} - ${business.name}`;
        
        await sendSMS(user.email, smsBody); 
      }

      return appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['user-appointments'] });
      toast.success(txtBookingConfirmed);
      onComplete?.();
    },
    onError: (error) => {
      console.error('❌ Erro ao criar marcação:', error);
      if (error.message !== 'Já tem uma marcação ativa') {
        toast.error('Erro ao criar marcação. Tente novamente.');
      }
    }
  });

  const getScheduleForDate = (date) => {
    if (!selectedService) return null;
    
    const dayOfWeek = date.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    
    const workingHours = selectedService.working_hours || {};
    const hasWorkingHours = Object.keys(workingHours).length > 0;
    
    if (hasWorkingHours) {
      const daySchedule = workingHours[dayName];
      if (!daySchedule || !daySchedule.enabled) {
        return null;
      }
      
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
    
    return {
      start: selectedService.start_time || '09:00',
      end: selectedService.end_time || '18:00',
      breaks: []
    };
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

  const generateTimeSlots = () => {
    if (!selectedService || !selectedDate) return [];

    const schedule = getScheduleForDate(selectedDate);
    if (!schedule) return [];

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
      
      const isBooked = appointments.some(apt => {
        const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
        if (apt.appointment_date !== selectedDateStr) {
          return false;
        }
        
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
  };

  const handleBook = () => {
    console.log('🎫 handleBook chamado:', { 
      selectedService: selectedService?.id, 
      selectedDate, 
      selectedTime,
      user: user?.email 
    });
    
    if (!selectedService || !selectedDate || !selectedTime) {
      console.error('❌ handleBook: Campos não preenchidos');
      return;
    }

    bookMutation.mutate({
      business_id: business.id,
      service_id: selectedService.id,
      user_email: user.email,
      appointment_date: format(selectedDate, 'yyyy-MM-dd'),
      appointment_time: selectedTime,
      status: 'agendado',
      notes: notes,
      duration: selectedService.duration,
      buffer_time: selectedService.buffer_time || 0
    });
  };

  const isDayAvailable = (date) => {
    if (!selectedService) return false;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    if (selectedService.blocked_dates?.includes(dateStr)) {
      return false;
    }
    
    const dayOfWeek = date.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    
    const workingHours = selectedService.working_hours || {};
    const hasWorkingHours = Object.keys(workingHours).length > 0;
    
    if (hasWorkingHours) {
      const daySchedule = workingHours[dayName];
      return daySchedule && daySchedule.enabled;
    }
    
    return true;
  };

  const timeSlots = generateTimeSlots();
  
  const filteredServices = services.filter(service =>
    service && ( // ✅ PROTEÇÃO: Verificar se service existe
      service.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.category?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            {txtSelectService}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <p className="text-center text-slate-500 py-8">
              {txtNoServicesAvailable}
            </p>
          ) : (
            <>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder={txtSearchService}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 text-sm"
                />
              </div>
              
              {filteredServices.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-500 mb-3">{txtNoServiceFound}</p>
                  <Button size="sm" variant="outline" onClick={() => setSearchTerm('')}>
                    {txtClearSearch}
                  </Button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {filteredServices.map(service => (
                    <Card
                      key={service.id}
                      className={`cursor-pointer transition-all ${
                        selectedService?.id === service.id
                          ? 'border-2 border-sky-500 shadow-lg'
                          : 'border hover:border-slate-300'
                      }`}
                      onClick={() => {
                        setSelectedService(service);
                        setSelectedDate(null);
                        setSelectedTime(null);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-slate-900">{service.name}</h4>
                          {selectedService?.id === service.id && (
                            <CheckCircle2 className="w-5 h-5 text-sky-500" />
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mb-3">{service.description}</p>
                        <div className="flex gap-3 text-xs">
                          <Badge variant="secondary" className="gap-1">
                            <Clock className="w-3 h-3" />
                            {service.duration} min
                          </Badge>
                          {service.buffer_time > 0 && (
                            <Badge variant="outline" className="gap-1 text-amber-700 border-amber-300">
                              <Clock className="w-3 h-3" />
                              {service.buffer_time} {txtTolerance}
                            </Badge>
                          )}
                          {service.price > 0 && (
                            <Badge variant="secondary" className="gap-1">
                              <Euro className="w-3 h-3" />
                              {service.price.toFixed(2)}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {selectedService && (
        <Card className="border-0 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50/50 border-b">
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <CalendarIcon className="w-5 h-5 text-blue-500" />
              {txtSelectDate}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center p-6 bg-white">
            <div className="w-full max-w-sm">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setSelectedTime(null);
                }}
                disabled={(date) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return date < today || !isDayAvailable(date);
                }}
                locale={pt}
                className="rounded-2xl border border-slate-200 shadow-sm bg-white p-2"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {selectedDate && (
        <Card className="border-0 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-emerald-50/50 border-b">
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <Clock className="w-5 h-5 text-emerald-500" />
              {txtSelectTime} - {format(selectedDate, "dd 'de' MMMM", { locale: pt })}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 bg-white">
            {timeSlots.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">{txtNoSlotsAvailable}</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                {timeSlots.map(slot => (
                  <button
                    key={slot.time}
                    disabled={!slot.available}
                    onClick={() => setSelectedTime(slot.time)}
                    className={`
                      relative px-3 py-3 rounded-xl text-sm font-semibold
                      transition-all duration-200 ease-out
                      ${selectedTime === slot.time
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105 ring-2 ring-blue-400/30'
                        : slot.available
                          ? 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:scale-105 hover:shadow-md border border-slate-200'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50 line-through'
                      }
                    `}
                  >
                    {slot.time}
                    {selectedTime === slot.time && (
                      <CheckCircle2 className="absolute -top-1 -right-1 w-4 h-4 text-white bg-blue-600 rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedTime && (
        <Card className="border-0 shadow-lg bg-gradient-to-br from-sky-50 to-blue-50">
          <CardHeader>
            <CardTitle>{txtSummary}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-white rounded-xl">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">{txtService}</span>
                  <span className="font-semibold text-slate-900">{selectedService.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">{txtDate}</span>
                  <span className="font-semibold text-slate-900">
                    {format(selectedDate, "dd/MM/yyyy", { locale: pt })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">{txtTime}</span>
                  <span className="font-semibold text-slate-900">{selectedTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">{txtDuration}</span>
                  <span className="font-semibold text-slate-900">{selectedService.duration} min</span>
                </div>
                {selectedService.buffer_time > 0 && (
                  <div className="flex justify-between text-amber-700">
                    <span className="text-slate-600">{txtDelayTolerance}</span>
                    <span className="font-semibold text-amber-700">{selectedService.buffer_time} min</span>
                  </div>
                )}
                {selectedService.price > 0 && (
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-slate-600">{txtPrice}</span>
                    <span className="font-bold text-slate-900">€{selectedService.price.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="notes">{txtNotes}</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={txtAdditionalInfo}
                rows={3}
              />
            </div>

            <Button
              className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 py-6 text-lg"
              onClick={handleBook}
              disabled={bookMutation.isPending}
            >
              {bookMutation.isPending ? txtConfirming : txtConfirmBooking}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}