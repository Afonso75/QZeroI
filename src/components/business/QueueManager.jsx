import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  PlayCircle, 
  PauseCircle, 
  StopCircle,
  PhoneCall,
  CheckCircle2,
  Users,
  Clock,
  Settings,
  TrendingUp,
  UserPlus,
  Copy,
  ExternalLink
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import TicketPanel from "./TicketPanel";
import NotificationSettings from "./NotificationSettings";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import { validateQueueOperating } from "@/utils/queueValidation";
import { checkAndResetQueueForNewDay } from "@/utils/queueReset";
import { sendEmail } from "@/services/emailService";
import { sendSMS } from "@/api/functions"; // CORREÇÃO: Importar sendSMS
import TicketHistory from "./TicketHistory";
import { useAutoTranslate } from "@/hooks/useTranslate";
import { safeFetch } from "@/utils/apiConfig";

export default function QueueManager({ queue, tickets }) {
  const queryClient = useQueryClient();
  const [showSettings, setShowSettings] = useState(false);
  const [avgTime, setAvgTime] = useState(queue.average_service_time);
  const [toleranceTime, setToleranceTime] = useState(queue.tolerance_time || 15);
  const [showManualTicket, setShowManualTicket] = useState(false);
  const [manualEmail, setManualEmail] = useState("");
  const [manualName, setManualName] = useState("");
  const [createdTicketId, setCreatedTicketId] = useState(null);
  
  // Traduções
  const txtQueuePaused = useAutoTranslate('Senha pausada com sucesso', 'pt');
  const txtQueueResumed = useAutoTranslate('Senha retomada com sucesso', 'pt');
  const txtSettingsUpdated = useAutoTranslate('Configurações atualizadas', 'pt');
  const txtErrorUpdatingQueue = useAutoTranslate('Erro ao atualizar senha', 'pt');
  const txtEmailRequired = useAutoTranslate('Email é obrigatório para criar senha manual', 'pt');
  const txtInPersonCustomer = useAutoTranslate('Cliente Presencial', 'pt');
  const txtTicketDeleted = useAutoTranslate('Senha eliminada com sucesso', 'pt');
  const txtErrorDeletingTicket = useAutoTranslate('Erro ao eliminar senha', 'pt');
  const txtLinkCopied = useAutoTranslate('Link copiado!', 'pt');
  const txtOpen = useAutoTranslate('Aberta', 'pt');
  const txtPaused = useAutoTranslate('Pausada', 'pt');
  const txtClosed = useAutoTranslate('Fechada', 'pt');
  const txtAverageTime = useAutoTranslate('Tempo Médio (min)', 'pt');
  const txtTolerance = useAutoTranslate('Tolerância (min)', 'pt');
  const txtSave = useAutoTranslate('Guardar', 'pt');
  const txtManagement = useAutoTranslate('Gestão', 'pt');
  const txtHistory = useAutoTranslate('Histórico', 'pt');
  const txtWaiting = useAutoTranslate('Aguardando', 'pt');
  const txtAttending = useAutoTranslate('Atendendo', 'pt');
  const txtCurrent = useAutoTranslate('Atual', 'pt');
  const txtLast = useAutoTranslate('Última', 'pt');
  const txtNoTickets = useAutoTranslate('Sem senhas', 'pt');
  const txtCalling = useAutoTranslate('A chamar...', 'pt');
  const txtCall = useAutoTranslate('Chamar', 'pt');
  const txtManualTicket = useAutoTranslate('Senha Manual', 'pt');
  const txtEmailRequired2 = useAutoTranslate('Email *', 'pt');
  const txtNameOptional = useAutoTranslate('Nome (opcional)', 'pt');
  const txtCreating = useAutoTranslate('Criando...', 'pt');
  const txtCreate = useAutoTranslate('Criar', 'pt');
  const txtTicketCreatedEmailSent = useAutoTranslate('criada! Email enviado com sucesso.', 'pt');
  const txtTicketCreatedEmailError = useAutoTranslate('criada, mas houve erro ao enviar o email. Partilhe o link manualmente.', 'pt');
  const txtTicketCreatedSuccess = useAutoTranslate('criada com sucesso!', 'pt');
  const txtTicketCreatedQR = useAutoTranslate('Senha Criada! Mostre este QR Code ao cliente:', 'pt');
  const txtClientCanScan = useAutoTranslate('O cliente pode escanear para acompanhar a senha', 'pt');
  const txtCopyLinkAlt = useAutoTranslate('Copiar Link (alternativa)', 'pt');
  const txtTickets = useAutoTranslate('Senhas', 'pt');

  const activeTickets = tickets.filter(t => ['aguardando', 'chamado'].includes(t.status));
  const attendingTickets = tickets.filter(t => t.status === 'atendendo');

  useEffect(() => {
    if (!queue || !tickets?.length) return;

    const expireOldTickets = async () => {
      const now = new Date();
      const currentToleranceTime = queue.tolerance_time || 15;
      const expirationTimeMs = currentToleranceTime * 60 * 1000;
      
      const oldTickets = tickets.filter(t => {
        if (!t || t.status !== 'chamado' || !t.called_at) return false;
        
        const calledAt = new Date(t.called_at);
        const ageMs = now - calledAt;
        
        return ageMs > expirationTimeMs;
      });

      for (const ticket of oldTickets) {
        await base44.entities.Ticket.update(ticket.id, {
          status: 'cancelado',
          completed_at: new Date().toISOString()
        });
      }

      if (oldTickets.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['business-tickets'] });
        queryClient.invalidateQueries({ queryKey: ['business-ticket-history'] });
      }
    };

    expireOldTickets();
    const interval = setInterval(expireOldTickets, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [tickets, queryClient, queue]);

  useEffect(() => {
    if (!queue || !tickets?.length) return;

    const autoCompleteAttendingTickets = async () => {
      const now = new Date();
      const avgServiceTimeMs = (queue.average_service_time || 15) * 60 * 1000;
      
      const attendingTickets = tickets.filter(t => t && t.status === 'atendendo');
      
      const ticketsNeedingTimestamp = attendingTickets.filter(t => !t.attending_started_at);
      for (const ticket of ticketsNeedingTimestamp) {
        console.log(`⏰ Migrando senha #${ticket.ticket_number} - adicionando attending_started_at`);
        await base44.entities.Ticket.update(ticket.id, {
          attending_started_at: new Date().toISOString()
        });
      }
      
      const ticketsToComplete = attendingTickets.filter(t => {
        if (!t.attending_started_at) return false;
        
        const attendingStartedAt = new Date(t.attending_started_at);
        const attendingDuration = now - attendingStartedAt;
        const shouldComplete = attendingDuration >= avgServiceTimeMs;
        
        if (shouldComplete) {
          console.log(`✅ Auto-concluindo senha #${t.ticket_number} - em atendimento há ${Math.round(attendingDuration / 60000)} minutos`);
        }
        
        return shouldComplete;
      });

      for (const ticket of ticketsToComplete) {
        await base44.entities.Ticket.update(ticket.id, {
          status: 'concluido',
          completed_at: new Date().toISOString()
        });
      }

      if (ticketsNeedingTimestamp.length > 0 || ticketsToComplete.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['business-tickets'] });
        queryClient.invalidateQueries({ queryKey: ['business-ticket-history'] });
      }
    };

    autoCompleteAttendingTickets();
    const interval = setInterval(autoCompleteAttendingTickets, 30 * 1000);

    return () => clearInterval(interval);
  }, [tickets, queryClient, queue]);

  useEffect(() => {
    if (!queue?.notifications_enabled || !queue?.notification_settings || !activeTickets?.length) return;
    
    const advanceNotice = queue.notification_settings.advance_notice || 2;
    const nextNumber = queue.current_number + 1;
    
    activeTickets.forEach(async (ticket) => {
      if (!ticket || !ticket.ticket_number) return;
      
      const ticketsAhead = ticket.ticket_number - nextNumber;
      
      if (ticketsAhead === advanceNotice && ticket.status === 'aguardando') {
        const message = `Quase sua vez! Faltam ${advanceNotice} senhas. Senha #${ticket.ticket_number} - ${queue.name}`;
        
        if (queue.notification_settings.email && ticket.user_email) {
          try {
            await base44.integrations.Core.SendEmail({
              to: ticket.user_email,
              subject: `Quase sua vez - ${queue.name}`,
              body: message
            });
            console.log(`📧 Email enviado para ${ticket.user_email}: ${message}`);
          } catch (error) {
            console.error('Email error:', error);
          }
        }
        
        if (queue.notification_settings.sms && ticket.user_phone) {
          await sendSMS(ticket.user_phone, message);
          console.log(`📱 SMS enviado para ${ticket.user_phone}: ${message}`);
        }
        
        // ✅ Push notifications são enviadas via Firebase (não via entity local)
      }
    });
  }, [queue?.current_number, activeTickets, queue?.notifications_enabled, queue?.notification_settings]);

  const updateQueueMutation = useMutation({
    mutationFn: async (updates) => {
      await base44.entities.Queue.update(queue.id, updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['business-queues'] });
      
      // Feedback específico baseado na atualização
      if (variables.status === 'pausada') {
        toast.success(txtQueuePaused);
      } else if (variables.status === 'aberta') {
        toast.success(txtQueueResumed);
      } else if (variables.average_service_time || variables.tolerance_time) {
        toast.success(txtSettingsUpdated);
      }
    },
    onError: (error) => {
      console.error('Error updating queue:', error);
      toast.error(txtErrorUpdatingQueue);
    },
  });

  const updateTicketMutation = useMutation({
    mutationFn: async ({ ticketId, updates }) => {
      await base44.entities.Ticket.update(ticketId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['business-ticket-history'] });
    },
  });

  const createManualTicketMutation = useMutation({
    mutationFn: async () => {
      if (!manualEmail || !manualEmail.includes('@')) {
        toast.error(txtEmailRequired);
        throw new Error('Email obrigatório');
      }

      const validation = validateQueueOperating(queue);
      if (!validation.isOperating) {
        toast.error(validation.reason);
        throw new Error(validation.reason);
      }
      
      // Resetar fila se for um novo dia
      const updatedQueue = await checkAndResetQueueForNewDay(queue);
      
      // Atualizar cache do React Query para evitar resets múltiplos
      queryClient.setQueryData(['business-queues'], (oldQueues) => 
        oldQueues?.map(q => q.id === updatedQueue.id ? updatedQueue : q) || oldQueues
      );
      
      const nextNumber = updatedQueue.last_issued_number + 1;
      const position = activeTickets.length + 1;
      const estimatedTime = position * queue.average_service_time;

      const ticket = await base44.entities.Ticket.create({
        queue_id: queue.id,
        business_id: queue.business_id,
        user_email: manualEmail,
        user_phone: null,
        ticket_number: nextNumber,
        status: 'aguardando',
        estimated_time: estimatedTime,
        position: position,
        is_manual: true,
        manual_name: manualName || txtInPersonCustomer
      });

      await base44.entities.Queue.update(updatedQueue.id, {
        last_issued_number: nextNumber
      });

      // 🌐 Usar sempre domínio de produção para emails (Capacitor usa localhost/app.qzero.local)
      const productionDomain = 'https://waitless-qzero.com';
      const publicUrl = `${productionDomain}${createPageUrl(`TicketPublic?id=${ticket.id}`)}`;
      const attemptedEmail = !!(manualEmail && manualEmail.includes('@'));
      let notificationSent = { email: false };

      if (attemptedEmail) {
        const emailBody = `Olá ${manualName || 'Cliente'}!\n\nA sua senha foi criada com sucesso.\n\nDetalhes:\nSenha: #${ticket.ticket_number}\nFila: ${queue.name}\nPosição: ${position}\nTempo Estimado: ~${estimatedTime} minutos\n\nAcompanhe sua senha em tempo real:\n${publicUrl}\n\nMantenha esta página aberta para receber atualizações.\n\nObrigado!`;

        console.log('📧 Tentando enviar email via Resend para:', manualEmail);
        const emailResult = await sendEmail({
          to: manualEmail,
          subject: `Senha #${ticket.ticket_number} - ${queue.name}`,
          body: emailBody
        });
        
        notificationSent.email = emailResult.success;
        if (emailResult.success) {
          console.log('✅ Email enviado com sucesso via Resend');
        } else {
          console.error('❌ Erro ao enviar email:', emailResult.error);
        }
      }

      return { ticket, notificationSent, attemptedEmail };
    },
    onSuccess: (data) => {
      const { ticket, notificationSent, attemptedEmail } = data;
      queryClient.invalidateQueries({ queryKey: ['business-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['business-queues'] });
      setManualEmail("");
      setManualName("");
      setCreatedTicketId(ticket.id);
      
      if (attemptedEmail && notificationSent.email) {
        toast.success(`Senha #${ticket.ticket_number} ${txtTicketCreatedEmailSent}`);
      } else if (attemptedEmail && !notificationSent.email) {
        toast.warning(`Senha #${ticket.ticket_number} ${txtTicketCreatedEmailError}`);
      } else {
        toast.success(`Senha #${ticket.ticket_number} ${txtTicketCreatedSuccess}`);
      }
    },
  });

  const deleteTicketMutation = useMutation({
    mutationFn: async (ticketId) => {
      await base44.entities.Ticket.delete(ticketId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-tickets'] });
      toast.success(txtTicketDeleted);
    },
    onError: () => {
      toast.error(txtErrorDeletingTicket);
    },
  });

  const callNextMutation = useMutation({
    mutationFn: async () => {
      const nextNumber = queue.current_number + 1;
      
      const skippedTickets = tickets.filter(t => 
        t && t.ticket_number < nextNumber && 
        ['aguardando', 'chamado'].includes(t.status)
      );

      for (const ticket of skippedTickets) {
        await base44.entities.Ticket.update(ticket.id, {
          status: 'cancelado',
          completed_at: new Date().toISOString()
        });
      }
      
      const nextTicket = tickets.find(t => 
        t && t.ticket_number === nextNumber && 
        t.status === 'aguardando'
      );

      if (nextTicket) {
        await base44.entities.Ticket.update(nextTicket.id, {
          status: 'chamado',
          called_at: new Date().toISOString()
        });

        const message = `É sua vez! Senha #${nextNumber} chamada. Dirija-se ao ${queue.name}.`;

        if (queue.notifications_enabled) {
          if (queue.notification_settings?.email && nextTicket.user_email) {
            try {
              await base44.integrations.Core.SendEmail({
                to: nextTicket.user_email,
                subject: 'É a sua vez!',
                body: `Senha #${nextNumber} foi chamada! Dirija-se ao atendimento em ${queue.name}.`
              });
              console.log(`📧 Email "É a sua vez!" enviado para ${nextTicket.user_email}`);
            } catch (error) {
              console.error('Email error:', error);
            }
          }
          
          if (queue.notification_settings?.sms && nextTicket.user_phone) {
            await sendSMS(nextTicket.user_phone, message);
            console.log(`📱 SMS "É a sua vez!" enviado para ${nextTicket.user_phone}`);
          }
        }

        // 📱 PUSH NOTIFICATION: "A sua senha foi chamada!" (com tempo de tolerância)
        if (nextTicket.user_email) {
          try {
            await safeFetch('/api/push-notifications/ticket-called', {
              method: 'POST',
              body: JSON.stringify({
                userEmail: nextTicket.user_email,
                queueName: queue.name,
                ticketNumber: nextNumber,
                businessName: queue.company_name || '',
                toleranceMinutes: queue.tolerance_time || 15
              })
            });
            console.log(`📱 Push "A sua senha foi chamada!" enviado para ${nextTicket.user_email} (tolerância: ${queue.tolerance_time || 15}min)`);
          } catch (error) {
            console.error('Push notification error:', error);
          }
        }
      }

      // 📱 PUSH NOTIFICATION: "A sua vez está a chegar!" - 2 senhas antes
      const ticketTwoAhead = tickets.find(t => 
        t && t.ticket_number === (nextNumber + 2) && 
        t.status === 'aguardando'
      );

      if (ticketTwoAhead && ticketTwoAhead.user_email) {
        try {
          await safeFetch('/api/push-notifications/queue-alert', {
            method: 'POST',
            body: JSON.stringify({
              userEmail: ticketTwoAhead.user_email,
              queueName: queue.name,
              ticketNumber: ticketTwoAhead.ticket_number,
              position: 2,
              businessName: queue.company_name || ''
            })
          });
          console.log(`📱 Push "A sua vez está a chegar!" enviado para ${ticketTwoAhead.user_email} (faltam 2 senhas)`);
        } catch (error) {
          console.error('Push notification error:', error);
        }
      }

      await base44.entities.Queue.update(queue.id, {
        current_number: nextNumber
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['business-queues'] });
    },
  });

  const toggleQueueStatus = () => {
    const newStatus = queue.status === "aberta" ? "pausada" : "aberta";
    updateQueueMutation.mutate({ status: newStatus });
  };

  const updateSettings = () => {
    updateQueueMutation.mutate({ 
      average_service_time: parseInt(avgTime),
      tolerance_time: parseInt(toleranceTime)
    });
    setShowSettings(false);
  };

  const copyTicketLink = (ticketId) => {
    // 🌐 Usar sempre domínio de produção para links partilhados
    const productionDomain = 'https://waitless-qzero.com';
    const link = `${productionDomain}${createPageUrl('TicketPublic')}?id=${ticketId}`;
    navigator.clipboard.writeText(link);
    toast.success(txtLinkCopied);
  };

  const statusConfig = {
    aberta: { 
      color: "bg-green-100 text-green-700 border-green-200", 
      icon: PlayCircle,
      label: txtOpen 
    },
    pausada: { 
      color: "bg-amber-100 text-amber-700 border-amber-200", 
      icon: PauseCircle,
      label: txtPaused 
    },
    fechada: { 
      color: "bg-red-100 text-red-700 border-red-200", 
      icon: StopCircle,
      label: txtClosed 
    }
  };

  const status = statusConfig[queue.status] || statusConfig.aberta;
  const StatusIcon = status.icon;

  return (
    <Card className="border-0 shadow-sm w-full overflow-hidden">
      <CardHeader className="pb-1 border-b p-1.5">
        <div className="flex justify-between items-start gap-1 w-full">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 mb-0.5 flex-wrap">
              <CardTitle className="text-xs truncate">{queue.name}</CardTitle>
              <Badge className={`${status.color} text-xs h-4 px-1 py-0 flex-shrink-0`}>
                <StatusIcon className="w-2 h-2 mr-0.5" />
                {status.label}
              </Badge>
            </div>
          </div>
          
          <div className="flex gap-0.5 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="h-5 w-5 p-0"
            >
              <Settings className="w-2.5 h-2.5" />
            </Button>
            <Button
              variant={queue.status === "aberta" ? "outline" : "default"}
              size="sm"
              onClick={toggleQueueStatus}
              disabled={updateQueueMutation.isPending}
              className={`h-5 w-5 p-0 ${queue.status === "aberta" ? "border-amber-300 text-amber-700" : ""}`}
            >
              {queue.status === "aberta" ? (
                <PauseCircle className="w-2.5 h-2.5" />
              ) : (
                <PlayCircle className="w-2.5 h-2.5" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {showSettings && (
        <div className="p-1.5 bg-slate-50 border-b space-y-1">
          <div>
            <Label htmlFor="avgTime" className="mb-0.5 block text-xs">{txtAverageTime}</Label>
            <Input
              id="avgTime"
              type="number"
              min="1"
              value={avgTime}
              onChange={(e) => setAvgTime(e.target.value)}
              className="h-6 text-xs"
            />
          </div>
          <div>
            <Label htmlFor="toleranceTime" className="mb-0.5 block text-xs">{txtTolerance}</Label>
            <Input
              id="toleranceTime"
              type="number"
              min="5"
              value={toleranceTime}
              onChange={(e) => setToleranceTime(e.target.value)}
              className="h-6 text-xs"
            />
          </div>
          <Button onClick={updateSettings} size="sm" className="w-full h-6 text-xs">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {txtSave}
          </Button>
        </div>
      )}

      <CardContent className="p-0 w-full">
        <Tabs defaultValue="main" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b px-1 h-6 bg-transparent">
            <TabsTrigger value="main" className="text-xs px-1 h-5">{txtManagement}</TabsTrigger>
            <TabsTrigger value="history" className="text-xs px-1 h-5">{txtHistory}</TabsTrigger>
          </TabsList>

          <TabsContent value="main" className="p-1.5 w-full">
            <div className="grid grid-cols-2 gap-1 mb-1.5">
              <div className="p-1 bg-gradient-to-br from-blue-50 to-sky-50 rounded">
                <div className="flex items-center gap-0.5 mb-0.5">
                  <Users className="w-2 h-2 text-blue-600" />
                  <div className="text-sm font-bold text-blue-600">{activeTickets.length}</div>
                </div>
                <div className="text-xs text-slate-600 leading-none">{txtWaiting}</div>
              </div>

              <div className="p-1 bg-gradient-to-br from-purple-50 to-pink-50 rounded">
                <div className="flex items-center gap-0.5 mb-0.5">
                  <Clock className="w-2 h-2 text-purple-600" />
                  <div className="text-sm font-bold text-purple-600">{attendingTickets.length}</div>
                </div>
                <div className="text-xs text-slate-600 leading-none">{txtAttending}</div>
              </div>

              <div className="p-1 bg-gradient-to-br from-green-50 to-emerald-50 rounded">
                <div className="flex items-center gap-0.5 mb-0.5">
                  <TrendingUp className="w-2 h-2 text-green-600" />
                  <div className="text-sm font-bold text-green-600">#{queue.current_number}</div>
                </div>
                <div className="text-xs text-slate-600 leading-none">{txtCurrent}</div>
              </div>

              <div className="p-1 bg-gradient-to-br from-amber-50 to-orange-50 rounded">
                <div className="flex items-center gap-0.5 mb-0.5">
                  <Clock className="w-2 h-2 text-amber-600" />
                  <div className="text-sm font-bold text-amber-600">#{queue.last_issued_number}</div>
                </div>
                <div className="text-xs text-slate-600 leading-none">{txtLast}</div>
              </div>
            </div>

            <div className="space-y-1 mb-1.5">
              <Button
                className="w-full h-7 text-xs bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 px-1"
                onClick={() => callNextMutation.mutate()}
                disabled={callNextMutation.isPending || activeTickets.length === 0 || queue.status !== "aberta"}
              >
                <PhoneCall className="w-2.5 h-2.5 mr-1" />
                {callNextMutation.isPending ? txtCalling : `${txtCall} #${queue.current_number + 1}`}
              </Button>

              <Button
                variant="outline"
                className="w-full h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-50 px-1"
                onClick={() => setShowManualTicket(!showManualTicket)}
              >
                <UserPlus className="w-2.5 h-2.5 mr-1" />
                {txtManualTicket}
              </Button>
            </div>

            {showManualTicket && (
              <Card className="mb-1.5 border-blue-200 bg-blue-50">
                <CardContent className="p-1.5">
                  <div className="space-y-1">
                    <Input
                      value={manualEmail}
                      onChange={(e) => setManualEmail(e.target.value)}
                      placeholder={txtEmailRequired2}
                      type="text"
                      inputMode="email"
                      className="h-6 text-xs"
                      autoComplete="off"
                    />
                    <Input
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      placeholder={txtNameOptional}
                      className="h-6 text-xs"
                    />
                    <div className="flex gap-1">
                      <Button
                        onClick={() => createManualTicketMutation.mutate()}
                        disabled={createManualTicketMutation.isPending}
                        className="flex-1 h-6 text-xs px-1"
                      >
                        {createManualTicketMutation.isPending ? txtCreating : txtCreate}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowManualTicket(false);
                          setCreatedTicketId(null);
                        }}
                        className="h-6 text-xs px-2"
                      >
                        X
                      </Button>
                    </div>
                    {createdTicketId && (() => {
                      // 🌐 Usar sempre domínio de produção para QR codes (Capacitor usa localhost/app.qzero.local)
                      const productionDomain = 'https://waitless-qzero.com';
                      const qrCodeUrl = `${productionDomain}${createPageUrl('TicketPublic')}?id=${createdTicketId}`;
                      console.log('🔗 QR Code URL gerado:', qrCodeUrl);
                      console.log('🆔 Ticket ID:', createdTicketId);
                      return (
                        <div className="pt-2 border-t border-blue-200">
                          <div className="bg-white rounded p-3 flex flex-col items-center">
                            <p className="text-xs font-medium text-slate-700 mb-2">
                              {txtTicketCreatedQR}
                            </p>
                            <div className="bg-white p-2 rounded border-2 border-slate-200">
                              <QRCodeSVG 
                                value={qrCodeUrl}
                                size={140}
                                level="M"
                                includeMargin={false}
                              />
                            </div>
                            <p className="text-xs text-slate-600 mt-2 text-center">
                              {txtClientCanScan}
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyTicketLink(createdTicketId)}
                              className="mt-2 h-6 text-xs w-full"
                            >
                              <Copy className="w-2.5 h-2.5 mr-1" />
                              {txtCopyLinkAlt}
                            </Button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTickets.length > 0 ? (
              <div>
                <h4 className="font-bold text-slate-900 mb-1 text-xs">{txtTickets}</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {activeTickets.slice(0, 5).map(ticket => (
                    <TicketPanel 
                      key={ticket.id} 
                      ticket={ticket} 
                      onUpdateTicket={updateTicketMutation.mutate}
                      onDeleteTicket={deleteTicketMutation.mutate}
                    />
                  ))}
                </div>
                {activeTickets.length > 5 && (
                  <p className="text-xs text-slate-500 mt-1 text-center">
                    +{activeTickets.length - 5}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-3 text-slate-500">
                <Users className="w-6 h-6 mx-auto mb-1 opacity-50" />
                <p className="text-xs">{txtNoTickets}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="p-1.5">
            <TicketHistory businessId={queue.business_id} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}