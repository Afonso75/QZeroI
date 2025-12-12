import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bell, Mail, Smartphone, Clock, Calendar, AlertCircle, Save, Crown } from "lucide-react";
import { toast } from "sonner";
import { useAutoTranslate } from "@/hooks/useTranslate";

const defaultPreferences = {
  ticket_almost_ready: {
    enabled: true,
    advance_positions: 5,
    channels: ["push"]
  },
  ticket_ready: {
    enabled: true,
    channels: ["push", "email"]
  },
  appointment_reminder: {
    enabled: true,
    advance_hours: 24,
    channels: ["push", "email"]
  },
  queue_paused: {
    enabled: true,
    channels: ["push"]
  }
};

export default function NotificationSettings({ user }) {
  // Traduções
  const txtSavedSuccess = useAutoTranslate('Preferências guardadas com sucesso!', 'pt');
  const txtSaveError = useAutoTranslate('Erro ao guardar preferências', 'pt');
  const txtNotificationSettings = useAutoTranslate('Configurar Notificações', 'pt');
  const txtCustomizeAlerts = useAutoTranslate('Personalize como e quando quer receber alertas', 'pt');
  const txtSavePreferences = useAutoTranslate('Guardar Preferências', 'pt');
  const txtAlmostYourTurn = useAutoTranslate('Quase a Sua Vez', 'pt');
  const txtReceiveAlertAlmost = useAutoTranslate('Receber alerta quando estiver quase na sua vez', 'pt');
  const txtYourTurn = useAutoTranslate('É a Sua Vez', 'pt');
  const txtReceiveAlertCalled = useAutoTranslate('Receber alerta quando for chamado', 'pt');
  const txtAppointmentReminder = useAutoTranslate('Lembrete de Marcação', 'pt');
  const txtReminderBefore = useAutoTranslate('Lembrete antes das suas marcações', 'pt');
  const txtQueuePaused = useAutoTranslate('Fila Pausada', 'pt');
  const txtAlertPaused = useAutoTranslate('Alertas quando a fila for pausada', 'pt');
  const txtPositionsBefore = useAutoTranslate('Posições antes', 'pt');
  const txtHoursBefore = useAutoTranslate('Horas antes', 'pt');
  const txtActivateNotifications = useAutoTranslate('Ativar notificações', 'pt');
  const txtPremiumOnly = useAutoTranslate('Disponível apenas para utilizadores Premium', 'pt');
  const txtReceiveVia = useAutoTranslate('Receber via:', 'pt');
  const txtSaving = useAutoTranslate('A guardar...', 'pt');

  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState(
    user.notification_preferences || defaultPreferences
  );

  const updateMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast.success(txtSavedSuccess);
    },
    onError: () => {
      toast.error(txtSaveError);
    }
  });

  const handleSave = () => {
    updateMutation.mutate({ notification_preferences: preferences });
  };

  const updatePreference = (key, field, value) => {
    setPreferences(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      }
    }));
  };

  const toggleChannel = (key, channel) => {
    const currentChannels = preferences[key]?.channels || [];
    const newChannels = currentChannels.includes(channel)
      ? currentChannels.filter(c => c !== channel)
      : [...currentChannels, channel];
    
    updatePreference(key, 'channels', newChannels);
  };

  const notificationTypes = [
    {
      key: "ticket_almost_ready",
      title: txtAlmostYourTurn,
      description: txtReceiveAlertAlmost,
      icon: Clock,
      color: "from-blue-500 to-cyan-500",
      hasCustomValue: true,
      customLabel: txtPositionsBefore,
      customField: "advance_positions",
      customMin: 1,
      customMax: 20
    },
    {
      key: "ticket_ready",
      title: txtYourTurn,
      description: txtReceiveAlertCalled,
      icon: Bell,
      color: "from-green-500 to-emerald-500"
    },
    {
      key: "appointment_reminder",
      title: txtAppointmentReminder,
      description: txtReminderBefore,
      icon: Calendar,
      color: "from-purple-500 to-pink-500",
      hasCustomValue: true,
      customLabel: txtHoursBefore,
      customField: "advance_hours",
      customMin: 1,
      customMax: 72
    },
    {
      key: "queue_paused",
      title: txtQueuePaused,
      description: txtAlertPaused,
      icon: AlertCircle,
      color: "from-amber-500 to-orange-500"
    }
  ];

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            {txtNotificationSettings}
          </CardTitle>
          <p className="text-sm text-slate-600">
            {txtCustomizeAlerts}
          </p>
        </CardHeader>
      </Card>

      {notificationTypes.map((type) => {
        const pref = preferences[type.key] || {};
        const isLocked = type.isPremium && !user.is_premium;

        return (
          <Card key={type.key} className={`border-0 shadow-md ${isLocked ? 'opacity-60' : ''}`}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${type.color} flex items-center justify-center flex-shrink-0`}>
                  <type.icon className="w-6 h-6 text-white" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-slate-900">{type.title}</h3>
                    {type.isPremium && (
                      <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs">
                        <Crown className="w-3 h-3 mr-1" />
                        Premium
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mb-4">{type.description}</p>

                  {isLocked ? (
                    <div className="flex items-center gap-2 text-sm text-purple-600">
                      <Crown className="w-4 h-4" />
                      <span>{txtPremiumOnly}</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">{txtActivateNotifications}</Label>
                        <Switch
                          checked={pref.enabled}
                          onCheckedChange={(checked) => updatePreference(type.key, 'enabled', checked)}
                        />
                      </div>

                      {pref.enabled && (
                        <>
                          {type.hasCustomValue && (
                            <div className="flex items-center gap-3">
                              <Label className="text-sm text-slate-600 whitespace-nowrap">
                                {type.customLabel}:
                              </Label>
                              <Input
                                type="number"
                                min={type.customMin}
                                max={type.customMax}
                                value={pref[type.customField] || type.customMin}
                                onChange={(e) => updatePreference(type.key, type.customField, parseInt(e.target.value))}
                                className="w-24"
                              />
                            </div>
                          )}

                          <div>
                            <Label className="text-sm font-medium mb-2 block">
                              {txtReceiveVia}
                            </Label>
                            <div className="flex gap-3">
                              <Button
                                variant={pref.channels?.includes('push') ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => toggleChannel(type.key, 'push')}
                                className="gap-2"
                              >
                                <Smartphone className="w-4 h-4" />
                                Push
                              </Button>
                              <Button
                                variant={pref.channels?.includes('email') ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => toggleChannel(type.key, 'email')}
                                className="gap-2"
                              >
                                <Mail className="w-4 h-4" />
                                Email
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-sky-50">
        <CardContent className="p-6">
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {updateMutation.isPending ? txtSaving : txtSavePreferences}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}