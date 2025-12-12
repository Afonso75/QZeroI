import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Clock, Loader2, Star } from "lucide-react";
import { useAutoTranslate } from "@/hooks/useTranslate";

export default function TicketCard({ ticket, showEstimate = true, variant = "default" }) {
  // Traduções
  const txtWaiting = useAutoTranslate('Aguardando', 'pt');
  const txtYourTurn = useAutoTranslate('É Sua Vez!', 'pt');
  const txtInService = useAutoTranslate('Atendendo', 'pt');
  const txtCompleted = useAutoTranslate('Concluído', 'pt');
  const txtCancelled = useAutoTranslate('Cancelado', 'pt');
  const txtPosition = useAutoTranslate('Posição', 'pt');
  const txtEstimatedTime = useAutoTranslate('Tempo estimado', 'pt');
  const txtMin = useAutoTranslate('min', 'pt');

  const statusConfig = {
    aguardando: { icon: Clock, color: "bg-blue-500 text-white", label: txtWaiting },
    chamado: { icon: Clock, color: "bg-amber-500 text-white animate-pulse", label: txtYourTurn },
    atendendo: { icon: Loader2, color: "bg-purple-500 text-white", label: txtInService },
    concluido: { icon: Star, color: "bg-green-500 text-white", label: txtCompleted },
    cancelado: { icon: Clock, color: "bg-red-500 text-white", label: txtCancelled }
  };
  const status = statusConfig[ticket.status];
  const StatusIcon = status.icon;
  const isCompact = variant === "compact";

  return (
    <Link to={createPageUrl(`TicketView?id=${ticket.id}`)}>
      <div className={`p-4 bg-gradient-to-br ${
        ticket.status === 'chamado' ? 'from-amber-50 to-orange-50 border-amber-300' :
        'from-blue-50 to-sky-50 border-blue-200'
      } rounded-xl border hover:shadow-lg transition-all cursor-pointer`}>
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="text-3xl font-bold text-blue-600">#{ticket.ticket_number}</div>
            {showEstimate && ticket.position && (
              <div className="text-sm text-slate-600">{txtPosition}: {ticket.position}</div>
            )}
          </div>
          <Badge className={status.color}>
            <StatusIcon className={`w-3 h-3 mr-1 ${status.icon === Loader2 ? 'animate-spin' : ''}`} />
            {status.label}
          </Badge>
        </div>
        
        {showEstimate && ticket.estimated_time && (
          <div className="text-sm text-slate-600">
            {txtEstimatedTime}: ~{ticket.estimated_time} {txtMin}
          </div>
        )}

        {ticket.rating && (
          <div className="flex items-center gap-1 mt-2">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-3 h-3 ${i < ticket.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
              />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}