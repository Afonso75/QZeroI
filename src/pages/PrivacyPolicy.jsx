import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Shield, Lock, Eye, Database, Globe, Mail, Trash2 } from "lucide-react";
import { useAutoTranslate } from '@/hooks/useTranslate';
import { navigateBackOrFallback } from '@/hooks/useNavigateBack';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { pt, enUS, es, fr, de, it, nl, pl, ru, uk, zhCN, ja, ko, ar, hi, tr, vi, th, id as idLocale, ms } from 'date-fns/locale';

const localeMap = {
  'pt': pt, 'pt-PT': pt, 'pt-BR': pt,
  'en': enUS, 'en-US': enUS, 'en-GB': enUS,
  'es': es, 'fr': fr, 'de': de, 'it': it, 'nl': nl, 'pl': pl,
  'ru': ru, 'uk': uk, 'zh': zhCN, 'zh-CN': zhCN, 'ja': ja, 'ko': ko,
  'ar': ar, 'hi': hi, 'tr': tr, 'vi': vi, 'th': th, 'id': idLocale, 'ms': ms, 'fil': enUS
};

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  
  const currentLocale = localeMap[i18n.language] || localeMap[i18n.language?.split('-')[0]] || enUS;
  const lastUpdateDate = new Date(2025, 11, 2);
  const isPtLang = i18n.language?.startsWith('pt');
  const formattedDate = isPtLang 
    ? format(lastUpdateDate, "d 'de' MMMM 'de' yyyy", { locale: currentLocale })
    : format(lastUpdateDate, "MMMM d, yyyy", { locale: currentLocale });
  
  const txtBack = useAutoTranslate('Voltar', 'pt');
  const txtTitle = useAutoTranslate('Política de Privacidade', 'pt');
  const txtLastUpdated = useAutoTranslate('Última atualização', 'pt');
  
  const txtIntroTitle = useAutoTranslate('Introdução', 'pt');
  const txtIntroText = useAutoTranslate('A QZero ("nós", "nosso" ou "nos") opera a aplicação móvel QZero. Esta página informa-o sobre as nossas políticas relativas à recolha, utilização e divulgação de dados pessoais quando utiliza o nosso Serviço e as escolhas que tem associadas a esses dados.', 'pt');
  
  const txtDataCollectionTitle = useAutoTranslate('Dados que Recolhemos', 'pt');
  const txtDataCollectionText = useAutoTranslate('Recolhemos vários tipos de informação para fornecer e melhorar o nosso Serviço:', 'pt');
  const txtDataPersonal = useAutoTranslate('Dados Pessoais: nome, email, número de telefone, data de nascimento', 'pt');
  const txtDataLocation = useAutoTranslate('Dados de Localização: localização GPS (apenas com a sua permissão)', 'pt');
  const txtDataUsage = useAutoTranslate('Dados de Utilização: interações com a app, histórico de filas e marcações', 'pt');
  const txtDataDevice = useAutoTranslate('Dados do Dispositivo: tipo de dispositivo, sistema operativo, identificadores únicos', 'pt');
  const txtDataPayment = useAutoTranslate('Dados de Pagamento: processados de forma segura através de Stripe ou Apple/Google Pay', 'pt');
  
  const txtDataUseTitle = useAutoTranslate('Como Utilizamos os Seus Dados', 'pt');
  const txtDataUseText = useAutoTranslate('Utilizamos os dados recolhidos para:', 'pt');
  const txtDataUse1 = useAutoTranslate('Fornecer e manter o nosso Serviço', 'pt');
  const txtDataUse2 = useAutoTranslate('Notificá-lo sobre alterações no nosso Serviço', 'pt');
  const txtDataUse3 = useAutoTranslate('Permitir-lhe participar em funcionalidades interativas', 'pt');
  const txtDataUse4 = useAutoTranslate('Fornecer suporte ao cliente', 'pt');
  const txtDataUse5 = useAutoTranslate('Recolher análises para melhorar o Serviço', 'pt');
  const txtDataUse6 = useAutoTranslate('Detetar, prevenir e resolver problemas técnicos', 'pt');
  const txtDataUse7 = useAutoTranslate('Enviar notificações push sobre filas e marcações', 'pt');
  
  const txtDataStorageTitle = useAutoTranslate('Armazenamento e Segurança dos Dados', 'pt');
  const txtDataStorageText = useAutoTranslate('Os seus dados são armazenados de forma segura em servidores encriptados. Implementamos medidas de segurança adequadas para proteger contra acesso não autorizado, alteração, divulgação ou destruição dos seus dados pessoais.', 'pt');
  
  const txtDataSharingTitle = useAutoTranslate('Partilha de Dados', 'pt');
  const txtDataSharingText = useAutoTranslate('Não vendemos nem alugamos os seus dados pessoais a terceiros. Podemos partilhar os seus dados apenas com:', 'pt');
  const txtDataSharing1 = useAutoTranslate('Prestadores de serviços (Stripe para pagamentos, Firebase para notificações)', 'pt');
  const txtDataSharing2 = useAutoTranslate('Empresas onde utiliza os nossos serviços de fila/marcação', 'pt');
  const txtDataSharing3 = useAutoTranslate('Autoridades legais quando exigido por lei', 'pt');
  
  const txtRightsTitle = useAutoTranslate('Os Seus Direitos (GDPR)', 'pt');
  const txtRightsText = useAutoTranslate('Ao abrigo do GDPR, tem os seguintes direitos:', 'pt');
  const txtRights1 = useAutoTranslate('Direito de acesso aos seus dados pessoais', 'pt');
  const txtRights2 = useAutoTranslate('Direito de retificação de dados incorretos', 'pt');
  const txtRights3 = useAutoTranslate('Direito ao apagamento ("direito a ser esquecido")', 'pt');
  const txtRights4 = useAutoTranslate('Direito à portabilidade dos dados', 'pt');
  const txtRights5 = useAutoTranslate('Direito de oposição ao processamento', 'pt');
  const txtRights6 = useAutoTranslate('Direito de retirar o consentimento a qualquer momento', 'pt');
  
  const txtDeleteTitle = useAutoTranslate('Eliminação de Conta', 'pt');
  const txtDeleteText = useAutoTranslate('Pode eliminar a sua conta e todos os dados associados a qualquer momento através das definições do seu perfil na aplicação. Esta ação é irreversível e remove permanentemente todos os seus dados dos nossos sistemas.', 'pt');
  
  const txtChildrenTitle = useAutoTranslate('Privacidade de Menores', 'pt');
  const txtChildrenText = useAutoTranslate('O nosso Serviço não se destina a menores de 16 anos. Não recolhemos intencionalmente informações pessoais de menores de 16 anos.', 'pt');
  
  const txtChangesTitle = useAutoTranslate('Alterações a Esta Política', 'pt');
  const txtChangesText = useAutoTranslate('Podemos atualizar a nossa Política de Privacidade periodicamente. Notificá-lo-emos de quaisquer alterações publicando a nova Política de Privacidade nesta página e atualizando a data de "última atualização".', 'pt');
  
  const txtContactTitle = useAutoTranslate('Contacto', 'pt');
  const txtContactText = useAutoTranslate('Se tiver questões sobre esta Política de Privacidade, contacte-nos:', 'pt');

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50">
      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigateBackOrFallback(navigate, '/')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {txtBack}
          </Button>
        </div>

        <Card className="border-0 shadow-xl">
          <CardContent className="p-6 sm:p-8 md:p-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-indigo-100 rounded-xl">
                <Shield className="w-8 h-8 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{txtTitle}</h1>
                <p className="text-sm text-slate-500">{txtLastUpdated}: {formattedDate}</p>
              </div>
            </div>

            <div className="prose prose-slate max-w-none space-y-8">
              <section>
                <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-indigo-600" />
                  {txtIntroTitle}
                </h2>
                <p className="text-slate-600 mt-2">{txtIntroText}</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-600" />
                  {txtDataCollectionTitle}
                </h2>
                <p className="text-slate-600 mt-2">{txtDataCollectionText}</p>
                <ul className="list-disc list-inside text-slate-600 mt-3 space-y-2">
                  <li>{txtDataPersonal}</li>
                  <li>{txtDataLocation}</li>
                  <li>{txtDataUsage}</li>
                  <li>{txtDataDevice}</li>
                  <li>{txtDataPayment}</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-indigo-600" />
                  {txtDataUseTitle}
                </h2>
                <p className="text-slate-600 mt-2">{txtDataUseText}</p>
                <ul className="list-disc list-inside text-slate-600 mt-3 space-y-2">
                  <li>{txtDataUse1}</li>
                  <li>{txtDataUse2}</li>
                  <li>{txtDataUse3}</li>
                  <li>{txtDataUse4}</li>
                  <li>{txtDataUse5}</li>
                  <li>{txtDataUse6}</li>
                  <li>{txtDataUse7}</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-indigo-600" />
                  {txtDataStorageTitle}
                </h2>
                <p className="text-slate-600 mt-2">{txtDataStorageText}</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-900">{txtDataSharingTitle}</h2>
                <p className="text-slate-600 mt-2">{txtDataSharingText}</p>
                <ul className="list-disc list-inside text-slate-600 mt-3 space-y-2">
                  <li>{txtDataSharing1}</li>
                  <li>{txtDataSharing2}</li>
                  <li>{txtDataSharing3}</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-900">{txtRightsTitle}</h2>
                <p className="text-slate-600 mt-2">{txtRightsText}</p>
                <ul className="list-disc list-inside text-slate-600 mt-3 space-y-2">
                  <li>{txtRights1}</li>
                  <li>{txtRights2}</li>
                  <li>{txtRights3}</li>
                  <li>{txtRights4}</li>
                  <li>{txtRights5}</li>
                  <li>{txtRights6}</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-red-600" />
                  {txtDeleteTitle}
                </h2>
                <p className="text-slate-600 mt-2">{txtDeleteText}</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-900">{txtChildrenTitle}</h2>
                <p className="text-slate-600 mt-2">{txtChildrenText}</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-900">{txtChangesTitle}</h2>
                <p className="text-slate-600 mt-2">{txtChangesText}</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-indigo-600" />
                  {txtContactTitle}
                </h2>
                <p className="text-slate-600 mt-2">{txtContactText}</p>
                <div className="mt-3 p-4 bg-slate-50 rounded-lg">
                  <p className="text-slate-700"><strong>Email:</strong> suporteqzero@gmail.com</p>
                </div>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
