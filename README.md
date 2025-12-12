# QZero - Sistema de Gestão de Filas

Sistema completo e independente para gestão de filas e agendamentos empresariais.

## 🚀 Características

- **Sistema Standalone**: Funciona completamente sem dependências externas
- **Dados Locais**: Persistência via localStorage + backend API local
- **Portal do Cliente**: Visualizar empresas, filas, agendamentos e histórico
- **Portal Empresarial**: Dashboard, gestão de filas, serviços, agendamentos e analytics
- **Subscrições com Stripe**: Fluxo completo de pagamentos (€49.99/mês com 2 dias grátis)
- **Tempo Real**: Posição e tempo estimado calculados dinamicamente
- **Ferramentas de Marketing**: Gerador de cartazes A4 com QR codes
- **Painel TV**: Display fullscreen para salas de espera

## 📦 Tecnologias

- **Frontend**: React 18 + Vite 6
- **UI**: Radix UI + Tailwind CSS
- **Animações**: Framer Motion
- **State**: TanStack React Query
- **Routing**: React Router DOM v7
- **Pagamentos**: Stripe

## 🏃 Como Executar

```bash
# Instalar dependências
npm install

# Executar em desenvolvimento
npm run dev

# Acessar
http://localhost:5000
```

## 🗄️ Gestão de Dados

Para limpar todos os dados e recomeçar:

1. Abra o Console do Navegador (F12)
2. Execute: `clearAllMockData()`
3. Recarregue a página (F5)

## 📝 Licença

Propriedade privada - Todos os direitos reservados