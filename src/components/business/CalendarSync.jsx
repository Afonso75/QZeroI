import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle2, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { useAutoTranslate } from "@/hooks/useTranslate";

export default function CalendarSync({ business }) {
  const queryClient = useQueryClient();
  
  const txtCalendarSync = useAutoTranslate('Sincronização de Calendário', 'pt');
  const txtConnected = useAutoTranslate('Conectado', 'pt');
  const txtNotConnected = useAutoTranslate('Não conectado', 'pt');
  const txtActive = useAutoTranslate('Ativo', 'pt');
  const txtInactive = useAutoTranslate('Inativo', 'pt');
  const txtAutoSync = useAutoTranslate('Sincronização automática de marcações', 'pt');
  const txtAvoidDoubleBooking = useAutoTranslate('Evite double-booking entre plataformas', 'pt');
  const txtRealTimeUpdates = useAutoTranslate('Atualizações em tempo real', 'pt');
  const txtDisconnect = useAutoTranslate('Desconectar Google Calendar', 'pt');
  const txtConnect = useAutoTranslate('Conectar Google Calendar', 'pt');
  const txtConnectedSuccess = useAutoTranslate('Calendário Google conectado com sucesso!', 'pt');
  const txtDisconnectedSuccess = useAutoTranslate('Calendário Google desconectado', 'pt');

  const connectMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Business.update(business.id, {
        google_calendar_connected: true,
        google_calendar_id: 'primary'
      });
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business'] });
      toast.success(txtConnectedSuccess);
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Business.update(business.id, {
        google_calendar_connected: false,
        google_calendar_id: null
      });
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business'] });
      toast.success(txtDisconnectedSuccess);
    },
  });

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          {txtCalendarSync}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900">Google Calendar</h4>
              <p className="text-sm text-slate-600">
                {business.google_calendar_connected ? txtConnected : txtNotConnected}
              </p>
            </div>
          </div>
          {business.google_calendar_connected ? (
            <Badge className="bg-green-100 text-green-700 border-green-200">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              {txtActive}
            </Badge>
          ) : (
            <Badge variant="outline">{txtInactive}</Badge>
          )}
        </div>

        <div className="space-y-2 text-sm text-slate-600">
          <p className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            {txtAutoSync}
          </p>
          <p className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            {txtAvoidDoubleBooking}
          </p>
          <p className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            {txtRealTimeUpdates}
          </p>
        </div>

        {business.google_calendar_connected ? (
          <Button
            onClick={() => disconnectMutation.mutate()}
            disabled={disconnectMutation.isPending}
            variant="outline"
            className="w-full"
          >
            {txtDisconnect}
          </Button>
        ) : (
          <Button
            onClick={() => connectMutation.mutate()}
            disabled={connectMutation.isPending}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <LinkIcon className="w-4 h-4 mr-2" />
            {txtConnect}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}