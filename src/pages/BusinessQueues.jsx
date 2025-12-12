import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Users, Crown, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "../components/shared/EmptyState";
import QueueForm from "../components/business/QueueForm";
import { useConfirm } from "@/hooks/useConfirm";
import { toast } from "sonner";
import { useBusinessAccess } from "@/hooks/useBusinessAccess";
import { useAutoTranslate } from "@/hooks/useTranslate";
import { ExpiredBanner } from "@/components/business/ExpiredBanner";
import { BusinessFeatureGuard } from "@/components/business/BusinessFeatureGuard";

export default function BusinessQueuesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingQueue, setEditingQueue] = useState(null);
  const { confirm, ConfirmDialog } = useConfirm();
  
  // ✅ Usar hook com hasAccess (inclui subscrições canceladas com acesso até currentPeriodEnd)
  const { hasAccess, hasActiveSubscription, isExpired, companyProfile, isLoading: loadingAccess } = useBusinessAccess();

  const txtQueueManagement = useAutoTranslate('Gestão de Senhas', 'pt');
  const txtCreateManage = useAutoTranslate('Crie e gerir as suas senhas de atendimento', 'pt');
  const txtNewQueue = useAutoTranslate('Nova Senha', 'pt');
  const txtSubscriptionRequired = useAutoTranslate('Subscrição Necessária', 'pt');
  const txtSubscriptionDesc = useAutoTranslate('Para criar e gerir senhas de atendimento, precisa de ativar o plano empresarial.', 'pt');
  const txtActivatePlan = useAutoTranslate('Ativar Plano Empresarial - €49,99/mês', 'pt');
  const txtQueueDeleted = useAutoTranslate('Senha eliminada com sucesso', 'pt');
  const txtDeleteError = useAutoTranslate('Erro ao eliminar senha', 'pt');
  const txtDeleteTitle = useAutoTranslate('Eliminar Senha', 'pt');
  const txtDeleteConfirm = useAutoTranslate('Tem certeza que deseja eliminar esta senha de atendimento? Esta ação não pode ser desfeita.', 'pt');
  const txtCurrent = useAutoTranslate('Atual', 'pt');
  const txtLast = useAutoTranslate('Última', 'pt');
  const txtMin = useAutoTranslate('Min', 'pt');
  const txtEdit = useAutoTranslate('Editar', 'pt');
  const txtNoQueuesCreated = useAutoTranslate('Nenhuma senha de atendimento criada', 'pt');
  const txtCreateFirstQueue = useAutoTranslate('Crie a sua primeira senha de atendimento para começar a gerir o fluxo de clientes', 'pt');
  const txtCreateFirstQueueBtn = useAutoTranslate('Criar Primeira Senha', 'pt');
  const txtOpen = useAutoTranslate('aberto', 'pt');
  const txtPaused = useAutoTranslate('pausado', 'pt');
  const txtClosed = useAutoTranslate('fechado', 'pt');

  useEffect(() => {
    base44.auth.me().then(userData => {
      setUser(userData);
      if (!userData.is_business_user || !userData.business_id) {
        navigate(createPageUrl("Home"));
      }
    }).catch(() => base44.auth.redirectToLogin());
  }, [navigate]);

  // ✅ Usar hasAccess (true para subscrições ativas, trial, ou canceladas com currentPeriodEnd futuro)
  const hasSubscription = hasAccess || hasActiveSubscription || user?.has_business_subscription;

  const { data: queues, isLoading } = useQuery({
    queryKey: ['business-queues', user?.business_id],
    queryFn: () => base44.entities.Queue.filter({ business_id: user.business_id }),
    enabled: !!user?.business_id,
  });

  const deleteQueueMutation = useMutation({
    mutationFn: (queueId) => base44.entities.Queue.delete(queueId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-queues', user?.business_id] });
      toast.success(txtQueueDeleted);
    },
    onError: () => {
      toast.error(txtDeleteError);
    }
  });

  const handleEdit = (queue) => {
    if (!hasSubscription) return;
    setEditingQueue(queue);
    setShowForm(true);
  };

  const handleDelete = async (queueId) => {
    if (!hasSubscription) return;
    const confirmed = await confirm({
      title: txtDeleteTitle,
      description: txtDeleteConfirm,
    });
    if (confirmed) {
      deleteQueueMutation.mutate(queueId);
    }
  };

  const txtBack = useAutoTranslate('Voltar', 'pt');
  const txtQueueManagementFeature = useAutoTranslate('a gestão de senhas', 'pt');

  if (!user || isLoading) {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 p-2">
        <div className="max-w-full mx-auto px-2">
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return (
    <BusinessFeatureGuard 
      companyProfile={companyProfile}
      hasAccess={hasAccess}
      isExpired={isExpired}
      feature={txtQueueManagementFeature}
      isLoading={loadingAccess}
    >
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50">
      {isExpired && <ExpiredBanner companyProfileId={companyProfile?.id} />}
      <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-8 py-2 sm:py-3 lg:py-6">
        <div className="flex items-center justify-between gap-2 lg:gap-4 mb-2 sm:mb-3 lg:mb-6">
          <div className="flex items-center gap-2 lg:gap-3 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 lg:h-10 lg:w-10 p-0 flex-shrink-0"
              onClick={() => navigate(createPageUrl("BusinessDashboard"))}
            >
              <ArrowLeft className="w-4 h-4 lg:w-5 lg:h-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base lg:text-2xl xl:text-3xl font-bold text-slate-900 truncate">{txtQueueManagement}</h1>
              <p className="text-[10px] sm:text-xs lg:text-base text-slate-500 truncate hidden sm:block">{txtCreateManage}</p>
            </div>
          </div>
          {!isExpired && (
            <Button 
              size="sm" 
              onClick={() => { setEditingQueue(null); setShowForm(true); }} 
              className="gap-1 lg:gap-2 h-7 lg:h-10 text-xs lg:text-sm px-2 lg:px-4 flex-shrink-0"
            >
              <Plus className="w-3 h-3 lg:w-4 lg:h-4" />
              <span className="hidden sm:inline">{txtNewQueue}</span>
              <span className="sm:hidden">+</span>
            </Button>
          )}
        </div>

        {showForm ? (
          <Card className="border-0 shadow-md mb-3">
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm">{editingQueue ? 'Editar Ticket' : 'Novo Ticket'}</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <QueueForm
                queue={editingQueue}
                businessId={user.business_id}
                onClose={() => {
                  setShowForm(false);
                  setEditingQueue(null);
                }}
              />
            </CardContent>
          </Card>
        ) : queues.length === 0 ? (
          <EmptyState
            icon={Users}
            title={txtNoQueuesCreated}
            description={txtCreateFirstQueue}
            action={{
              label: txtCreateFirstQueueBtn,
              onClick: () => setShowForm(true)
            }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-4">
            {queues.map(queue => (
              <Card key={queue.id} className="border-0 shadow-sm lg:shadow-md hover:shadow-md lg:hover:shadow-lg transition-all">
                <CardContent className="p-3 lg:p-5">
                  <div className="flex justify-between items-start gap-2 lg:gap-3 mb-2 lg:mb-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm lg:text-lg text-slate-900 truncate">{queue.name}</h3>
                      {queue.description && (
                        <p className="text-[10px] lg:text-sm text-slate-500 truncate">{queue.description}</p>
                      )}
                    </div>
                    <div className={`px-1.5 lg:px-3 py-0.5 lg:py-1 rounded-full text-[10px] lg:text-xs font-medium flex-shrink-0 ${
                      queue.status === 'aberta' ? 'bg-green-100 text-green-700' :
                      queue.status === 'pausada' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {queue.status === 'aberta' ? txtOpen : queue.status === 'pausada' ? txtPaused : txtClosed}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 lg:gap-3 mb-2 lg:mb-4">
                    <div className="p-1.5 lg:p-3 bg-blue-50 rounded lg:rounded-lg text-center">
                      <div className="text-sm lg:text-xl font-bold text-blue-600">#{queue.current_number}</div>
                      <div className="text-[9px] lg:text-xs text-blue-500">{txtCurrent}</div>
                    </div>
                    <div className="p-1.5 lg:p-3 bg-purple-50 rounded lg:rounded-lg text-center">
                      <div className="text-sm lg:text-xl font-bold text-purple-600">#{queue.last_issued_number}</div>
                      <div className="text-[9px] lg:text-xs text-purple-500">{txtLast}</div>
                    </div>
                    <div className="p-1.5 lg:p-3 bg-green-50 rounded lg:rounded-lg text-center">
                      <div className="text-sm lg:text-xl font-bold text-green-600">{queue.average_service_time}</div>
                      <div className="text-[9px] lg:text-xs text-green-500">{txtMin}</div>
                    </div>
                  </div>

                  {!isExpired && (
                    <div className="flex gap-1.5 lg:gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-7 lg:h-9 text-xs lg:text-sm"
                        onClick={() => handleEdit(queue)}
                      >
                        <Edit className="w-3 h-3 lg:w-4 lg:h-4 mr-1" />
                        {txtEdit}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0 border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(queue.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <ConfirmDialog />
    </div>
    </BusinessFeatureGuard>
  );
}