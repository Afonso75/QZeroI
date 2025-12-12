import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MessageSquare, CheckCircle2, AlertCircle, Smartphone, Send } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAutoTranslate } from "@/hooks/useTranslate";

export default function SMSGatewayConfig({ business }) {
  const txtSMSConfig = useAutoTranslate('Configuração de SMS', 'pt');
  const txtConfigured = useAutoTranslate('Configurado', 'pt');
  const txtAboutSMS = useAutoTranslate('Sobre Notificações SMS', 'pt');
  const txtAboutSMSDesc = useAutoTranslate('Configure um gateway SMS para enviar notificações automáticas aos seus clientes quando a senha for chamada, avisos de proximidade e lembretes de marcações.', 'pt');
  const txtTwilioDesc = useAutoTranslate('Twilio: Plataforma global com cobertura em 180+ países', 'pt');
  const txtVonageDesc = useAutoTranslate('Vonage: Anteriormente Nexmo, preços competitivos', 'pt');
  const txtGatewaySMS = useAutoTranslate('Gateway SMS', 'pt');
  const txtSelectGateway = useAutoTranslate('Selecione um gateway', 'pt');
  const txtNoneEmailOnly = useAutoTranslate('Nenhum (apenas email)', 'pt');
  const txtGetCredentials = useAutoTranslate('Obtenha as suas credenciais no', 'pt');
  const txtPhoneNumber = useAutoTranslate('Número de Telefone', 'pt');
  const txtTwilioPhone = useAutoTranslate('Número de Telefone Twilio', 'pt');
  const txtInternationalFormat = useAutoTranslate('Formato internacional com código do país', 'pt');
  const txtSaving = useAutoTranslate('A guardar...', 'pt');
  const txtSaveConfig = useAutoTranslate('Guardar Configuração', 'pt');
  const txtTestSMS = useAutoTranslate('Testar Envio de SMS', 'pt');
  const txtSending = useAutoTranslate('Enviando...', 'pt');
  const txtTest = useAutoTranslate('Testar', 'pt');
  const txtTestSuccess = useAutoTranslate('SMS de teste enviado com sucesso! (Simulação - configure as chaves de API para envio real)', 'pt');
  const txtTestError = useAutoTranslate('Erro ao enviar SMS de teste. Verifique as configurações.', 'pt');
  const txtImportant = useAutoTranslate('Importante', 'pt');
  const txtCredentialsSecure = useAutoTranslate('As credenciais são armazenadas de forma segura', 'pt');
  const txtSMSCosts = useAutoTranslate('Custos de SMS aplicados conforme tarifário do gateway', 'pt');
  const txtTestBefore = useAutoTranslate('Teste sempre antes de ativar para clientes', 'pt');
  const txtCheckCredits = useAutoTranslate('Certifique-se de que tem créditos no gateway escolhido', 'pt');
  const queryClient = useQueryClient();
  const [gateway, setGateway] = useState(business?.sms_gateway || 'none');
  const [config, setConfig] = useState(business?.sms_config || {});
  const [testPhone, setTestPhone] = useState('');
  const [testResult, setTestResult] = useState(null);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Business.update(business.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business'] });
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      sms_gateway: gateway,
      sms_config: config
    });
  };

  const handleTest = async () => {
    setTestResult({ status: 'loading' });
    
    try {
      // Simulate SMS sending via configured gateway
      const message = `Teste de SMS da ${business.name}. Gateway: ${gateway}`;
      
      // In production, this would call the actual SMS API
      // For now, we'll send an email as fallback
      await base44.integrations.Core.SendEmail({
        to: business.email,
        subject: 'Teste de SMS',
        body: `[SMS TESTE] Para: ${testPhone}\nMensagem: ${message}\n\nGateway: ${gateway}\nConfiguração: ${gateway === 'twilio' ? `SID: ${config.twilio_account_sid?.slice(0, 8)}...` : `API Key: ${config.vonage_api_key?.slice(0, 8)}...`}`
      });
      
      setTestResult({ 
        status: 'success', 
        message: txtTestSuccess 
      });
    } catch (error) {
      setTestResult({ 
        status: 'error', 
        message: txtTestError 
      });
    }
  };

  const isConfigured = gateway !== 'none' && (
    (gateway === 'twilio' && config.twilio_account_sid && config.twilio_auth_token && config.twilio_phone_number) ||
    (gateway === 'vonage' && config.vonage_api_key && config.vonage_api_secret && config.vonage_phone_number)
  );

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            {txtSMSConfig}
          </CardTitle>
          {isConfigured && (
            <Badge className="bg-green-100 text-green-700 border-green-200">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              {txtConfigured}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <h5 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            {txtAboutSMS}
          </h5>
          <p className="text-sm text-blue-800 mb-2">
            {txtAboutSMSDesc}
          </p>
          <ul className="text-sm text-blue-700 space-y-1 ml-4">
            <li>• {txtTwilioDesc}</li>
            <li>• {txtVonageDesc}</li>
          </ul>
        </div>

        <div>
          <Label htmlFor="gateway">{txtGatewaySMS}</Label>
          <Select value={gateway} onValueChange={setGateway}>
            <SelectTrigger>
              <SelectValue placeholder={txtSelectGateway} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{txtNoneEmailOnly}</SelectItem>
              <SelectItem value="twilio">Twilio</SelectItem>
              <SelectItem value="vonage">Vonage (Nexmo)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {gateway !== 'none' && (
          <Tabs value={gateway} className="w-full">
            <TabsContent value="twilio" className="space-y-4 mt-4">
              <div className="p-4 bg-slate-50 rounded-xl space-y-4">
                <div className="flex items-start gap-2 text-sm text-slate-600 mb-3">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>
                    {txtGetCredentials} <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Console Twilio</a>
                  </p>
                </div>

                <div>
                  <Label htmlFor="twilio_sid">Account SID</Label>
                  <Input
                    id="twilio_sid"
                    type="password"
                    value={config.twilio_account_sid || ''}
                    onChange={(e) => setConfig({ ...config, twilio_account_sid: e.target.value })}
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  />
                </div>

                <div>
                  <Label htmlFor="twilio_token">Auth Token</Label>
                  <Input
                    id="twilio_token"
                    type="password"
                    value={config.twilio_auth_token || ''}
                    onChange={(e) => setConfig({ ...config, twilio_auth_token: e.target.value })}
                    placeholder="********************************"
                  />
                </div>

                <div>
                  <Label htmlFor="twilio_phone">{txtTwilioPhone}</Label>
                  <Input
                    id="twilio_phone"
                    value={config.twilio_phone_number || ''}
                    onChange={(e) => setConfig({ ...config, twilio_phone_number: e.target.value })}
                    placeholder="+351912345678"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {txtInternationalFormat}
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="vonage" className="space-y-4 mt-4">
              <div className="p-4 bg-slate-50 rounded-xl space-y-4">
                <div className="flex items-start gap-2 text-sm text-slate-600 mb-3">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>
                    {txtGetCredentials} <a href="https://dashboard.nexmo.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Dashboard Vonage</a>
                  </p>
                </div>

                <div>
                  <Label htmlFor="vonage_key">API Key</Label>
                  <Input
                    id="vonage_key"
                    type="password"
                    value={config.vonage_api_key || ''}
                    onChange={(e) => setConfig({ ...config, vonage_api_key: e.target.value })}
                    placeholder="xxxxxxxx"
                  />
                </div>

                <div>
                  <Label htmlFor="vonage_secret">API Secret</Label>
                  <Input
                    id="vonage_secret"
                    type="password"
                    value={config.vonage_api_secret || ''}
                    onChange={(e) => setConfig({ ...config, vonage_api_secret: e.target.value })}
                    placeholder="********************************"
                  />
                </div>

                <div>
                  <Label htmlFor="vonage_phone">{txtPhoneNumber}</Label>
                  <Input
                    id="vonage_phone"
                    value={config.vonage_phone_number || ''}
                    onChange={(e) => setConfig({ ...config, vonage_phone_number: e.target.value })}
                    placeholder="+351912345678"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {txtInternationalFormat}
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}

        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="w-full"
        >
          {updateMutation.isPending ? txtSaving : txtSaveConfig}
        </Button>

        {/* Test SMS */}
        {isConfigured && (
          <div className="p-4 bg-slate-50 rounded-xl space-y-4">
            <h4 className="font-semibold text-slate-900">{txtTestSMS}</h4>
            <div className="flex gap-2">
              <Input
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="+351912345678"
                className="flex-1"
              />
              <Button
                onClick={handleTest}
                disabled={!testPhone || testResult?.status === 'loading'}
              >
                <Send className="w-4 h-4 mr-2" />
                {testResult?.status === 'loading' ? txtSending : txtTest}
              </Button>
            </div>
            {testResult && testResult.status !== 'loading' && (
              <div className={`p-3 rounded-lg ${
                testResult.status === 'success' 
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                <p className="text-sm">{testResult.message}</p>
              </div>
            )}
          </div>
        )}

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <h5 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {txtImportant}
          </h5>
          <ul className="text-sm text-amber-800 space-y-1">
            <li>• {txtCredentialsSecure}</li>
            <li>• {txtSMSCosts}</li>
            <li>• {txtTestBefore}</li>
            <li>• {txtCheckCredits}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}