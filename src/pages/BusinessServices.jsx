import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Calendar, Crown, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import EmptyState from "../components/shared/EmptyState";
import ServiceForm from "../components/business/ServiceForm";
import { useConfirm } from "@/hooks/useConfirm";
import { toast } from "sonner";
import { useBusinessAccess } from "@/hooks/useBusinessAccess";
import { useAutoTranslate } from "@/hooks/useTranslate";
import { ExpiredBanner } from "@/components/business/ExpiredBanner";
import { BusinessFeatureGuard } from "@/components/business/BusinessFeatureGuard";

export default function BusinessServicesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const { confirm, ConfirmDialog } = useConfirm();
  
  // ✅ Usar hook com hasAccess (inclui subscrições canceladas com acesso até currentPeriodEnd)
  const { hasAccess, hasActiveSubscription, isExpired, companyProfile, isLoading: loadingAccess } = useBusinessAccess();

  const txtServiceManagement = useAutoTranslate('Gestão de Serviços', 'pt');
  const txtCreateManageServices = useAutoTranslate('Crie e gerir os serviços que oferece aos seus clientes', 'pt');
  const txtNewService = useAutoTranslate('Novo Serviço', 'pt');
  const txtServiceDeleted = useAutoTranslate('Serviço eliminado com sucesso', 'pt');
  const txtDeleteServiceError = useAutoTranslate('Erro ao eliminar serviço', 'pt');
  const txtDeleteServiceTitle = useAutoTranslate('Eliminar Serviço', 'pt');
  const txtDeleteServiceConfirm = useAutoTranslate('Tem certeza que deseja eliminar este serviço? Esta ação não pode ser desfeita.', 'pt');
  const txtEdit = useAutoTranslate('Editar', 'pt');
  const txtAvailableDays = useAutoTranslate('Dias disponíveis:', 'pt');
  const txtNoServicesCreated = useAutoTranslate('Nenhum serviço criado', 'pt');
  const txtCreateFirstServiceDesc = useAutoTranslate('Crie seu primeiro serviço para oferecer aos clientes', 'pt');
  const txtCreateFirstService = useAutoTranslate('Criar Primeiro Serviço', 'pt');
  const txtSunday = useAutoTranslate('Domingo', 'pt');
  const txtMonday = useAutoTranslate('Segunda-feira', 'pt');
  const txtTuesday = useAutoTranslate('Terça-feira', 'pt');
  const txtWednesday = useAutoTranslate('Quarta-feira', 'pt');
  const txtThursday = useAutoTranslate('Quinta-feira', 'pt');
  const txtFriday = useAutoTranslate('Sexta-feira', 'pt');
  const txtSaturday = useAutoTranslate('Sábado', 'pt');
  
  const daysOfWeekMap = {
    sunday: txtSunday,
    monday: txtMonday,
    tuesday: txtTuesday,
    wednesday: txtWednesday,
    thursday: txtThursday,
    friday: txtFriday,
    saturday: txtSaturday
  };

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
  const txtBack = useAutoTranslate('Voltar', 'pt');
  const txtServiceManagementFeature = useAutoTranslate('a gestão de marcações', 'pt');

  const { data: services, isLoading } = useQuery({
    queryKey: ['business-services', user?.business_id],
    queryFn: () => base44.entities.Service.filter({ business_id: user.business_id }),
    initialData: [],
    enabled: !!user?.business_id,
  });

  const deleteServiceMutation = useMutation({
    mutationFn: (serviceId) => base44.entities.Service.delete(serviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-services', user?.business_id] });
      toast.success(txtServiceDeleted);
    },
    onError: () => {
      toast.error(txtDeleteServiceError);
    }
  });

  const handleEdit = (service) => {
    if (!hasSubscription) return;
    setEditingService(service);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingService(null);
  };

  const handleDelete = async (serviceId) => {
    if (!hasSubscription) return;
    const confirmed = await confirm({
      title: txtDeleteServiceTitle,
      description: txtDeleteServiceConfirm,
    });
    if (confirmed) {
      deleteServiceMutation.mutate(serviceId);
    }
  };

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
      feature={txtServiceManagementFeature}
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
              <h1 className="text-sm sm:text-base lg:text-2xl xl:text-3xl font-bold text-slate-900 truncate">{txtServiceManagement}</h1>
              <p className="text-[10px] sm:text-xs lg:text-base text-slate-500 truncate hidden sm:block">{txtCreateManageServices}</p>
            </div>
          </div>
          {!showForm && !isExpired && (
            <Button 
              size="sm" 
              onClick={() => { setEditingService(null); setShowForm(true); }} 
              className="gap-1 lg:gap-2 h-7 lg:h-10 text-xs lg:text-sm px-2 lg:px-4 flex-shrink-0"
            >
              <Plus className="w-3 h-3 lg:w-4 lg:h-4" />
              <span className="hidden sm:inline">{txtNewService}</span>
              <span className="sm:hidden">+</span>
            </Button>
          )}
        </div>

        {showForm && (
          <div className="mb-3">
            <ServiceForm
              service={editingService}
              businessId={user.business_id}
              onClose={handleCloseForm}
            />
          </div>
        )}

        {!showForm && services.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title={txtNoServicesCreated}
            description={txtCreateFirstServiceDesc}
            action={{
              label: txtCreateFirstService,
              onClick: () => setShowForm(true)
            }}
          />
        ) : !showForm && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-4">
            {services.map(service => (
              <Card key={service.id} className="border-0 shadow-sm lg:shadow-md hover:shadow-md lg:hover:shadow-lg transition-all">
                <CardContent className="p-3 lg:p-5">
                  <div className="flex justify-between items-start gap-2 lg:gap-3 mb-2 lg:mb-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm lg:text-lg text-slate-900 truncate">{service.name}</h3>
                      {service.description && (
                        <p className="text-[10px] lg:text-sm text-slate-500 line-clamp-1">{service.description}</p>
                      )}
                    </div>
                    {service.price && service.price > 0 && (
                      <Badge className="bg-sky-100 text-sky-700 border-sky-200 text-xs lg:text-sm flex-shrink-0">
                        €{service.price.toFixed(2)}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 lg:gap-3 mb-2 lg:mb-3">
                    <div className="flex items-center gap-1 lg:gap-2 text-slate-600">
                      <Calendar className="w-3 h-3 lg:w-4 lg:h-4" />
                      <span className="text-xs lg:text-sm">{service.duration} min</span>
                    </div>
                    {service.category && (
                      <Badge variant="secondary" className="text-[10px] lg:text-xs h-4 lg:h-6 px-1 lg:px-2">{service.category}</Badge>
                    )}
                  </div>

                  {service.working_hours && Object.keys(service.working_hours).length > 0 && (
                    <div className="mb-2 lg:mb-3 pb-2 lg:pb-3 border-b">
                      <p className="text-[9px] lg:text-xs text-slate-400 mb-1 lg:mb-2">{txtAvailableDays}</p>
                      <div className="flex flex-wrap gap-0.5 lg:gap-1">
                        {Object.keys(service.working_hours).map(day => (
                          <Badge key={day} variant="outline" className="text-[9px] lg:text-xs h-4 lg:h-6 px-1 lg:px-2">
                            {daysOfWeekMap[day]?.substring(0, 3)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {!isExpired && (
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-7 text-xs"
                        onClick={() => handleEdit(service)}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        {txtEdit}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0 border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(service.id)}
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
