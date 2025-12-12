import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Trash2, Users, Mail, Phone } from "lucide-react";
import { useAutoTranslate } from "@/hooks/useTranslate";

export default function StaffManager({ businessId }) {
  const txtTeam = useAutoTranslate('Equipa', 'pt');
  const txtAdd = useAutoTranslate('Adicionar', 'pt');
  const txtEdit = useAutoTranslate('Editar', 'pt');
  const txtNew = useAutoTranslate('Novo', 'pt');
  const txtEmployee = useAutoTranslate('Funcionário', 'pt');
  const txtName = useAutoTranslate('Nome', 'pt');
  const txtEmail = useAutoTranslate('Email', 'pt');
  const txtPhone = useAutoTranslate('Telefone', 'pt');
  const txtRole = useAutoTranslate('Função', 'pt');
  const txtAttendant = useAutoTranslate('Atendente', 'pt');
  const txtSupervisor = useAutoTranslate('Supervisor', 'pt');
  const txtManager = useAutoTranslate('Gestor', 'pt');
  const txtUpdate = useAutoTranslate('Atualizar', 'pt');
  const txtCreate = useAutoTranslate('Criar', 'pt');
  const txtCancel = useAutoTranslate('Cancelar', 'pt');
  const txtNoEmployees = useAutoTranslate('Nenhum funcionário', 'pt');
  const txtDelete = useAutoTranslate('Eliminar?', 'pt');

  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "atendente"
  });

  const { data: staff } = useQuery({
    queryKey: ['staff', businessId],
    queryFn: () => base44.entities.Staff.filter({ business_id: businessId }),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Staff.create({ ...data, business_id: businessId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Staff.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Staff.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });

  const resetForm = () => {
    setFormData({ name: "", email: "", phone: "", role: "atendente" });
    setEditingStaff(null);
    setShowForm(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingStaff) {
      updateMutation.mutate({ id: editingStaff.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (member) => {
    setEditingStaff(member);
    setFormData({
      name: member.name,
      email: member.email || "",
      phone: member.phone || "",
      role: member.role
    });
    setShowForm(true);
  };

  const roleLabels = {
    atendente: txtAttendant,
    supervisor: txtSupervisor,
    manager: txtManager
  };

  const roleColors = {
    atendente: "bg-blue-100 text-blue-700 border-blue-200",
    supervisor: "bg-purple-100 text-purple-700 border-purple-200",
    manager: "bg-amber-100 text-amber-700 border-amber-200"
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h3 className="text-base md:text-lg font-bold text-slate-900">{txtTeam}</h3>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-2 w-full sm:w-auto h-9">
          <Plus className="w-3 h-3 md:w-4 md:h-4" />
          {txtAdd}
        </Button>
      </div>

      {showForm && (
        <Card className="border-2 border-sky-200">
          <CardHeader className="p-3 md:p-6">
            <CardTitle className="text-sm md:text-base">{editingStaff ? txtEdit : txtNew} {txtEmployee}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6">
            <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4" noValidate>
              <div>
                <Label className="text-xs md:text-sm">{txtName} *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="h-9 text-sm"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <Label className="text-xs md:text-sm">{txtEmail}</Label>
                  <Input
                    type="text"
                    inputMode="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="h-9 text-sm"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <Label className="text-xs md:text-sm">{txtPhone}</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs md:text-sm">{txtRole}</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="atendente" className="text-sm">{txtAttendant}</SelectItem>
                    <SelectItem value="supervisor" className="text-sm">{txtSupervisor}</SelectItem>
                    <SelectItem value="manager" className="text-sm">{txtManager}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 h-9">
                  {editingStaff ? txtUpdate : txtCreate}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={resetForm} className="flex-1 h-9">
                  {txtCancel}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {staff.length === 0 ? (
        <Card>
          <CardContent className="py-8 md:py-12 text-center">
            <Users className="w-10 h-10 md:w-12 md:h-12 text-slate-400 mx-auto mb-2 md:mb-3" />
            <p className="text-sm text-slate-600">{txtNoEmployees}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3 md:gap-4">
          {staff.map((member) => (
            <Card key={member.id}>
              <CardContent className="p-3 md:p-4">
                <div className="flex justify-between items-start mb-2 md:mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm md:text-base text-slate-900 truncate">{member.name}</h4>
                    <Badge className={`${roleColors[member.role]} text-xs mt-1`}>
                      {roleLabels[member.role]}
                    </Badge>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(member)} className="h-7 w-7 p-0">
                      <Edit className="w-3 h-3 md:w-4 md:h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => {
                        if (confirm(txtDelete)) {
                          deleteMutation.mutate(member.id);
                        }
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                    >
                      <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                    </Button>
                  </div>
                </div>
                {member.email && (
                  <div className="flex items-center gap-2 text-xs md:text-sm text-slate-600 mb-1">
                    <Mail className="w-3 h-3" />
                    <span className="truncate">{member.email}</span>
                  </div>
                )}
                {member.phone && (
                  <div className="flex items-center gap-2 text-xs md:text-sm text-slate-600">
                    <Phone className="w-3 h-3" />
                    {member.phone}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}