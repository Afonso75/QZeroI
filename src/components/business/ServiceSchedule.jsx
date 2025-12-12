import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Clock, Save, Info } from "lucide-react";
import { toast } from "sonner";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { useAutoTranslate } from "@/hooks/useTranslate";

export default function ServiceSchedule({ service, onChange, onSaveComplete }) {
  const txtSunday = useAutoTranslate('Domingo', 'pt');
  const txtMonday = useAutoTranslate('Segunda-feira', 'pt');
  const txtTuesday = useAutoTranslate('Terça-feira', 'pt');
  const txtWednesday = useAutoTranslate('Quarta-feira', 'pt');
  const txtThursday = useAutoTranslate('Quinta-feira', 'pt');
  const txtFriday = useAutoTranslate('Sexta-feira', 'pt');
  const txtSaturday = useAutoTranslate('Sábado', 'pt');
  const txtWorkingHours = useAutoTranslate('Horários de Funcionamento', 'pt');
  const txtStart = useAutoTranslate('Início', 'pt');
  const txtEnd = useAutoTranslate('Fim', 'pt');
  const txtBreakStart = useAutoTranslate('Pausa Início', 'pt');
  const txtBreakEnd = useAutoTranslate('Pausa Fim', 'pt');
  const txtOptional = useAutoTranslate('opcional', 'pt');
  const txtSaving = useAutoTranslate('A salvar...', 'pt');
  const txtSaveHours = useAutoTranslate('Salvar Horários', 'pt');
  const txtHoursSaved = useAutoTranslate('Horários salvos com sucesso!', 'pt');
  const txtHoursError = useAutoTranslate('Erro ao salvar horários. Tente novamente.', 'pt');
  const txtSaveHint = useAutoTranslate('Os horários serão salvos ao clicar no botão "Salvar" no final', 'pt');
  const txtExistingServiceHint = useAutoTranslate('Configure os horários de disponibilidade para este serviço. Deixe os campos de pausa vazios se não houver intervalo.', 'pt');
  const txtNewServiceHint = useAutoTranslate('Para serviços novos, configure os horários aqui. Eles serão salvos quando criar o serviço.', 'pt');

  const daysOfWeek = [
    { value: "sunday", label: txtSunday },
    { value: "monday", label: txtMonday },
    { value: "tuesday", label: txtTuesday },
    { value: "wednesday", label: txtWednesday },
    { value: "thursday", label: txtThursday },
    { value: "friday", label: txtFriday },
    { value: "saturday", label: txtSaturday }
  ];

  const queryClient = useQueryClient();
  const [schedule, setSchedule] = useState(service.working_hours || {});

  useEffect(() => {
    setSchedule(service.working_hours || {});
  }, [service.id]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Service.update(service.id, data),
    onSuccess: (updatedService) => {
      // Atualiza AMBAS as query keys com businessId
      queryClient.setQueryData(['business-services', service.business_id], (oldData) => {
        if (!oldData) return [updatedService];
        return oldData.map(s => s.id === updatedService.id ? updatedService : s);
      });
      
      queryClient.setQueryData(['services', service.business_id], (oldData) => {
        if (!oldData) return [updatedService];
        return oldData.map(s => s.id === updatedService.id ? updatedService : s);
      });
      
      toast.success(txtHoursSaved);
      if (onSaveComplete) {
        onSaveComplete(schedule);
      }
    },
    onError: (error) => {
      console.error('Error saving schedule:', error);
      toast.error(txtHoursError);
    }
  });

  const toggleDay = (day) => {
    setSchedule(prev => {
      const newSchedule = { ...prev };
      if (newSchedule[day]) {
        delete newSchedule[day];
      } else {
        newSchedule[day] = {
          enabled: true,
          start: "09:00",
          end: "18:00",
          break_start: "",
          break_end: ""
        };
      }
      if (onChange) {
        onChange(newSchedule);
      }
      if (onSaveComplete) {
        onSaveComplete(newSchedule);
      }
      return newSchedule;
    });
  };

  const updateDaySchedule = (day, field, value) => {
    setSchedule(prev => {
      const newSchedule = {
        ...prev,
        [day]: {
          ...prev[day],
          [field]: value
        }
      };
      if (onChange) {
        onChange(newSchedule);
      }
      if (onSaveComplete) {
        onSaveComplete(newSchedule);
      }
      return newSchedule;
    });
  };

  const handleSave = () => {
    updateMutation.mutate({ working_hours: schedule });
  };

  const isEditMode = service.id !== 'new';

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          {txtWorkingHours}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!onChange && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {txtExistingServiceHint}
            </AlertDescription>
          </Alert>
        )}

        {onChange && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {txtNewServiceHint}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {daysOfWeek.map((day) => (
            <div key={day.value} className="space-y-3 p-4 border rounded-lg bg-slate-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={!!schedule[day.value]}
                    onCheckedChange={() => toggleDay(day.value)}
                  />
                  <Label className="font-semibold text-base">{day.label}</Label>
                </div>
              </div>

              {schedule[day.value] && (
                <div className="grid grid-cols-2 gap-4 pl-10">
                  <div>
                    <Label htmlFor={`${day.value}-start`} className="text-sm">{txtStart}</Label>
                    <Input
                      id={`${day.value}-start`}
                      type="time"
                      value={schedule[day.value].start}
                      onChange={(e) => updateDaySchedule(day.value, 'start', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`${day.value}-end`} className="text-sm">{txtEnd}</Label>
                    <Input
                      id={`${day.value}-end`}
                      type="time"
                      value={schedule[day.value].end}
                      onChange={(e) => updateDaySchedule(day.value, 'end', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`${day.value}-break-start`} className="text-sm">
                      {txtBreakStart} <span className="text-slate-400">({txtOptional})</span>
                    </Label>
                    <Input
                      id={`${day.value}-break-start`}
                      type="time"
                      value={schedule[day.value].break_start || ''}
                      onChange={(e) => updateDaySchedule(day.value, 'break_start', e.target.value)}
                      placeholder="--:--"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`${day.value}-break-end`} className="text-sm">
                      {txtBreakEnd} <span className="text-slate-400">({txtOptional})</span>
                    </Label>
                    <Input
                      id={`${day.value}-break-end`}
                      type="time"
                      value={schedule[day.value].break_end || ''}
                      onChange={(e) => updateDaySchedule(day.value, 'break_end', e.target.value)}
                      placeholder="--:--"
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {!onChange && !onSaveComplete && (
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="w-full gap-2"
          >
            <Save className="w-4 h-4" />
            {updateMutation.isPending ? txtSaving : txtSaveHours}
          </Button>
        )}
        {(onChange || onSaveComplete) && (
          <div className="text-center text-sm text-slate-600 py-2 bg-blue-50 rounded-md">
            💡 {txtSaveHint}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
