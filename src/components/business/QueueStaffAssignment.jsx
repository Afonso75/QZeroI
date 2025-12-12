import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Save } from "lucide-react";
import { useAutoTranslate } from "@/hooks/useTranslate";

export default function QueueStaffAssignment({ queue, businessId }) {
  // Traduções
  const txtAssignedStaff = useAutoTranslate('Funcionários Atribuídos', 'pt');
  const txtNoStaff = useAutoTranslate('Nenhum funcionário cadastrado', 'pt');
  const txtSaving = useAutoTranslate('Salvando...', 'pt');
  const txtSaveAssignments = useAutoTranslate('Salvar Atribuições', 'pt');

  const queryClient = useQueryClient();
  const [selectedStaff, setSelectedStaff] = useState(queue.assigned_staff || []);

  const { data: staff } = useQuery({
    queryKey: ['staff', businessId],
    queryFn: () => base44.entities.Staff.filter({ business_id: businessId, is_active: true }),
    initialData: [],
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Queue.update(queue.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-queues'] });
    },
  });

  const toggleStaff = (staffId) => {
    if (selectedStaff.includes(staffId)) {
      setSelectedStaff(selectedStaff.filter(id => id !== staffId));
    } else {
      setSelectedStaff([...selectedStaff, staffId]);
    }
  };

  const handleSave = () => {
    updateMutation.mutate({ assigned_staff: selectedStaff });
  };

  const roleColors = {
    atendente: "bg-blue-100 text-blue-700 border-blue-200",
    supervisor: "bg-purple-100 text-purple-700 border-purple-200",
    manager: "bg-amber-100 text-amber-700 border-amber-200"
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          {txtAssignedStaff}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {staff.length === 0 ? (
          <p className="text-center text-slate-500 py-4">
            {txtNoStaff}
          </p>
        ) : (
          <>
            <div className="space-y-2">
              {staff.map((member) => (
                <div key={member.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <Checkbox
                    checked={selectedStaff.includes(member.id)}
                    onCheckedChange={() => toggleStaff(member.id)}
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900">{member.name}</div>
                    <Badge className={`${roleColors[member.role]} text-xs`}>
                      {member.role}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            
            <Button 
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="w-full gap-2"
            >
              <Save className="w-4 h-4" />
              {updateMutation.isPending ? txtSaving : txtSaveAssignments}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}