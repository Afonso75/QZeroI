import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Clock, Save } from "lucide-react";
import { toast } from "sonner";
import { useAutoTranslate } from "@/hooks/useTranslate";

export default function QueueSchedule({ queue, onChange, onSaveComplete }) {
  const txtSunday = useAutoTranslate('Domingo', 'pt');
  const txtMonday = useAutoTranslate('Segunda-feira', 'pt');
  const txtTuesday = useAutoTranslate('Terça-feira', 'pt');
  const txtWednesday = useAutoTranslate('Quarta-feira', 'pt');
  const txtThursday = useAutoTranslate('Quinta-feira', 'pt');
  const txtFriday = useAutoTranslate('Sexta-feira', 'pt');
  const txtSaturday = useAutoTranslate('Sábado', 'pt');
  const txtWorkingHours = useAutoTranslate('Horários de Funcionamento', 'pt');
  const txtOpening = useAutoTranslate('Abertura', 'pt');
  const txtClosing = useAutoTranslate('Fecho', 'pt');
  const txtBreakStart = useAutoTranslate('Pausa Início', 'pt');
  const txtBreakEnd = useAutoTranslate('Pausa Fim', 'pt');
  const txtOptional = useAutoTranslate('opcional', 'pt');
  const txtSaving = useAutoTranslate('Salvando...', 'pt');
  const txtSaveHours = useAutoTranslate('Salvar Horários', 'pt');
  const txtHoursSaved = useAutoTranslate('Horários salvos com sucesso!', 'pt');
  const txtHoursError = useAutoTranslate('Erro ao salvar horários. Tente novamente.', 'pt');
  const txtSaveHint = useAutoTranslate('Os horários serão salvos ao clicar no botão "Salvar" no final', 'pt');

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
  const [schedule, setSchedule] = useState(queue.working_hours || {});

  useEffect(() => {
    setSchedule(queue.working_hours || {});
  }, [queue.id]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Queue.update(queue.id, data),
    onSuccess: (updatedQueue) => {
      // Atualiza o cache com businessId correto
      queryClient.setQueryData(['business-queues', queue.business_id], (oldData) => {
        if (!oldData) return [updatedQueue];
        return oldData.map(q => q.id === updatedQueue.id ? updatedQueue : q);
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

  const updateBreak = (day, field, value) => {
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

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          {txtWorkingHours}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {daysOfWeek.map(({ value, label }) => (
          <div key={value} className="p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <Label className="font-semibold">{label}</Label>
              <Switch
                checked={!!schedule[value]}
                onCheckedChange={() => toggleDay(value)}
              />
            </div>
            
            {schedule[value] && (
              <div className="space-y-3 ml-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">{txtOpening}</Label>
                    <Input
                      type="time"
                      value={schedule[value].start || "09:00"}
                      onChange={(e) => updateDaySchedule(value, 'start', e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{txtClosing}</Label>
                    <Input
                      type="time"
                      value={schedule[value].end || "18:00"}
                      onChange={(e) => updateDaySchedule(value, 'end', e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div>
                    <Label className="text-xs text-slate-600">
                      {txtBreakStart} <span className="text-slate-400">({txtOptional})</span>
                    </Label>
                    <Input
                      type="time"
                      value={schedule[value].break_start || ""}
                      onChange={(e) => updateBreak(value, 'break_start', e.target.value)}
                      className="h-9"
                      placeholder="--:--"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600">
                      {txtBreakEnd} <span className="text-slate-400">({txtOptional})</span>
                    </Label>
                    <Input
                      type="time"
                      value={schedule[value].break_end || ""}
                      onChange={(e) => updateBreak(value, 'break_end', e.target.value)}
                      className="h-9"
                      placeholder="--:--"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        
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