import { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useAutoTranslate } from "@/hooks/useTranslate";

export default function AppointmentReminders({ businessId }) {
  // Traduções para templates de email/SMS
  const txtSMSSent = useAutoTranslate('SMS Enviado', 'pt');
  const txtDefaultEmailTemplate = useAutoTranslate('Lembrete: Tem uma marcação amanhã às', 'pt');
  const txtReminderSubject = useAutoTranslate('Lembrete de Marcação', 'pt');
  const txtDefaultSMSTemplate = useAutoTranslate('Lembrete: Marcação amanhã às', 'pt');
  const { data: appointments } = useQuery({
    queryKey: ['upcoming-appointments', businessId],
    queryFn: () => base44.entities.Appointment.filter({
      business_id: businessId,
      status: { $in: ['agendado', 'confirmado'] }
    }),
    initialData: [],
    refetchInterval: 60000, // Check every minute
  });

  const { data: business } = useQuery({
    queryKey: ['business', businessId],
    queryFn: async () => {
      const businesses = await base44.entities.Business.filter({ id: businessId });
      return businesses[0];
    },
    enabled: !!businessId,
  });

  const sendSMS = async (phone, message) => {
    if (!business?.sms_gateway || business.sms_gateway === 'none') {
      return; // SMS not configured
    }

    // In production, this would make actual API calls to Twilio/Vonage
    // For now, we simulate it via email notification
    await base44.integrations.Core.SendEmail({
      to: business.email,
      subject: txtSMSSent,
      body: `[SMS] Para: ${phone}\nMensagem: ${message}\nGateway: ${business.sms_gateway}`
    });
  };

  useEffect(() => {
    // Guard: Wait for translations to load before sending reminders
    if (!appointments || !business) return;
    if (!txtDefaultEmailTemplate || !txtReminderSubject || !txtDefaultSMSTemplate || !txtSMSSent) return;

    appointments.forEach(async (appointment) => {
      const appointmentDate = new Date(appointment.appointment_date);
      const now = new Date();
      const hoursUntil = (appointmentDate - now) / (1000 * 60 * 60);

      // Send reminder 24 hours before
      if (hoursUntil <= 24 && hoursUntil > 23.5 && !appointment.reminder_sent) {
        // Send email reminder
        const emailBody = business.reminder_email_template || 
          `${txtDefaultEmailTemplate} ${appointment.appointment_time} - ${business.name}`;

        await base44.integrations.Core.SendEmail({
          to: appointment.user_email,
          subject: `${txtReminderSubject} - ${business.name}`,
          body: emailBody
        });

        // Send SMS reminder if configured
        if (business.sms_gateway !== 'none') {
          const smsBody = business.reminder_sms_template || 
            `${txtDefaultSMSTemplate} ${appointment.appointment_time} em ${business.name}`;
          
          await sendSMS(appointment.user_email, smsBody);
        }

        // Mark as sent
        await base44.entities.Appointment.update(appointment.id, {
          reminder_sent: true
        });
      }
    });
  }, [appointments, business, txtDefaultEmailTemplate, txtReminderSubject, txtDefaultSMSTemplate, txtSMSSent]);

  return null; // This is a background component
}