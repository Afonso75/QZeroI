import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Bell, Save } from "lucide-react";
import { useAutoTranslate } from "@/hooks/useTranslate";

export default function NotificationSettings({ queue }) {
  const txtAutoNotifications = useAutoTranslate('Notificações Automáticas', 'pt');
  const txtEnableNotifications = useAutoTranslate('Ativar Notificações', 'pt');
  const txtWarnWhenRemaining = useAutoTranslate('Avisar quando faltarem (senhas)', 'pt');
  const txtClientNotified = useAutoTranslate('O cliente será notificado quando faltarem esta quantidade de senhas', 'pt');
  const txtSaving = useAutoTranslate('Salvando...', 'pt');
  const txtSaveSettings = useAutoTranslate('Salvar Configurações', 'pt');
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(queue.notifications_enabled ?? true);
  const [settings, setSettings] = useState(queue.notification_settings || {
    email: true,
    sms: false,
    advance_notice: 2
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Queue.update(queue.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-queues'] });
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      notifications_enabled: enabled,
      notification_settings: settings
    });
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          {txtAutoNotifications}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <Label className="font-semibold">{txtEnableNotifications}</Label>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        {enabled && (
          <div>
            <Label>{txtWarnWhenRemaining}</Label>
            <Input
              type="number"
              min="1"
              max="10"
              value={settings.advance_notice}
              onChange={(e) => setSettings({...settings, advance_notice: parseInt(e.target.value)})}
              className="mt-2"
            />
            <p className="text-xs text-slate-500 mt-1">
              {txtClientNotified}
            </p>
          </div>
        )}

        <Button 
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="w-full gap-2"
        >
          <Save className="w-4 h-4" />
          {updateMutation.isPending ? txtSaving : txtSaveSettings}
        </Button>
      </CardContent>
    </Card>
  );
}