import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Ticket, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import TicketHistory from "../components/portal/TicketHistory";
import AppointmentHistory from "../components/portal/AppointmentHistory";
import { useAutoTranslate } from "@/hooks/useTranslate";

export default function CustomerPortalPage() {
  const txtPortal = useAutoTranslate('Portal', 'pt');
  const txtWelcome = useAutoTranslate('Bem-vindo', 'pt');
  const txtManageTicketsAppointments = useAutoTranslate('Gerir as suas senhas e marcações num único local', 'pt');
  const txtTickets = useAutoTranslate('Senhas', 'pt');
  const txtAppointments = useAutoTranslate('Marcações', 'pt');
  
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {
      base44.auth.redirectToLogin();
    });
  }, []);

  if (!user) {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 flex items-center justify-center p-3">
        <div className="max-w-6xl mx-auto w-full">
          <Skeleton className="h-20 w-full mb-3 rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const displayName = user?.nome_completo || user?.full_name || 'Utilizador';

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50">
      <div className="max-w-7xl mx-auto px-3 md:px-4 py-4">
        <div className="text-center mb-4 md:mb-6">
          <Badge className="bg-gradient-to-r from-sky-600 to-blue-600 text-white mb-2 text-[10px] px-2 py-0.5">
            <Ticket className="w-2.5 h-2.5 mr-0.5" />
            {txtPortal}
          </Badge>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mb-1">
            {txtWelcome},
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-blue-600 ml-1">
              {displayName}
            </span>
          </h1>
          <p className="text-xs md:text-sm text-slate-600 max-w-2xl mx-auto">
            {txtManageTicketsAppointments}
          </p>
        </div>

        <Card className="border-0 shadow-lg">
          <div className="h-1 bg-gradient-to-r from-sky-500 to-blue-600" />
          <CardContent className="p-3 md:p-5">
            <Tabs defaultValue="tickets" className="space-y-3 md:space-y-4">
              <TabsList className="bg-slate-100 border-0 w-full grid grid-cols-2 p-0.5 h-8">
                <TabsTrigger value="tickets" className="gap-1 text-xs h-7 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Ticket className="w-3.5 h-3.5" />
                  {txtTickets}
                </TabsTrigger>
                <TabsTrigger value="appointments" className="gap-1 text-xs h-7 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Calendar className="w-3.5 h-3.5" />
                  {txtAppointments}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tickets">
                <TicketHistory user={user} />
              </TabsContent>

              <TabsContent value="appointments">
                <AppointmentHistory user={user} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}