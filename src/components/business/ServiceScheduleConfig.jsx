import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Plus, X, Clock, CalendarX } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useAutoTranslate } from "@/hooks/useTranslate";

export default function ServiceScheduleConfig({ formData, setFormData }) {
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
  const txtBlockedDates = useAutoTranslate('Datas Bloqueadas (Férias/Feriados)', 'pt');
  const txtSelectDate = useAutoTranslate('Selecionar data', 'pt');

  const daysOfWeek = [
    { value: 'sunday', label: txtSunday },
    { value: 'monday', label: txtMonday },
    { value: 'tuesday', label: txtTuesday },
    { value: 'wednesday', label: txtWednesday },
    { value: 'thursday', label: txtThursday },
    { value: 'friday', label: txtFriday },
    { value: 'saturday', label: txtSaturday }
  ];
  const [blockDate, setBlockDate] = useState(null);

  useEffect(() => {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    const hasCustomSchedules = formData.custom_schedules && Object.keys(formData.custom_schedules).length > 0;
    
    const hasLegacyAvailableDays = () => {
      if (!formData.available_days || formData.available_days.length === 0) return false;
      if (!formData.working_hours || Object.keys(formData.working_hours).length === 0) return true;
      
      return formData.available_days.some(dayNum => {
        const dayName = dayNames[dayNum];
        return !formData.working_hours[dayName] || typeof formData.working_hours[dayName].enabled === 'undefined';
      });
    };
    
    const isWorkingHoursNormalized = () => {
      if (!formData.working_hours || Object.keys(formData.working_hours).length === 0) return false;
      if (!hasCustomSchedules) return true;
      
      return Object.entries(formData.custom_schedules).every(([dayNum, schedule]) => {
        const dayName = dayNames[parseInt(dayNum)];
        const wh = formData.working_hours[dayName];
        return wh && typeof wh.enabled !== 'undefined';
      });
    };
    
    const needsMigration = (hasCustomSchedules && !isWorkingHoursNormalized()) || hasLegacyAvailableDays();
    
    if (!needsMigration) return;
    
    const working_hours = { ...(formData.working_hours || {}) };
    
    if (hasCustomSchedules) {
      Object.entries(formData.custom_schedules).forEach(([dayNum, schedule]) => {
        const dayName = dayNames[parseInt(dayNum)];
        working_hours[dayName] = {
          enabled: true,
          start: schedule.start || '09:00',
          end: schedule.end || '18:00',
          break_start: schedule.breaks?.[0]?.start || '',
          break_end: schedule.breaks?.[0]?.end || ''
        };
      });
    }
    
    if (formData.available_days && formData.available_days.length > 0) {
      formData.available_days.forEach(dayNum => {
        const dayName = dayNames[dayNum];
        if (!working_hours[dayName] || typeof working_hours[dayName].enabled === 'undefined') {
          working_hours[dayName] = {
            enabled: true,
            start: formData.start_time || '09:00',
            end: formData.end_time || '18:00',
            break_start: '',
            break_end: ''
          };
        }
      });
    }
    
    const available_days = [];
    dayNames.forEach((dayName, index) => {
      if (working_hours[dayName]?.enabled) {
        available_days.push(index);
      }
    });
    
    const currentAvailableDays = formData.available_days || [];
    const workingHoursChanged = JSON.stringify(working_hours) !== JSON.stringify(formData.working_hours || {});
    const availableDaysChanged = 
      available_days.length !== currentAvailableDays.length ||
      !available_days.every(day => currentAvailableDays.includes(day));
    
    if (workingHoursChanged || availableDaysChanged) {
      const { custom_schedules, ...cleanedFormData } = formData;
      setFormData({ ...cleanedFormData, working_hours, available_days });
    }
  }, [formData.id]);

  useEffect(() => {
    if (formData.working_hours && Object.keys(formData.working_hours).length > 0) {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const computed_available_days = [];
      dayNames.forEach((dayName, index) => {
        if (formData.working_hours[dayName]?.enabled) {
          computed_available_days.push(index);
        }
      });
      
      const current_available_days = formData.available_days || [];
      const needsSync = 
        computed_available_days.length !== current_available_days.length ||
        !computed_available_days.every(day => current_available_days.includes(day));
      
      if (needsSync) {
        setFormData({ ...formData, available_days: computed_available_days });
      }
    }
  }, [formData.working_hours]);

  const workingHours = formData.working_hours || {};

  const syncWorkingHoursToAvailableDays = (working_hours) => {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const available_days = [];
    dayNames.forEach((dayName, index) => {
      if (working_hours[dayName]?.enabled) {
        available_days.push(index);
      }
    });
    return available_days;
  };

  const toggleDay = (day) => {
    const newWorkingHours = { ...workingHours };
    if (newWorkingHours[day]) {
      newWorkingHours[day] = {
        ...newWorkingHours[day],
        enabled: !newWorkingHours[day].enabled
      };
    } else {
      newWorkingHours[day] = {
        enabled: true,
        start: '09:00',
        end: '18:00',
        break_start: '',
        break_end: ''
      };
    }
    const available_days = syncWorkingHoursToAvailableDays(newWorkingHours);
    setFormData({ ...formData, working_hours: newWorkingHours, available_days });
  };

  const updateDaySchedule = (day, field, value) => {
    const newWorkingHours = {
      ...workingHours,
      [day]: {
        ...workingHours[day],
        [field]: value
      }
    };
    const available_days = syncWorkingHoursToAvailableDays(newWorkingHours);
    setFormData({ ...formData, working_hours: newWorkingHours, available_days });
  };

  const addBlockedDate = () => {
    if (!blockDate) return;
    const blocked = formData.blocked_dates || [];
    const dateStr = format(blockDate, 'yyyy-MM-dd');
    if (!blocked.includes(dateStr)) {
      setFormData({ ...formData, blocked_dates: [...blocked, dateStr] });
    }
    setBlockDate(null);
  };

  const removeBlockedDate = (date) => {
    const blocked = formData.blocked_dates.filter(d => d !== date);
    setFormData({ ...formData, blocked_dates: blocked });
  };

  return (
    <div className="space-y-6">
      {/* Horários por Dia */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {txtWorkingHours}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {daysOfWeek.map((day) => (
            <div key={day.value} className="space-y-3 p-4 border rounded-lg bg-slate-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={workingHours[day.value]?.enabled ?? false}
                    onCheckedChange={() => toggleDay(day.value)}
                  />
                  <Label className="font-semibold text-base">{day.label}</Label>
                </div>
              </div>

              {workingHours[day.value]?.enabled && (
                <div className="grid grid-cols-2 gap-4 pl-10">
                  <div>
                    <Label htmlFor={`${day.value}-start`} className="text-sm">{txtStart}</Label>
                    <Input
                      id={`${day.value}-start`}
                      type="time"
                      value={workingHours[day.value].start}
                      onChange={(e) => updateDaySchedule(day.value, 'start', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`${day.value}-end`} className="text-sm">{txtEnd}</Label>
                    <Input
                      id={`${day.value}-end`}
                      type="time"
                      value={workingHours[day.value].end}
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
                      value={workingHours[day.value].break_start || ''}
                      onChange={(e) => updateDaySchedule(day.value, 'break_start', e.target.value)}
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
                      value={workingHours[day.value].break_end || ''}
                      onChange={(e) => updateDaySchedule(day.value, 'break_end', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Datas Bloqueadas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarX className="w-4 h-4" />
            {txtBlockedDates}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="flex-1 justify-start text-left font-normal">
                  <CalendarX className="mr-2 h-4 w-4 text-slate-500" />
                  {blockDate ? format(blockDate, 'PPP', { locale: pt }) : txtSelectDate}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 shadow-xl border-slate-200" align="start">
                <Calendar
                  mode="single"
                  selected={blockDate}
                  onSelect={setBlockDate}
                  locale={pt}
                  className="rounded-xl"
                />
              </PopoverContent>
            </Popover>
            <Button type="button" onClick={addBlockedDate} disabled={!blockDate} className="shrink-0">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {formData.blocked_dates && formData.blocked_dates.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.blocked_dates.map(date => (
                <Badge key={date} variant="secondary" className="gap-2">
                  {format(new Date(date + 'T00:00:00'), 'dd/MM/yyyy')}
                  <button
                    type="button"
                    onClick={() => removeBlockedDate(date)}
                    className="hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
