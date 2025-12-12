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
import ServiceSchedule from "./ServiceSchedule";
import { useAutoTranslate } from "@/hooks/useTranslate";

export default function ServiceForm({ service, businessId, onClose }) {
  // Traduções
  const txtEditService = useAutoTranslate('Editar Serviço', 'pt');
  const txtNewService = useAutoTranslate('Novo Serviço', 'pt');
  const txtInfo = useAutoTranslate('Info', 'pt');
  const txtConfig = useAutoTranslate('Config', 'pt');
  const txtSchedule = useAutoTranslate('Horários', 'pt');
  const txtServiceName = useAutoTranslate('Nome do Serviço', 'pt');
  const txtDescription = useAutoTranslate('Descrição', 'pt');
  const txtDuration = useAutoTranslate('Duração (min)', 'pt');
  const txtPrice = useAutoTranslate('Preço (€)', 'pt');
  const txtCategory = useAutoTranslate('Categoria', 'pt');
  const txtToleranceTime = useAutoTranslate('Tempo de Tolerância (min)', 'pt');
  const txtOptional = useAutoTranslate('(opcional)', 'pt');
  const txtToleranceTooltip = useAutoTranslate('Tempo que o cliente tem para chegar após a confirmação da marcação', 'pt');
  const txtNoTolerance = useAutoTranslate('0 = sem tolerância', 'pt');
  const txtCategoryPlaceholder = useAutoTranslate('Ex: Beleza, Saúde, Consultoria', 'pt');
  const txtCancel = useAutoTranslate('Cancelar', 'pt');
  const txtSave = useAutoTranslate('Salvar', 'pt');
  const txtUpdateService = useAutoTranslate('Atualizar Serviço', 'pt');
  const txtCreateService = useAutoTranslate('Criar Serviço', 'pt');
  const txtServiceUpdated = useAutoTranslate('Serviço atualizado com sucesso!', 'pt');
  const txtServiceCreated = useAutoTranslate('Serviço criado com sucesso!', 'pt');
  const txtErrorSaving = useAutoTranslate('Erro ao salvar serviço:', 'pt');
  const txtPlaceholderHaircut = useAutoTranslate('Ex: Corte de Cabelo', 'pt');
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(service || {
    name: '',
    description: '',
    duration: 30,
    price: 0,
    category: '',
    tolerance_time: 5,
    working_hours: {}
  });

  useEffect(() => {
    if (service) {
      console.log('📝 ServiceForm received service:', service);
      console.log('📅 Working hours from service:', service.working_hours);
      setFormData({
        ...service,
        tolerance_time: service.tolerance_time || 5
      });
    } else {
      setFormData({
        name: '',
        description: '',
        duration: 30,
        price: 0,
        category: '',
        tolerance_time: 5,
        working_hours: {}
      });
    }
  }, [service]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      console.log('💾 Saving service...', { serviceId: service?.id, data });
      if (service) {
        const result = await base44.entities.Service.update(service.id, data);
        console.log('✅ Service updated:', result);
        return result;
      } else {
        const result = await base44.entities.Service.create({
          ...data,
          business_id: businessId,
          is_active: true
        });
        console.log('✅ Service created:', result);
        return result;
      }
    },
    onSuccess: async (updatedService) => {
      console.log('✅ onSuccess called, updating cache directly...');
      
      // Atualiza AMBAS as query keys (business-services E services)
      queryClient.setQueryData(['business-services', businessId], (oldData) => {
        if (!oldData) return [updatedService];
        if (service) {
          return oldData.map(s => s.id === updatedService.id ? updatedService : s);
        } else {
          return [...oldData, updatedService];
        }
      });
      
      queryClient.setQueryData(['services', businessId], (oldData) => {
        if (!oldData) return [updatedService];
        if (service) {
          return oldData.map(s => s.id === updatedService.id ? updatedService : s);
        } else {
          return [...oldData, updatedService];
        }
      });
      
      toast.success(service ? txtServiceUpdated : txtServiceCreated);
      onClose();
    },
    onError: (error) => {
      console.error('❌ Error saving service:', error);
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

  const handleScheduleSaveComplete = (newSchedule) => {
    setFormData(prev => ({ ...prev, working_hours: newSchedule }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl border border-slate-200" noValidate>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-slate-900">
          {service ? txtEditService : txtNewService}
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
            <Label htmlFor="service-name">{txtServiceName} *</Label>
            <Input
              id="service-name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder={txtPlaceholderHaircut}
            />
          </div>

          <div>
            <Label htmlFor="service-description">{txtDescription}</Label>
            <Textarea
              id="service-description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder={txtDescription}
              rows={3}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="duration">{txtDuration} *</Label>
              <Input
                id="duration"
                type="number"
                min="15"
                step="15"
                value={formData.duration}
                onChange={(e) => handleChange('duration', parseInt(e.target.value))}
              />
            </div>

            <div>
              <Label htmlFor="price">{txtPrice}</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => handleChange('price', parseFloat(e.target.value))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="category">{txtCategory}</Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              placeholder={txtCategoryPlaceholder}
            />
          </div>
        </TabsContent>

        <TabsContent value="config" className="space-y-4 mt-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Label htmlFor="tolerance-time">{txtToleranceTime} <span className="text-xs text-slate-400">{txtOptional}</span></Label>
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
        </TabsContent>

        <TabsContent value="schedule" className="mt-6">
          {service ? (
            <ServiceSchedule 
              service={service}
              onSaveComplete={handleScheduleSaveComplete}
            />
          ) : (
            <ServiceSchedule 
              service={{ 
                id: 'new',
                working_hours: formData.working_hours 
              }}
              onChange={(newSchedule) => handleChange('working_hours', newSchedule)}
              onSaveComplete={handleScheduleSaveComplete}
            />
          )}
        </TabsContent>
      </Tabs>

      <div className="flex gap-3 pt-4 border-t">
        <Button
          type="submit"
          className="flex-1 gap-2"
          disabled={saveMutation.isPending}
        >
          <Save className="w-4 h-4" />
          {service ? txtUpdateService : txtCreateService}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={saveMutation.isPending}
        >
          {txtCancel}
        </Button>
      </div>
    </form>
  );
}
