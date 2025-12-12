import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useAutoTranslate } from "@/hooks/useTranslate";

export default function StaffInviteAcceptPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const [user, setUser] = useState(null);
  const [processing, setProcessing] = useState(false);

  const txtLoadingInvite = useAutoTranslate('A carregar convite...', 'pt');
  const txtInvalidInvite = useAutoTranslate('Convite Inválido', 'pt');
  const txtInviteNotExist = useAutoTranslate('Este convite não existe, já foi usado ou expirou.', 'pt');
  const txtBackHome = useAutoTranslate('Voltar ao Início', 'pt');
  const txtIncorrectEmail = useAutoTranslate('Email Incorreto', 'pt');
  const txtInviteSentTo = useAutoTranslate('Este convite foi enviado para', 'pt');
  const txtPleaseLoginWith = useAutoTranslate('Por favor faça login com esse email.', 'pt');
  const txtSwitchAccount = useAutoTranslate('Trocar de Conta', 'pt');
  const txtTeamInvite = useAutoTranslate('Convite para Equipa', 'pt');
  const txtLoading = useAutoTranslate('A carregar...', 'pt');
  const txtAssignedPermissions = useAutoTranslate('Permissões Atribuídas:', 'pt');
  const txtManageQueues = useAutoTranslate('Gerir Senhas', 'pt');
  const txtManageAppointments = useAutoTranslate('Gerir Marcações', 'pt');
  const txtManageServices = useAutoTranslate('Gerir Serviços', 'pt');
  const txtNote = useAutoTranslate('Nota:', 'pt');
  const txtOnAcceptAccess = useAutoTranslate('Ao aceitar, terá acesso ao painel empresarial de', 'pt');
  const txtWithPermissions = useAutoTranslate('com as permissões indicadas acima.', 'pt');
  const txtReject = useAutoTranslate('Rejeitar', 'pt');
  const txtAccepting = useAutoTranslate('A aceitar...', 'pt');
  const txtAcceptInvite = useAutoTranslate('Aceitar Convite', 'pt');
  const txtInviteAccepted = useAutoTranslate('Convite aceite com sucesso!', 'pt');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {
      base44.auth.redirectToLogin(window.location.href);
    });
  }, []);

  const { data: invite, isLoading } = useQuery({
    queryKey: ['invite', token],
    queryFn: async () => {
      const invites = await base44.entities.StaffInvite.filter({ token: token });
      return invites[0];
    },
    enabled: !!token && !!user,
  });

  const { data: business } = useQuery({
    queryKey: ['business', invite?.business_id],
    queryFn: async () => {
      const businesses = await base44.entities.Business.filter({ id: invite.business_id });
      return businesses[0];
    },
    enabled: !!invite?.business_id,
  });

  const acceptInviteMutation = useMutation({
    mutationFn: async () => {
      setProcessing(true);

      // Atualizar perfil do utilizador (servidor emite novo JWT automaticamente)
      await base44.auth.updateMe({
        is_staff_member: true,
        is_business_user: true,
        business_id: invite.business_id,
        staff_permissions: invite.permissions,
        account_type: 'empresa'
      });

      // Marcar convite como aceite
      await base44.entities.StaffInvite.update(invite.id, {
        status: "aceite"
      });
    },
    onSuccess: () => {
      toast.success(txtInviteAccepted);
      // Redirecionar para BusinessHome (JWT já atualizado pelo servidor)
      window.location.href = createPageUrl("BusinessHome");
    },
  });

  const rejectInviteMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.StaffInvite.update(invite.id, {
        status: "rejeitado"
      });
    },
    onSuccess: () => {
      navigate(createPageUrl("Home"));
    },
  });

  const permissionLabels = {
    manage_queues: txtManageQueues,
    manage_appointments: txtManageAppointments,
    manage_services: txtManageServices
  };

  if (isLoading || !user) {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 flex items-center justify-center p-4">
        <Card className="border-0 shadow-2xl max-w-md w-full animate-scale-in">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-sky-600 mx-auto mb-4" />
            <p className="text-slate-600">{txtLoadingInvite}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invite || invite.status !== 'pendente') {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 flex items-center justify-center p-4">
        <Card className="border-0 shadow-2xl max-w-md w-full animate-scale-in">
          <CardContent className="p-12 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4 animate-pulse-slow" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {txtInvalidInvite}
            </h2>
            <p className="text-slate-600 mb-6">
              {txtInviteNotExist}
            </p>
            <Button onClick={() => navigate(createPageUrl("Home"))} className="hover-lift">
              {txtBackHome}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invite.email !== user.email) {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 flex items-center justify-center p-4">
        <Card className="border-0 shadow-2xl max-w-md w-full animate-scale-in">
          <CardContent className="p-12 text-center">
            <XCircle className="w-16 h-16 text-amber-500 mx-auto mb-4 animate-pulse-slow" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {txtIncorrectEmail}
            </h2>
            <p className="text-slate-600 mb-6">
              {txtInviteSentTo} {invite.email}. 
              {txtPleaseLoginWith}
            </p>
            <Button onClick={() => base44.auth.logout()} className="hover-lift">
              {txtSwitchAccount}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 flex items-center justify-center p-4">
      <Card className="border-0 shadow-2xl max-w-2xl w-full overflow-hidden animate-scale-in">
        <div className="h-2 bg-gradient-to-r from-sky-500 to-blue-600" />
        <CardContent className="p-8">
          <div className="text-center mb-8 animate-slide-in-down">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center mx-auto mb-4 hover-lift">
              <Building2 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2 gradient-text">
              {txtTeamInvite}
            </h1>
            <p className="text-lg text-slate-600">
              {business?.name || txtLoading}
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-6 mb-6 animate-slide-in-left">
            <h3 className="font-semibold text-slate-900 mb-4">
              {txtAssignedPermissions}
            </h3>
            <div className="space-y-3">
              {Object.entries(invite.permissions || {}).map(([key, value], idx) => (
                <div 
                  key={key} 
                  className="flex items-center gap-3 stagger-item"
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  {value ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <span className="text-slate-700">{permissionLabels[key]}</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-slate-300 flex-shrink-0" />
                      <span className="text-slate-400">{permissionLabels[key]}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-200 animate-slide-in-right">
            <p className="text-sm text-slate-700">
              <strong>{txtNote}</strong> {txtOnAcceptAccess} {business?.name} {txtWithPermissions}
            </p>
          </div>

          <div className="flex gap-4 animate-slide-in-up">
            <Button
              variant="outline"
              className="flex-1 smooth-transition hover-lift"
              onClick={() => rejectInviteMutation.mutate()}
              disabled={processing || rejectInviteMutation.isPending}
            >
              {txtReject}
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 smooth-transition hover-lift"
              onClick={() => acceptInviteMutation.mutate()}
              disabled={processing || acceptInviteMutation.isPending}
            >
              {processing || acceptInviteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {txtAccepting}
                </>
              ) : (
                txtAcceptInvite
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}