import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Users, Mail, Trash2, CheckCircle2, Clock, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import PageHeader from "../components/shared/PageHeader";
import { useConfirm } from "@/hooks/useConfirm";
import { sendEmail } from "@/services/emailService";
import { useAutoTranslate } from "@/hooks/useTranslate";

export default function BusinessStaffPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const { confirm, ConfirmDialog } = useConfirm();

  const txtTeamManagement = useAutoTranslate('Gestão da Equipa', 'pt');
  const txtInviteEmployee = useAutoTranslate('Convidar Funcionário', 'pt');
  const txtInviteTeamMember = useAutoTranslate('Convide funcionários para gerir a conta em conjunto', 'pt');
  const txtInviteSentSuccess = useAutoTranslate('Convite enviado com sucesso!', 'pt');
  const txtErrorSendingInvite = useAutoTranslate('Erro ao enviar convite', 'pt');
  const txtInviteRevokedSuccess = useAutoTranslate('Convite revogado com sucesso', 'pt');
  const txtMemberRemovedSuccess = useAutoTranslate('Membro removido com sucesso', 'pt');
  const txtInvalidEmail = useAutoTranslate('Email inválido', 'pt');
  const txtNewInvite = useAutoTranslate('Novo Convite', 'pt');
  const txtEmployeeEmail = useAutoTranslate('Email do Funcionário', 'pt');
  const txtFullAccess = useAutoTranslate('O funcionário terá acesso total à gestão da conta', 'pt');
  const txtCancel = useAutoTranslate('Cancelar', 'pt');
  const txtSending = useAutoTranslate('A enviar...', 'pt');
  const txtSendInvite = useAutoTranslate('Enviar Convite', 'pt');
  const txtPendingInvites = useAutoTranslate('Convites Pendentes', 'pt');
  const txtFullManagementAccess = useAutoTranslate('Acesso total à gestão', 'pt');
  const txtActiveEmployees = useAutoTranslate('Funcionários Ativos', 'pt');
  const txtNoEmployees = useAutoTranslate('Nenhum funcionário', 'pt');
  const txtInviteHelp = useAutoTranslate('Convide funcionários para ajudar na gestão', 'pt');
  const txtInviteFirstEmployee = useAutoTranslate('Convidar Primeiro Funcionário', 'pt');

  useEffect(() => {
    base44.auth.me().then(userData => {
      setUser(userData);
      if (!userData.is_business_user || !userData.business_id) {
        navigate(createPageUrl("Home"));
      }
    }).catch(() => base44.auth.redirectToLogin());
  }, [navigate]);

  const { data: business } = useQuery({
    queryKey: ['business', user?.business_id],
    queryFn: async () => {
      const businesses = await base44.entities.Business.filter({ id: user.business_id });
      return businesses[0];
    },
    enabled: !!user?.business_id,
  });

  const { data: staffMembers, isLoading } = useQuery({
    queryKey: ['staff-members', user?.business_id],
    queryFn: async () => {
      const users = await base44.entities.User.filter({
        business_id: user.business_id,
        is_staff_member: true
      });
      return users;
    },
    initialData: [],
    enabled: !!user?.business_id,
  });

  const { data: invites } = useQuery({
    queryKey: ['staff-invites', user?.business_id],
    queryFn: () => base44.entities.StaffInvite.filter({
      business_id: user.business_id,
      status: "pendente"
    }),
    initialData: [],
    enabled: !!user?.business_id,
  });

  const inviteStaffMutation = useMutation({
    mutationFn: async () => {
      try {
        console.log('🔄 Iniciando convite para:', inviteEmail);
        
        // Garantir que temos o business carregado
        let businessData = business;
        if (!businessData) {
          console.log('📦 Carregando dados da empresa...');
          const businesses = await base44.entities.Business.filter({ id: user.business_id });
          businessData = businesses[0];
          console.log('✅ Empresa carregada:', businessData?.name);
        }

        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        console.log('💾 Criando convite na base de dados...');
        const invite = await base44.entities.StaffInvite.create({
          business_id: user.business_id,
          email: inviteEmail,
          permissions: null,
          token: token,
          status: "pendente",
          expires_at: expiresAt.toISOString(),
          invited_by: user.email
        });
        console.log('✅ Convite criado:', invite.id);

        // 🌐 Usar sempre domínio de produção para emails (Capacitor usa localhost/app.qzero.local)
        const productionDomain = 'https://waitless-qzero.com';
        const inviteUrl = `${productionDomain}${createPageUrl(`StaffInviteAccept?token=${token}`)}`;

        console.log('📧 Enviando email para:', inviteEmail);
        const emailResult = await sendEmail({
          to: inviteEmail,
          subject: `Convite para Equipa - ${businessData?.name || 'Empresa'}`,
          body: `Olá!\n\nFoi convidado para fazer parte da equipa de ${businessData?.name || 'a empresa'}.\n\nTerá acesso total à gestão da conta, incluindo senhas, marcações e serviços.\n\nClique para aceitar: ${inviteUrl}\n\nO convite expira em 7 dias.`
        });
        console.log('📬 Resultado do email:', emailResult);

        if (!emailResult.success) {
          throw new Error(emailResult.error || 'Erro ao enviar email');
        }

        console.log('✅ Convite enviado com sucesso!');
        return invite;
      } catch (error) {
        console.error('❌ Erro detalhado ao enviar convite:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-invites'] });
      setShowInviteForm(false);
      setInviteEmail("");
      toast.success(txtInviteSentSuccess);
    },
    onError: (error) => {
      console.error('Erro ao enviar convite:', error);
      toast.error(error.message || txtErrorSendingInvite);
    }
  });

  const deleteInviteMutation = useMutation({
    mutationFn: (inviteId) => base44.entities.StaffInvite.delete(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-invites'] });
      toast.success(txtInviteRevokedSuccess);
    },
  });

  const removeStaffMutation = useMutation({
    mutationFn: async (staffId) => {
      await base44.entities.User.update(staffId, {
        is_staff_member: false,
        business_id: null,
        staff_permissions: null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-members'] });
      toast.success(txtMemberRemovedSuccess);
    },
  });

  const handleInvite = () => {
    if (!inviteEmail || !inviteEmail.includes('@')) {
      toast.error(txtInvalidEmail);
      return;
    }

    inviteStaffMutation.mutate();
  };

  if (!user || isLoading) {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 p-4">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-16 w-64 mb-8" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <PageHeader
          title={txtTeamManagement}
          subtitle={txtInviteTeamMember}
          backTo="BusinessSettings"
          actions={
            <Button onClick={() => setShowInviteForm(!showInviteForm)} className="gap-2">
              <Mail className="w-4 h-4" />
              {txtInviteEmployee}
            </Button>
          }
        />

        {showInviteForm && (
          <Card className="border-0 shadow-xl mb-8">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{txtNewInvite}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowInviteForm(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="email">{txtEmployeeEmail}</Label>
                <Input
                  id="email"
                  type="text"
                  inputMode="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="funcionario@exemplo.com"
                  className="mb-2"
                  autoComplete="off"
                />
                <p className="text-xs text-slate-600">
                  {txtFullAccess}
                </p>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button variant="outline" onClick={() => setShowInviteForm(false)}>
                  {txtCancel}
                </Button>
                <Button 
                  onClick={handleInvite}
                  disabled={inviteStaffMutation.isPending}
                >
                  {inviteStaffMutation.isPending ? txtSending : txtSendInvite}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {invites.length > 0 && (
          <Card className="border-0 shadow-lg mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {txtPendingInvites}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invites.map(invite => (
                  <div key={invite.id} className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{invite.email}</p>
                      <p className="text-xs text-slate-600 mt-1">{txtFullManagementAccess}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => deleteInviteMutation.mutate(invite.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {txtActiveEmployees} ({staffMembers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {staffMembers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {txtNoEmployees}
                </h3>
                <p className="text-slate-600 mb-6">
                  {txtInviteHelp}
                </p>
                <Button onClick={() => setShowInviteForm(true)}>
                  <Mail className="w-4 h-4 mr-2" />
                  {txtInviteFirstEmployee}
                </Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {staffMembers.map(member => (
                  <Card key={member.id} className="border shadow-sm">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <h4 className="font-bold text-slate-900 mb-1">
                            {member.full_name || 'Sem nome'}
                          </h4>
                          <p className="text-sm text-slate-600">{member.email}</p>
                          <p className="text-xs text-slate-500 mt-1">Acesso total à gestão</p>
                        </div>
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Ativo
                        </Badge>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-red-200 text-red-600 hover:bg-red-50"
                        onClick={async () => {
                          const confirmed = await confirm({
                            title: 'Remover Membro',
                            description: `Tem certeza que deseja remover ${member.full_name || member.email} da equipa? Esta ação não pode ser desfeita.`,
                          });
                          if (confirmed) {
                            removeStaffMutation.mutate(member.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remover da Equipa
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <ConfirmDialog />
    </div>
  );
}