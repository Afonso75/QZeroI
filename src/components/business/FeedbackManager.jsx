import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Star, 
  MessageSquare, 
  TrendingUp, 
  AlertCircle,
  Send,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAutoTranslate } from "@/hooks/useTranslate";

export default function FeedbackManager({ businessId }) {
  // Traduções
  const txtFeedbackRatings = useAutoTranslate('Avaliações e Feedback', 'pt');
  const txtAvgRating = useAutoTranslate('Avaliação Média', 'pt');
  const txtPositive = useAutoTranslate('Positivas', 'pt');
  const txtNegative = useAutoTranslate('Negativas', 'pt');
  const txtNeedsResponse = useAutoTranslate('Aguardam Resposta', 'pt');
  const txtRatingDistribution = useAutoTranslate('Distribuição de Avaliações', 'pt');
  const txtRecentFeedback = useAutoTranslate('Feedback Recente', 'pt');
  const txtNoFeedback = useAutoTranslate('Nenhum feedback recebido', 'pt');
  const txtRespond = useAutoTranslate('Responder', 'pt');
  const txtSend = useAutoTranslate('Enviar', 'pt');
  const txtCancel = useAutoTranslate('Cancelar', 'pt');
  const txtResponseSent = useAutoTranslate('Resposta enviada', 'pt');
  const txtWriteResponse = useAutoTranslate('Escrever resposta...', 'pt');
  const txtAverage = useAutoTranslate('Média', 'pt');
  const txtPositiveLabel = useAutoTranslate('Positivo', 'pt');
  const txtNegativeLabel = useAutoTranslate('Negativo', 'pt');
  const txtAwaitingLabel = useAutoTranslate('Aguardam', 'pt');
  const txtAttention = useAutoTranslate('Atenção', 'pt');
  const txtDistribution = useAutoTranslate('Distribuição', 'pt');
  const txtFeedback = useAutoTranslate('Feedback', 'pt');
  const txtNoFeedbackYet = useAutoTranslate('Nenhum feedback', 'pt');
  const txtTotal = useAutoTranslate('total', 'pt');
  const txtRespondPlaceholder = useAutoTranslate('Responder...', 'pt');
  const queryClient = useQueryClient();
  const [respondingTo, setRespondingTo] = useState(null);
  const [response, setResponse] = useState("");

  const { data: tickets } = useQuery({
    queryKey: ['feedback-tickets', businessId],
    queryFn: () => base44.entities.Ticket.filter({ 
      business_id: businessId,
      status: 'concluido'
    }, '-completed_at'),
    initialData: [],
  });

  const { data: appointments } = useQuery({
    queryKey: ['feedback-appointments', businessId],
    queryFn: () => base44.entities.Appointment.filter({ 
      business_id: businessId,
      status: 'concluido'
    }, '-appointment_date'),
    initialData: [],
  });

  const { data: reviews } = useQuery({
    queryKey: ['feedback-reviews', businessId],
    queryFn: () => base44.entities.Review.filter({ 
      business_id: businessId
    }),
    initialData: [],
  });

  const allFeedback = [
    ...tickets.filter(t => t.rating || t.feedback).map(t => ({
      id: t.id,
      type: 'ticket',
      rating: t.rating,
      feedback: t.feedback,
      date: t.completed_at,
      user_email: t.user_email,
      response: t.business_response
    })),
    ...appointments.filter(a => a.rating || a.feedback).map(a => ({
      id: a.id,
      type: 'appointment',
      rating: a.rating,
      feedback: a.feedback,
      date: a.appointment_date,
      user_email: a.user_email,
      response: a.business_response
    })),
    ...reviews.map(r => ({
      id: r.id,
      type: 'review',
      rating: r.rating,
      feedback: r.comment,
      date: r.created_date,
      user_email: r.user_email,
      response: r.business_response
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const respondMutation = useMutation({
    mutationFn: async ({ id, type, response }) => {
      if (type === 'ticket') {
        await base44.entities.Ticket.update(id, { business_response: response });
      } else if (type === 'appointment') {
        await base44.entities.Appointment.update(id, { business_response: response });
      } else if (type === 'review') {
        await base44.entities.Review.update(id, { business_response: response });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-tickets', businessId] });
      queryClient.invalidateQueries({ queryKey: ['feedback-appointments', businessId] });
      queryClient.invalidateQueries({ queryKey: ['feedback-reviews', businessId] });
      queryClient.invalidateQueries({ queryKey: ['reviews', businessId] });
      queryClient.invalidateQueries({ queryKey: ['user-review', businessId] });
      setRespondingTo(null);
      setResponse("");
    },
  });

  const ratedFeedback = allFeedback.filter(f => f.rating);
  const avgRating = ratedFeedback.length > 0
    ? (ratedFeedback.reduce((sum, f) => sum + f.rating, 0) / ratedFeedback.length).toFixed(1)
    : 0;

  const positiveCount = allFeedback.filter(f => f.rating >= 4).length;
  const negativeCount = allFeedback.filter(f => f.rating <= 2).length;
  const needsResponseCount = allFeedback.filter(f => !f.response && f.feedback).length;

  const ratingDistribution = [
    { rating: '5★', count: allFeedback.filter(f => f.rating === 5).length },
    { rating: '4★', count: allFeedback.filter(f => f.rating === 4).length },
    { rating: '3★', count: allFeedback.filter(f => f.rating === 3).length },
    { rating: '2★', count: allFeedback.filter(f => f.rating === 2).length },
    { rating: '1★', count: allFeedback.filter(f => f.rating === 1).length },
  ];

  const handleRespond = (feedback) => {
    setRespondingTo(feedback);
    setResponse("");
  };

  const submitResponse = () => {
    if (response.trim()) {
      respondMutation.mutate({
        id: respondingTo.id,
        type: respondingTo.type,
        response: response.trim()
      });
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-4">
              <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Star className="w-4 h-4 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-600">{txtAverage}</p>
                <p className="text-xl md:text-3xl font-bold text-slate-900">{avgRating}</p>
              </div>
            </div>
            <div className="text-xs text-slate-600">
              {ratedFeedback.length} {txtTotal}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-4">
              <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <ThumbsUp className="w-4 h-4 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-600">{txtPositiveLabel}</p>
                <p className="text-xl md:text-3xl font-bold text-slate-900">{positiveCount}</p>
              </div>
            </div>
            <div className="text-xs text-slate-600">
              {ratedFeedback.length > 0 ? Math.round((positiveCount / ratedFeedback.length) * 100) : 0}%
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-4">
              <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
                <ThumbsDown className="w-4 h-4 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-600">{txtNegativeLabel}</p>
                <p className="text-xl md:text-3xl font-bold text-slate-900">{negativeCount}</p>
              </div>
            </div>
            <div className="text-xs text-slate-600">
              {txtAttention}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-4">
              <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-600">{txtAwaitingLabel}</p>
                <p className="text-xl md:text-3xl font-bold text-slate-900">{needsResponseCount}</p>
              </div>
            </div>
            <div className="text-xs text-slate-600">
              {txtRespond}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="flex items-center gap-2 text-sm md:text-base">
            <TrendingUp className="w-4 h-4 md:w-5 md:h-5" />
            {txtDistribution}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-6">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ratingDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="rating" stroke="#64748b" style={{ fontSize: '10px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '10px' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg">
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="flex items-center gap-2 text-sm md:text-base">
            <MessageSquare className="w-4 h-4 md:w-5 md:h-5" />
            {txtFeedback}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-6">
          {allFeedback.length === 0 ? (
            <div className="text-center py-8 md:py-12">
              <MessageSquare className="w-12 h-12 md:w-16 md:h-16 text-slate-300 mx-auto mb-3 md:mb-4" />
              <p className="text-sm text-slate-600">{txtNoFeedbackYet}</p>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {allFeedback.map((feedback) => (
                <div 
                  key={`${feedback.type}-${feedback.id}`}
                  className={`p-3 md:p-5 rounded-xl border-2 transition-all ${
                    !feedback.response && feedback.feedback
                      ? 'border-amber-200 bg-amber-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2 md:mb-3">
                    <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        feedback.rating >= 4 ? 'bg-green-100' :
                        feedback.rating === 3 ? 'bg-yellow-100' :
                        'bg-red-100'
                      }`}>
                        <Star className={`w-4 h-4 md:w-5 md:h-5 ${
                          feedback.rating >= 4 ? 'text-green-600 fill-green-600' :
                          feedback.rating === 3 ? 'text-yellow-600 fill-yellow-600' :
                          'text-red-600 fill-red-600'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm md:text-base text-slate-900">{feedback.rating}/5</span>
                          <Badge variant="outline" className="text-xs">
                            {feedback.type === 'ticket' ? 'Senha' : feedback.type === 'review' ? 'Avaliação' : 'Marcação'}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 truncate">
                          {feedback.user_email} • {new Date(feedback.date).toLocaleDateString('pt-PT')}
                        </p>
                      </div>
                    </div>
                    {!feedback.response && feedback.feedback && (
                      <Badge className="bg-amber-500 text-white text-xs px-1.5 py-0 ml-2">
                        <AlertCircle className="w-3 h-3 mr-0.5" />
                        Aguarda
                      </Badge>
                    )}
                    {feedback.response && (
                      <Badge className="bg-green-100 text-green-700 border-green-200 text-xs px-1.5 py-0 ml-2">
                        <CheckCircle2 className="w-3 h-3 mr-0.5" />
                        OK
                      </Badge>
                    )}
                  </div>

                  {feedback.feedback && (
                    <div className="mb-3 md:mb-4">
                      <p className="text-xs md:text-sm text-slate-700 leading-relaxed">"{feedback.feedback}"</p>
                    </div>
                  )}

                  {feedback.response ? (
                    <div className="p-2 md:p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-1 md:mb-2">
                        <MessageSquare className="w-3 h-3 md:w-4 md:h-4 text-blue-600" />
                        <span className="text-xs md:text-sm font-semibold text-blue-900">Resposta:</span>
                      </div>
                      <p className="text-xs md:text-sm text-blue-800">{feedback.response}</p>
                    </div>
                  ) : feedback.feedback && (
                    <div>
                      {respondingTo?.id === feedback.id ? (
                        <div className="space-y-2 md:space-y-3">
                          <Textarea
                            value={response}
                            onChange={(e) => setResponse(e.target.value)}
                            placeholder={txtRespondPlaceholder}
                            rows={2}
                            className="resize-none text-sm"
                          />
                          <div className="flex gap-2 justify-end">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setRespondingTo(null)}
                              className="h-8 text-xs"
                            >
                              Cancelar
                            </Button>
                            <Button 
                              size="sm"
                              onClick={submitResponse}
                              disabled={!response.trim() || respondMutation.isPending}
                              className="bg-blue-600 hover:bg-blue-700 h-8 text-xs"
                            >
                              <Send className="w-3 h-3 mr-1" />
                              {respondMutation.isPending ? 'Enviando...' : 'Enviar'}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleRespond(feedback)}
                          className="gap-2 h-8 text-xs"
                        >
                          <MessageSquare className="w-3 h-3" />
                          Responder
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}