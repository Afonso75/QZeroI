import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Wifi, Server, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { apiUrl } from '@/utils/apiConfig';

const isCapacitor = typeof window !== 'undefined' && 
  (window.Capacitor !== undefined || 
   window.location.protocol === 'capacitor:' ||
   window.location.protocol === 'ionic:' ||
   window.location.protocol === 'file:');

export function ApiDiagnostic({ error }) {
  const [expanded, setExpanded] = useState(false);
  const [diagResults, setDiagResults] = useState(null);
  const [testing, setTesting] = useState(false);

  const isHtmlError = error?.message?.includes('API indisponível') || 
                      error?.message?.includes('unexpected token') ||
                      error?.message?.includes('doctype');

  const runDiagnostics = async () => {
    setTesting(true);
    const results = {
      environment: {
        isCapacitor,
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        apiBase: apiUrl(''),
        timestamp: new Date().toISOString()
      },
      tests: []
    };

    const endpoints = [
      { name: 'Health Check', url: '/api/health' },
      { name: 'Public Businesses', url: '/api/public/businesses' }
    ];

    for (const ep of endpoints) {
      try {
        const start = Date.now();
        const response = await fetch(apiUrl(ep.url), { 
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        const duration = Date.now() - start;
        const contentType = response.headers.get('content-type') || '';
        const isJson = contentType.includes('application/json');
        
        let bodyPreview = '';
        try {
          const text = await response.text();
          bodyPreview = text.substring(0, 100);
          if (text.includes('<!DOCTYPE') || text.includes('<html')) {
            bodyPreview = '[HTML PAGE - Server may be down or returning error page]';
          }
        } catch (e) {
          bodyPreview = '[Unable to read body]';
        }

        results.tests.push({
          endpoint: ep.name,
          url: apiUrl(ep.url),
          status: response.status,
          ok: response.ok,
          contentType,
          isJson,
          duration,
          bodyPreview
        });
      } catch (err) {
        results.tests.push({
          endpoint: ep.name,
          url: apiUrl(ep.url),
          error: err.message,
          ok: false
        });
      }
    }

    setDiagResults(results);
    setTesting(false);
  };

  if (!isHtmlError && !expanded) {
    return null;
  }

  return (
    <Card className="mt-4 p-4 bg-amber-50 border-amber-200">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 text-amber-700">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium text-sm">Problemas de Conectividade</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </div>

      {expanded && (
        <div className="mt-4 space-y-4">
          <div className="text-sm text-amber-800">
            <p className="mb-2">
              O servidor não está a responder corretamente. Isto pode acontecer se:
            </p>
            <ul className="list-disc ml-4 space-y-1 text-xs">
              <li>O servidor de produção não está publicado</li>
              <li>Problemas de rede ou firewall</li>
              <li>O servidor está a devolver uma página de erro HTML</li>
            </ul>
          </div>

          <Button 
            variant="outline" 
            size="sm"
            onClick={runDiagnostics}
            disabled={testing}
            className="w-full text-xs"
          >
            <Wifi className="w-4 h-4 mr-2" />
            {testing ? 'A testar...' : 'Executar Diagnóstico'}
          </Button>

          {diagResults && (
            <div className="mt-4 space-y-3 text-xs">
              <div className="bg-white p-3 rounded border">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  Ambiente
                </h4>
                <div className="space-y-1 text-slate-600">
                  <p>App Móvel: {diagResults.environment.isCapacitor ? 'Sim (Capacitor)' : 'Não (Browser)'}</p>
                  <p>Protocolo: {diagResults.environment.protocol}</p>
                  <p>API Base: {diagResults.environment.apiBase || '(same-origin)'}</p>
                </div>
              </div>

              {diagResults.tests.map((test, i) => (
                <div key={i} className={`p-3 rounded border ${test.ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {test.ok ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span className="font-medium">{test.endpoint}</span>
                  </div>
                  <div className="text-slate-600 space-y-1">
                    <p className="truncate">URL: {test.url}</p>
                    {test.error ? (
                      <p className="text-red-600">Erro: {test.error}</p>
                    ) : (
                      <>
                        <p>Status: {test.status} | JSON: {test.isJson ? 'Sim' : 'Não'} | {test.duration}ms</p>
                        <p className="truncate">Resposta: {test.bodyPreview}</p>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default ApiDiagnostic;
