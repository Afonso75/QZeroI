import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Printer, Eye, FileImage } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAutoTranslate } from '@/hooks/useTranslate';

export function PosterGenerator({ companyProfile, compact = false }) {
  const posterRef = useRef(null);

  const txtViewPrintPoster = useAutoTranslate('Ver e Imprimir Cartaz', 'pt');
  const txtPosterBtn = useAutoTranslate('Cartaz', 'pt');
  const txtAdvertisingPoster = useAutoTranslate('Cartaz Publicitário', 'pt');
  const txtPrintInstructions = useAutoTranslate('Imprima este cartaz A4 e coloque-o na sua empresa para informar os clientes sobre o sistema QZero', 'pt');
  const txtZeroQueues = useAutoTranslate('Zero Filas de Espera', 'pt');
  const txtSmartManagement = useAutoTranslate('Gestão inteligente de senhas e marcações', 'pt');
  const txtGetTicketMobile = useAutoTranslate('Tire Senha pelo Telemóvel', 'pt');
  const txtNoNeedPresent = useAutoTranslate('Não precisa de estar aqui presente. Tire a sua senha online!', 'pt');
  const txtBookAppointment = useAutoTranslate('Marque o Seu Atendimento', 'pt');
  const txtChooseBestTime = useAutoTranslate('Escolha o melhor dia e hora para si. Sem esperas!', 'pt');
  const txtReceiveNotifications = useAutoTranslate('Receba Notificações', 'pt');
  const txtWeNotifyYou = useAutoTranslate('Avisamos quando estiver quase na sua vez!', 'pt');
  const txtHowToUse = useAutoTranslate('Como Usar?', 'pt');
  const txtAccessQRCode = useAutoTranslate('Aceda ao nosso QR Code', 'pt');
  const txtGetTicketOrBook = useAutoTranslate('Tire senha ou marque atendimento', 'pt');
  const txtFollowRealTime = useAutoTranslate('Acompanhe tudo em tempo real', 'pt');
  const txtArriveWhenCalled = useAutoTranslate('Chegue quando for chamado!', 'pt');
  const txtQueueSystem = useAutoTranslate('Sistema de gestão de filas inteligente • QZero', 'pt');
  const txtPrintPosterA4 = useAutoTranslate('Imprimir Cartaz A4', 'pt');
  const txtTip = useAutoTranslate('Dica:', 'pt');
  const txtQRCodeLeads = useAutoTranslate('O QR Code leva os clientes diretamente para a página de registo do QZero!', 'pt');

  if (!companyProfile) return null;

  // 🌐 Usar sempre domínio de produção para QR code
  const productionDomain = 'https://waitless-qzero.com';
  const publicUrl = `${productionDomain}/register`;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const posterHTML = posterRef.current.innerHTML;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-PT">
      <head>
        <meta charset="UTF-8">
        <title>Cartaz ${companyProfile.name} - QZero</title>
        <style>
          @page { size: A4 portrait; margin: 0; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Arial', sans-serif;
            background-color: #ffffff;
            color: #111111;
            width: 21cm;
            height: 29.7cm;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            align-items: center;
          }
          .cartaz {
            width: 100%;
            height: 100%;
            padding: 2cm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
          }
          .header { text-align: center; margin-bottom: 2em; }
          .logo-section { margin-bottom: 1.5em; }
          .logo {
            font-size: 72px;
            font-weight: 900;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            letter-spacing: -2px;
          }
          .company-name {
            font-size: 36px;
            color: #111;
            font-weight: 700;
            margin-top: 0.5em;
            margin-bottom: 0.3em;
          }
          .tagline {
            font-size: 24px;
            color: #333;
            font-weight: 600;
            margin-top: 0.5em;
          }
          .subtitle {
            font-size: 18px;
            color: #666;
            font-weight: 400;
          }
          .content { flex: 1; width: 100%; max-width: 600px; }
          h2 {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 1.5em;
            text-align: center;
            color: #667eea;
          }
          .benefits { margin-bottom: 2em; }
          .benefit-item {
            display: flex;
            align-items: flex-start;
            margin-bottom: 1.5em;
            padding: 1em;
            background: #f8f9ff;
            border-radius: 12px;
            border-left: 4px solid #667eea;
          }
          .benefit-icon {
            font-size: 32px;
            margin-right: 1em;
            flex-shrink: 0;
          }
          .benefit-text h3 {
            font-size: 20px;
            font-weight: bold;
            color: #333;
            margin-bottom: 0.3em;
          }
          .benefit-text p {
            font-size: 16px;
            color: #666;
            line-height: 1.5;
          }
          .how-to {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2em;
            border-radius: 16px;
            margin-bottom: 2em;
          }
          .how-to h2 {
            color: white;
            font-size: 28px;
            margin-bottom: 1em;
          }
          .steps { display: grid; gap: 1em; }
          .step {
            display: flex;
            align-items: center;
            background: rgba(255, 255, 255, 0.15);
            padding: 1em;
            border-radius: 10px;
            backdrop-filter: blur(10px);
          }
          .step-number {
            font-size: 32px;
            font-weight: 900;
            background: white;
            color: #667eea;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 1em;
            flex-shrink: 0;
          }
          .step-text {
            font-size: 18px;
            font-weight: 500;
            line-height: 1.4;
          }
          .footer { text-align: center; margin-top: 2em; }
          .qr-container {
            width: 180px;
            height: 180px;
            background: white;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1em;
            padding: 1em;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          .url {
            font-size: 18px;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 0.5em;
            word-break: break-all;
          }
          .footer-note {
            font-size: 14px;
            color: #999;
            font-style: italic;
          }
          @media print {
            body { width: 21cm; height: 29.7cm; }
            .cartaz { page-break-after: avoid; }
          }
        </style>
      </head>
      <body>
        ${posterHTML}
      </body>
      </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {compact ? (
          <Button
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-auto py-2.5 px-3 w-full"
          >
            <FileImage className="w-4 h-4 mr-1.5 flex-shrink-0" />
            <span className="text-xs sm:text-sm truncate">{txtPosterBtn}</span>
          </Button>
        ) : (
          <Button
            size="lg"
            variant="outline"
            className="w-full border-2 border-purple-300 hover:bg-purple-50 hover:border-purple-400"
          >
            <Eye className="w-5 h-5 mr-2" />
            {txtViewPrintPoster}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{txtAdvertisingPoster} - {companyProfile.name}</DialogTitle>
          <DialogDescription>
            {txtPrintInstructions}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Preview do Cartaz */}
          <div 
            ref={posterRef}
            className="bg-white border rounded-lg shadow-lg"
            style={{ 
              width: '100%',
              aspectRatio: '210/297',
              maxWidth: '600px',
              margin: '0 auto'
            }}
          >
            <div className="cartaz w-full h-full p-8 flex flex-col items-center justify-between">
              <div className="header text-center mb-6">
                <div className="logo-section mb-4">
                  <div 
                    className="logo text-5xl font-black"
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      letterSpacing: '-2px'
                    }}
                  >
                    QZero
                  </div>
                  <div className="company-name text-2xl text-gray-900 font-bold mt-3 mb-1">
                    {companyProfile.name}
                  </div>
                  <div className="tagline text-lg text-gray-700 font-semibold mt-2">
                    {txtZeroQueues}
                  </div>
                  <div className="subtitle text-sm text-gray-600">
                    {txtSmartManagement}
                  </div>
                </div>
              </div>

              <div className="content flex-1 w-full max-w-lg">
                <div className="benefits mb-6">
                  <div className="benefit-item flex items-start mb-4 p-3 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                    <div className="benefit-icon text-2xl mr-3">📱</div>
                    <div className="benefit-text">
                      <h3 className="text-base font-bold text-gray-800 mb-1">{txtGetTicketMobile}</h3>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {txtNoNeedPresent}
                      </p>
                    </div>
                  </div>

                  <div className="benefit-item flex items-start mb-4 p-3 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                    <div className="benefit-icon text-2xl mr-3">⏰</div>
                    <div className="benefit-text">
                      <h3 className="text-base font-bold text-gray-800 mb-1">{txtBookAppointment}</h3>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {txtChooseBestTime}
                      </p>
                    </div>
                  </div>

                  <div className="benefit-item flex items-start p-3 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                    <div className="benefit-icon text-2xl mr-3">🔔</div>
                    <div className="benefit-text">
                      <h3 className="text-base font-bold text-gray-800 mb-1">{txtReceiveNotifications}</h3>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {txtWeNotifyYou}
                      </p>
                    </div>
                  </div>
                </div>

                <div 
                  className="how-to text-white p-4 rounded-xl mb-6"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  }}
                >
                  <h2 className="text-white text-lg font-bold mb-3">{txtHowToUse}</h2>
                  <div className="steps space-y-2">
                    <div className="step flex items-center bg-white bg-opacity-15 p-2 rounded-lg">
                      <div className="step-number text-lg font-black bg-white text-purple-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                        1
                      </div>
                      <div className="step-text text-sm font-medium">
                        {txtAccessQRCode}
                      </div>
                    </div>
                    <div className="step flex items-center bg-white bg-opacity-15 p-2 rounded-lg">
                      <div className="step-number text-lg font-black bg-white text-purple-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                        2
                      </div>
                      <div className="step-text text-sm font-medium">
                        {txtGetTicketOrBook}
                      </div>
                    </div>
                    <div className="step flex items-center bg-white bg-opacity-15 p-2 rounded-lg">
                      <div className="step-number text-lg font-black bg-white text-purple-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                        3
                      </div>
                      <div className="step-text text-sm font-medium">
                        {txtFollowRealTime}
                      </div>
                    </div>
                    <div className="step flex items-center bg-white bg-opacity-15 p-2 rounded-lg">
                      <div className="step-number text-lg font-black bg-white text-purple-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                        4
                      </div>
                      <div className="step-text text-sm font-medium">
                        {txtArriveWhenCalled}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="footer text-center">
                <div className="qr-container w-32 h-32 bg-white rounded-lg flex items-center justify-center mx-auto mb-3 p-2 shadow-md">
                  <QRCodeSVG 
                    value={publicUrl}
                    size={112}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <div className="url text-xs font-bold text-purple-600 mb-1 break-all px-4">
                  {publicUrl}
                </div>
                <div className="footer-note text-xs text-gray-500 italic">
                  {txtQueueSystem}
                </div>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-3 justify-center pt-4 border-t">
            <Button
              onClick={handlePrint}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Printer className="w-5 h-5 mr-2" />
              {txtPrintPosterA4}
            </Button>
          </div>

          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="font-medium mb-1">💡 {txtTip}</p>
            <p>{txtQRCodeLeads}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
