import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Sparkles, 
  TrendingUp, 
  Users, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  Zap,
  Calendar,
  Target,
  Activity,
  Loader2
} from "lucide-react";

export default function AIAnalytics({ tickets, queues, business }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateInsights = async () => {
    setLoading(true);
    
    try {
      // Prepare historical data for AI analysis
      const historicalData = {
        business_name: business.name,
        business_category: business.category,
        total_tickets: tickets.length,
        queues: queues.map(q => ({
          name: q.name,
          average_service_time: q.average_service_time,
          max_capacity: q.max_capacity,
          status: q.status
        })),
        ticket_stats: {
          total: tickets.length,
          completed: tickets.filter(t => t.status === 'concluido').length,
          cancelled: tickets.filter(t => t.status === 'cancelado').length,
          active: tickets.filter(t => ['aguardando', 'chamado', 'atendendo'].includes(t.status)).length
        },
        hourly_distribution: calculateHourlyDistribution(),
        daily_distribution: calculateDailyDistribution(),
        avg_wait_time: calculateAvgWaitTime(),
        avg_rating: calculateAvgRating(),
        peak_hours: findPeakHours(),
        busiest_days: findBusiestDays()
      };

      // Call AI for deep insights
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é um consultor especialista em gestão de filas e otimização de atendimento ao cliente. 
        
Analise os seguintes dados históricos de uma empresa:

${JSON.stringify(historicalData, null, 2)}

Forneça uma análise profunda e acionável com:

1. **peak_hours_analysis**: Análise detalhada dos horários de pico e padrões
2. **optimal_staffing**: Recomendações específicas de número de funcionários por horário
3. **flow_optimization**: Sugestões para melhorar o fluxo de clientes
4. **customer_satisfaction**: Insights sobre satisfação e como melhorar
5. **forecasting**: Previsões para próxima semana com números específicos
6. **action_items**: Lista de 5 ações prioritárias e imediatas

Seja específico com números, horários e recomendações práticas.`,
        response_json_schema: {
          type: "object",
          properties: {
            peak_hours_analysis: {
              type: "object",
              properties: {
                summary: { type: "string" },
                peak_periods: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      time_range: { type: "string" },
                      expected_volume: { type: "string" },
                      recommendation: { type: "string" }
                    }
                  }
                }
              }
            },
            optimal_staffing: {
              type: "object",
              properties: {
                summary: { type: "string" },
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      time_range: { type: "string" },
                      staff_needed: { type: "string" },
                      rationale: { type: "string" }
                    }
                  }
                }
              }
            },
            flow_optimization: {
              type: "object",
              properties: {
                summary: { type: "string" },
                suggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      area: { type: "string" },
                      issue: { type: "string" },
                      solution: { type: "string" },
                      impact: { type: "string" }
                    }
                  }
                }
              }
            },
            customer_satisfaction: {
              type: "object",
              properties: {
                current_score: { type: "string" },
                analysis: { type: "string" },
                improvement_areas: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      metric: { type: "string" },
                      current_value: { type: "string" },
                      target_value: { type: "string" },
                      action: { type: "string" }
                    }
                  }
                }
              }
            },
            forecasting: {
              type: "object",
              properties: {
                next_week_prediction: { type: "string" },
                daily_breakdown: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      day: { type: "string" },
                      expected_tickets: { type: "string" },
                      confidence: { type: "string" }
                    }
                  }
                },
                trends: { type: "string" }
              }
            },
            action_items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  priority: { type: "string" },
                  action: { type: "string" },
                  expected_impact: { type: "string" },
                  implementation_time: { type: "string" }
                }
              }
            }
          }
        }
      });

      setInsights(result);
    } catch (error) {
      console.error('Error generating AI insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateHourlyDistribution = () => {
    const dist = Array(24).fill(0);
    tickets.forEach(t => {
      const hour = new Date(t.created_date).getHours();
      dist[hour]++;
    });
    return dist;
  };

  const calculateDailyDistribution = () => {
    const dist = Array(7).fill(0);
    tickets.forEach(t => {
      const day = new Date(t.created_date).getDay();
      dist[day]++;
    });
    return dist;
  };

  const calculateAvgWaitTime = () => {
    const withTime = tickets.filter(t => t.called_at && t.created_date);
    if (withTime.length === 0) return 0;
    const total = withTime.reduce((sum, t) => {
      return sum + (new Date(t.called_at) - new Date(t.created_date)) / (1000 * 60);
    }, 0);
    return Math.round(total / withTime.length);
  };

  const calculateAvgRating = () => {
    const rated = tickets.filter(t => t.rating);
    if (rated.length === 0) return 0;
    return (rated.reduce((sum, t) => sum + t.rating, 0) / rated.length).toFixed(1);
  };

  const findPeakHours = () => {
    const dist = calculateHourlyDistribution();
    const max = Math.max(...dist);
    return dist
      .map((count, hour) => ({ hour, count }))
      .filter(h => h.count >= max * 0.8)
      .map(h => `${h.hour}:00-${h.hour + 1}:00`);
  };

  const findBusiestDays = () => {
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const dist = calculateDailyDistribution();
    return dist
      .map((count, day) => ({ day: days[day], count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(d => d.day);
  };

  if (tickets.length < 10) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
        <CardContent className="p-12 text-center">
          <Brain className="w-16 h-16 text-purple-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            Analytics com IA Não Disponível
          </h3>
          <p className="text-slate-600">
            Colete pelo menos 10 senhas para desbloquear análises avançadas com IA
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-600 via-pink-600 to-purple-700 text-white overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24" />
        
        <CardContent className="relative p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Sparkles className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">Analytics com IA Avançada</h2>
                <p className="text-purple-100">Insights profundos para otimizar seu negócio</p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl">
              <Users className="w-5 h-5 mb-2" />
              <div className="text-2xl font-bold">{tickets.length}</div>
              <div className="text-sm text-purple-100">Total de Senhas</div>
            </div>
            <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl">
              <Clock className="w-5 h-5 mb-2" />
              <div className="text-2xl font-bold">{calculateAvgWaitTime()}min</div>
              <div className="text-sm text-purple-100">Tempo Médio</div>
            </div>
            <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl">
              <Activity className="w-5 h-5 mb-2" />
              <div className="text-2xl font-bold">{calculateAvgRating()}/5</div>
              <div className="text-sm text-purple-100">Satisfação</div>
            </div>
          </div>

          <Button
            onClick={generateInsights}
            disabled={loading}
            className="w-full bg-white text-purple-600 hover:bg-purple-50 font-semibold py-6 text-lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Analisando com IA...
              </>
            ) : (
              <>
                <Brain className="w-5 h-5 mr-2" />
                Gerar Análise com IA
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {insights && (
        <>
          {/* Peak Hours Analysis */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-600" />
                Análise de Horários de Pico
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-700 leading-relaxed">{insights.peak_hours_analysis.summary}</p>
              <div className="grid gap-3">
                {insights.peak_hours_analysis.peak_periods.map((period, idx) => (
                  <div key={idx} className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-purple-600 text-white">{period.time_range}</Badge>
                        <span className="text-sm font-medium text-slate-600">{period.expected_volume}</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-700">{period.recommendation}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Optimal Staffing */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Dimensionamento de Equipa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-700 leading-relaxed">{insights.optimal_staffing.summary}</p>
              <div className="space-y-3">
                {insights.optimal_staffing.recommendations.map((rec, idx) => (
                  <div key={idx} className="p-4 bg-blue-50 rounded-xl border-l-4 border-blue-500">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className="bg-blue-600 text-white">{rec.time_range}</Badge>
                      <span className="font-bold text-blue-900">{rec.staff_needed}</span>
                    </div>
                    <p className="text-sm text-slate-700">{rec.rationale}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Flow Optimization */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-600" />
                Otimização de Fluxo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-700 leading-relaxed">{insights.flow_optimization.summary}</p>
              <div className="grid gap-4">
                {insights.flow_optimization.suggestions.map((sug, idx) => (
                  <div key={idx} className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
                        <Target className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900 mb-1">{sug.area}</h4>
                        <p className="text-sm text-slate-700 mb-2">
                          <span className="font-medium">Problema:</span> {sug.issue}
                        </p>
                        <p className="text-sm text-slate-700 mb-2">
                          <span className="font-medium">Solução:</span> {sug.solution}
                        </p>
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          Impacto: {sug.impact}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Customer Satisfaction */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-600" />
                Análise de Satisfação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-green-50 rounded-xl">
                <div className="text-3xl font-bold text-green-700 mb-1">
                  {insights.customer_satisfaction.current_score}
                </div>
                <p className="text-sm text-slate-600">Score Atual</p>
              </div>
              <p className="text-slate-700 leading-relaxed">{insights.customer_satisfaction.analysis}</p>
              <div className="space-y-3">
                {insights.customer_satisfaction.improvement_areas.map((area, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-900">{area.metric}</span>
                      <div className="flex gap-2">
                        <Badge variant="outline">{area.current_value}</Badge>
                        <span className="text-slate-400">→</span>
                        <Badge className="bg-green-100 text-green-700">{area.target_value}</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-slate-700">{area.action}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Forecasting */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-purple-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Previsão Próxima Semana
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-white rounded-xl border-2 border-indigo-200">
                <p className="font-bold text-indigo-900 mb-2">{insights.forecasting.next_week_prediction}</p>
                <p className="text-sm text-slate-600">{insights.forecasting.trends}</p>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {insights.forecasting.daily_breakdown.map((day, idx) => (
                  <div key={idx} className="p-4 bg-white rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-900">{day.day}</span>
                      <Badge className="bg-indigo-100 text-indigo-700">{day.expected_tickets}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Confiança: {day.confidence}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Items */}
          <Card className="border-0 shadow-lg border-2 border-amber-200">
            <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-amber-600" />
                Ações Prioritárias
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {insights.action_items.map((item, idx) => (
                  <div key={idx} className="flex gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:shadow-md transition-shadow">
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white ${
                        item.priority === 'Alta' ? 'bg-red-500' :
                        item.priority === 'Média' ? 'bg-amber-500' : 'bg-blue-500'
                      }`}>
                        {idx + 1}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={
                          item.priority === 'Alta' ? 'bg-red-100 text-red-700' :
                          item.priority === 'Média' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        }>
                          {item.priority}
                        </Badge>
                        <span className="text-xs text-slate-500">{item.implementation_time}</span>
                      </div>
                      <p className="font-medium text-slate-900 mb-2">{item.action}</p>
                      <p className="text-sm text-slate-600">
                        <span className="font-medium">Impacto esperado:</span> {item.expected_impact}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}