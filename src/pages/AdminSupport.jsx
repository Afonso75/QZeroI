import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  MessageSquare, 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Download,
  Paperclip,
  StickyNote,
  User
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";

const statusConfig = {
  pendente: { icon: Clock, color: "bg-amber-100 text-amber-700 border-amber-200", label: "Pendente" },
  em_analise: { icon: AlertCircle, color: "bg-blue-100 text-blue-700 border-blue-200", label: "Em Análise" },
  resolvido: { icon: CheckCircle2, color: "bg-green-100 text-green-700 border-green-200", label: "Resolvido" }
};

export default function AdminSupportPage() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [responseText, setResponseText] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [responseFiles, setResponseFiles] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    base44.auth.me().then(userData => {
      setUser(userData);
      if (userData.role !== 'admin') {
        window.location.href = '/';
      }
    }).catch(() => base44.auth.redirectToLogin());
  }, []);

  const { data: messages, isLoading } = useQuery({
    queryKey: ['admin-support-messages', filterStatus],
    queryFn: async () => {
      if (filterStatus === "all") {
        return await base44.entities.SupportMessage.list('-created_date');
      }
      return await base44.entities.SupportMessage.filter({ status: filterStatus }, '-created_date');
    },
    initialData: [],
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: businesses } = useQuery({
    queryKey: ['all-businesses'],
    queryFn: () => base44.entities.Business.list(),
    initialData: [],
    enabled: !!user,
  });

  const updateMessageMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SupportMessage.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-support-messages'] });
      toast.success('Mensagem atualizada!');
    },
  });

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    const uploadedUrls = [];
    
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploadedUrls.push(file_url);
    }
    
    setResponseFiles([...responseFiles, ...uploadedUrls]);
  };

  const handleSendResponse = async () => {
    if (!selectedMessage || !responseText.trim()) {
      toast.error('Escreva uma resposta');
      return;
    }

    await updateMessageMutation.mutate({
      id: selectedMessage.id,
      data: {
        response: responseText,
        response_date: new Date().toISOString(),
        response_attachments: responseFiles,
        status: 'resolvido'
      }
    });

    try {
      await base44.integrations.Core.SendEmail({
        from_name: 'QZero Suporte',
        to: selectedMessage.user_email,
        subject: `Re: ${selectedMessage.subject}`,
        body: `Olá ${selectedMessage.user_name},

Recebemos a sua mensagem e aqui está a nossa resposta:

${responseText}

${responseFiles.length > 0 ? `\nAnexos: ${responseFiles.join('\n')}` : ''}

---
Equipa QZero
suporteqzero@gmail.com`
      });
    } catch (e) {
      console.error('Email error:', e);
    }

    setResponseText("");
    setResponseFiles([]);
    setSelectedMessage(null);
  };

  const handleAddNote = async () => {
    if (!selectedMessage || !internalNote.trim()) {
      toast.error('Escreva uma nota');
      return;
    }

    const notes = selectedMessage.internal_notes || [];
    notes.push({
      note: internalNote,
      created_by: user.email,
      created_at: new Date().toISOString()
    });

    await updateMessageMutation.mutate({
      id: selectedMessage.id,
      data: { internal_notes: notes }
    });

    setInternalNote("");
  };

  const handleStatusChange = async (messageId, newStatus) => {
    await updateMessageMutation.mutate({
      id: messageId,
      data: { status: newStatus }
    });
  };

  const getBusinessName = (businessId) => {
    const business = businesses.find(b => b.id === businessId);
    return business?.name || 'N/A';
  };

  if (!user || isLoading) {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 p-4">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-16 w-64 mb-8" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  const pendingCount = messages.filter(m => m.status === 'pendente').length;
  const inAnalysisCount = messages.filter(m => m.status === 'em_analise').length;
  const resolvedCount = messages.filter(m => m.status === 'resolvido').length;

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Dashboard de Suporte</h1>
          <p className="text-slate-600">Gestão de mensagens de suporte dos clientes</p>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <MessageSquare className="w-8 h-8 text-slate-600" />
                <Badge className="bg-slate-100 text-slate-700">Total</Badge>
              </div>
              <div className="text-3xl font-bold text-slate-900">{messages.length}</div>
              <p className="text-sm text-slate-600">Mensagens</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 text-amber-600" />
                <Badge className="bg-amber-100 text-amber-700">Pendente</Badge>
              </div>
              <div className="text-3xl font-bold text-amber-600">{pendingCount}</div>
              <p className="text-sm text-slate-600">Por responder</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-8 h-8 text-blue-600" />
                <Badge className="bg-blue-100 text-blue-700">Em Análise</Badge>
              </div>
              <div className="text-3xl font-bold text-blue-600">{inAnalysisCount}</div>
              <p className="text-sm text-slate-600">Em progresso</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
                <Badge className="bg-green-100 text-green-700">Resolvido</Badge>
              </div>
              <div className="text-3xl font-bold text-green-600">{resolvedCount}</div>
              <p className="text-sm text-slate-600">Concluídas</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-slate-50 border-b">
                <div className="flex justify-between items-center">
                  <CardTitle>Mensagens</CardTitle>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="pendente">Pendentes</SelectItem>
                      <SelectItem value="em_analise">Em Análise</SelectItem>
                      <SelectItem value="resolvido">Resolvidas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y max-h-[600px] overflow-y-auto">
                  {messages.map(msg => {
                    const status = statusConfig[msg.status];
                    const StatusIcon = status.icon;

                    return (
                      <div
                        key={msg.id}
                        className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${
                          selectedMessage?.id === msg.id ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => setSelectedMessage(msg)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h4 className="font-bold text-slate-900">{msg.subject}</h4>
                            <p className="text-sm text-slate-600">{getBusinessName(msg.business_id)} • {msg.user_name}</p>
                          </div>
                          <Badge className={status.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-700 line-clamp-2 mb-2">{msg.message}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span>{format(new Date(msg.created_date), "dd MMM 'às' HH:mm", { locale: pt })}</span>
                          {msg.attachments?.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Paperclip className="w-3 h-3" />
                              {msg.attachments.length}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            {selectedMessage ? (
              <Card className="border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-sky-500 to-blue-600 text-white">
                  <CardTitle className="text-lg">Detalhes da Mensagem</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <Tabs defaultValue="response" className="w-full">
                    <TabsList className="w-full grid grid-cols-2">
                      <TabsTrigger value="response">Responder</TabsTrigger>
                      <TabsTrigger value="notes">Notas</TabsTrigger>
                    </TabsList>

                    <TabsContent value="response" className="space-y-4">
                      <div>
                        <Label>Estado</Label>
                        <Select
                          value={selectedMessage.status}
                          onValueChange={(value) => handleStatusChange(selectedMessage.id, value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendente">Pendente</SelectItem>
                            <SelectItem value="em_analise">Em Análise</SelectItem>
                            <SelectItem value="resolvido">Resolvido</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedMessage.message}</p>
                      </div>

                      {selectedMessage.attachments?.length > 0 && (
                        <div>
                          <Label>Anexos do Cliente</Label>
                          <div className="space-y-2 mt-2">
                            {selectedMessage.attachments.map((url, idx) => (
                              <a
                                key={idx}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-2 bg-slate-50 rounded hover:bg-slate-100 text-sm"
                              >
                                <FileText className="w-4 h-4" />
                                Ficheiro {idx + 1}
                                <Download className="w-3 h-3 ml-auto" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <Label htmlFor="response">Resposta</Label>
                        <Textarea
                          id="response"
                          value={responseText}
                          onChange={(e) => setResponseText(e.target.value)}
                          placeholder="Escreva a sua resposta..."
                          rows={6}
                        />
                      </div>

                      <div>
                        <Label>Anexar Ficheiros</Label>
                        <Input
                          type="file"
                          multiple
                          onChange={handleFileUpload}
                          className="mt-2"
                        />
                        {responseFiles.length > 0 && (
                          <p className="text-xs text-slate-600 mt-2">{responseFiles.length} ficheiro(s) anexado(s)</p>
                        )}
                      </div>

                      <Button
                        onClick={handleSendResponse}
                        className="w-full bg-gradient-to-r from-sky-500 to-blue-600 gap-2"
                        disabled={updateMessageMutation.isPending}
                      >
                        <Send className="w-4 h-4" />
                        Enviar Resposta
                      </Button>
                    </TabsContent>

                    <TabsContent value="notes" className="space-y-4">
                      <div>
                        <Label htmlFor="note">Nova Nota Interna</Label>
                        <Textarea
                          id="note"
                          value={internalNote}
                          onChange={(e) => setInternalNote(e.target.value)}
                          placeholder="Adicione uma nota interna..."
                          rows={4}
                        />
                        <Button
                          onClick={handleAddNote}
                          className="w-full mt-2 gap-2"
                          variant="outline"
                        >
                          <StickyNote className="w-4 h-4" />
                          Adicionar Nota
                        </Button>
                      </div>

                      {selectedMessage.internal_notes?.length > 0 && (
                        <div className="space-y-2">
                          <Label>Histórico de Notas</Label>
                          {selectedMessage.internal_notes.map((note, idx) => (
                            <div key={idx} className="p-3 bg-amber-50 border-l-4 border-amber-400 rounded">
                              <div className="flex items-center gap-2 mb-1">
                                <User className="w-3 h-3 text-amber-700" />
                                <span className="text-xs font-semibold text-amber-900">{note.created_by}</span>
                                <span className="text-xs text-amber-700">
                                  {format(new Date(note.created_at), "dd MMM 'às' HH:mm", { locale: pt })}
                                </span>
                              </div>
                              <p className="text-sm text-amber-900 whitespace-pre-wrap">{note.note}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-12 text-center">
                  <MessageSquare className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600">Selecione uma mensagem para responder</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}