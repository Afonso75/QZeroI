import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, MessageSquare, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAutoTranslate } from "@/hooks/useTranslate";

export default function Reviews({ business, user }) {
  // Traduções
  const txtReviews = useAutoTranslate('Avaliações', 'pt');
  const txtReview = useAutoTranslate('avaliação', 'pt');
  const txtReviewsPlural = useAutoTranslate('avaliações', 'pt');
  const txtLeaveReview = useAutoTranslate('Deixar Avaliação', 'pt');
  const txtYourReview = useAutoTranslate('A Sua Avaliação', 'pt');
  const txtSelectRating = useAutoTranslate('Selecione uma Avaliação', 'pt');
  const txtComment = useAutoTranslate('Comentário (opcional)', 'pt');
  const txtSubmit = useAutoTranslate('Enviar', 'pt');
  const txtCancel = useAutoTranslate('Cancelar', 'pt');
  const txtReviewSent = useAutoTranslate('Avaliação enviada com sucesso!', 'pt');
  const txtPleaseSelectRating = useAutoTranslate('Por favor, selecione uma avaliação', 'pt');
  const txtNoReviews = useAutoTranslate('Nenhuma avaliação ainda', 'pt');
  const txtFirstReview = useAutoTranslate('Seja o primeiro a avaliar!', 'pt');
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const queryClient = useQueryClient();

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['reviews', business.id],
    queryFn: () => base44.entities.Review.filter({ business_id: business.id }, '-created_date'),
    initialData: [],
  });

  const { data: userReview } = useQuery({
    queryKey: ['user-review', business.id, user?.email],
    queryFn: async () => {
      if (!user) return null;
      const userReviews = await base44.entities.Review.filter({
        business_id: business.id,
        user_email: user.email
      });
      return userReviews[0] || null;
    },
    enabled: !!user,
  });

  const createReviewMutation = useMutation({
    mutationFn: async (data) => {
      if (!user) {
        base44.auth.redirectToLogin(window.location.href);
        return;
      }
      return await base44.entities.Review.create({
        business_id: business.id,
        user_email: user.email,
        user_name: user.full_name || user.email.split('@')[0],
        rating: data.rating,
        comment: data.comment,
        is_verified: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', business.id] });
      queryClient.invalidateQueries({ queryKey: ['user-review', business.id, user?.email] });
      setShowForm(false);
      setRating(0);
      setComment("");
      toast.success(txtReviewSent);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error(txtPleaseSelectRating);
      return;
    }
    createReviewMutation.mutate({ rating, comment });
  };

  const avgRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : (business.rating ? business.rating.toFixed(1) : null);

  const ratingCounts = [5, 4, 3, 2, 1].map(stars => 
    reviews.filter(r => r.rating === stars).length
  );

  return (
    <div className="space-y-2">
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-1">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              {txtReviews}
            </CardTitle>
            <div className="text-right">
              <div className="text-xl font-bold text-slate-900">{avgRating}</div>
              <div className="text-xs text-slate-500">
                {reviews.length} {reviews.length === 1 ? txtReview : txtReviewsPlural}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 mb-3">
            {ratingCounts.map((count, idx) => {
              const stars = 5 - idx;
              const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
              return (
                <div key={stars} className="flex items-center gap-2 text-xs">
                  <span className="w-8 text-slate-600">{stars} ★</span>
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-400"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-slate-500">{count}</span>
                </div>
              );
            })}
          </div>

          {!user ? (
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full h-7 text-xs"
              onClick={() => base44.auth.redirectToLogin(window.location.href)}
            >
              Entrar para Avaliar
            </Button>
          ) : userReview ? (
            <div className="p-2 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-1 mb-1">
                <CheckCircle2 className="w-3 h-3 text-green-600" />
                <span className="text-xs font-semibold text-green-900">Já avaliou</span>
              </div>
              <div className="flex items-center gap-0.5 mb-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    className={`w-3 h-3 ${
                      star <= userReview.rating
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-slate-300'
                    }`}
                  />
                ))}
              </div>
              {userReview.comment && (
                <p className="text-xs text-slate-700">{userReview.comment}</p>
              )}
            </div>
          ) : showForm ? (
            <form onSubmit={handleSubmit} className="space-y-2">
              <div>
                <p className="text-xs text-slate-600 mb-1">Sua avaliação:</p>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                    >
                      <Star
                        className={`w-5 h-5 transition-all ${
                          star <= (hoveredRating || rating)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <Textarea
                placeholder="Comente sua experiência (opcional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="text-xs h-16"
              />
              <div className="flex gap-1">
                <Button 
                  type="button" 
                  size="sm" 
                  variant="outline"
                  className="flex-1 h-7 text-xs"
                  onClick={() => {
                    setShowForm(false);
                    setRating(0);
                    setComment("");
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  size="sm"
                  className="flex-1 h-7 text-xs bg-gradient-to-r from-sky-500 to-blue-600"
                  disabled={createReviewMutation.isPending}
                >
                  {createReviewMutation.isPending ? 'Enviando...' : 'Enviar'}
                </Button>
              </div>
            </form>
          ) : (
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full h-7 text-xs"
              onClick={() => setShowForm(true)}
            >
              <MessageSquare className="w-3 h-3 mr-1" />
              Deixar Avaliação
            </Button>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : reviews.length > 0 ? (
        <div className="space-y-2">
          {reviews.map(review => (
            <Card key={review.id} className="border-0 shadow-sm">
              <CardContent className="p-2">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="font-semibold text-xs text-slate-900">
                      {review.user_name}
                    </p>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          className={`w-2.5 h-2.5 ${
                            star <= review.rating
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {review.is_verified && (
                    <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-green-100 rounded text-xs text-green-700">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>Verificado</span>
                    </div>
                  )}
                </div>
                {review.comment && (
                  <p className="text-xs text-slate-700 leading-relaxed mb-2">
                    {review.comment}
                  </p>
                )}
                {review.business_response && (
                  <div className="p-2 bg-blue-50 rounded-lg border border-blue-200 mb-2">
                    <div className="flex items-center gap-1 mb-1">
                      <MessageSquare className="w-3 h-3 text-blue-600" />
                      <span className="text-xs font-semibold text-blue-900">Resposta da empresa:</span>
                    </div>
                    <p className="text-xs text-blue-800">{review.business_response}</p>
                  </div>
                )}
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(review.created_date).toLocaleDateString('pt-PT')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-6 text-center">
            <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-600">Ainda sem avaliações</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}