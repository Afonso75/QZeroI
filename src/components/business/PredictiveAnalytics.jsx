import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Brain, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function PredictiveAnalytics({ tickets, queues, business }) {
  // Predict next 7 days based on historical patterns
  const predictions = React.useMemo(() => {
    if (tickets.length < 7) return null;

    // Group by day of week
    const dayPatterns = Array(7).fill(0).map(() => ({ total: 0, count: 0 }));
    
    tickets.forEach(ticket => {
      const date = new Date(ticket.created_date);
      const dayOfWeek = date.getDay();
      dayPatterns[dayOfWeek].total++;
      dayPatterns[dayOfWeek].count++;
    });

    // Calculate averages
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const predictions = dayPatterns.map((pattern, index) => ({
      dia: dayNames[index],
      previsto: pattern.count > 0 ? Math.round(pattern.total / pattern.count) : 0,
      confianca: pattern.count > 0 ? Math.min(100, (pattern.count / 4) * 100) : 0
    }));

    return predictions;
  }, [tickets]);

  // Calculate trend
  const trend = React.useMemo(() => {
    if (tickets.length < 14) return null;

    const now = Date.now();
    const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = now - (14 * 24 * 60 * 60 * 1000);

    const lastWeek = tickets.filter(t => {
      const date = new Date(t.created_date).getTime();
      return date >= weekAgo && date <= now;
    }).length;

    const previousWeek = tickets.filter(t => {
      const date = new Date(t.created_date).getTime();
      return date >= twoWeeksAgo && date < weekAgo;
    }).length;

    const change = previousWeek > 0 
      ? ((lastWeek - previousWeek) / previousWeek * 100).toFixed(1)
      : 0;

    return {
      lastWeek,
      previousWeek,
      change: parseFloat(change),
      trend: change > 0 ? 'crescimento' : change < 0 ? 'declínio' : 'estável'
    };
  }, [tickets]);

  // Recommendations based on data
  const recommendations = React.useMemo(() => {
    const recs = [];

    // Check cancellation rate
    const cancelledRate = tickets.length > 0 
      ? (tickets.filter(t => t.status === 'cancelado').length / tickets.length) * 100
      : 0;

    if (cancelledRate > 15) {
      recs.push({
        type: 'warning',
        title: 'Taxa de Cancelamento Alta',
        description: `${cancelledRate.toFixed(1)}% das senhas são canceladas. Considere reduzir tempo de espera.`,
        icon: AlertTriangle,
        color: 'text-amber-600 bg-amber-50'
      });
    }

    // Check wait times
    const avgWait = tickets
      .filter(t => t.called_at && t.created_date)
      .reduce((sum, t, _, arr) => {
        const wait = (new Date(t.called_at) - new Date(t.created_date)) / (1000 * 60);
        return sum + wait / arr.length;
      }, 0);

    if (avgWait > 30) {
      recs.push({
        type: 'warning',
        title: 'Tempo de Espera Elevado',
        description: `Média de ${Math.round(avgWait)} minutos. Aumente a capacidade de atendimento ou optimize o processo.`,
        icon: Clock,
        color: 'text-orange-600 bg-orange-50'
      });
    }

    // Check growth trend
    if (trend && trend.change > 20) {
      recs.push({
        type: 'success',
        title: 'Crescimento Acelerado',
        description: `+${trend.change}% de aumento na última semana. Prepare-se para maior demanda.`,
        icon: TrendingUp,
        color: 'text-green-600 bg-green-50'
      });
    }

    // Check completion rate
    const completionRate = tickets.length > 0
      ? (tickets.filter(t => t.status === 'concluido').length / tickets.length) * 100
      : 0;

    if (completionRate > 85) {
      recs.push({
        type: 'success',
        title: 'Excelente Desempenho',
        description: `${completionRate.toFixed(1)}% de taxa de conclusão. Continue o ótimo trabalho!`,
        icon: CheckCircle2,
        color: 'text-green-600 bg-green-50'
      });
    }

    return recs;
  }, [tickets, trend]);

  // Peak prediction
  const peakPrediction = React.useMemo(() => {
    const hourCounts = Array(24).fill(0);
    
    tickets.forEach(ticket => {
      const hour = new Date(ticket.created_date).getHours();
      hourCounts[hour]++;
    });

    const maxHour = hourCounts.indexOf(Math.max(...hourCounts));
    const maxCount = Math.max(...hourCounts);

    return {
      hour: maxHour,
      count: maxCount,
      timeRange: `${maxHour}:00 - ${maxHour + 1}:00`
    };
  }, [tickets]);

  if (!predictions || !trend) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-12 text-center">
          <Brain className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600">Dados insuficientes para análise preditiva</p>
          <p className="text-sm text-slate-500 mt-2">Colete mais dados ao longo do tempo</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Trend Analysis */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Análise Preditiva com IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 bg-white rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className={trend.change > 0 ? 'w-6 h-6 text-green-600' : 'w-6 h-6 text-red-600'} />
                <span className="text-sm font-medium text-slate-600">Tendência</span>
              </div>
              <p className="text-3xl font-bold text-slate-900 mb-2">
                {trend.change > 0 ? '+' : ''}{trend.change}%
              </p>
              <Badge className={
                trend.trend === 'crescimento' ? 'bg-green-100 text-green-700' :
                trend.trend === 'declínio' ? 'bg-red-100 text-red-700' :
                'bg-slate-100 text-slate-700'
              }>
                {trend.trend === 'crescimento' ? '📈 Crescimento' : 
                 trend.trend === 'declínio' ? '📉 Declínio' : '➡️ Estável'}
              </Badge>
              <p className="text-xs text-slate-500 mt-3">
                Última semana: {trend.lastWeek} senhas
              </p>
            </div>

            <div className="p-6 bg-white rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-6 h-6 text-purple-600" />
                <span className="text-sm font-medium text-slate-600">Horário de Pico</span>
              </div>
              <p className="text-3xl font-bold text-slate-900 mb-2">
                {peakPrediction.timeRange}
              </p>
              <Badge className="bg-purple-100 text-purple-700">
                ~{peakPrediction.count} senhas esperadas
              </Badge>
              <p className="text-xs text-slate-500 mt-3">
                Prepare equipe extra neste horário
              </p>
            </div>

            <div className="p-6 bg-white rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-6 h-6 text-indigo-600" />
                <span className="text-sm font-medium text-slate-600">Próxima Semana</span>
              </div>
              <p className="text-3xl font-bold text-slate-900 mb-2">
                ~{Math.round(predictions.reduce((sum, p) => sum + p.previsto, 0))}
              </p>
              <Badge className="bg-indigo-100 text-indigo-700">
                Previsão total de senhas
              </Badge>
              <p className="text-xs text-slate-500 mt-3">
                Com base em padrões históricos
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Predictions */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Previsão Semanal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={predictions}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="dia" stroke="#64748b" style={{ fontSize: '12px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="previsto" 
                stroke="#8b5cf6" 
                strokeWidth={3}
                dot={{ fill: '#8b5cf6', r: 5 }}
                name="Senhas Previstas"
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-600">
            <Brain className="w-4 h-4" />
            Previsão baseada em padrões de {tickets.length} senhas analisadas
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Recomendações Inteligentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendations.map((rec, idx) => {
                const Icon = rec.icon;
                return (
                  <div key={idx} className={`p-4 rounded-xl ${rec.color}`}>
                    <div className="flex items-start gap-3">
                      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold mb-1">{rec.title}</h4>
                        <p className="text-sm opacity-90">{rec.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}