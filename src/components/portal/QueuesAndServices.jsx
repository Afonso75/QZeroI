import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Clock, Building2, Calendar, Users, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAutoTranslate } from "@/hooks/useTranslate";

export default function QueuesAndServices({ user }) {
  // Traduções
  const txtCompany = useAutoTranslate('Empresa', 'pt');
  const txtOpen = useAutoTranslate('Aberta', 'pt');
  const txtCurrentTicket = useAutoTranslate('Senha Atual', 'pt');
  const txtWaiting = useAutoTranslate('Aguardando', 'pt');
  const txtMinService = useAutoTranslate('min/atendimento', 'pt');
  const txtGetTicket = useAutoTranslate('Retirar Senha', 'pt');
  const txtScheduleService = useAutoTranslate('Agendar Serviço', 'pt');
  const txtOpenQueues = useAutoTranslate('Filas Abertas', 'pt');
  const txtAvailableServices = useAutoTranslate('Serviços Disponíveis', 'pt');
  const txtNoQueuesOpen = useAutoTranslate('Nenhuma fila aberta', 'pt');
  const txtNoQueuesAvailable = useAutoTranslate('Não há filas disponíveis no momento', 'pt');
  const txtNoServicesAvailable = useAutoTranslate('Nenhum serviço disponível', 'pt');
  const txtNoServicesToSchedule = useAutoTranslate('Não há serviços para agendar no momento', 'pt');
  const { data: businesses, isLoading: loadingBusinesses } = useQuery({
    queryKey: ['all-businesses'],
    queryFn: () => base44.entities.Business.filter({ is_active: true }),
    initialData: [],
  });

  const { data: queues, isLoading: loadingQueues } = useQuery({
    queryKey: ['all-queues'],
    queryFn: () => base44.entities.Queue.filter({ is_active: true, status: 'aberta' }),
    initialData: [],
  });

  const { data: services, isLoading: loadingServices } = useQuery({
    queryKey: ['all-services'],
    queryFn: () => base44.entities.Service.filter({ is_active: true }),
    initialData: [],
  });

  const getBusinessName = (businessId) => {
    return businesses.find(b => b.id === businessId)?.name || txtCompany;
  };

  const QueueCard = ({ queue }) => {
    const business = businesses.find(b => b.id === queue.business_id);
    const waitingCount = queue.last_issued_number - queue.current_number;

    return (
      <Card className="border-0 shadow-lg hover:shadow-xl transition-all">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-bold text-lg text-slate-900 mb-1">{queue.name}</h3>
              <div className="flex items-center gap-2 text-slate-600 text-sm">
                <Building2 className="w-4 h-4" />
                <span>{business?.name}</span>
              </div>
            </div>
            <Badge className="bg-green-100 text-green-700 border-green-200">
              {txtOpen}
            </Badge>
          </div>

          {queue.description && (
            <p className="text-sm text-slate-600 mb-4">{queue.description}</p>
          )}

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-600 mb-1">{txtCurrentTicket}</div>
              <div className="text-2xl font-bold text-blue-900">#{queue.current_number}</div>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="text-sm text-purple-600 mb-1">{txtWaiting}</div>
              <div className="text-2xl font-bold text-purple-900">{waitingCount}</div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-1 text-sm text-slate-600">
              <Clock className="w-4 h-4" />
              <span>~{queue.average_service_time} {txtMinService}</span>
            </div>
            <Link to={createPageUrl(`BusinessDetail?id=${queue.business_id}`)}>
              <Button size="sm">
                {txtGetTicket}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  };

  const ServiceCard = ({ service }) => {
    const business = businesses.find(b => b.id === service.business_id);

    return (
      <Card className="border-0 shadow-lg hover:shadow-xl transition-all">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-bold text-lg text-slate-900 mb-1">{service.name}</h3>
              <div className="flex items-center gap-2 text-slate-600 text-sm">
                <Building2 className="w-4 h-4" />
                <span>{business?.name}</span>
              </div>
            </div>
            {service.price && (
              <Badge className="bg-sky-100 text-sky-700 border-sky-200">
                €{service.price.toFixed(2)}
              </Badge>
            )}
          </div>

          {service.description && (
            <p className="text-sm text-slate-600 mb-4">{service.description}</p>
          )}

          <div className="flex items-center gap-4 mb-4 text-sm text-slate-600">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{service.duration} min</span>
            </div>
            {service.category && (
              <Badge variant="secondary">{service.category}</Badge>
            )}
          </div>

          <Link to={createPageUrl(`BusinessDetail?id=${service.business_id}`)}>
            <Button size="sm" variant="outline" className="w-full">
              <Calendar className="w-4 h-4 mr-2" />
              {txtScheduleService}
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  };

  if (loadingBusinesses || loadingQueues || loadingServices) {
    return (
      <div className="grid md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-64" />)}
      </div>
    );
  }

  return (
    <Tabs defaultValue="queues">
      <TabsList className="bg-white border border-slate-200 mb-6">
        <TabsTrigger value="queues">
          <Users className="w-4 h-4 mr-2" />
          {txtOpenQueues} ({queues.length})
        </TabsTrigger>
        <TabsTrigger value="services">
          <Calendar className="w-4 h-4 mr-2" />
          {txtAvailableServices} ({services.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="queues">
        {queues.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-16 text-center">
              <Users className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                {txtNoQueuesOpen}
              </h3>
              <p className="text-slate-600">
                {txtNoQueuesAvailable}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {queues.map(queue => (
              <QueueCard key={queue.id} queue={queue} />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="services">
        {services.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-16 text-center">
              <Calendar className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                {txtNoServicesAvailable}
              </h3>
              <p className="text-slate-600">
                {txtNoServicesToSchedule}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {services.map(service => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}