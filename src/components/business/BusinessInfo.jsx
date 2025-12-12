import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Phone, Mail, Clock, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAutoTranslate } from "@/hooks/useTranslate";

export default function BusinessInfo({ business }) {
  // Traduções
  const txtSunday = useAutoTranslate('Domingo', 'pt');
  const txtMonday = useAutoTranslate('Segunda-feira', 'pt');
  const txtTuesday = useAutoTranslate('Terça-feira', 'pt');
  const txtWednesday = useAutoTranslate('Quarta-feira', 'pt');
  const txtThursday = useAutoTranslate('Quinta-feira', 'pt');
  const txtFriday = useAutoTranslate('Sexta-feira', 'pt');
  const txtSaturday = useAutoTranslate('Sábado', 'pt');
  const txtLocation = useAutoTranslate('Localização', 'pt');
  const txtAddressNotAvailable = useAutoTranslate('Morada não disponível', 'pt');
  const txtOpenInMaps = useAutoTranslate('Abrir no Google Maps', 'pt');
  const txtContacts = useAutoTranslate('Contactos', 'pt');
  const txtWorkingHours = useAutoTranslate('Horário de Funcionamento', 'pt');
  const txtToday = useAutoTranslate('Hoje', 'pt');
  const txtClosed = useAutoTranslate('Fechado', 'pt');

  const DAYS = [txtSunday, txtMonday, txtTuesday, txtWednesday, txtThursday, txtFriday, txtSaturday];
  const openMaps = () => {
    if (business.latitude && business.longitude) {
      window.open(`https://www.google.com/maps?q=${business.latitude},${business.longitude}`, '_blank');
    } else if (business.address) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address)}`, '_blank');
    }
  };

  const callPhone = () => {
    if (business.phone) {
      window.location.href = `tel:${business.phone}`;
    }
  };

  const sendEmail = () => {
    if (business.email) {
      window.location.href = `mailto:${business.email}`;
    }
  };

  const today = new Date().getDay();
  const todayHours = business.working_hours?.[today];

  return (
    <div className="space-y-2">
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1">
            <MapPin className="w-4 h-4 text-sky-600" />
            {txtLocation}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-700 mb-3 leading-relaxed">{business.address || txtAddressNotAvailable}</p>
          <Button 
            size="sm" 
            variant="outline" 
            className="w-full h-8 text-xs font-medium hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-colors" 
            onClick={openMaps}
          >
            <Navigation className="w-3.5 h-3.5 mr-1.5" />
            {txtOpenInMaps}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1">
            <Phone className="w-4 h-4 text-sky-600" />
            {txtContacts}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {business.phone && (
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full h-7 text-xs justify-start"
              onClick={callPhone}
            >
              <Phone className="w-3 h-3 mr-1.5" />
              {business.phone}
            </Button>
          )}
          {business.email && (
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full h-7 text-xs justify-start"
              onClick={sendEmail}
            >
              <Mail className="w-3 h-3 mr-1.5" />
              {business.email}
            </Button>
          )}
        </CardContent>
      </Card>

      {business.working_hours && (
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1">
              <Clock className="w-4 h-4 text-sky-600" />
              {txtWorkingHours}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayHours && (
              <div className="mb-2 p-2 bg-sky-50 rounded-lg">
                <p className="text-xs font-semibold text-sky-900">{txtToday}</p>
                <p className="text-xs text-sky-700">
                  {todayHours.closed ? txtClosed : `${todayHours.open} - ${todayHours.close}`}
                </p>
              </div>
            )}
            <div className="space-y-1">
              {DAYS.map((day, index) => {
                const hours = business.working_hours[index];
                if (!hours) return null;
                return (
                  <div key={index} className="flex justify-between text-xs">
                    <span className={`text-slate-700 ${index === today ? 'font-semibold' : ''}`}>
                      {day}
                    </span>
                    <span className={`text-slate-600 ${index === today ? 'font-semibold text-sky-700' : ''}`}>
                      {hours.closed ? txtClosed : `${hours.open} - ${hours.close}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}