import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Mail, MessageSquare, Save } from "lucide-react";
import { toast } from "sonner";
import { useAutoTranslate } from "@/hooks/useTranslate";

export default function MessageTemplates({ business }) {
  const txtMessageTemplates = useAutoTranslate('Templates de Mensagens', 'pt');
  const txtAvailableVariables = useAutoTranslate('Variáveis Disponíveis:', 'pt');
  const txtConfirmationEmail = useAutoTranslate('Email de Confirmação', 'pt');
  const txtReminderEmail = useAutoTranslate('Email de Lembrete', 'pt');
  const txtConfirmationSMS = useAutoTranslate('SMS de Confirmação (max 160 caracteres)', 'pt');
  const txtReminderSMS = useAutoTranslate('SMS de Lembrete (max 160 caracteres)', 'pt');
  const txtCharacters = useAutoTranslate('caracteres', 'pt');
  const txtSaveTemplates = useAutoTranslate('Guardar Templates', 'pt');
  const txtTemplatesSaved = useAutoTranslate('Templates guardados com sucesso!', 'pt');
  const queryClient = useQueryClient();
  const [confirmationEmail, setConfirmationEmail] = useState(
    business.confirmation_email_template || 
    `Olá!\n\nA sua marcação foi confirmada.\n\nDetalhes:\nServiço: {{service_name}}\nData: {{date}}\nHora: {{time}}\nEmpresa: {{business_name}}\n\nPara reagendar ou cancelar, clique aqui: {{management_link}}\n\nObrigado!`
  );
  
  const [reminderEmail, setReminderEmail] = useState(
    business.reminder_email_template ||
    `Olá!\n\nLembramos que tem uma marcação amanhã:\n\nServiço: {{service_name}}\nData: {{date}}\nHora: {{time}}\nLocal: {{business_name}}\n\nVemo-nos em breve!`
  );

  const [confirmationSMS, setConfirmationSMS] = useState(
    business.confirmation_sms_template ||
    `Marcação confirmada! {{service_name}} em {{date}} às {{time}}. Gerir: {{management_link}}`
  );

  const [reminderSMS, setReminderSMS] = useState(
    business.reminder_sms_template ||
    `Lembrete: {{service_name}} amanhã às {{time}} em {{business_name}}`
  );

  const saveMutation = useMutation({
    mutationFn: async (templates) => {
      return await base44.entities.Business.update(business.id, templates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business'] });
      toast.success(txtTemplatesSaved);
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      confirmation_email_template: confirmationEmail,
      reminder_email_template: reminderEmail,
      confirmation_sms_template: confirmationSMS,
      reminder_sms_template: reminderSMS
    });
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle>{txtMessageTemplates}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">{txtAvailableVariables}</h4>
          <div className="grid grid-cols-2 gap-2 text-sm text-blue-700">
            <Badge variant="outline">{'{{business_name}}'}</Badge>
            <Badge variant="outline">{'{{service_name}}'}</Badge>
            <Badge variant="outline">{'{{date}}'}</Badge>
            <Badge variant="outline">{'{{time}}'}</Badge>
            <Badge variant="outline">{'{{client_name}}'}</Badge>
            <Badge variant="outline">{'{{management_link}}'}</Badge>
          </div>
        </div>

        <Tabs defaultValue="email">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="email">
              <Mail className="w-4 h-4 mr-2" />
              Email
            </TabsTrigger>
            <TabsTrigger value="sms">
              <MessageSquare className="w-4 h-4 mr-2" />
              SMS
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4">
            <div>
              <Label>{txtConfirmationEmail}</Label>
              <Textarea
                value={confirmationEmail}
                onChange={(e) => setConfirmationEmail(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
            </div>
            <div>
              <Label>{txtReminderEmail}</Label>
              <Textarea
                value={reminderEmail}
                onChange={(e) => setReminderEmail(e.target.value)}
                rows={6}
                className="font-mono text-sm"
              />
            </div>
          </TabsContent>

          <TabsContent value="sms" className="space-y-4">
            <div>
              <Label>{txtConfirmationSMS}</Label>
              <Textarea
                value={confirmationSMS}
                onChange={(e) => setConfirmationSMS(e.target.value)}
                rows={3}
                maxLength={160}
                className="font-mono text-sm"
              />
              <p className="text-xs text-slate-500 mt-1">
                {confirmationSMS.length}/160 {txtCharacters}
              </p>
            </div>
            <div>
              <Label>{txtReminderSMS}</Label>
              <Textarea
                value={reminderSMS}
                onChange={(e) => setReminderSMS(e.target.value)}
                rows={3}
                maxLength={160}
                className="font-mono text-sm"
              />
              <p className="text-xs text-slate-500 mt-1">
                {reminderSMS.length}/160 {txtCharacters}
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="w-full bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700"
        >
          <Save className="w-4 h-4 mr-2" />
          {txtSaveTemplates}
        </Button>
      </CardContent>
    </Card>
  );
}