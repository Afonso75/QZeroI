import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Clock, Euro, Calendar, Timer } from "lucide-react";
import ServiceScheduleConfig from "./ServiceScheduleConfig";
import { useAutoTranslate } from "@/hooks/useTranslate";

export default function ServiceManager({ businessId }) {
  // Traduções
  const txtSun = useAutoTranslate('Dom', 'pt');
  const txtMon = useAutoTranslate('Seg', 'pt');
  const txtTue = useAutoTranslate('Ter', 'pt');
  const txtWed = useAutoTranslate('Qua', 'pt');
  const txtThu = useAutoTranslate('Qui', 'pt');
  const txtFri = useAutoTranslate('Sex', 'pt');
  const txtSat = useAutoTranslate('Sáb', 'pt');
  const txtServices = useAutoTranslate('Serviços', 'pt');
  const txtManageAppointments = useAutoTranslate('Gerir marcações', 'pt');
  const txtNew = useAutoTranslate('Novo', 'pt');
  const txtEdit = useAutoTranslate('Editar', 'pt');
  const txtNewService = useAutoTranslate('Novo Serviço', 'pt');
  const txtEditService = useAutoTranslate('Editar Serviço', 'pt');
  const txtName = useAutoTranslate('Nome *', 'pt');
  const txtCategory = useAutoTranslate('Categoria', 'pt');
  const txtDescription = useAutoTranslate('Descrição', 'pt');
  const txtMin = useAutoTranslate('Min *', 'pt');
  const txtTolerance = useAutoTranslate('Tolerância', 'pt');
  const txtOptional = useAutoTranslate('(opcional)', 'pt');
  const txtToler = useAutoTranslate('Toler.', 'pt');
  const txtPrice = useAutoTranslate('Preço €', 'pt');
  const txtDailySlots = useAutoTranslate('Slots Diários', 'pt');
  const txtDays = useAutoTranslate('Dias', 'pt');
  const txtActive = useAutoTranslate('Ativo', 'pt');
  const txtUpdate = useAutoTranslate('Atualizar', 'pt');
  const txtCreate = useAutoTranslate('Criar', 'pt');
  const txtCancel = useAutoTranslate('Cancelar', 'pt');
  const txtNoServices = useAutoTranslate('Nenhum serviço criado', 'pt');
  const txtDeleteConfirm = useAutoTranslate('Eliminar?', 'pt');
  const txtTol = useAutoTranslate('tol:', 'pt');
  
  const daysOfWeek = [
    { value: 0, label: txtSun },
    { value: 1, label: txtMon },
    { value: 2, label: txtTue },
    { value: 3, label: txtWed },
    { value: 4, label: txtThu },
    { value: 5, label: txtFri },
    { value: 6, label: txtSat }
  ];
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: 30,
    buffer_time: 0,
    tolerance_time: 15,
    price: 0,
    category: '',
    start_time: '09:00',
    end_time: '18:00',
    available_days: [1, 2, 3, 4, 5],
    max_daily_slots: 10,
    custom_schedules: {},
    blocked_dates: [],
    is_active: true
  });

  const { data: services, isLoading } = useQuery({
    queryKey: ['services', businessId],
    queryFn: () => base44.entities.Service.filter({ business_id: businessId }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Service.create({ ...data, business_id: businessId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', businessId] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Service.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', businessId] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Service.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', businessId] });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      duration: 30,
      buffer_time: 0,
      tolerance_time: 15,
      price: 0,
      category: '',
      start_time: '09:00',
      end_time: '18:00',
      available_days: [1, 2, 3, 4, 5],
      max_daily_slots: 10,
      custom_schedules: {},
      blocked_dates: [],
      is_active: true
    });
    setEditingService(null);
    setShowForm(false);
  };

  const handleEdit = (service) => {
    setFormData({
      ...service,
      buffer_time: service.buffer_time || 0,
      tolerance_time: service.tolerance_time || 15,
      available_days: service.available_days || [1, 2, 3, 4, 5],
      custom_schedules: service.custom_schedules || {},
      blocked_dates: service.blocked_dates || []
    });
    setEditingService(service);
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingService) {
      updateMutation.mutate({ id: editingService.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const toggleDay = (day) => {
    const days = formData.available_days || [];
    if (days.includes(day)) {
      setFormData({ ...formData, available_days: days.filter(d => d !== day) });
    } else {
      setFormData({ ...formData, available_days: [...days, day].sort() });
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-base md:text-xl font-bold text-slate-900">{txtServices}</h3>
          <p className="text-xs md:text-sm text-slate-600">{txtManageAppointments}</p>
        </div>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)} className="gap-2 w-full sm:w-auto h-9">
            <Plus className="w-3 h-3 md:w-4 md:h-4" />
            {txtNew}
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border-2 border-sky-200 shadow-lg">
          <CardHeader className="bg-sky-50 p-3 md:p-6">
            <CardTitle className="text-sm md:text-lg">
              {editingService ? txtEditService : txtNewService}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6">
            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6" noValidate>
              <div className="space-y-3 md:space-y-4">
                <div className="grid md:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <Label htmlFor="name" className="text-xs md:text-sm">{txtName}</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="h-9 text-sm"
                    />
                  </div>

                  <div>
                    <Label htmlFor="category" className="text-xs md:text-sm">{txtCategory}</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description" className="text-xs md:text-sm">{txtDescription}</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="resize-none text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                  <div>
                    <Label htmlFor="duration" className="text-xs md:text-sm">{txtMin}</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="15"
                      step="15"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                      className="h-9 text-sm"
                    />
                  </div>

                  <div>
                    <Label htmlFor="buffer_time" className="text-xs md:text-sm">
                      {txtTolerance} <span className="text-xs text-slate-400">{txtOptional}</span>
                    </Label>
                    <Input
                      id="buffer_time"
                      type="number"
                      min="0"
                      step="5"
                      value={formData.buffer_time}
                      onChange={(e) => setFormData({ ...formData, buffer_time: parseInt(e.target.value) })}
                      className="h-9 text-sm"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="tolerance_time" className="text-xs md:text-sm">{txtToler}</Label>
                    <Input
                      id="tolerance_time"
                      type="number"
                      min="5"
                      step="5"
                      value={formData.tolerance_time}
                      onChange={(e) => setFormData({ ...formData, tolerance_time: parseInt(e.target.value) })}
                      className="h-9 text-sm"
                    />
                  </div>

                  <div>
                    <Label htmlFor="price" className="text-xs md:text-sm">{txtPrice}</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="slots" className="text-xs md:text-sm">{txtDailySlots}</Label>
                  <Input
                    id="slots"
                    type="number"
                    min="1"
                    value={formData.max_daily_slots}
                    onChange={(e) => setFormData({ ...formData, max_daily_slots: parseInt(e.target.value) })}
                    className="h-9 text-sm"
                  />
                </div>

                <div>
                  <Label className="mb-2 block text-xs md:text-sm">{txtDays}</Label>
                  <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                    {daysOfWeek.map(day => (
                      <Button
                        key={day.value}
                        type="button"
                        variant={formData.available_days?.includes(day.value) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleDay(day.value)}
                        className="w-full h-8 text-xs px-1"
                      >
                        {day.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <ServiceScheduleConfig formData={formData} setFormData={setFormData} />

              <div className="flex items-center gap-2 pt-3 md:pt-4 border-t">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label className="text-xs md:text-sm">{txtActive}</Label>
              </div>

              <div className="flex gap-2 md:gap-3">
                <Button type="submit" size="sm" className="gap-2 flex-1 h-9">
                  {editingService ? txtUpdate : txtCreate}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={resetForm} className="flex-1 h-9">
                  {txtCancel}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {services.length === 0 ? (
        <Card>
          <CardContent className="py-8 md:py-12 text-center text-slate-500 text-sm">
            {txtNoServices}
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3 md:gap-4">
          {services.map(service => (
            <Card key={service.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-3 md:p-4">
                <div className="flex justify-between items-start mb-2 md:mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm md:text-base text-slate-900 mb-1 truncate">{service.name}</h4>
                    {service.category && (
                      <Badge variant="secondary" className="text-xs">{service.category}</Badge>
                    )}
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(service)} className="h-7 w-7 p-0">
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50 h-7 w-7 p-0"
                      onClick={() => {
                        if (confirm(txtDeleteConfirm)) {
                          deleteMutation.mutate(service.id);
                        }
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <p className="text-xs md:text-sm text-slate-600 mb-2 md:mb-3 line-clamp-2">{service.description}</p>

                <div className="flex flex-wrap gap-2 md:gap-3 text-xs text-slate-600 mb-2">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {service.duration}min
                  </div>
                  {(service.buffer_time > 0 || service.tolerance_time > 0) && (
                    <div className="flex items-center gap-1">
                      <Timer className="w-3 h-3" />
                      {service.buffer_time > 0 && `+${service.buffer_time}min`}
                      {service.tolerance_time > 0 && ` (${txtTol} ${service.tolerance_time}min)`}
                    </div>
                  )}
                  {service.price > 0 && (
                    <div className="flex items-center gap-1">
                      <Euro className="w-3 h-3" />
                      {service.price.toFixed(2)}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {service.start_time}-{service.end_time}
                  </div>
                </div>

                {service.available_days && service.available_days.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {service.available_days.map(dayNum => {
                      const day = daysOfWeek.find(d => d.value === dayNum);
                      return day ? (
                        <Badge key={dayNum} variant="secondary" className="text-xs px-1.5 py-0">
                          {day.label}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}

                {!service.is_active && (
                  <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs">
                    Inativo
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}