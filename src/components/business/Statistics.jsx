
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  BarChart3,
  TrendingUp,
  Clock,
  Users,
  Star,
  Calendar,
  Download,
  TrendingDown,
  Activity
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import PerformanceCharts from "./PerformanceCharts";
import UserBehaviorAnalytics from "./UserBehaviorAnalytics";
import PredictiveAnalytics from "./PredictiveAnalytics";
import AIAnalytics from "./AIAnalytics";
import { useAutoTranslate } from "@/hooks/useTranslate";

export default function Statistics({ business, queues, tickets }) {
  const [timePeriod, setTimePeriod] = useState("hoje");
  
  const txtStatsAnalytics = useAutoTranslate('Estatísticas e Analytics', 'pt');
  const txtDetailedAnalysis = useAutoTranslate('Análise detalhada do desempenho', 'pt');
  const txtToday = useAutoTranslate('Hoje', 'pt');
  const txt7Days = useAutoTranslate('7 Dias', 'pt');
  const txt30Days = useAutoTranslate('30 Dias', 'pt');
  const txtTotalTickets = useAutoTranslate('Total de Senhas', 'pt');
  const txtCompleted = useAutoTranslate('concluídas', 'pt');
  const txtCompletionRate = useAutoTranslate('Taxa de Conclusão', 'pt');
  const txtCancelled = useAutoTranslate('canceladas', 'pt');
  const txtAverageTime = useAutoTranslate('Tempo Médio', 'pt');
  const txtMin = useAutoTranslate('min', 'pt');
  const txtAverageWaitTime = useAutoTranslate('Tempo de espera médio', 'pt');
  const txtAverageRating = useAutoTranslate('Avaliação Média', 'pt');
  const txtRatings = useAutoTranslate('avaliações', 'pt');
  const txtPeakHour = useAutoTranslate('Horário de Pico', 'pt');
  const txtHighestDemand = useAutoTranslate('Maior procura', 'pt');
  const txtQueuePerformance = useAutoTranslate('Desempenho por Senha', 'pt');
  const txtQueue = useAutoTranslate('Fila', 'pt');
  const txtTickets = useAutoTranslate('Senhas', 'pt');
  const txtNoDataToDisplay = useAutoTranslate('Sem dados para exibir', 'pt');
  const txtTicketsServed = useAutoTranslate('senhas atendidas', 'pt');
  const txtOf = useAutoTranslate('de', 'pt');
  const txtBusiest = useAutoTranslate('Horário Mais Movimentado', 'pt');
  const txtTicketsIssued = useAutoTranslate('senhas emitidas', 'pt');
  const txtAveragePerHour = useAutoTranslate('Média por Hora', 'pt');
  const txtTicketsPerHourToday = useAutoTranslate('senhas/hora hoje', 'pt');

  // Calculate date ranges
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  // Filter tickets by period
  const filterByPeriod = (ticket) => {
    const ticketDate = new Date(ticket.created_date);
    switch(timePeriod) {
      case "hoje":
        return ticketDate >= today;
      case "semana":
        return ticketDate >= weekAgo;
      case "mes":
        return ticketDate >= monthAgo;
      default:
        return true;
    }
  };

  const filteredTickets = tickets.filter(filterByPeriod);
  const completedTickets = filteredTickets.filter(t => t.status === "concluido");
  const cancelledTickets = filteredTickets.filter(t => t.status === "cancelado");
  
  // Calculate average wait time
  const ticketsWithTime = completedTickets.filter(t => t.called_at && t.created_date);
  const avgWaitTime = ticketsWithTime.length > 0
    ? Math.round(
        ticketsWithTime.reduce((sum, t) => {
          const wait = (new Date(t.called_at) - new Date(t.created_date)) / (1000 * 60);
          return sum + wait;
        }, 0) / ticketsWithTime.length
      )
    : 0;

  // Calculate ratings
  const ratedTickets = completedTickets.filter(t => t.rating);
  const avgRating = ratedTickets.length > 0
    ? (ratedTickets.reduce((sum, t) => sum + t.rating, 0) / ratedTickets.length).toFixed(1)
    : "N/A";

  // Queue performance
  const queueStats = queues.map(queue => {
    const queueTickets = filteredTickets.filter(t => t.queue_id === queue.id);
    const queueCompleted = queueTickets.filter(t => t.status === "concluido");
    
    return {
      id: queue.id,
      name: queue.name,
      total: queueTickets.length,
      completed: queueCompleted.length,
      completionRate: queueTickets.length > 0 
        ? Math.round((queueCompleted.length / queueTickets.length) * 100)
        : 0
    };
  }).sort((a, b) => b.total - a.total);

  // Hourly distribution
  const hourlyDistribution = Array(24).fill(0);
  filteredTickets.forEach(ticket => {
    const hour = new Date(ticket.created_date).getHours();
    hourlyDistribution[hour]++;
  });

  const peakHour = hourlyDistribution.indexOf(Math.max(...hourlyDistribution));
  const peakHourText = peakHour >= 0 ? `${peakHour}:00 - ${peakHour + 1}:00` : "N/A";

  // Export functions
  const exportToCSV = () => {
    const headers = ["Data", "Senha", "Tipo Senha", "Status", "Tempo Espera (min)", "Avaliação"];
    const rows = filteredTickets.map(t => [
      new Date(t.created_date).toLocaleString('pt-PT'),
      `#${t.ticket_number}`,
      queues.find(q => q.id === t.queue_id)?.name || 'N/A',
      t.status,
      t.called_at ? Math.round((new Date(t.called_at) - new Date(t.created_date)) / (1000 * 60)) : 'N/A',
      t.rating || 'N/A'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-${business.name}-${timePeriod}.csv`;
    a.click();
  };

  const exportSummary = () => {
    const summary = {
      empresa: business.name,
      periodo: timePeriod,
      data_geracao: new Date().toLocaleString('pt-PT'),
      metricas: {
        total_senhas: filteredTickets.length,
        senhas_concluidas: completedTickets.length,
        senhas_canceladas: cancelledTickets.length,
        taxa_conclusao: `${Math.round((completedTickets.length / filteredTickets.length) * 100)}%`,
        tempo_medio_espera: `${avgWaitTime} min`,
        avaliacao_media: avgRating
      },
      filas: queueStats
    };

    const json = JSON.stringify(summary, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resumo-${business.name}-${timePeriod}.json`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* AI Analytics - New Component */}
      <AIAnalytics 
        tickets={tickets}
        queues={queues}
        business={business}
      />

      {/* Period Selector & Export */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{txtStatsAnalytics}</h2>
          <p className="text-slate-600 text-sm">{txtDetailedAnalysis}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Tabs value={timePeriod} onValueChange={setTimePeriod}>
            <TabsList className="bg-white border border-slate-200">
              <TabsTrigger value="hoje">{txtToday}</TabsTrigger>
              <TabsTrigger value="semana">{txt7Days}</TabsTrigger>
              <TabsTrigger value="mes">{txt30Days}</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-2">
            <Download className="w-4 h-4" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportSummary} className="gap-2">
            <Download className="w-4 h-4" />
            JSON
          </Button>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">{txtTotalTickets}</p>
                <p className="text-3xl font-bold text-slate-900">{filteredTickets.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Badge className="bg-green-100 text-green-700 border-green-200">
                <TrendingUp className="w-3 h-3 mr-1" />
                {completedTickets.length} {txtCompleted}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">{txtCompletionRate}</p>
                <p className="text-3xl font-bold text-slate-900">
                  {filteredTickets.length > 0 
                    ? Math.round((completedTickets.length / filteredTickets.length) * 100)
                    : 0}%
                </p>
              </div>
            </div>
            <div className="text-sm text-slate-600">
              {cancelledTickets.length} {txtCancelled}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">{txtAverageTime}</p>
                <p className="text-3xl font-bold text-slate-900">
                  {avgWaitTime}
                  <span className="text-lg text-slate-500">{txtMin}</span>
                </p>
              </div>
            </div>
            <div className="text-sm text-slate-600">
              {txtAverageWaitTime}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Star className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">{txtAverageRating}</p>
                <p className="text-3xl font-bold text-slate-900">
                  {avgRating}
                  {avgRating !== "N/A" && <span className="text-lg text-slate-500">/5</span>}
                </p>
              </div>
            </div>
            <div className="text-sm text-slate-600">
              {ratedTickets.length} {txtRatings}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Charts */}
      <PerformanceCharts 
        tickets={filteredTickets}
        queues={queues}
        timePeriod={timePeriod}
      />

      {/* User Behavior Analytics */}
      <UserBehaviorAnalytics 
        tickets={filteredTickets}
        completedTickets={completedTickets}
        cancelledTickets={cancelledTickets}
      />

      {/* Predictive Analytics */}
      <PredictiveAnalytics 
        tickets={tickets}
        queues={queues}
        business={business}
      />

      {/* Queue Performance */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            {txtQueuePerformance}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {queueStats.length === 0 ? (
            <p className="text-center text-slate-500 py-8">{txtNoDataToDisplay}</p>
          ) : (
            <div className="space-y-4">
              {queueStats.map((stat, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-slate-900">{stat.name}</h4>
                      <p className="text-sm text-slate-600">
                        {stat.completed} {txtOf} {stat.total} {txtTicketsServed}
                      </p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                      {stat.completionRate}%
                    </Badge>
                  </div>
                  
                  <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                      style={{ width: `${stat.completionRate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Peak Hours */}
      {timePeriod === "hoje" && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {txtPeakHour}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <span className="text-sm font-medium text-amber-900">{txtBusiest}</span>
                </div>
                <p className="text-3xl font-bold text-amber-700">{peakHourText}</p>
                <p className="text-sm text-amber-600 mt-1">
                  {Math.max(...hourlyDistribution)} {txtTicketsIssued}
                </p>
              </div>

              <div className="p-6 bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">{txtAveragePerHour}</span>
                </div>
                <p className="text-3xl font-bold text-blue-700">
                  {Math.round(filteredTickets.length / 24)}
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  {txtTicketsPerHourToday}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-end gap-1 h-32">
                {hourlyDistribution.map((count, hour) => {
                  const maxCount = Math.max(...hourlyDistribution);
                  const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  
                  return (
                    <div key={hour} className="flex-1 flex flex-col items-center gap-1">
                      <div 
                        className="w-full bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t transition-all hover:opacity-80"
                        style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : '0' }}
                        title={`${hour}:00 - ${count} senhas`}
                      />
                      {hour % 3 === 0 && (
                        <span className="text-[10px] text-slate-500">{hour}h</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
