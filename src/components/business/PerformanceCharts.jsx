import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";
import { TrendingUp, Activity, PieChart as PieChartIcon } from "lucide-react";
import { useAutoTranslate } from "@/hooks/useTranslate";

export default function PerformanceCharts({ tickets, queues, timePeriod }) {
  // Traduções
  const txtTemporalEvolution = useAutoTranslate('Evolução Temporal', 'pt');
  const txtTotal = useAutoTranslate('Total', 'pt');
  const txtCompleted = useAutoTranslate('Concluídas', 'pt');
  const txtCancelled = useAutoTranslate('Canceladas', 'pt');
  const txtQueueDistribution = useAutoTranslate('Distribuição por Fila', 'pt');
  const txtStatusDistribution = useAutoTranslate('Distribuição por Estado', 'pt');
  const txtHourlyPerformance = useAutoTranslate('Desempenho por Hora', 'pt');
  const txtTickets = useAutoTranslate('Senhas', 'pt');
  const txtUnknown = useAutoTranslate('Desconhecida', 'pt');
  const txtWaiting = useAutoTranslate('Aguardando', 'pt');
  const txtInService = useAutoTranslate('Atendendo', 'pt');
  // Prepare daily trend data
  const dailyData = React.useMemo(() => {
    const dataMap = {};
    
    tickets.forEach(ticket => {
      const date = new Date(ticket.created_date).toLocaleDateString('pt-PT', { 
        day: '2-digit', 
        month: '2-digit' 
      });
      
      if (!dataMap[date]) {
        dataMap[date] = { 
          date, 
          total: 0, 
          concluidas: 0, 
          canceladas: 0 
        };
      }
      
      dataMap[date].total++;
      if (ticket.status === 'concluido') dataMap[date].concluidas++;
      if (ticket.status === 'cancelado') dataMap[date].canceladas++;
    });

    return Object.values(dataMap).sort((a, b) => {
      const [dayA, monthA] = a.date.split('/');
      const [dayB, monthB] = b.date.split('/');
      return new Date(2024, monthA - 1, dayA) - new Date(2024, monthB - 1, dayB);
    });
  }, [tickets]);

  // Queue distribution
  const queueDistribution = React.useMemo(() => {
    const distribution = {};
    
    tickets.forEach(ticket => {
      const queue = queues.find(q => q.id === ticket.queue_id);
      const queueName = queue?.name || txtUnknown;
      
      if (!distribution[queueName]) {
        distribution[queueName] = 0;
      }
      distribution[queueName]++;
    });

    return Object.entries(distribution).map(([name, value]) => ({
      name,
      value
    }));
  }, [tickets, queues]);

  // Status distribution
  const statusDistribution = React.useMemo(() => {
    const statuses = {
      'Concluído': tickets.filter(t => t.status === 'concluido').length,
      'Cancelado': tickets.filter(t => t.status === 'cancelado').length,
      'Aguardando': tickets.filter(t => t.status === 'aguardando').length,
      'Atendendo': tickets.filter(t => t.status === 'atendendo').length,
    };

    return Object.entries(statuses)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [tickets]);

  // Hourly performance
  const hourlyPerformance = React.useMemo(() => {
    const hours = Array(24).fill(0).map((_, i) => ({
      hora: `${i}h`,
      senhas: 0,
      concluidas: 0
    }));

    tickets.forEach(ticket => {
      const hour = new Date(ticket.created_date).getHours();
      hours[hour].senhas++;
      if (ticket.status === 'concluido') hours[hour].concluidas++;
    });

    return hours.filter(h => h.senhas > 0);
  }, [tickets]);

  const COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899'];

  return (
    <>
      {/* Trend Chart */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Evolução Temporal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorConcluidas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '12px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="total" 
                stroke="#0ea5e9" 
                fillOpacity={1} 
                fill="url(#colorTotal)"
                name="Total"
              />
              <Area 
                type="monotone" 
                dataKey="concluidas" 
                stroke="#10b981" 
                fillOpacity={1} 
                fill="url(#colorConcluidas)"
                name="Concluídas"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Queue Distribution */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="w-5 h-5" />
              Distribuição por Senha
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={queueDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {queueDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Status das Senhas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '12px' }} />
                <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Bar dataKey="value" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Hourly Performance */}
      {hourlyPerformance.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Desempenho por Hora
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={hourlyPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="hora" stroke="#64748b" style={{ fontSize: '12px' }} />
                <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="senhas" 
                  stroke="#0ea5e9" 
                  strokeWidth={2}
                  dot={{ fill: '#0ea5e9', r: 4 }}
                  name="Senhas Emitidas"
                />
                <Line 
                  type="monotone" 
                  dataKey="concluidas" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 4 }}
                  name="Senhas Concluídas"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </>
  );
}