import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { X, Save, Info } from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import QueueSchedule from "./QueueSchedule";
import { useAutoTranslate } from "@/hooks/useTranslate";

export default function QueueForm({ queue, businessId, onClose }) {
  // Traduções
  const txtEditQueue = useAutoTranslate('Editar Ticket', 'pt');
  const txtNewQueue = useAutoTranslate('Novo Ticket', 'pt');
  const txtInfo = useAutoTranslate('Info', 'pt');
  const txtConfig = useAutoTranslate('Config', 'pt');
  const txtSchedule = useAutoTranslate('Horários', 'pt');
  const txtQueueName = useAutoTranslate('Nome do Ticket', 'pt');
  const txtDescription = useAutoTranslate('Descrição', 'pt');
  const txtAvgServiceTime = useAutoTranslate('Tempo Médio de Atendimento (min)', 'pt');
  const txtToleranceTime = useAutoTranslate('Tempo de Tolerância (min)', 'pt');
  const txtOptional = useAutoTranslate('(opcional)', 'pt');
  const txtToleranceTooltip = useAutoTranslate('Tempo que o cliente tem para chegar após ser chamado', 'pt');
  const txtNoTolerance = useAutoTranslate('0 = sem tolerância', 'pt');
  const txtMaxCapacity = useAutoTranslate('Capacidade Máxima', 'pt');
  const txtCancel = useAutoTranslate('Cancelar', 'pt');
  const txtSave = useAutoTranslate('Salvar', 'pt');
  const txtQueueUpdated = useAutoTranslate('Ticket atualizado com sucesso!', 'pt');
  const txtQueueCreated = useAutoTranslate('Ticket criado com sucesso!', 'pt');
  const txtErrorSaving = useAutoTranslate('Erro ao salvar ticket:', 'pt');
  const txtPlaceholderGeneral = useAutoTranslate('Ex: Atendimento Geral', 'pt');
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(queue || {
    name: '',
    description: '',
    average_service_time: 10,
    tolerance_time: 5,
    max_capacity: 100,
    current_number: 0,
    last_issued_number: 0,
    status: 'aberta',
    is_active: true,
    working_hours: {}
  });

  useEffect(() => {
    if (queue) {
      console.log('📝 QueueForm received queue:', queue);
      console.log('📅 Working hours from queue:', queue.working_hours);
      setFormData({
        ...queue,
        tolerance_time: queue.tolerance_time || 5
      });
    } else {
      setFormData({
        name: '',
        description: '',
        average_service_time: 10,
        tolerance_time: 5,
        max_capacity: 100,
        current_number: 0,
        last_issued_number: 0,
        status: 'aberta',
        is_active: true,
        working_hours: {}
      });
    }
  }, [queue]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      console.log('💾 Saving queue...', { queueId: queue?.id, data });
      if (queue) {
        const result = await base44.entities.Queue.update(queue.id, data);
        console.log('✅ Queue updated:', result);
        return result;
      } else {
        const result = await base44.entities.Queue.create({
          ...data,
          business_id: businessId
        });
        console.log('✅ Queue created:', result);
        return result;
      }
    },
    onSuccess: async (updatedQueue) => {
      console.log('✅ onSuccess called, updating cache directly...');
      
      queryClient.setQueryData(['business-queues', businessId], (oldData) => {
        if (!oldData) return [updatedQueue];
        if (queue) {
          return oldData.map(q => q.id === updatedQueue.id ? updatedQueue : q);
        } else {
          return [...oldData, updatedQueue];
        }
      });
      
      toast.success(queue ? txtQueueUpdated : txtQueueCreated);
      onClose();
    },
    onError: (error) => {
      console.error('❌ Error saving queue:', error);
      toast.error(`${txtErrorSaving} ${error.message}`);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl border border-slate-200" noValidate>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-slate-900">
          {queue ? txtEditQueue : txtNewQueue}
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="flex flex-row w-full h-auto gap-1 p-1">
          <TabsTrigger value="info" className="flex-1 text-xs sm:text-sm px-2 py-2">
            {txtInfo}
          </TabsTrigger>
          <TabsTrigger value="config" className="flex-1 text-xs sm:text-sm px-2 py-2">
            {txtConfig}
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex-1 text-xs sm:text-sm px-2 py-2">
            {txtSchedule}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4 mt-6">
          <div>
            <Label htmlFor="queue-name">{txtQueueName} *</Label>
            <Input
              id="queue-name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder={txtPlaceholderGeneral}
            />
          </div>

          <div>
            <Label htmlFor="queue-description">{txtDescription}</Label>
            <Textarea
              id="queue-description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder={txtDescription}
              rows={2}
            />
          </div>
        </TabsContent>

        <TabsContent value="config" className="space-y-4 mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="avg-time">{txtAvgServiceTime} *</Label>
              <Input
                id="avg-time"
                type="number"
                min="1"
                value={formData.average_service_time}
                onChange={(e) => handleChange('average_service_time', parseInt(e.target.value))}
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Label htmlFor="tolerance-time">
                  {txtToleranceTime} <span className="text-xs text-slate-400">{txtOptional}</span>
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-slate-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{txtToleranceTooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="tolerance-time"
                type="number"
                min="0"
                step="5"
                value={formData.tolerance_time}
                onChange={(e) => handleChange('tolerance_time', parseInt(e.target.value))}
                placeholder={txtNoTolerance}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="max-capacity">{txtMaxCapacity} *</Label>
              <Input
                id="max-capacity"
                type="number"
                min="1"
                value={formData.max_capacity}
                onChange={(e) => handleChange('max_capacity', parseInt(e.target.value))}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="schedule" className="mt-6">
          <QueueSchedule 
            queue={queue || { working_hours: formData.working_hours }} 
            onChange={!queue ? (schedule) => handleChange('working_hours', schedule) : undefined}
            onSaveComplete={queue ? (schedule) => handleChange('working_hours', schedule) : undefined}
          />
        </TabsContent>
      </Tabs>

      <div className="flex gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="flex-1"
        >
          {txtCancel}
        </Button>
        <Button
          type="submit"
          disabled={saveMutation.isPending}
          className="flex-1 gap-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700"
        >
          <Save className="w-4 h-4" />
          {txtSave}
        </Button>
      </div>
    </form>
  );
}