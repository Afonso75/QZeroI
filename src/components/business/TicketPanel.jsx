import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  PhoneCall, 
  CheckCircle2, 
  XCircle,
  Clock,
  User,
  Trash2
} from "lucide-react";
import { useAutoTranslate } from "@/hooks/useTranslate";

export default function TicketPanel({ ticket, onUpdateTicket, onDeleteTicket }) {
  const txtWaiting = useAutoTranslate('Aguard', 'pt');
  const txtCalled = useAutoTranslate('Chamado', 'pt');
  const txtAttending = useAutoTranslate('Atend', 'pt');
  const txtDeleteTicket = useAutoTranslate('Eliminar senha', 'pt');
  const txtDeleteConfirm = useAutoTranslate('Eliminar senha #', 'pt');

  const statusConfig = {
    aguardando: { 
      color: "bg-blue-100 text-blue-700 border-blue-200",
      label: txtWaiting
    },
    chamado: { 
      color: "bg-amber-100 text-amber-700 border-amber-200",
      label: txtCalled
    },
    atendendo: { 
      color: "bg-purple-100 text-purple-700 border-purple-200",
      label: txtAttending
    }
  };
  const status = statusConfig[ticket.status];

  const handleCall = () => {
    onUpdateTicket({
      ticketId: ticket.id,
      updates: {
        status: 'chamado',
        called_at: new Date().toISOString()
      }
    });
  };

  const handleStartAttending = () => {
    onUpdateTicket({
      ticketId: ticket.id,
      updates: {
        status: 'atendendo',
        attending_started_at: new Date().toISOString()
      }
    });
  };

  const handleComplete = () => {
    onUpdateTicket({
      ticketId: ticket.id,
      updates: {
        status: 'concluido',
        completed_at: new Date().toISOString()
      }
    });
  };

  const handleCancel = () => {
    onUpdateTicket({
      ticketId: ticket.id,
      updates: {
        status: 'cancelado'
      }
    });
  };

  const handleDelete = () => {
    if (confirm(`${txtDeleteConfirm}${ticket.ticket_number}?`)) {
      onDeleteTicket(ticket.id);
    }
  };

  return (
    <div className="flex items-center gap-1 p-1.5 bg-white border border-slate-200 rounded w-full overflow-hidden">
      <div className="w-7 h-7 rounded bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
        #{ticket.ticket_number}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 mb-0.5">
          <Badge className={`${status.color} text-xs h-4 px-1 py-0`}>
            {status.label}
          </Badge>
          {ticket.is_manual && ticket.manual_name && (
            <span className="text-xs text-slate-700 truncate">{ticket.manual_name}</span>
          )}
        </div>
        
        {!ticket.is_manual && (
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <User className="w-2 h-2 flex-shrink-0" />
            <span className="truncate">{ticket.user_email}</span>
          </div>
        )}
      </div>

      <div className="flex gap-0.5 flex-shrink-0">
        {ticket.status === 'aguardando' && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCall}
              className="h-6 px-1 text-xs"
            >
              <PhoneCall className="w-2.5 h-2.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              className="h-6 w-6 p-0 border-red-200 text-red-600 hover:bg-red-50"
            >
              <XCircle className="w-2.5 h-2.5" />
            </Button>
          </>
        )}

        {ticket.status === 'chamado' && (
          <>
            <Button
              size="sm"
              onClick={handleStartAttending}
              className="h-6 px-1 text-xs bg-purple-600 hover:bg-purple-700"
            >
              <Clock className="w-2.5 h-2.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              className="h-6 w-6 p-0 border-red-200 text-red-600 hover:bg-red-50"
            >
              <XCircle className="w-2.5 h-2.5" />
            </Button>
          </>
        )}

        {ticket.status === 'atendendo' && (
          <Button
            size="sm"
            onClick={handleComplete}
            className="h-6 px-1 text-xs bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="w-2.5 h-2.5" />
          </Button>
        )}

        {onDeleteTicket && !ticket.is_manual && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleDelete}
            className="h-6 w-6 p-0 border-red-300 text-red-700 hover:bg-red-100"
            title={txtDeleteTicket}
          >
            <Trash2 className="w-2.5 h-2.5" />
          </Button>
        )}
      </div>
    </div>
  );
}