import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getUploadUrl } from "@/utils/apiConfig";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  CheckCircle2, 
  Calendar, 
  Building2, 
  TrendingUp,
  ArrowRight,
  Sparkles,
  Star,
  MapPin,
  Search
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { validateQueueOperating } from "@/utils/queueValidation";
import { checkAndResetQueueForNewDay } from "@/utils/queueReset";
import { useAutoTranslate } from "@/hooks/useTranslate";

export default function DashboardPage() {
  // Traduções
  const txtMyPortal = useAutoTranslate('O Meu Portal', 'pt');
  const txtActiveTickets = useAutoTranslate('Senhas Ativas', 'pt');
  const txtUpcomingAppointments = useAutoTranslate('Próximas Marcações', 'pt');
  const txtRecentTickets = useAutoTranslate('Últimas Senhas', 'pt');
  const txtFeaturedBusinesses = useAutoTranslate('Empresas em Destaque', 'pt');
  const txtSearchBusinesses = useAutoTranslate('Procurar empresas...', 'pt');
  const txtAlreadyHaveTicket = useAutoTranslate('Já tem uma senha ativa para este serviço', 'pt');
  const txtTicketCreatedSuccess = useAutoTranslate('Senha criada com sucesso!', 'pt');
  const txtErrorCreatingTicket = useAutoTranslate('Erro ao criar senha:', 'pt');
  const txtTicket = useAutoTranslate('Senha', 'pt');
  const txtPosition = useAutoTranslate('Posição', 'pt');
  const txtEstimatedWait = useAutoTranslate('Tempo Estimado', 'pt');
  const txtMin = useAutoTranslate('min', 'pt');
  const txtSeeDetails = useAutoTranslate('Ver Detalhes', 'pt');
  const txtNoActiveTickets = useAutoTranslate('Nenhuma senha ativa', 'pt');
  const txtNoActiveTicketsDesc = useAutoTranslate('Não tem senhas ativas no momento', 'pt');
  const txtNoAppointments = useAutoTranslate('Nenhuma marcação', 'pt');
  const txtNoAppointmentsDesc = useAutoTranslate('Não tem marcações agendadas', 'pt');
  const txtNoRecentTickets = useAutoTranslate('Nenhuma senha recente', 'pt');
  const txtErrorIssuingTicket = useAutoTranslate('Erro ao emitir senha', 'pt');
  const txtNoQueueAvailable = useAutoTranslate('Nenhuma fila disponível', 'pt');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [takingTicket, setTakingTicket] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => base44.auth.redirectToLogin());
  }, []);

  const { data: activeTickets, isLoading: loadingTickets } = useQuery({
    queryKey: ['user-active-tickets', user?.email],
    queryFn: () => base44.entities.Ticket.filter({ 
      user_email: user.email,
      status: { $in: ['aguardando', 'chamado', 'atendendo'] }
    }),
    initialData: [],
    enabled: !!user,
    refetchInterval: 5000,
  });

  const { data: recentTickets } = useQuery({
    queryKey: ['user-recent-tickets', user?.email],
    queryFn: () => base44.entities.Ticket.filter({ user_email: user.email }, '-created_date', 5),
    initialData: [],
    enabled: !!user,
  });

  const { data: appointments } = useQuery({
    queryKey: ['user-appointments', user?.email],
    queryFn: () => base44.entities.Appointment.filter({ 
      user_email: user.email,
      status: { $in: ['agendado', 'confirmado'] }
    }),
    initialData: [],
    enabled: !!user,
  });

  const { data: businesses } = useQuery({
    queryKey: ['featured-businesses'],
    queryFn: () => base44.entities.Business.filter({ is_active: true }),
    initialData: [],
  });

  const { data: queues } = useQuery({
    queryKey: ['all-queues-dash'],
    queryFn: () => base44.entities.Queue.list(),
    initialData: [],
  });

  const { data: services } = useQuery({
    queryKey: ['all-services-dash'],
    queryFn: () => base44.entities.Service.list(),
    initialData: [],
  });

  const createTicketMutation = useMutation({
    mutationFn: async ({ businessId, queueId }) => {
      const existingTickets = await base44.entities.Ticket.filter({
        user_email: user.email,
        queue_id: queueId
      });

      const hasActiveTicket = existingTickets.some(t => 
        ['aguardando', 'chamado', 'atendendo'].includes(t.status)
      );

      if (hasActiveTicket) {
        toast.error(txtAlreadyHaveTicket);
        throw new Error(txtAlreadyHaveTicket);
      }

      // Buscar fila atualizada do servidor (não do cache) para ter definições mais recentes
      const allQueues = await base44.entities.Queue.list();
      let queue = allQueues.find(q => q.id === queueId);
      
      if (!queue) {
        throw new Error('Fila não encontrada');
      }
      
      const validation = validateQueueOperating(queue);
      if (!validation.isOperating) {
        toast.error(validation.reason);
        throw new Error(validation.reason);
      }
      
      // Resetar fila se for um novo dia
      queue = await checkAndResetQueueForNewDay(queue);
      
      // Atualizar cache do React Query para evitar resets múltiplos
      queryClient.setQueryData(['all-queues-dash'], (oldQueues) => 
        oldQueues?.map(q => q.id === queue.id ? queue : q) || oldQueues
      );
      
      const ticketNumber = queue.last_issued_number + 1;
      const position = ticketNumber - queue.current_number;
      const estimatedTime = position * queue.average_service_time;

      const ticket = await base44.entities.Ticket.create({
        queue_id: queueId,
        business_id: businessId,
        user_email: user.email,
        ticket_number: ticketNumber,
        status: "aguardando",
        estimated_time: estimatedTime,
        position: position,
        is_premium: false
      });

      try {
        await base44.entities.Queue.update(queueId, {
          last_issued_number: ticketNumber
        });
      } catch (err) {
        console.warn('Erro ao atualizar fila (senha já criada, ignorado):', err);
      }

      return ticket;
    },
    onSuccess: (ticket) => {
      queryClient.invalidateQueries({ queryKey: ['all-queues-dash'] });
      queryClient.invalidateQueries({ queryKey: ['user-active-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['customer-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
      toast.success(`Senha #${ticket.ticket_number} retirada com sucesso! Posição: ${ticket.position}`);
      navigate(createPageUrl(`TicketView?id=${ticket.id}`));
    },
    onError: (error) => {
      if (error.message !== 'Já tem uma senha ativa') {
        toast.error(txtErrorIssuingTicket);
      }
      setTakingTicket(null);
    }
  });

  const handleQuickTicket = (businessId) => {
    const businessQueues = queues.filter(q => 
      q.business_id === businessId && 
      q.is_active && 
      q.status === "aberta"
    );

    if (businessQueues.length === 0) {
      toast.error(txtNoQueueAvailable);
      return;
    }

    if (businessQueues.length === 1) {
      setTakingTicket(businessId);
      createTicketMutation.mutate({
        businessId,
        queueId: businessQueues[0].id
      });
    } else {
      navigate(createPageUrl(`BusinessDetail?id=${businessId}`));
    }
  };

  const completedCount = recentTickets.filter(t => t.status === 'concluido').length;

  const recentBusinessIds = [...new Set(recentTickets.map(t => t.business_id))];
  const recentBusinesses = businesses.filter(b => recentBusinessIds.includes(b.id)).slice(0, 4);

  const filteredBusinesses = businesses
    .filter(b => 
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .slice(0, 6);

  if (!user || loadingTickets) {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 p-4">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-16 w-64 mb-8" />
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
            Olá, {user.full_name || 'Utilizador'}! 👋
          </h1>
          <p className="text-slate-600">Bem-vindo ao seu dashboard</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <Badge className="bg-blue-100 text-blue-700 border-blue-200">Ativas</Badge>
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-1">{activeTickets.length}</div>
              <p className="text-sm text-slate-600">Senhas ativas</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <Badge className="bg-green-100 text-green-700 border-green-200">Concluídas</Badge>
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-1">{completedCount}</div>
              <p className="text-sm text-slate-600">Recentemente</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <Badge className="bg-purple-100 text-purple-700 border-purple-200">Agendadas</Badge>
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-1">{appointments.length}</div>
              <p className="text-sm text-slate-600">Marcações</p>
            </CardContent>
          </Card>
        </div>

        {recentBusinesses.length > 0 && (
          <Card className="border-0 shadow-lg mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-sky-600" />
                Acesso Rápido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recentBusinesses.map(business => {
                  const hasQueues = queues.some(q => 
                    q.business_id === business.id && 
                    q.is_active && 
                    q.status === "aberta"
                  );
                  const hasServices = services.some(s => 
                    s.business_id === business.id && 
                    s.is_active
                  );

                  return (
                    <Card key={business.id} className="border-2 hover:border-sky-300 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          {business.logo_url && (
                            <img 
                              src={getUploadUrl(business.logo_url)} 
                              alt={business.name}
                              className="w-10 h-10 rounded-lg object-cover"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm text-slate-900 truncate">{business.name}</h4>
                            {business.rating && (
                              <div className="flex items-center gap-1 text-xs">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                <span>{business.rating.toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {hasQueues && (
                            <Button
                              size="sm"
                              onClick={() => handleQuickTicket(business.id)}
                              disabled={takingTicket === business.id}
                              className="bg-gradient-to-r from-sky-500 to-blue-600 h-8 sm:h-11 text-xs gap-1"
                            >
                              <Sparkles className="w-3 h-3" />
                              Senha
                            </Button>
                          )}
                          {hasServices && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(createPageUrl(`BusinessDetail?id=${business.id}`))}
                              className="h-8 sm:h-11 text-xs gap-1"
                            >
                              <Calendar className="w-3 h-3" />
                              Marcar
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-sky-600" />
                Procurar Empresas
              </CardTitle>
              <Link to={createPageUrl("Businesses")}>
                <Button variant="outline" size="sm" className="gap-2">
                  Ver Todas
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredBusinesses.map(business => {
                const hasQueues = queues.some(q => 
                  q.business_id === business.id && 
                  q.is_active && 
                  q.status === "aberta"
                );

                return (
                  <Card key={business.id} className="border-2 hover:shadow-md transition-all">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        {business.logo_url && (
                          <img 
                            src={getUploadUrl(business.logo_url)} 
                            alt={business.name}
                            className="w-8 h-8 rounded-lg object-cover"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        )}
                        <h4 className="font-bold text-xs text-slate-900 truncate flex-1">{business.name}</h4>
                      </div>
                      {hasQueues ? (
                        <Button
                          size="sm"
                          onClick={() => handleQuickTicket(business.id)}
                          disabled={takingTicket === business.id}
                          className="w-full bg-gradient-to-r from-sky-500 to-blue-600 h-7 sm:h-11 text-xs"
                        >
                          <Sparkles className="w-3 h-3 mr-1" />
                          Tirar Senha
                        </Button>
                      ) : (
                        <Link to={createPageUrl(`BusinessDetail?id=${business.id}`)}>
                          <Button size="sm" variant="outline" className="w-full h-7 sm:h-11 text-xs">
                            Ver Detalhes
                          </Button>
                        </Link>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}