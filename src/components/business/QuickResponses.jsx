import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, MessageSquare, Copy } from "lucide-react";
import { useAutoTranslate } from "@/hooks/useTranslate";

export default function QuickResponses({ business }) {
  const txtQuickResponses = useAutoTranslate('Respostas Rápidas', 'pt');
  const txtNewResponse = useAutoTranslate('Nova Resposta', 'pt');
  const txtDescription = useAutoTranslate('Configure mensagens pré-definidas para comunicar rapidamente com clientes através de SMS/email', 'pt');
  const txtResponseTitle = useAutoTranslate('Título da Resposta', 'pt');
  const txtTitlePlaceholder = useAutoTranslate('Ex: Aviso de Atraso', 'pt');
  const txtMessage = useAutoTranslate('Mensagem', 'pt');
  const txtMessagePlaceholder = useAutoTranslate('Ex: Devido a um imprevisto, teremos um atraso de 15 minutos. Pedimos desculpa pelo inconveniente.', 'pt');
  const txtSave = useAutoTranslate('Guardar', 'pt');
  const txtCancel = useAutoTranslate('Cancelar', 'pt');
  const txtNoResponses = useAutoTranslate('Nenhuma resposta rápida configurada', 'pt');
  const txtCreateMessages = useAutoTranslate('Crie mensagens pré-definidas para comunicar mais rapidamente', 'pt');
  const txtCharacters = useAutoTranslate('caracteres', 'pt');
  const txtDeleteConfirm = useAutoTranslate('Tem certeza que deseja eliminar esta resposta rápida?', 'pt');
  const txtUsageTip = useAutoTranslate('Dica de Uso', 'pt');
  const txtUsageDescription = useAutoTranslate('Use estas respostas quando precisar comunicar alterações nos horários, avisar sobre atrasos, ou enviar informações importantes para todos os clientes em espera.', 'pt');
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [newResponse, setNewResponse] = useState({ title: '', message: '' });

  const quickResponses = business?.quick_responses || [];

  const updateBusinessMutation = useMutation({
    mutationFn: async (responses) => {
      await base44.entities.Business.update(business.id, {
        quick_responses: responses
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business'] });
    },
  });

  const handleAdd = () => {
    if (!newResponse.title || !newResponse.message) return;
    
    const updated = [...quickResponses, newResponse];
    updateBusinessMutation.mutate(updated);
    setNewResponse({ title: '', message: '' });
    setShowForm(false);
  };

  const handleDelete = (index) => {
    if (!confirm(txtDeleteConfirm)) return;
    
    const updated = quickResponses.filter((_, i) => i !== index);
    updateBusinessMutation.mutate(updated);
  };

  const handleCopy = (message) => {
    navigator.clipboard.writeText(message);
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            {txtQuickResponses}
          </CardTitle>
          <Button
            size="sm"
            onClick={() => setShowForm(!showForm)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            {txtNewResponse}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-slate-600">
          {txtDescription}
        </p>

        {showForm && (
          <div className="p-4 bg-slate-50 rounded-xl space-y-4">
            <div>
              <Label htmlFor="title">{txtResponseTitle}</Label>
              <Input
                id="title"
                value={newResponse.title}
                onChange={(e) => setNewResponse({ ...newResponse, title: e.target.value })}
                placeholder={txtTitlePlaceholder}
              />
            </div>

            <div>
              <Label htmlFor="message">{txtMessage}</Label>
              <Textarea
                id="message"
                value={newResponse.message}
                onChange={(e) => setNewResponse({ ...newResponse, message: e.target.value })}
                placeholder={txtMessagePlaceholder}
                rows={4}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={updateBusinessMutation.isPending}>
                {txtSave}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                {txtCancel}
              </Button>
            </div>
          </div>
        )}

        {quickResponses.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{txtNoResponses}</p>
            <p className="text-sm mt-1">{txtCreateMessages}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {quickResponses.map((response, index) => (
              <div
                key={index}
                className="p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-slate-900">{response.title}</h4>
                    <Badge variant="secondary" className="text-xs mt-1">
                      {response.message.length} {txtCharacters}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy(response.message)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(index)}
                      className="border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                  {response.message}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
          <h5 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            {txtUsageTip}
          </h5>
          <p className="text-sm text-blue-800">
            {txtUsageDescription}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}