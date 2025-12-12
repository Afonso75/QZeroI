import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, TrendingUp, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function UserBehaviorAnalytics({ tickets, completedTickets, cancelledTickets }) {
  // Calculate user behavior metrics
  const metrics = React.useMemo(() => {
    // User frequency
    const userFrequency = {};
    tickets.forEach(ticket => {
      if (ticket.user_email) {
        userFrequency[ticket.user_email] = (userFrequency[ticket.user_email] || 0) + 1;
      }
    });

    const uniqueUsers = Object.keys(userFrequency).length;
    const repeatUsers = Object.values(userFrequency).filter(count => count > 1).length;
    const repeatRate = uniqueUsers > 0 ? (repeatUsers / uniqueUsers * 100).toFixed(1) : 0;

    // Average service time
    const completedWithTime = completedTickets.filter(t => t.completed_at && t.called_at);
    const avgServiceTime = completedWithTime.length > 0
      ? Math.round(
          completedWithTime.reduce((sum, t) => {
            const time = (new Date(t.completed_at) - new Date(t.called_at)) / (1000 * 60);
            return sum + time;
          }, 0) / completedWithTime.length
        )
      : 0;

    // Cancellation analysis
    const cancelledWithReason = cancelledTickets.filter(t => t.position);
    const avgCancellationPosition = cancelledWithReason.length > 0
      ? Math.round(
          cancelledWithReason.reduce((sum, t) => sum + (t.position || 0), 0) / cancelledWithReason.length
        )
      : 0;

    // Peak waiting times
    const waitTimes = completedTickets
      .filter(t => t.called_at && t.created_date)
      .map(t => ({
        time: Math.round((new Date(t.called_at) - new Date(t.created_date)) / (1000 * 60)),
        hour: new Date(t.created_date).getHours()
      }));

    const maxWaitTime = waitTimes.length > 0 ? Math.max(...waitTimes.map(w => w.time)) : 0;
    const minWaitTime = waitTimes.length > 0 ? Math.min(...waitTimes.map(w => w.time)) : 0;

    return {
      uniqueUsers,
      repeatUsers,
      repeatRate,
      avgServiceTime,
      avgCancellationPosition,
      maxWaitTime,
      minWaitTime,
      userFrequency
    };
  }, [tickets, completedTickets, cancelledTickets]);

  // Top users data
  const topUsersData = React.useMemo(() => {
    return Object.entries(metrics.userFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([email, count]) => ({
        email: email.split('@')[0],
        visitas: count
      }));
  }, [metrics.userFrequency]);

  // Wait time distribution
  const waitTimeDistribution = React.useMemo(() => {
    const ranges = {
      '0-5 min': 0,
      '5-10 min': 0,
      '10-20 min': 0,
      '20-30 min': 0,
      '30+ min': 0
    };

    completedTickets.forEach(ticket => {
      if (ticket.called_at && ticket.created_date) {
        const wait = (new Date(ticket.called_at) - new Date(ticket.created_date)) / (1000 * 60);
        if (wait <= 5) ranges['0-5 min']++;
        else if (wait <= 10) ranges['5-10 min']++;
        else if (wait <= 20) ranges['10-20 min']++;
        else if (wait <= 30) ranges['20-30 min']++;
        else ranges['30+ min']++;
      }
    });

    return Object.entries(ranges).map(([range, count]) => ({
      range,
      count
    }));
  }, [completedTickets]);

  return (
    <>
      {/* Behavior Metrics */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-sky-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-slate-600">Utilizadores Únicos</p>
                <p className="text-3xl font-bold text-slate-900">{metrics.uniqueUsers}</p>
              </div>
            </div>
            <div className="text-xs text-slate-600">
              {metrics.repeatUsers} utilizadores recorrentes
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-slate-600">Taxa de Retorno</p>
                <p className="text-3xl font-bold text-slate-900">{metrics.repeatRate}%</p>
              </div>
            </div>
            <div className="text-xs text-slate-600">
              Clientes que voltaram
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-slate-600">Tempo de Serviço</p>
                <p className="text-3xl font-bold text-slate-900">{metrics.avgServiceTime}<span className="text-lg">m</span></p>
              </div>
            </div>
            <div className="text-xs text-slate-600">
              Média de atendimento
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <AlertCircle className="w-8 h-8 text-amber-600" />
              <div>
                <p className="text-sm text-slate-600">Cancelamentos</p>
                <p className="text-3xl font-bold text-slate-900">{cancelledTickets.length}</p>
              </div>
            </div>
            <div className="text-xs text-slate-600">
              Posição média: #{metrics.avgCancellationPosition}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Users */}
        {topUsersData.length > 0 && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Top 10 Utilizadores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topUsersData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" stroke="#64748b" style={{ fontSize: '12px' }} />
                  <YAxis 
                    type="category" 
                    dataKey="email" 
                    stroke="#64748b" 
                    style={{ fontSize: '11px' }}
                    width={100}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="visitas" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Wait Time Distribution */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Distribuição de Tempo de Espera
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={waitTimeDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="range" stroke="#64748b" style={{ fontSize: '11px' }} />
                <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="count" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-sky-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Insights de Comportamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-blue-600 text-white">Espera</Badge>
              </div>
              <p className="text-2xl font-bold text-slate-900 mb-1">
                {metrics.minWaitTime} - {metrics.maxWaitTime} min
              </p>
              <p className="text-sm text-slate-600">Variação de tempo de espera</p>
            </div>

            <div className="p-4 bg-white rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-purple-600 text-white">Fidelização</Badge>
              </div>
              <p className="text-2xl font-bold text-slate-900 mb-1">
                {metrics.repeatRate}%
              </p>
              <p className="text-sm text-slate-600">Clientes retornam ao serviço</p>
            </div>

            <div className="p-4 bg-white rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-amber-600 text-white">Abandono</Badge>
              </div>
              <p className="text-2xl font-bold text-slate-900 mb-1">
                Posição #{metrics.avgCancellationPosition}
              </p>
              <p className="text-sm text-slate-600">Ponto médio de desistência</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}