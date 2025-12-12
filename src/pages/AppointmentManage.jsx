import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getUploadUrl } from "@/utils/apiConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { 
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Star,
  ArrowLeft
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useAutoTranslate } from "@/hooks/useTranslate";

export default function AppointmentManagePage() {
  const txtAppointmentNotFound = useAutoTranslate('Marcação não encontrada', 'pt');
  const txtInvalidToken = useAutoTranslate('Token inválido ou marcação já foi removida', 'pt');
  const txtBackToDashboard = useAutoTranslate('Voltar ao Dashboard', 'pt');
  const txtConfirmCancel = useAutoTranslate('Tem certeza que deseja cancelar esta marcação?', 'pt');
  const txtMyAppointments = useAutoTranslate('Minhas Marcações', 'pt');
  const txtAppointmentDetails = useAutoTranslate('Detalhes da Marcação', 'pt');
  const txtDate = useAutoTranslate('Data', 'pt');
  const txtDateNotAvailable = useAutoTranslate('Data não disponível', 'pt');
  const txtHour = useAutoTranslate('Hora', 'pt');
  const txtService = useAutoTranslate('Serviço', 'pt');
  const txtDuration = useAutoTranslate('Duração:', 'pt');
  const txtMinutes = useAutoTranslate('minutos', 'pt');
  const txtTolerance = useAutoTranslate('Tolerância:', 'pt');
  const txtMinutesToAppear = useAutoTranslate('minutos para comparecer', 'pt');
  const txtNotes = useAutoTranslate('Observações', 'pt');
  const txtCancelling = useAutoTranslate('Cancelando...', 'pt');
  const txtCancelAppointment = useAutoTranslate('Cancelar Marcação', 'pt');
  const txtHowWasService = useAutoTranslate('Como foi o atendimento?', 'pt');
  const txtRating = useAutoTranslate('Avaliação', 'pt');
  const txtCommentOptional = useAutoTranslate('Comentário (opcional)', 'pt');
  const txtTellExperience = useAutoTranslate('Conte-nos sobre sua experiência...', 'pt');
  const txtSending = useAutoTranslate('Enviando...', 'pt');
  const txtSubmitRating = useAutoTranslate('Enviar Avaliação', 'pt');
  const txtYourRating = useAutoTranslate('Sua avaliação:', 'pt');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  const { data: appointment, isLoading } = useQuery({
    queryKey: ['appointment-by-token', token],
    queryFn: async () => {
      const appointments = await base44.entities.Appointment.filter({ management_token: token });
      const apt = appointments[0];
      
      // Show feedback form if completed and no rating yet
      if (apt?.status === 'concluido' && !apt.rating) {
        setShowFeedback(true);
      }
      
      return apt;
    },
    enabled: !!token,
  });

  const { data: business } = useQuery({
    queryKey: ['business', appointment?.business_id],
    queryFn: async () => {
      const businesses = await base44.entities.Business.filter({ id: appointment.business_id });
      return businesses[0];
    },
    enabled: !!appointment?.business_id,
  });

  const { data: service } = useQuery({
    queryKey: ['service', appointment?.service_id],
    queryFn: async () => {
      const services = await base44.entities.Service.filter({ id: appointment.service_id });
      return services[0];
    },
    enabled: !!appointment?.service_id,
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Appointment.update(appointment.id, {
        status: 'cancelado'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment-by-token'] });
    },
  });

  const submitFeedbackMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Appointment.update(appointment.id, {
        rating,
        feedback
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment-by-token'] });
      setShowFeedback(false);
    },
  });

  const handleCancel = () => {
    if (confirm(txtConfirmCancel)) {
      cancelMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 p-4">
        <div className="max-w-2xl mx-auto">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 p-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="py-16 text-center">
              <AlertCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-slate-900 mb-2">{txtAppointmentNotFound}</h3>
              <p className="text-slate-600 mb-6">{txtInvalidToken}</p>
              <Button onClick={() => navigate(createPageUrl('Dashboard'))}>
                {txtBackToDashboard}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const appointmentDate = (() => {
    try {
      if (!appointment.appointment_date) return new Date();
      const date = new Date(appointment.appointment_date);
      if (isNaN(date.getTime())) return new Date();
      return date;
    } catch (e) {
      console.warn('Erro ao criar data da marcação:', e);
      return new Date();
    }
  })();
  const isPast = appointmentDate < new Date();

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50">
      <div className="max-w-2xl mx-auto px-4 py-4">
        <Button
          variant="outline"
          className="mb-6 gap-2"
          onClick={() => navigate(createPageUrl('MyAppointments'))}
        >
          <ArrowLeft className="w-4 h-4" />
          {txtMyAppointments}
        </Button>

        <Card className="border-0 shadow-2xl mb-6">
          <div className={`h-2 bg-gradient-to-r ${
            appointment.status === 'agendado' ? 'from-blue-500 to-cyan-500' :
            appointment.status === 'confirmado' ? 'from-green-500 to-emerald-500' :
            appointment.status === 'concluido' ? 'from-purple-500 to-pink-500' :
            'from-red-500 to-rose-500'
          }`} />
          
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{txtAppointmentDetails}</CardTitle>
              <Badge className={
                appointment.status === 'agendado' ? 'bg-blue-100 text-blue-700' :
                appointment.status === 'confirmado' ? 'bg-green-100 text-green-700' :
                appointment.status === 'concluido' ? 'bg-purple-100 text-purple-700' :
                'bg-red-100 text-red-700'
              }>
                {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Business Info */}
            <div className="bg-slate-50 rounded-xl p-6">
              <div className="flex items-start gap-4">
                {business?.logo_url && (
                  <img 
                    src={getUploadUrl(business.logo_url)} 
                    alt={business.name}
                    className="w-16 h-16 rounded-lg object-contain bg-white p-2"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-bold text-xl text-slate-900 mb-1">{business?.name}</h3>
                  {business?.address && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <MapPin className="w-4 h-4" />
                      <span>{business.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Appointment Details */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarIcon className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-slate-600">{txtDate}</span>
                </div>
                <div className="text-xl font-bold text-blue-900">
                  {(() => {
                    try {
                      if (!appointmentDate || isNaN(appointmentDate.getTime())) return txtDateNotAvailable;
                      return format(appointmentDate, "dd 'de' MMMM 'de' yyyy", { locale: pt });
                    } catch (e) {
                      console.warn('Erro ao formatar data:', e);
                      return txtDateNotAvailable;
                    }
                  })()}
                </div>
              </div>

              <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-purple-600" />
                  <span className="text-sm text-slate-600">{txtHour}</span>
                </div>
                <div className="text-xl font-bold text-purple-900">
                  {appointment.appointment_time}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl">
              <h4 className="font-semibold text-slate-900 mb-2">{txtService}</h4>
              <p className="text-slate-700">{service?.name}</p>
              {service?.description && (
                <p className="text-sm text-slate-600 mt-1">{service.description}</p>
              )}
              <div className="flex flex-col gap-2 mt-2">
                {service?.duration && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Clock className="w-4 h-4" />
                    <span>{txtDuration} {service.duration} {txtMinutes}</span>
                  </div>
                )}
                {service?.tolerance_time && appointment.status === 'confirmado' && (
                  <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                    <Clock className="w-4 h-4" />
                    <span>{txtTolerance} {service.tolerance_time} {txtMinutesToAppear}</span>
                  </div>
                )}
              </div>
            </div>

            {appointment.notes && (
              <div className="p-4 bg-slate-50 rounded-xl">
                <h4 className="font-semibold text-slate-900 mb-2">{txtNotes}</h4>
                <p className="text-slate-700">{appointment.notes}</p>
              </div>
            )}

            {/* Actions */}
            {['agendado', 'confirmado'].includes(appointment.status) && !isPast && (
              <Button
                variant="outline"
                className="w-full border-red-200 text-red-600 hover:bg-red-50"
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
              >
                <XCircle className="w-4 h-4 mr-2" />
                {cancelMutation.isPending ? txtCancelling : txtCancelAppointment}
              </Button>
            )}

            {/* Feedback Form */}
            {showFeedback && (
              <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl">
                <h4 className="font-bold text-lg text-slate-900 mb-4">{txtHowWasService}</h4>
                
                <Label className="mb-2 block">{txtRating}</Label>
                <div className="flex gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className={`p-2 rounded-lg transition-all ${
                        rating >= star 
                          ? 'bg-amber-500 text-white' 
                          : 'bg-white text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      <Star className="w-6 h-6" fill={rating >= star ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>

                <Label htmlFor="feedback" className="mb-2 block">{txtCommentOptional}</Label>
                <Textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder={txtTellExperience}
                  rows={3}
                  className="mb-4"
                />

                <Button
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                  onClick={() => submitFeedbackMutation.mutate()}
                  disabled={rating === 0 || submitFeedbackMutation.isPending}
                >
                  {submitFeedbackMutation.isPending ? txtSending : txtSubmitRating}
                </Button>
              </div>
            )}

            {/* Show rating if already submitted */}
            {appointment.rating && !showFeedback && (
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-slate-600">{txtYourRating}</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star 
                        key={star} 
                        className={`w-4 h-4 ${appointment.rating >= star ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`}
                      />
                    ))}
                  </div>
                </div>
                {appointment.feedback && (
                  <p className="text-sm text-slate-700 italic">&quot;{appointment.feedback}&quot;</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}