import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, FileText, CreditCard, AlertTriangle, Scale, RefreshCw, Ban, Mail } from "lucide-react";
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

export default function TermsOfUsePage() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  
  const currentLocale = localeMap[i18n.language] || localeMap[i18n.language?.split('-')[0]] || enUS;
  const lastUpdateDate = new Date(2025, 11, 2);
  const isPtLang = i18n.language?.startsWith('pt');
  const formattedDate = isPtLang 
    ? format(lastUpdateDate, "d 'de' MMMM 'de' yyyy", { locale: currentLocale })
    : format(lastUpdateDate, "MMMM d, yyyy", { locale: currentLocale });
  
  const txtBack = useAutoTranslate('Voltar', 'pt');
  const txtTitle = useAutoTranslate('Termos de Utilização', 'pt');
  const txtLastUpdated = useAutoTranslate('Última atualização', 'pt');
  
  const txtIntroTitle = useAutoTranslate('Aceitação dos Termos', 'pt');
  const txtIntroText = useAutoTranslate('Ao aceder ou utilizar a aplicação QZero, concorda em ficar vinculado a estes Termos de Utilização. Se não concordar com qualquer parte dos termos, não poderá aceder ao serviço.', 'pt');
  
  const txtServiceTitle = useAutoTranslate('Descrição do Serviço', 'pt');
  const txtServiceText = useAutoTranslate('A QZero é uma plataforma de gestão de filas e marcações que permite às empresas gerir o atendimento aos clientes e aos consumidores acompanhar o seu lugar na fila em tempo real.', 'pt');
  
  const txtAccountTitle = useAutoTranslate('Conta de Utilizador', 'pt');
  const txtAccountText = useAutoTranslate('Para utilizar certas funcionalidades do Serviço, deve criar uma conta. É responsável por manter a confidencialidade da sua conta e palavra-passe. Concorda em aceitar a responsabilidade por todas as atividades que ocorram na sua conta.', 'pt');
  
  const txtSubscriptionTitle = useAutoTranslate('Subscrições e Pagamentos', 'pt');
  const txtSubscriptionIntro = useAutoTranslate('Para contas empresariais, oferecemos subscrições pagas com as seguintes condições:', 'pt');
  
  const txtSubName = useAutoTranslate('Plano Empresarial QZero', 'pt');
  const txtSubDuration = useAutoTranslate('Duração: Mensal (renovação automática)', 'pt');
  const txtSubPrice = useAutoTranslate('Preço: €49,99/mês', 'pt');
  
  const txtPaymentTermsTitle = useAutoTranslate('Termos de Pagamento (Apple App Store / Google Play)', 'pt');
  const txtPaymentTerm1 = useAutoTranslate('O pagamento será cobrado na sua conta iTunes/Google Play no momento da confirmação da compra.', 'pt');
  const txtPaymentTerm2 = useAutoTranslate('A subscrição renova-se automaticamente a menos que a renovação automática seja desativada pelo menos 24 horas antes do fim do período atual.', 'pt');
  const txtPaymentTerm3 = useAutoTranslate('A sua conta será cobrada pela renovação nas 24 horas anteriores ao fim do período atual, ao preço da subscrição selecionada.', 'pt');
  const txtPaymentTerm4 = useAutoTranslate('As subscrições podem ser geridas pelo utilizador e a renovação automática pode ser desativada acedendo às Definições da Conta após a compra.', 'pt');
  const txtPaymentTerm5 = useAutoTranslate('Qualquer parte não utilizada de um período de teste gratuito, se oferecido, será perdida quando o utilizador comprar uma subscrição.', 'pt');
  
  const txtStripeTermsTitle = useAutoTranslate('Termos de Pagamento (Website via Stripe)', 'pt');
  const txtStripeTerm1 = useAutoTranslate('Os pagamentos são processados de forma segura através do Stripe.', 'pt');
  const txtStripeTerm2 = useAutoTranslate('Pode existir um período de teste gratuito de 7 dias para novos utilizadores.', 'pt');
  const txtStripeTerm3 = useAutoTranslate('Após o período de teste, a subscrição é cobrada automaticamente.', 'pt');
  const txtStripeTerm4 = useAutoTranslate('Pode cancelar a qualquer momento através das definições da sua conta.', 'pt');
  
  const txtCancelTitle = useAutoTranslate('Cancelamento', 'pt');
  const txtCancelText = useAutoTranslate('Pode cancelar a sua subscrição a qualquer momento. O acesso às funcionalidades empresariais permanecerá ativo até ao fim do período de faturação atual. Não são emitidos reembolsos por períodos parciais.', 'pt');
  const txtCancelHow = useAutoTranslate('Para cancelar:', 'pt');
  const txtCancelIOS = useAutoTranslate('iOS: Definições > [Seu Nome] > Subscrições > QZero > Cancelar Subscrição', 'pt');
  const txtCancelAndroid = useAutoTranslate('Android: Google Play Store > Menu > Subscrições > QZero > Cancelar Subscrição', 'pt');
  const txtCancelWeb = useAutoTranslate('Website: Perfil > Gerir Subscrição > Cancelar', 'pt');
  
  const txtUseTitle = useAutoTranslate('Utilização Aceitável', 'pt');
  const txtUseText = useAutoTranslate('Concorda em não utilizar o Serviço para:', 'pt');
  const txtUse1 = useAutoTranslate('Violar quaisquer leis ou regulamentos aplicáveis', 'pt');
  const txtUse2 = useAutoTranslate('Transmitir material prejudicial, fraudulento ou enganador', 'pt');
  const txtUse3 = useAutoTranslate('Interferir com o funcionamento normal do Serviço', 'pt');
  const txtUse4 = useAutoTranslate('Tentar aceder não autorizado a sistemas ou dados', 'pt');
  const txtUse5 = useAutoTranslate('Recolher dados de outros utilizadores sem consentimento', 'pt');
  
  const txtIPTitle = useAutoTranslate('Propriedade Intelectual', 'pt');
  const txtIPText = useAutoTranslate('O Serviço e o seu conteúdo original, funcionalidades e funcionalidade são e permanecerão propriedade exclusiva da QZero. O Serviço está protegido por direitos de autor, marcas registadas e outras leis.', 'pt');
  
  const txtTerminationTitle = useAutoTranslate('Rescisão', 'pt');
  const txtTerminationText = useAutoTranslate('Podemos rescindir ou suspender a sua conta imediatamente, sem aviso prévio ou responsabilidade, por qualquer razão, incluindo, sem limitação, se violar os Termos. Após a rescisão, o seu direito de utilizar o Serviço cessará imediatamente.', 'pt');
  
  const txtLiabilityTitle = useAutoTranslate('Limitação de Responsabilidade', 'pt');
  const txtLiabilityText = useAutoTranslate('Em caso algum a QZero, nem os seus diretores, empregados, parceiros, agentes, fornecedores ou afiliados, serão responsáveis por quaisquer danos indiretos, incidentais, especiais, consequenciais ou punitivos, incluindo, sem limitação, perda de lucros, dados, uso, boa vontade ou outras perdas intangíveis.', 'pt');
  
  const txtDisclaimerTitle = useAutoTranslate('Isenção de Garantias', 'pt');
  const txtDisclaimerText = useAutoTranslate('O Serviço é fornecido "TAL COMO ESTÁ" e "CONFORME DISPONÍVEL" sem garantias de qualquer tipo, expressas ou implícitas. Não garantimos que o Serviço funcionará de forma ininterrupta, segura ou estará disponível em qualquer momento ou local específico.', 'pt');
  
  const txtLawTitle = useAutoTranslate('Lei Aplicável', 'pt');
  const txtLawText = useAutoTranslate('Estes Termos serão regidos e interpretados de acordo com as leis de Portugal, sem consideração às suas disposições sobre conflitos de leis. A nossa falha em fazer valer qualquer direito ou disposição destes Termos não será considerada uma renúncia a esses direitos.', 'pt');
  
  const txtChangesTitle = useAutoTranslate('Alterações aos Termos', 'pt');
  const txtChangesText = useAutoTranslate('Reservamo-nos o direito, a nosso exclusivo critério, de modificar ou substituir estes Termos a qualquer momento. Notificá-lo-emos de quaisquer alterações materiais com pelo menos 30 dias de antecedência antes de os novos termos entrarem em vigor.', 'pt');
  
  const txtContactTitle = useAutoTranslate('Contacto', 'pt');
  const txtContactText = useAutoTranslate('Se tiver questões sobre estes Termos, contacte-nos:', 'pt');

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
                <FileText className="w-8 h-8 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{txtTitle}</h1>
                <p className="text-sm text-slate-500">{txtLastUpdated}: {formattedDate}</p>
              </div>
            </div>

            <div className="prose prose-slate max-w-none space-y-8">
              <section>
                <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-indigo-600" />
                  {txtIntroTitle}
                </h2>
                <p className="text-slate-600 mt-2">{txtIntroText}</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-900">{txtServiceTitle}</h2>
                <p className="text-slate-600 mt-2">{txtServiceText}</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-900">{txtAccountTitle}</h2>
                <p className="text-slate-600 mt-2">{txtAccountText}</p>
              </section>

              <section className="bg-indigo-50 p-6 rounded-xl border border-indigo-200">
                <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                  {txtSubscriptionTitle}
                </h2>
                <p className="text-slate-600 mt-2">{txtSubscriptionIntro}</p>
                
                <div className="mt-4 p-4 bg-white rounded-lg">
                  <h3 className="font-semibold text-lg text-slate-900">{txtSubName}</h3>
                  <ul className="list-disc list-inside text-slate-700 mt-2 space-y-1">
                    <li>{txtSubDuration}</li>
                    <li>{txtSubPrice}</li>
                  </ul>
                </div>

                <div className="mt-6">
                  <h3 className="font-semibold text-slate-900">{txtPaymentTermsTitle}</h3>
                  <ul className="list-disc list-inside text-slate-700 mt-2 space-y-2">
                    <li>{txtPaymentTerm1}</li>
                    <li>{txtPaymentTerm2}</li>
                    <li>{txtPaymentTerm3}</li>
                    <li>{txtPaymentTerm4}</li>
                    <li>{txtPaymentTerm5}</li>
                  </ul>
                </div>

                <div className="mt-6">
                  <h3 className="font-semibold text-slate-900">{txtStripeTermsTitle}</h3>
                  <ul className="list-disc list-inside text-slate-700 mt-2 space-y-2">
                    <li>{txtStripeTerm1}</li>
                    <li>{txtStripeTerm2}</li>
                    <li>{txtStripeTerm3}</li>
                    <li>{txtStripeTerm4}</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-indigo-600" />
                  {txtCancelTitle}
                </h2>
                <p className="text-slate-600 mt-2">{txtCancelText}</p>
                <p className="text-slate-700 mt-3 font-medium">{txtCancelHow}</p>
                <ul className="list-disc list-inside text-slate-600 mt-2 space-y-1">
                  <li>{txtCancelIOS}</li>
                  <li>{txtCancelAndroid}</li>
                  <li>{txtCancelWeb}</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                  <Ban className="w-5 h-5 text-red-600" />
                  {txtUseTitle}
                </h2>
                <p className="text-slate-600 mt-2">{txtUseText}</p>
                <ul className="list-disc list-inside text-slate-600 mt-3 space-y-2">
                  <li>{txtUse1}</li>
                  <li>{txtUse2}</li>
                  <li>{txtUse3}</li>
                  <li>{txtUse4}</li>
                  <li>{txtUse5}</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-900">{txtIPTitle}</h2>
                <p className="text-slate-600 mt-2">{txtIPText}</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  {txtTerminationTitle}
                </h2>
                <p className="text-slate-600 mt-2">{txtTerminationText}</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-900">{txtLiabilityTitle}</h2>
                <p className="text-slate-600 mt-2">{txtLiabilityText}</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-900">{txtDisclaimerTitle}</h2>
                <p className="text-slate-600 mt-2">{txtDisclaimerText}</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-900">{txtLawTitle}</h2>
                <p className="text-slate-600 mt-2">{txtLawText}</p>
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
