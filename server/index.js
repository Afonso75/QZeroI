import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { google } from 'googleapis';
import { companyProfileStorage, SUBSCRIPTION_STATUS } from '../src/models/companyProfile.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import { db } from './db.js';
import { companyProfiles, users, verificationCodes, challengeTokens, passwordResetTokens, consents, tickets, queues, appointments, deviceTokens, pushNotifications, staffInvites, services } from '../shared/schema.js';
import { eq, and, gt, desc, sql } from 'drizzle-orm';
import { fileTypeFromBuffer } from 'file-type';
import { 
  sanitizeMiddleware, 
  validateRegister, 
  validateLogin,
  validateEmail,
  validateId,
  validateVerificationCode,
  validateRequestPasswordReset,
  validateResetPassword,
  validateCompanyProfile,
  validateCancelSubscription,
  handleValidationErrors,
  errorHandler,
  safeLog
} from './middleware/security.js';
import logger, { logAuthFailure, logAuthSuccess, logSecurityEvent } from './middleware/logger.js';
import { translateText, translateBatch, detectLanguage } from './services/translateService.js';
import objectStorageService, { ObjectNotFoundError } from './services/objectStorage.js';
import pushNotificationService from './services/pushNotificationService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_FILE = path.join(__dirname, 'demoStore.json');

// Diretório para uploads
const UPLOADS_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configuração do Multer para upload de ficheiros
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const safeName = file.originalname.replace(ext, '').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    cb(null, `${safeName}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de ficheiro inválido. Apenas PNG, JPG, JPEG e GIF são permitidos.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: fileFilter
});

// Debug: Verificar se a chave é de teste
const stripeKey = process.env.STRIPE_SECRET_KEY;
const IS_STRIPE_LIVE = stripeKey && stripeKey.startsWith('sk_live_');

// 🔍 DETECTAR PRODUÇÃO DE FORMA ROBUSTA
// Produção APENAS se NODE_ENV=production OU deployment oficial
// ✅ NÃO usar IS_STRIPE_LIVE - permite dev com chave LIVE sem forçar modo produção
const IS_PRODUCTION = process.env.NODE_ENV === 'production' || 
                      process.env.REPLIT_DEPLOYMENT === '1';

// 🌐 DOMÍNIO COOKIES: Detectar se estamos em domínio personalizado ou Replit dev
// CRÍTICO: Cookies com domain='waitless-qzero.com' NÃO funcionam em *.replit.dev!
const isCustomDomain = process.env.REPLIT_DEPLOYMENT === '1'; // Apenas em deployment oficial
const COOKIE_DOMAIN = (IS_PRODUCTION && isCustomDomain) ? 'waitless-qzero.com' : undefined;

// 🔍 DEBUG: Log das variáveis de ambiente para diagnóstico
console.log('🔍 DETECÇÃO DE AMBIENTE:', {
  'NODE_ENV': process.env.NODE_ENV,
  'REPLIT_DEPLOYMENT': process.env.REPLIT_DEPLOYMENT,
  'IS_STRIPE_LIVE': IS_STRIPE_LIVE,
  'IS_PRODUCTION': IS_PRODUCTION
});

if (stripeKey) {
  const keyPrefix = stripeKey.substring(0, 8);
  console.log('🔑 Stripe Key Prefix:', keyPrefix);
  if (keyPrefix.startsWith('sk_test_')) {
    console.log('✅ Usando chave de TESTE da Stripe');
  } else if (keyPrefix.startsWith('sk_live_')) {
    console.log('🚀 ATENÇÃO: Usando chave de PRODUÇÃO da Stripe!');
    console.log('💰 Pagamentos serão REAIS - modo LIVE ativo');
  } else {
    console.log('❌ Formato de chave desconhecido');
  }
} else {
  console.log('❌ STRIPE_SECRET_KEY não está definida!');
}

console.log(`🌍 Ambiente: ${IS_PRODUCTION ? 'PRODUÇÃO' : 'DESENVOLVIMENTO'}`);
console.log(`💳 Stripe: ${IS_STRIPE_LIVE ? 'LIVE (REAL)' : 'TEST (SIMULADO)'}`);
if (IS_PRODUCTION && !IS_STRIPE_LIVE) {
  console.warn('⚠️ AVISO: Ambiente PRODUÇÃO mas Stripe em modo TESTE!');
}

// ⚠️ CRÍTICO: Validar que Stripe key existe
if (!stripeKey) {
  console.error('❌ ERRO FATAL: STRIPE_SECRET_KEY não está configurada!');
  console.error('🔧 Configure via: Tools → Secrets → STRIPE_SECRET_KEY');
  process.exit(1);
}

const stripe = new Stripe(stripeKey, {
  apiVersion: '2023-10-16',
});

// 🍪 CONFIGURAÇÃO CENTRALIZADA DE COOKIES
// Desenvolvimento: sameSite: 'strict' (same-origin via Vite proxy) evita Lax+POST
// Produção: sameSite: 'lax' + secure: true (Safari iOS compatível)
// 🔒 CORREÇÃO SAFARI iOS: Detectar conexão HTTPS mesmo em desenvolvimento
// Safari iOS rejeita cookies com secure:false quando acedido via HTTPS (replit.dev)
const isHttpsConnection = process.env.REPLIT_DEPLOYMENT === '1' || 
                          process.env.REPL_SLUG !== undefined; // Replit sempre usa HTTPS

// 🐛 WORKAROUND SAFARI 16.4+: Bug conhecido perde cookies com SameSite=Lax
// Solução: OMITIR SameSite completamente + adicionar Domain + maxAge explícito
// Referência: WebKit Bug #255524
// ✅ CAPACITOR FIX: Usar SameSite=None + Secure para cross-origin requests
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true, // ✅ SEMPRE true - HTTPS obrigatório para SameSite=None
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias (OBRIGATÓRIO para persistência)
  sameSite: 'none', // ✅ CAPACITOR: Necessário para cross-origin (WebView → API)
  path: '/', // ✅ Disponível em todo o domínio
  domain: COOKIE_DOMAIN, // ✅ undefined em dev/replit, domínio em produção
};

// 🗑️ FUNÇÃO HELPER: Limpeza AGRESSIVA de cookies para Safari iOS
// Safari iOS frequentemente ignora clearCookie() normal, então precisamos forçar
function aggressiveClearCookie(res, cookieName) {
  // Método 1: clearCookie com options (padrão)
  res.clearCookie(cookieName, COOKIE_OPTIONS);
  
  // Método 2: clearCookie SEM options (às vezes funciona melhor no Safari)
  res.clearCookie(cookieName);
  
  // Método 3: Forçar expiração via Set-Cookie manual (garantia absoluta)
  // CRÍTICO: Usar COOKIE_DOMAIN (não hardcoded) para coincidir com cookie original
  const domain = COOKIE_DOMAIN ? `; Domain=${COOKIE_DOMAIN}` : '';
  res.setHeader('Set-Cookie', [
    `${cookieName}=deleted; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=None${domain}`,
    `${cookieName}=deleted; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None${domain}`
  ]);
  
  console.log(`🗑️ Cookie "${cookieName}" limpo agressivamente (3 métodos, domain=${COOKIE_DOMAIN || 'default'})`);
}

console.log('🍪 Configuração de cookies:', {
  secure: COOKIE_OPTIONS.secure,
  sameSite: COOKIE_OPTIONS.sameSite || 'OMITIDO (Safari workaround)',
  httpOnly: COOKIE_OPTIONS.httpOnly,
  maxAge: '7 dias',
  domain: COOKIE_DOMAIN || 'padrão (current domain)',
  IS_PRODUCTION,
  isHttpsConnection,
  isCustomDomain
});

const app = express();

// ⚙️ CONFIGURAÇÃO: Trust proxy (Replit usa proxy reverso)
// Essencial para rate limiting funcionar corretamente em produção
app.set('trust proxy', 1);

// ================== SEGURANÇA ==================

// 🛡️ 1. HELMET - Security headers HTTP
// Protege contra: XSS, clickjacking, MIME sniffing, etc.
app.use(helmet({
  contentSecurityPolicy: IS_PRODUCTION ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://maps.googleapis.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:", "https://*.googleapis.com", "https://*.gstatic.com"],
      connectSrc: [
        "'self'", 
        "https://api.stripe.com",
        "https://nominatim.openstreetmap.org",
        "https://maps.googleapis.com",
        "https://*.googleapis.com"
      ],
      frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
    },
  } : false,
  crossOriginEmbedderPolicy: false,
  hsts: IS_PRODUCTION ? {
    maxAge: 31536000, // 1 ano
    includeSubDomains: true,
    preload: true
  } : false,
  noSniff: true, // Prevenir MIME sniffing
  frameguard: { action: 'deny' }, // Prevenir clickjacking
  xssFilter: true, // XSS protection
  hidePoweredBy: true, // Esconder X-Powered-By
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// 🛡️ 2. RATE LIMITING - Proteção contra spam/DDoS
// Limita requests por IP para prevenir ataques
// ✅ AUMENTADO SIGNIFICATIVAMENTE - O Replit dev também pode ter IS_PRODUCTION=true por causa do Stripe
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000, // ✅ AUMENTADO: 5000 req/15min para suportar traduções intensivas
  message: 'Muitos pedidos deste IP. Por favor, tente novamente mais tarde.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // ✅ CRÍTICO: Excluir traduções do rate limiter geral (tem seu próprio limiter)
    if (req.path === '/api/translate' || req.path === '/api/translate/detect') return true;
    if (req.path === '/api/stripe-webhook') return true;
    if (req.path.includes('/api/demo/')) return true;
    // ✅ Excluir autenticação (tem seu próprio limiter)
    if (req.path.startsWith('/api/auth/')) return true;
    return false;
  },
});

// Aplicar rate limiting em todas rotas da API
app.use('/api/', limiter);

// Rate limiting para autenticação (mais generoso para evitar bloqueios acidentais)
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // ✅ 5 minutos (reduzido de 15)
  max: 30, // ✅ AUMENTADO: 30 tentativas/5min (evita bloqueios durante desenvolvimento)
  message: 'Muitas tentativas de login. Tente novamente em 5 minutos.',
  skipSuccessfulRequests: true, // Não contar tentativas bem-sucedidas
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/validate-credentials', authLimiter);
app.use('/api/auth/verify-code', authLimiter);

// 🛡️ 3. CORS RESTRITO - Apenas domínios autorizados
// Previne que sites maliciosos façam requests à sua API
// ✅ CORRIGIDO: CORS SEM WILDCARDS (segurança)
const allowedOrigins = IS_PRODUCTION 
  ? [
      'https://q-zero-afonsomarques80.replit.app',
      'https://waitless-qzero.com',
      'https://www.waitless-qzero.com',
      'https://app.qzero.local',  // ✅ CAPACITOR: Hostname configurado
      'http://127.0.0.1:3001',
      'http://localhost:3001',
      'http://127.0.0.1:5000',
      'http://localhost:5000'
    ].filter(Boolean)
  : [
      'http://localhost:5000',
      'http://localhost:5001',
      'http://localhost:3001',
      'http://127.0.0.1:5000',
      'http://127.0.0.1:5001',
      'http://127.0.0.1:3001',
      'https://app.qzero.local',  // ✅ CAPACITOR em dev também
    ];

app.use(cors({
  origin: (origin, callback) => {
    // ✅ Permitir requests sem origin (apps móveis Capacitor, Postman, curl)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.includes(origin);
    const isReplitDomain = origin.includes('.replit.dev') || origin.includes('.replit.app');
    
    // ✅ CAPACITOR: Permitir apps móveis (capacitor://, ionic://, file://)
    const isCapacitorApp = 
      origin.startsWith('capacitor://') ||
      origin.startsWith('ionic://') ||
      origin.startsWith('http://localhost') ||
      origin.startsWith('https://localhost') ||
      origin === 'null' ||  // Android WebView envia 'null' como origin
      origin.includes('app.qzero.local');  // Hostname configurado no Capacitor
    
    if (isAllowed || isReplitDomain || isCapacitorApp) {
      callback(null, true);
    } else {
      safeLog(`⚠️ CORS BLOCKED:`, { origin, allowed: allowedOrigins });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Platform'],
}));

console.log(`🛡️ Segurança ativada:`);
console.log(`  - Helmet: ✅ (Security headers)`);
console.log(`  - Rate Limiting: ✅ (${IS_PRODUCTION ? '100' : '2000'} req/15min)`);
console.log(`  - Translation Rate Limit: ✅ (${process.env.NODE_ENV === 'development' ? '2000' : '500'} req/min - separado, NODE_ENV=${process.env.NODE_ENV})`);
console.log(`  - CORS: ✅ (${allowedOrigins.length} domínios autorizados)`);

app.use(cookieParser());

// ⚠️ CRÍTICO: Webhook Stripe ANTES do express.json()
// Stripe precisa do raw body para verificar assinatura
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('❌ STRIPE_WEBHOOK_SECRET não configurado!');
      return res.status(500).send('Webhook secret not configured');
    }

    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('🎯 Received Stripe webhook event:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const companyProfileId = session.client_reference_id || session.metadata.companyProfileId;
        
        if (companyProfileId) {
          let subscriptionStatus = 'active';
          let isTrialing = false;
          let trialStart = null;
          let trialEnd = null;
          
          if (session.subscription) {
            try {
              const subscription = await stripe.subscriptions.retrieve(session.subscription);
              subscriptionStatus = subscription.status;
              isTrialing = subscription.status === 'trialing';
              
              // 🎁 TRIAL: Guardar datas de início e fim do período gratuito
              if (subscription.trial_start && subscription.trial_end) {
                trialStart = new Date(subscription.trial_start * 1000); // Stripe usa Unix timestamp
                trialEnd = new Date(subscription.trial_end * 1000);
                console.log(`🎁 Trial detected: ${trialStart.toISOString()} → ${trialEnd.toISOString()}`);
              }
            } catch (subError) {
              console.warn('⚠️ Could not retrieve subscription:', subError.message);
            }
          }
          
          // ✅ CRÍTICO: Status deve ser PENDING_PAYMENT durante trial, só ACTIVE após pagamento
          const profileStatus = isTrialing ? SUBSCRIPTION_STATUS.PENDING_PAYMENT : SUBSCRIPTION_STATUS.ACTIVE;
          
          const updateData = {
            status: profileStatus,
            stripeCustomerId: session.customer,
            subscriptionId: session.subscription,
            subscriptionStatus: subscriptionStatus,
            updatedAt: new Date()
          };
          
          // Adicionar datas de trial se existirem
          if (trialStart) updateData.trialStart = trialStart;
          if (trialEnd) updateData.trialEnd = trialEnd;
          
          await db.update(companyProfiles)
            .set(updateData)
            .where(eq(companyProfiles.id, companyProfileId));
          
          const statusMessage = isTrialing
            ? `✅ Webhook: Company profile ${companyProfileId} entered 7-day trial (status: pending_payment)`
            : `✅ Webhook: Company profile ${companyProfileId} activated after payment (status: active)`;
          console.log(statusMessage);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        
        if (subscriptionId) {
          // ✅ PRIMEIRO PAGAMENTO BEM-SUCEDIDO → Ativar perfil!
          // Isto acontece quando trial expira E o pagamento é processado com sucesso
          await db.update(companyProfiles)
            .set({
              status: SUBSCRIPTION_STATUS.ACTIVE, // ✅ Perfil agora está ATIVO
              subscriptionStatus: 'active',
              updatedAt: new Date()
            })
            .where(eq(companyProfiles.subscriptionId, subscriptionId));
          
          console.log(`✅ Webhook: Payment succeeded for subscription ${subscriptionId} - Profile activated`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const failedInvoice = event.data.object;
        const failedSubscriptionId = failedInvoice.subscription;
        
        if (failedSubscriptionId) {
          // ⚠️ PAGAMENTO FALHOU → Apenas atualizar subscription_status
          // NÃO revogar acesso imediatamente (Stripe faz retries automáticos)
          // Acesso só é revogado quando subscription.updated → past_due/canceled
          await db.update(companyProfiles)
            .set({
              subscriptionStatus: 'past_due',
              updatedAt: new Date()
            })
            .where(eq(companyProfiles.subscriptionId, failedSubscriptionId));
          
          console.log(`⚠️ Webhook: Payment failed for subscription ${failedSubscriptionId} - Marked past_due (Stripe will retry)`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const updatedSubscription = event.data.object;
        
        // 🔍 PRIMEIRO: Verificar estado atual na DB antes de atualizar
        const currentProfile = await db.query.companyProfiles.findFirst({
          where: eq(companyProfiles.subscriptionId, updatedSubscription.id)
        });
        
        // ⚠️ Se já está cancelado na DB, NÃO reverter para trialing/active
        const isAlreadyCancelledInDB = currentProfile && 
          (currentProfile.subscriptionStatus === 'cancelled' || currentProfile.subscriptionStatus === 'canceled');
        
        // 🔍 Verificar se a subscrição está marcada para cancelar no fim do período
        const isCancelledButActive = updatedSubscription.cancel_at_period_end === true;
        
        console.log(`🔍 Webhook subscription.updated: DB status=${currentProfile?.subscriptionStatus}, Stripe cancel_at_period_end=${isCancelledButActive}, Stripe status=${updatedSubscription.status}`);
        
        // ✅ Se já está cancelado na DB OU no Stripe, manter como cancelado
        if (isAlreadyCancelledInDB || isCancelledButActive) {
          const updateData = {
            status: SUBSCRIPTION_STATUS.ACTIVE, // Manter acesso até fim do período
            subscriptionStatus: 'cancelled',
            updatedAt: new Date()
          };
          
          // Atualizar a data de fim do período
          if (updatedSubscription.current_period_end) {
            updateData.currentPeriodEnd = new Date(updatedSubscription.current_period_end * 1000);
          }
          
          await db.update(companyProfiles)
            .set(updateData)
            .where(eq(companyProfiles.subscriptionId, updatedSubscription.id));
          
          console.log(`⏰ Webhook: Subscription ${updatedSubscription.id} - MANTENDO ESTADO CANCELADO (acesso até ${updateData.currentPeriodEnd})`);
          break;
        }
        
        // ✅ Só atualiza para outros estados se NÃO estiver cancelado
        const updateData = {
          subscriptionStatus: updatedSubscription.status,
          updatedAt: new Date()
        };
        
        if (updatedSubscription.status === 'active') {
          updateData.status = SUBSCRIPTION_STATUS.ACTIVE;
        } else if (updatedSubscription.status === 'trialing') {
          updateData.status = SUBSCRIPTION_STATUS.PENDING_PAYMENT;
        } else if (updatedSubscription.status === 'past_due') {
          updateData.status = SUBSCRIPTION_STATUS.PENDING_PAYMENT;
        } else if (updatedSubscription.status === 'canceled' || updatedSubscription.status === 'unpaid') {
          updateData.status = SUBSCRIPTION_STATUS.CANCELLED;
        }
        
        // 🎁 Atualizar datas de trial se mudaram
        if (updatedSubscription.trial_start && updatedSubscription.trial_end) {
          updateData.trialStart = new Date(updatedSubscription.trial_start * 1000);
          updateData.trialEnd = new Date(updatedSubscription.trial_end * 1000);
        }
        
        await db.update(companyProfiles)
          .set(updateData)
          .where(eq(companyProfiles.subscriptionId, updatedSubscription.id));
        
        console.log(`✅ Webhook: Subscription ${updatedSubscription.id} updated to ${updatedSubscription.status} (profile status: ${updateData.status})`);
        break;
      }

      case 'customer.subscription.deleted': {
        const deletedSubscription = event.data.object;
        
        await db.update(companyProfiles)
          .set({
            status: SUBSCRIPTION_STATUS.CANCELLED,
            subscriptionStatus: 'canceled',
            updatedAt: new Date()
          })
          .where(eq(companyProfiles.subscriptionId, deletedSubscription.id));
        
        console.log(`⚠️ Webhook: Subscription ${deletedSubscription.id} cancelled`);
        break;
      }

      default:
        console.log(`ℹ️ Webhook: Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    // Ainda retorna 200 para Stripe não reenviar
  }

  res.json({ received: true });
});

// AGORA aplicar express.json() para outras rotas
app.use(express.json());

// 🛡️ SANITIZAÇÃO GLOBAL - Remove NoSQL injection, XSS
// ✅ Sanitizer customizado compatível com Express 5 (substitui express-mongo-sanitize)
// Remove caracteres perigosos ($, .) que podem causar NoSQL injection
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return;
  
  // Recursivamente sanitizar todos os valores do objeto
  Object.keys(obj).forEach(key => {
    // Remover chaves que começam com $ ou contêm .
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      // Recursivamente sanitizar objetos aninhados
      if (Array.isArray(obj[key])) {
        obj[key].forEach(item => sanitizeObject(item));
      } else {
        sanitizeObject(obj[key]);
      }
    }
  });
}

// Middleware que aplica sanitização em req.body, req.params, req.query
app.use((req, res, next) => {
  sanitizeObject(req.body);
  sanitizeObject(req.params);
  sanitizeObject(req.query);
  next();
});

app.use(sanitizeMiddleware); // Remove tags HTML perigosas

// Servir ficheiros de upload estaticamente com headers CORS para Capacitor
app.use('/uploads', (req, res, next) => {
  // ✅ CAPACITOR FIX: Adicionar headers CORS para apps móveis
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  // ✅ Cache control para imagens (1 hora)
  res.setHeader('Cache-Control', 'public, max-age=3600');
  next();
}, express.static(UPLOADS_DIR));

const PRICE_EUR_49_99_MONTHLY = '49.99';

// 🔒 CRÍTICO: JWT_SECRET é obrigatório (sem fallback inseguro!)
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ ERRO FATAL: JWT_SECRET não está configurada!');
  console.error('🔧 Configure via: Tools → Secrets → JWT_SECRET');
  console.error('🔑 Gere uma secret forte: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  process.exit(1);
}

// ================== AUTHENTICATION MIDDLEWARE ==================

const authenticateToken = (req, res, next) => {
  const cookieToken = req.cookies.auth_token;
  const authHeader = req.headers['authorization'];
  const bearerToken = authHeader?.replace('Bearer ', '');
  const token = cookieToken || bearerToken;
  
  // 🔍 DEBUG: Log detalhado para Safari iOS debugging
  if (!IS_PRODUCTION) {
    console.log('🔍 authenticateToken - Cookie token:', !!cookieToken);
    console.log('🔍 authenticateToken - Bearer token:', !!bearerToken);
    console.log('🔍 authenticateToken - Token final encontrado:', !!token);
    console.log('🔍 authenticateToken - Auth header presente:', !!authHeader);
    console.log('🔍 authenticateToken - Cookies disponíveis:', Object.keys(req.cookies || {}));
  }
  
  if (!token) {
    logSecurityEvent('auth_missing_token', { ip: req.ip, path: req.path });
    return res.status(401).json({ error: 'Não autenticado' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    
    // 🔒 PRODUÇÃO: NÃO logar email ou dados do utilizador
    if (!IS_PRODUCTION) {
      console.log('✅ Token válido para:', decoded.email);
    } else {
      // logAuthSuccess espera (req, userId, email) mas decoded não tem req
      logger.info('AUTH_SUCCESS', {
        event: 'TOKEN_VALIDATED',
        userId: decoded.userId,
        email: decoded.email,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
    }
    
    next();
  } catch (error) {
    logAuthFailure(req, `Token inválido: ${error.message}`);
    return res.status(403).json({ error: 'Token inválido' });
  }
};

// ================== MIDDLEWARE: BLOQUEIO DE SUBSCRIÇÃO EXPIRADA ==================
// 🚫 Este middleware bloqueia IMEDIATAMENTE o acesso a funcionalidades empresariais
// para contas com subscrição expirada - funciona mesmo em apps móveis antigas

const requireActiveSubscription = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!user || user.accountType !== 'empresa') {
      return next(); // Contas pessoais podem passar
    }

    if (!user.businessId) {
      return res.status(403).json({ 
        error: 'Subscrição necessária',
        subscription_required: true,
        is_expired: true
      });
    }

    const profile = await db.query.companyProfiles.findFirst({
      where: eq(companyProfiles.id, user.businessId)
    });

    if (!profile) {
      return res.status(403).json({ 
        error: 'Perfil empresarial não encontrado',
        subscription_required: true
      });
    }

    // 🚫 VERIFICAR EXPIRAÇÃO
    const now = new Date();
    const periodEnd = profile.currentPeriodEnd ? new Date(profile.currentPeriodEnd) : null;
    const isExpired = profile.subscriptionStatus === 'expired' || 
                      profile.status === 'expired' ||
                      (periodEnd && now > periodEnd);

    console.log('🔍 requireActiveSubscription:', {
      email: user.email,
      status: profile.status,
      subscriptionStatus: profile.subscriptionStatus,
      isExpired: isExpired
    });

    if (isExpired) {
      console.log('🚫 ACESSO BLOQUEADO - Subscrição expirada:', user.email);
      return res.status(403).json({ 
        error: 'A sua subscrição expirou. Por favor, renove para continuar a usar as funcionalidades empresariais.',
        subscription_expired: true,
        is_expired: true,
        subscription_status: profile.subscriptionStatus,
        current_period_end: profile.currentPeriodEnd
      });
    }

    // ✅ Subscrição ativa - permitir acesso
    next();
  } catch (error) {
    console.error('❌ Erro no requireActiveSubscription:', error);
    return res.status(500).json({ error: 'Erro ao verificar subscrição' });
  }
};

// ================== AUTHENTICATION ENDPOINTS ==================

// POST /api/consent - Log user consent to Privacy Policy and Terms & Conditions
// Rate limited to prevent spam
const consentLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: IS_PRODUCTION ? 10 : 50, // Production: 10/min, Dev: 50/min
  message: 'Too many consent requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/api/consent', consentLimiter, async (req, res) => {
  try {
    const { guestId, userId, consent, version, userAgent, locale, source } = req.body;

    // Validate required fields
    if (!guestId || consent === undefined || !version || !source) {
      return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }

    // Validate consent value
    if (typeof consent !== 'boolean') {
      return res.status(400).json({ ok: false, error: 'Consent must be boolean' });
    }

    // Capture IP address
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

    // Generate unique ID for consent record
    const consentId = `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store consent in database
    await db.insert(consents).values({
      id: consentId,
      guestId: guestId,
      userId: userId || null,
      consent: consent,
      version: version,
      userAgent: userAgent || null,
      locale: locale || null,
      ip: ip,
      source: source,
    });

    console.log(`✅ Consent logged: ${consentId} (guest: ${guestId}, version: ${version})`);

    res.json({ ok: true });
  } catch (error) {
    console.error('❌ Consent logging error:', error);
    // Never expose stack trace to client
    res.status(500).json({ ok: false });
  }
});

// POST /api/auth/register - Registo de novo utilizador
// ✅ VALIDAÇÃO E SANITIZAÇÃO APLICADAS
app.post('/api/auth/register', validateRegister, handleValidationErrors, async (req, res) => {
  try {
    const { email, password, fullName, phone, birthdate, accountType } = req.body;

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase())
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email já está registado' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `user${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const [newUser] = await db.insert(users).values({
      id: userId,
      email: email.toLowerCase(),
      passwordHash,
      fullName: fullName || '',
      phone: phone || '',
      birthdate: birthdate || '',
      accountType,
      isBusinessUser: accountType === 'empresa',
      isStaffMember: false,
    }).returning();

    // ✅ Gerar JWT com TODOS os role flags (igual ao login 2FA)
    const token = jwt.sign(
      { 
        userId: newUser.id, 
        email: newUser.email,
        isBusinessUser: newUser.isBusinessUser,
        isStaffMember: newUser.isStaffMember,
        businessId: newUser.businessId || null,
        staffPermissions: newUser.staffPermissions || null,
        accountType: newUser.accountType
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('auth_token', token, COOKIE_OPTIONS);

    // 🔒 PRODUÇÃO: NÃO logar email do utilizador
    if (!IS_PRODUCTION) {
      console.log('✅ Novo utilizador registado:', email);
    } else {
      logAuthSuccess(req, newUser.id, email);
    }

    res.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        phone: newUser.phone,
        birthdate: newUser.birthdate,
        accountType: newUser.accountType,
        isBusinessUser: newUser.isBusinessUser,
        isStaffMember: newUser.isStaffMember,
        businessId: newUser.businessId || null,
        staffPermissions: newUser.staffPermissions || null,
      },
      token
    });
  } catch (error) {
    console.error('❌ Erro no registo:', error);
    res.status(500).json({ error: 'Erro ao criar conta' });
  }
});

// POST /api/auth/login - DEPRECADO: Agora exige 2FA
// Este endpoint foi desabilitado por segurança. Use o fluxo 2FA:
// 1. POST /api/auth/validate-credentials
// 2. POST /api/auth/send-verification-code  
// 3. POST /api/auth/verify-code
app.post('/api/auth/login', async (req, res) => {
  return res.status(403).json({ 
    error: 'Este endpoint foi desabilitado. Por favor, utilize o fluxo de autenticação 2FA através da página de login.',
    requires_2fa: true 
  });
});

// GET /api/auth/me - Verificar autenticação
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 /api/auth/me - Iniciando busca para userId:', req.user?.userId);
    
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.user.userId)
    });

    console.log('🔍 /api/auth/me - Utilizador encontrado:', !!user);

    if (!user) {
      console.warn('⚠️ Utilizador não encontrado (JWT com userId antigo):', req.user.userId);
      console.warn('🔄 Limpando cookie inválido e forçando re-login...');
      
      // 🔒 LIMPAR cookie inválido de forma AGRESSIVA (Safari iOS workaround)
      aggressiveClearCookie(res, 'auth_token');
      
      return res.status(401).json({ 
        error: 'Not authenticated',
        reason: 'user_not_found',
        message: 'Sessão inválida. Por favor, faça login novamente.'
      });
    }

    // ✅ CALCULAR has_business_subscription DINAMICAMENTE de company_profiles
    let hasBusinessSubscription = false;
    let subscriptionInfo = null;
    
    if (user.accountType === 'empresa' && user.businessId) {
      try {
        const profile = await db.query.companyProfiles.findFirst({
          where: eq(companyProfiles.id, user.businessId)
        });
        
        // ✅ TRIAL CONTA COMO ACESSO ATIVO!
        // User tem acesso completo durante trial E após pagamento
        // ✅ SUBSCRIÇÕES CANCELADAS mantêm acesso até currentPeriodEnd
        const now = new Date();
        const hasCanceledAccess = (profile.subscriptionStatus === 'canceled' || profile.subscriptionStatus === 'cancelled') && 
                                   profile.currentPeriodEnd && 
                                   new Date(profile.currentPeriodEnd) > now;
        
        // ❌ EXPIRADO: Verificar se a subscrição expirou
        const isExpired = profile.subscriptionStatus === 'expired' || 
                          (profile.currentPeriodEnd && new Date(profile.currentPeriodEnd) < now);
        
        console.log('🔍 Verificação de acesso empresarial:', {
          email: user.email,
          status: profile.status,
          subscriptionStatus: profile.subscriptionStatus,
          currentPeriodEnd: profile.currentPeriodEnd,
          isExpired: isExpired,
          hasCanceledAccess: hasCanceledAccess
        });
        
        if (profile && !isExpired && (profile.status === 'active' || 
                        profile.subscriptionStatus === 'trialing' ||
                        hasCanceledAccess)) {
          hasBusinessSubscription = true;
          
          // ✅ SYNC: Atualizar DB se estiver desatualizado (evita queries futuras)
          if (user.hasBusinessSubscription !== hasBusinessSubscription) {
            await db.update(users)
              .set({ hasBusinessSubscription: true })
              .where(eq(users.id, user.id));
          }
        } else if (isExpired && user.hasBusinessSubscription) {
          // ❌ SYNC: Remover acesso se expirou
          console.log('❌ Subscrição expirada - removendo acesso empresarial:', user.email);
          await db.update(users)
            .set({ hasBusinessSubscription: false })
            .where(eq(users.id, user.id));
        }
        
        // ✅ Retornar informação de subscription/trial para o frontend
        if (profile) {
          subscriptionInfo = {
            status: profile.status,
            subscription_status: profile.subscriptionStatus,
            trial_start: profile.trialStart,
            trial_end: profile.trialEnd,
            current_period_end: profile.currentPeriodEnd,
            is_expired: isExpired, // 🚫 Flag explícito de expiração
          };
        }
      } catch (err) {
        console.warn('⚠️ Erro ao verificar perfil empresarial:', err);
        // Continuar com valor do DB (fallback seguro)
        hasBusinessSubscription = !!user.hasBusinessSubscription;
      }
    }

    console.log('✅ /api/auth/me - Enviando resposta');
    
    // ✅ Retornar campos em snake_case (normalização segura de tipos)
    res.json({
      id: user.id,
      email: user.email,
      full_name: user.fullName || null,
      phone: user.phone || null,
      birthdate: user.birthdate || null,
      country: user.country || null,
      city: user.city || null,
      account_type: user.accountType,
      is_business_user: !!user.isBusinessUser,
      is_staff_member: !!user.isStaffMember,
      business_id: user.businessId || null,
      staff_permissions: user.staffPermissions || null,
      onboarding_completed: true, // Sempre true (onboarding legacy removido)
      has_business_subscription: hasBusinessSubscription,
      subscription_info: subscriptionInfo, // ✅ Informação de trial/subscription
      created_at: user.createdAt || null
    });
  } catch (error) {
    console.error('❌ ERRO FATAL em /api/auth/me:', {
      message: error.message,
      stack: error.stack,
      userId: req.user?.userId
    });
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PATCH /api/auth/language - Atualizar idioma preferido do utilizador
app.patch('/api/auth/language', authenticateToken, async (req, res) => {
  try {
    const { language } = req.body;
    
    if (!language || typeof language !== 'string' || language.length > 10) {
      return res.status(400).json({ error: 'Idioma inválido' });
    }

    await db.update(users)
      .set({ 
        preferredLanguage: language,
        updatedAt: new Date()
      })
      .where(eq(users.id, req.user.userId));

    console.log(`✅ Idioma atualizado para ${language} - userId: ${req.user.userId}`);
    res.json({ success: true, language });
  } catch (error) {
    console.error('❌ Erro ao atualizar idioma:', error);
    res.status(500).json({ error: 'Erro ao atualizar idioma' });
  }
});

// POST /api/auth/logout - Logout
app.post('/api/auth/logout', async (req, res) => {
  try {
    // 🧹 Tentar obter email do utilizador do JWT (se existir)
    const token = req.cookies.auth_token;
    let userEmail = null;
    
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userEmail = decoded.email;
      } catch (err) {
        // JWT inválido/expirado - ok, vamos limpar o cookie na mesma
        console.log('⚠️ JWT inválido no logout, mas vamos limpar tudo na mesma');
      }
    }
    
    // 🗑️ Se temos o email, limpar challenge tokens e verification codes
    if (userEmail) {
      // Invalidar todos os challenge tokens do utilizador
      await db.delete(challengeTokens)
        .where(eq(challengeTokens.email, userEmail.toLowerCase()));
      
      // Invalidar todos os verification codes do utilizador
      await db.delete(verificationCodes)
        .where(eq(verificationCodes.email, userEmail.toLowerCase()));
      
      console.log(`🧹 Challenge tokens e verification codes limpos para ${userEmail}`);
    }
    
    // 🍪 Limpar cookie de autenticação de forma AGRESSIVA (Safari iOS workaround)
    aggressiveClearCookie(res, 'auth_token');
    
    res.json({ success: true, message: 'Logout realizado com sucesso' });
  } catch (error) {
    logger.error('Erro no logout:', error);
    // Mesmo com erro, limpar cookie de forma AGRESSIVA
    aggressiveClearCookie(res, 'auth_token');
    res.json({ success: true, message: 'Logout realizado com sucesso' });
  }
});

// DELETE /api/auth/delete-account - Eliminar conta do utilizador e TODOS os dados
app.delete('/api/auth/delete-account', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;
    
    console.log(`🗑️ ========== ELIMINAÇÃO COMPLETA DE CONTA ==========`);
    console.log(`🗑️ Utilizador: ${userEmail} (ID: ${userId})`);
    
    // 1. Buscar perfil de empresa (se existir) - PRIMEIRO para cancelar Stripe
    let companyProfile = null;
    try {
      const [profile] = await db.select().from(companyProfiles).where(eq(companyProfiles.userId, userId));
      companyProfile = profile;
      
      // Também verificar por adminUserId (campo alternativo)
      if (!companyProfile) {
        const [profileByAdmin] = await db.select().from(companyProfiles).where(eq(companyProfiles.adminUserId, userId));
        companyProfile = profileByAdmin;
      }
    } catch (e) {
      console.log('⚠️ Erro ao buscar perfil de empresa:', e.message);
    }
    
    // 2. CANCELAR SUBSCRIÇÃO STRIPE (se existir)
    if (companyProfile?.subscriptionId && stripe) {
      try {
        await stripe.subscriptions.cancel(companyProfile.subscriptionId);
        console.log('✅ Subscrição Stripe CANCELADA:', companyProfile.subscriptionId);
      } catch (stripeError) {
        console.warn('⚠️ Erro ao cancelar subscrição Stripe:', stripeError.message);
      }
    }
    
    // 3. Eliminar tokens de dispositivo (push notifications)
    try {
      await db.delete(deviceTokens).where(eq(deviceTokens.userId, userId));
      console.log('✅ Device tokens eliminados');
    } catch (e) {
      console.log('⚠️ Erro ao eliminar device tokens:', e.message);
    }
    
    // 4. Eliminar notificações push
    try {
      await db.delete(pushNotifications).where(eq(pushNotifications.userId, userId));
      console.log('✅ Push notifications eliminadas');
    } catch (e) {
      console.log('⚠️ Erro ao eliminar push notifications:', e.message);
    }
    
    // 5. Eliminar registos de consentimento (GDPR)
    try {
      await db.delete(consents).where(eq(consents.userId, userId));
      console.log('✅ Consent records eliminados');
    } catch (e) {
      console.log('⚠️ Erro ao eliminar consents:', e.message);
    }
    
    // 6. Eliminar challenge tokens
    try {
      await db.delete(challengeTokens).where(eq(challengeTokens.email, userEmail.toLowerCase()));
      console.log('✅ Challenge tokens eliminados');
    } catch (e) {
      console.log('⚠️ Erro ao eliminar challenge tokens:', e.message);
    }
    
    // 7. Eliminar verification codes
    try {
      await db.delete(verificationCodes).where(eq(verificationCodes.email, userEmail.toLowerCase()));
      console.log('✅ Verification codes eliminados');
    } catch (e) {
      console.log('⚠️ Erro ao eliminar verification codes:', e.message);
    }
    
    // 8. Eliminar password reset tokens
    try {
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.email, userEmail.toLowerCase()));
      console.log('✅ Password reset tokens eliminados');
    } catch (e) {
      console.log('⚠️ Erro ao eliminar password reset tokens:', e.message);
    }
    
    // 9. Se tem empresa, eliminar TODOS os dados relacionados
    if (companyProfile) {
      console.log(`🏢 Eliminando empresa: ${companyProfile.companyName} (ID: ${companyProfile.id})`);
      
      // Eliminar filas da empresa
      try {
        await db.delete(queues).where(eq(queues.businessId, companyProfile.id));
        console.log('✅ Filas da empresa eliminadas');
      } catch (e) {
        console.log('⚠️ Erro ao eliminar filas:', e.message);
      }
      
      // Eliminar TODAS as marcações da empresa
      try {
        await db.delete(appointments).where(eq(appointments.businessId, companyProfile.id));
        console.log('✅ Marcações da empresa eliminadas');
      } catch (e) {
        console.log('⚠️ Erro ao eliminar marcações:', e.message);
      }
      
      // Eliminar TODOS os tickets/senhas da empresa
      try {
        await db.delete(tickets).where(eq(tickets.businessId, companyProfile.id));
        console.log('✅ Tickets/senhas da empresa eliminados');
      } catch (e) {
        console.log('⚠️ Erro ao eliminar tickets:', e.message);
      }
      
      // Eliminar convites pendentes de staff
      try {
        await db.delete(staffInvites).where(eq(staffInvites.businessId, companyProfile.id));
        console.log('✅ Staff invites eliminados');
      } catch (e) {
        console.log('⚠️ Erro ao eliminar staff invites:', e.message);
      }
      
      // Eliminar perfil de empresa
      await db.delete(companyProfiles).where(eq(companyProfiles.id, companyProfile.id));
      console.log('✅ Perfil de empresa ELIMINADO');
    }
    
    // 10. Eliminar marcações do utilizador (como cliente)
    try {
      await db.delete(appointments).where(eq(appointments.userEmail, userEmail.toLowerCase()));
      console.log('✅ Marcações do utilizador (como cliente) eliminadas');
    } catch (e) {
      console.log('⚠️ Erro ao eliminar marcações do utilizador:', e.message);
    }
    
    // 11. Eliminar tickets do utilizador (como cliente)
    try {
      await db.delete(tickets).where(eq(tickets.userEmail, userEmail.toLowerCase()));
      console.log('✅ Tickets do utilizador (como cliente) eliminados');
    } catch (e) {
      console.log('⚠️ Erro ao eliminar tickets do utilizador:', e.message);
    }
    
    // 12. FINALMENTE - Eliminar o utilizador
    await db.delete(users).where(eq(users.id, userId));
    console.log('✅ UTILIZADOR ELIMINADO');
    
    // 13. Limpar cookie de autenticação
    aggressiveClearCookie(res, 'auth_token');
    
    console.log(`🗑️ ========== CONTA COMPLETAMENTE ELIMINADA ==========`);
    console.log(`✅ ${userEmail} - Todos os dados removidos permanentemente`);
    
    logSecurityEvent(req, userEmail, 'ACCOUNT_DELETED_COMPLETE');
    
    res.json({ success: true, message: 'Conta eliminada com sucesso. Todos os dados foram removidos permanentemente.' });
  } catch (error) {
    console.error('❌ Erro ao eliminar conta:', error);
    res.status(500).json({ error: 'Erro ao eliminar conta. Por favor, tente novamente.' });
  }
});

// POST /api/auth/clear-session - Limpar sessão de emergência (SEM autenticação)
// ⚠️ Endpoint público para quando utilizadores ficam presos em loop de cookies inválidos
app.post('/api/auth/clear-session', (req, res) => {
  try {
    console.log('🚨 Clear-session chamado - limpeza forçada de cookies');
    
    // 🗑️ Limpar cookie de forma AGRESSIVA
    aggressiveClearCookie(res, 'auth_token');
    
    res.json({ 
      success: true, 
      message: 'Sessão limpa com sucesso. Pode fazer login novamente.' 
    });
  } catch (error) {
    logger.error('Erro no clear-session:', error);
    res.json({ success: true, message: 'Sessão limpa' });
  }
});

// POST /api/auth/validate-credentials - Validar credenciais e gerar challenge token
// ✅ VALIDAÇÃO E SANITIZAÇÃO APLICADAS
app.post('/api/auth/validate-credentials', validateLogin, handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase())
    });

    if (!user) {
      logAuthFailure(req, 'User not found');
      return res.status(401).json({ error: 'Email ou palavra-passe incorretos' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);

    if (!validPassword) {
      logAuthFailure(req, 'Invalid password');
      return res.status(401).json({ error: 'Email ou palavra-passe incorretos' });
    }
    
    logAuthSuccess(req, user.id, user.email);

    // Invalidar challenge tokens anteriores do mesmo email
    await db.update(challengeTokens)
      .set({ used: true })
      .where(and(
        eq(challengeTokens.email, email.toLowerCase()),
        eq(challengeTokens.used, false)
      ));

    // Gerar challenge token único e SALVAR NO SERVIDOR (válido por 2 minutos)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

    await db.insert(challengeTokens).values({
      id: `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: email.toLowerCase(),
      token: token,
      used: false,
      expiresAt: expiresAt,
    });

    // 🔒 PRODUÇÃO: NÃO logar email do utilizador
    if (!IS_PRODUCTION) {
      console.log('✅ Credenciais validadas, challenge token armazenado no servidor:', email);
    }

    res.json({
      success: true,
      message: 'Credenciais válidas',
      challengeToken: token
    });
  } catch (error) {
    console.error('❌ Erro ao validar credenciais:', error);
    res.status(500).json({ error: 'Erro ao validar credenciais' });
  }
});

// POST /api/auth/send-verification-code - Enviar código vinculado a challenge token
// ✅ VALIDAÇÃO APLICADA
app.post('/api/auth/send-verification-code', validateEmail, handleValidationErrors, async (req, res) => {
  try {
    const { email, challengeToken } = req.body;

    if (!challengeToken) {
      return res.status(400).json({ error: 'Challenge token é obrigatório' });
    }

    // VALIDAR que o challenge token existe no servidor e não está expirado
    // ✅ PERMITE REENVIOS: Removido verificação de "used" para permitir múltiplos reenvios
    const now = new Date();
    const storedChallenge = await db.query.challengeTokens.findFirst({
      where: and(
        eq(challengeTokens.email, email.toLowerCase()),
        eq(challengeTokens.token, challengeToken),
        gt(challengeTokens.expiresAt, now)
      )
    });

    if (!storedChallenge) {
      return res.status(401).json({ error: 'Challenge token inválido ou expirado. Por favor, faça login novamente.' });
    }

    // Verificar se o utilizador existe
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase())
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilizador não encontrado' });
    }

    // Invalidar códigos anteriores do mesmo email
    await db.update(verificationCodes)
      .set({ verified: true }) // Marca como verificado para invalidar
      .where(and(
        eq(verificationCodes.email, email.toLowerCase()),
        eq(verificationCodes.verified, false)
      ));

    // 🎯 CONTAS DEMO/REVIEW: Usar código fixo "000000" para contas de teste (Apple/Google review)
    // Inclui contas @qzero.app e conta específica de revisão da Apple
    const APPLE_REVIEW_ACCOUNTS = ['teste2125b@gmail.com'];
    const isDemoAccount = email.toLowerCase().endsWith('@qzero.app') || 
                          APPLE_REVIEW_ACCOUNTS.includes(email.toLowerCase());
    const code = isDemoAccount ? '000000' : Math.floor(100000 + Math.random() * 900000).toString();
    
    // Expirar em 10 minutos (demo accounts: 24 horas para facilitar testes)
    const expiresAt = new Date(Date.now() + (isDemoAccount ? 24 * 60 : 10) * 60 * 1000);

    // Salvar código VINCULADO ao challenge token
    await db.insert(verificationCodes).values({
      id: `code_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: email.toLowerCase(),
      code: code,
      challengeToken: challengeToken,
      expiresAt: expiresAt,
      verified: false,
    });

    // 🎯 CONTAS DEMO: Não enviar email - código fixo é "000000"
    if (isDemoAccount) {
      console.log('🎯 Demo account detected - using fixed code 000000:', email);
      return res.json({
        success: true,
        message: 'Código de verificação: 000000',
        isDemoAccount: true
      });
    }

    // Enviar código por email (apenas para contas normais)
    const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
    const xReplitToken = process.env.REPL_IDENTITY 
      ? 'repl ' + process.env.REPL_IDENTITY 
      : process.env.WEB_REPL_RENEWAL 
      ? 'depl ' + process.env.WEB_REPL_RENEWAL 
      : null;

    if (hostname && xReplitToken) {
      const connectionSettings = await fetch(
        'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
        {
          headers: {
            'Accept': 'application/json',
            'X_REPLIT_TOKEN': xReplitToken
          }
        }
      ).then(res => res.json()).then(data => data.items?.[0]);

      if (connectionSettings && connectionSettings.settings.api_key) {
        const resend = new Resend(connectionSettings.settings.api_key);
        const fromEmail = 'QZero <noreply@waitless-qzero.com>';

        // Traduzir email para o idioma preferido do utilizador
        const userLang = user.preferredLanguage || 'pt';
        const emailSubject = await translateText('Código de Verificação - QZero', userLang, 'pt');
        const emailBody = await translateText(
          `Olá ${user.fullName || 'Utilizador'},\n\nO seu código de verificação é: ${code}\n\nEste código expira em 10 minutos.\n\nSe não solicitou este código, ignore este email.\n\nQZero - Sistema de Gestão de Filas`,
          userLang,
          'pt'
        );

        await resend.emails.send({
          from: fromEmail,
          to: [email],
          subject: emailSubject,
          text: emailBody,
        });
      }
    }

    // 🔒 PRODUÇÃO: NÃO logar email do utilizador
    if (!IS_PRODUCTION) {
      console.log('✅ Código de verificação enviado para:', email);
    }

    res.json({
      success: true,
      message: 'Código de verificação enviado para o seu email'
    });
  } catch (error) {
    console.error('❌ Erro ao enviar código de verificação:', error);
    res.status(500).json({ error: 'Erro ao enviar código de verificação' });
  }
});

// POST /api/auth/verify-code - Verificar código + challenge token e fazer login
// ✅ VALIDAÇÃO APLICADA
app.post('/api/auth/verify-code', validateVerificationCode, handleValidationErrors, async (req, res) => {
  try {
    const { email, code, challengeToken } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email é obrigatório' });
    }

    // PRIMEIRO: Validar que o challenge token existe no servidor e não está usado
    const now = new Date();
    const storedChallenge = await db.query.challengeTokens.findFirst({
      where: and(
        eq(challengeTokens.email, email.toLowerCase()),
        eq(challengeTokens.token, challengeToken),
        eq(challengeTokens.used, false),
        gt(challengeTokens.expiresAt, now)
      )
    });

    if (!storedChallenge) {
      return res.status(401).json({ error: 'Sessão inválida ou expirada. Por favor, faça login novamente.' });
    }

    // SEGUNDO: Buscar código válido vinculado ao challenge token
    const verificationCode = await db.query.verificationCodes.findFirst({
      where: and(
        eq(verificationCodes.email, email.toLowerCase()),
        eq(verificationCodes.code, code),
        eq(verificationCodes.challengeToken, challengeToken),
        eq(verificationCodes.verified, false),
        gt(verificationCodes.expiresAt, now)
      ),
      orderBy: [desc(verificationCodes.createdAt)]
    });

    if (!verificationCode) {
      return res.status(401).json({ error: 'Código inválido ou expirado' });
    }

    // Marcar código como verificado
    await db.update(verificationCodes)
      .set({ verified: true })
      .where(eq(verificationCodes.id, verificationCode.id));

    // Marcar challenge token como usado (previne reutilização)
    await db.update(challengeTokens)
      .set({ used: true })
      .where(eq(challengeTokens.id, storedChallenge.id));

    // 🔄 CRÍTICO: RE-BUSCAR utilizador IMEDIATAMENTE ANTES de criar JWT
    // Isto garante que o user ainda existe (evita JWTs com userId fantasma)
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase())
    });

    if (!user) {
      console.error('❌ CRÍTICO: User foi apagado entre validação e JWT!', email);
      return res.status(404).json({ error: 'Utilizador não encontrado' });
    }

    // 🍎🤖 B2B COMPLIANCE: Bloquear login para TODAS as contas empresariais SEM subscrição ativa em apps nativas
    // Esta verificação é OBRIGATÓRIA para cumprir as diretrizes da Apple/Google
    const platform = req.headers['x-platform'] || 'web';
    const isNativeApp = ['ios', 'android', 'native'].includes(platform);
    
    if (isNativeApp && user.accountType === 'empresa') {
      // Primeiro: verificar se tem businessId
      if (!user.businessId) {
        // Conta empresarial sem perfil = nunca comprou subscrição
        console.log('🚫 B2B COMPLIANCE: Login bloqueado para conta empresarial sem perfil em app nativa:', email);
        return res.status(403).json({ 
          error: 'Acesso restrito',
          code: 'SUBSCRIPTION_REQUIRED',
          message: 'Para aceder à aplicação com conta empresarial, é necessário ter uma subscrição ativa. Por favor, visite waitless-qzero.com para criar o seu perfil empresarial.',
          redirectUrl: 'https://waitless-qzero.com'
        });
      }
      
      // Verificar se tem subscrição ativa
      const companyProfile = await db.query.companyProfiles.findFirst({
        where: eq(companyProfiles.id, user.businessId)
      });
      
      if (!companyProfile) {
        // Conta empresarial com businessId mas sem perfil = dados inconsistentes
        console.log('🚫 B2B COMPLIANCE: Login bloqueado para conta empresarial sem perfil válido em app nativa:', email);
        return res.status(403).json({ 
          error: 'Acesso restrito',
          code: 'SUBSCRIPTION_REQUIRED',
          message: 'Para aceder à aplicação com conta empresarial, é necessário ter uma subscrição ativa. Por favor, visite waitless-qzero.com para configurar a sua conta.',
          redirectUrl: 'https://waitless-qzero.com'
        });
      }
      
      const now = new Date();
      const hasActiveSubscription = 
        companyProfile.subscriptionStatus === 'active' || 
        companyProfile.subscriptionStatus === 'trialing' ||
        (companyProfile.subscriptionStatus === 'canceled' && 
         companyProfile.currentPeriodEnd && 
         new Date(companyProfile.currentPeriodEnd) > now);
      
      if (!hasActiveSubscription) {
        console.log('🚫 B2B COMPLIANCE: Login bloqueado para conta empresarial sem subscrição ativa em app nativa:', email);
        return res.status(403).json({ 
          error: 'Acesso restrito',
          code: 'SUBSCRIPTION_REQUIRED',
          message: 'Para aceder à aplicação com conta empresarial, é necessário ter uma subscrição ativa. Por favor, visite waitless-qzero.com para ativar ou renovar a sua subscrição.',
          redirectUrl: 'https://waitless-qzero.com'
        });
      }
    }

    // ✅ Gerar token JWT APENAS DEPOIS de confirmar que user existe
    // Token terá TODOS os role flags (necessário para staff members)
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        isBusinessUser: user.isBusinessUser,
        isStaffMember: user.isStaffMember,
        businessId: user.businessId,
        staffPermissions: user.staffPermissions,
        accountType: user.accountType
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Definir cookie com role flags completos
    res.cookie('auth_token', token, COOKIE_OPTIONS);
    
    console.log('🍪 Cookie auth_token criado para:', user.email);
    console.log('🍪 Cookie options:', {
      httpOnly: COOKIE_OPTIONS.httpOnly,
      secure: COOKIE_OPTIONS.secure,
      domain: COOKIE_OPTIONS.domain || 'padrão',
      path: COOKIE_OPTIONS.path,
      maxAge: '7 dias'
    });

    // 🔒 PRODUÇÃO: NÃO logar email do utilizador
    if (!IS_PRODUCTION) {
      console.log('✅ Login 2FA bem-sucedido com role flags:', email);
    } else {
      logAuthSuccess(req, user.id, email);
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        birthdate: user.birthdate,
        accountType: user.accountType,
        isBusinessUser: user.isBusinessUser,
        isStaffMember: user.isStaffMember,
        businessId: user.businessId,
        staffPermissions: user.staffPermissions,
      },
      token
    });
  } catch (error) {
    console.error('❌ Erro ao verificar código:', error);
    res.status(500).json({ error: 'Erro ao verificar código' });
  }
});

// PUT /api/auth/update-profile - Atualizar perfil do utilizador
// ✅ AUTENTICAÇÃO OBRIGATÓRIA (não precisa de validateEmail - email vem do JWT)
app.put('/api/auth/update-profile', authenticateToken, async (req, res) => {
  try {
    const { fullName, phone, birthdate, country, city, isBusinessUser, businessId, staffPermissions, isStaffMember, accountType } = req.body;
    
    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (phone !== undefined) updateData.phone = phone;
    if (birthdate !== undefined) updateData.birthdate = birthdate;
    if (country !== undefined) updateData.country = country;
    if (city !== undefined) updateData.city = city;
    if (isBusinessUser !== undefined) updateData.isBusinessUser = isBusinessUser;
    if (businessId !== undefined) updateData.businessId = businessId;
    if (staffPermissions !== undefined) updateData.staffPermissions = staffPermissions;
    if (isStaffMember !== undefined) updateData.isStaffMember = isStaffMember;
    if (accountType !== undefined) updateData.accountType = accountType;
    
    updateData.updatedAt = new Date();

    const [updatedUser] = await db.update(users)
      .set(updateData)
      .where(eq(users.id, req.user.userId))
      .returning();

    console.log('✅ Perfil atualizado:', updatedUser.email);

    // CRÍTICO: Emitir novo JWT com TODOS os dados atualizados (incluindo role flags)
    // para evitar 401 em /me após staff invite
    const token = jwt.sign(
      { 
        userId: updatedUser.id, 
        email: updatedUser.email,
        isBusinessUser: updatedUser.isBusinessUser,
        isStaffMember: updatedUser.isStaffMember,
        businessId: updatedUser.businessId,
        staffPermissions: updatedUser.staffPermissions,
        accountType: updatedUser.accountType
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Atualizar cookie com novo token contendo role flags
    res.cookie('auth_token', token, COOKIE_OPTIONS);

    console.log('🔄 Novo JWT emitido com role flags após atualização de perfil');

    res.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        phone: updatedUser.phone,
        birthdate: updatedUser.birthdate,
        country: updatedUser.country,
        city: updatedUser.city,
        accountType: updatedUser.accountType,
        isBusinessUser: updatedUser.isBusinessUser,
        isStaffMember: updatedUser.isStaffMember,
        businessId: updatedUser.businessId,
        staffPermissions: updatedUser.staffPermissions,
      },
      token
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar perfil:', error);
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

// POST /api/auth/request-password-reset - Solicitar reset de senha
app.post('/api/auth/request-password-reset', validateRequestPasswordReset, handleValidationErrors, async (req, res) => {
  try {
    const { email } = req.body;
    
    // Verificar se usuário existe
    const user = await db.query.users.findFirst({
      where: eq(users.email, email)
    });
    
    if (!user) {
      // Por segurança, não revelar se email existe ou não
      return res.json({ success: true, message: 'Se o email existir, receberá um código de recuperação' });
    }
    
    // Gerar código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Expirar em 10 minutos
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    // Salvar código na base de dados
    const resetTokenId = `reset_${Date.now()}${Math.floor(Math.random() * 10000)}`;
    await db.insert(passwordResetTokens).values({
      id: resetTokenId,
      email,
      code,
      expiresAt,
      used: false
    });
    
    // Enviar email com código via Resend
    const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
    const xReplitToken = process.env.REPL_IDENTITY 
      ? 'repl ' + process.env.REPL_IDENTITY 
      : process.env.WEB_REPL_RENEWAL 
      ? 'depl ' + process.env.WEB_REPL_RENEWAL 
      : null;

    if (hostname && xReplitToken) {
      try {
        const connectionSettings = await fetch(
          'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
          {
            headers: {
              'Accept': 'application/json',
              'X_REPLIT_TOKEN': xReplitToken
            }
          }
        ).then(res => res.json()).then(data => data.items?.[0]);

        if (connectionSettings && connectionSettings.settings.api_key) {
          const resend = new Resend(connectionSettings.settings.api_key);
          
          // Obter idioma preferido do utilizador
          const userLang = user?.preferredLanguage || 'pt';
          
          // Traduzir textos do email
          const emailSubject = await translateText('Recuperação de Senha - QZero', userLang, 'pt');
          const txtTitle = await translateText('Recuperação de Senha', userLang, 'pt');
          const txtHello = await translateText('Olá,', userLang, 'pt');
          const txtReceived = await translateText('Recebemos um pedido para recuperar a sua senha.', userLang, 'pt');
          const txtCodeIs = await translateText('O seu código de recuperação é:', userLang, 'pt');
          const txtValidFor = await translateText('Este código é válido por', userLang, 'pt');
          const txtMinutes = await translateText('10 minutos', userLang, 'pt');
          const txtIgnore = await translateText('Se não solicitou esta recuperação, ignore este email.', userLang, 'pt');
          const txtRegards = await translateText('Atenciosamente,', userLang, 'pt');
          const txtTeam = await translateText('Equipa QZero', userLang, 'pt');
          
          await resend.emails.send({
            from: 'QZero <noreply@waitless-qzero.com>',
            to: email,
            subject: emailSubject,
            html: `
              <h2>${txtTitle}</h2>
              <p>${txtHello}</p>
              <p>${txtReceived}</p>
              <p>${txtCodeIs}</p>
              <h1 style="font-size: 32px; letter-spacing: 5px; color: #2563eb;">${code}</h1>
              <p>${txtValidFor} <strong>${txtMinutes}</strong>.</p>
              <p>${txtIgnore}</p>
              <br>
              <p>${txtRegards}<br>${txtTeam}</p>
            `
          });
          
          console.log('✅ Código de recuperação enviado para:', email);
        } else {
          console.error('❌ Resend não configurado');
          return res.status(500).json({ error: 'Serviço de email não disponível' });
        }
      } catch (emailError) {
        console.error('❌ Erro ao enviar email de recuperação:', emailError);
        return res.status(500).json({ error: 'Erro ao enviar email de recuperação' });
      }
    } else {
      console.error('❌ Configurações de email não disponíveis');
      return res.status(500).json({ error: 'Serviço de email não disponível' });
    }
    
    res.json({ success: true, message: 'Código de recuperação enviado para o seu email' });
  } catch (error) {
    console.error('❌ Erro ao processar pedido de reset:', error);
    res.status(500).json({ error: 'Erro ao processar pedido' });
  }
});

// POST /api/auth/reset-password - Reset de senha com código
app.post('/api/auth/reset-password', validateResetPassword, handleValidationErrors, async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    
    // Buscar código válido e não usado
    const resetToken = await db.query.passwordResetTokens.findFirst({
      where: and(
        eq(passwordResetTokens.email, email),
        eq(passwordResetTokens.code, code),
        eq(passwordResetTokens.used, false),
        gt(passwordResetTokens.expiresAt, new Date())
      )
    });
    
    if (!resetToken) {
      logAuthFailure(req, email, 'INVALID_RESET_CODE');
      return res.status(400).json({ error: 'Código inválido ou expirado' });
    }
    
    // Buscar usuário
    const user = await db.query.users.findFirst({
      where: eq(users.email, email)
    });
    
    if (!user) {
      return res.status(404).json({ error: 'Utilizador não encontrado' });
    }
    
    // Hash da nova senha
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    // Atualizar senha do usuário
    await db.update(users)
      .set({ 
        passwordHash,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));
    
    // Marcar código como usado
    await db.update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.id, resetToken.id));
    
    logSecurityEvent(req, email, 'PASSWORD_RESET_SUCCESS');
    console.log('✅ Senha alterada com sucesso:', email);
    
    res.json({ success: true, message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao resetar senha:', error);
    res.status(500).json({ error: 'Erro ao resetar senha' });
  }
});

// POST /api/auth/change-password - Alterar senha (utilizador autenticado)
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;
    
    console.log('🔐 Tentativa de alteração de senha para userId:', userId);
    
    // Validações básicas
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres' });
    }
    
    // Buscar utilizador
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });
    
    if (!user) {
      return res.status(404).json({ error: 'Utilizador não encontrado' });
    }
    
    // Verificar senha atual
    const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!validPassword) {
      logSecurityEvent(req, user.email, 'PASSWORD_CHANGE_FAILED_WRONG_CURRENT');
      return res.status(401).json({ error: 'Senha atual incorreta' });
    }
    
    // Hash da nova senha
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    // Atualizar senha
    await db.update(users)
      .set({ 
        passwordHash,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
    
    logSecurityEvent(req, user.email, 'PASSWORD_CHANGE_SUCCESS');
    console.log('✅ Senha alterada com sucesso para:', user.email);
    
    res.json({ success: true, message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao alterar senha:', error);
    res.status(500).json({ error: 'Erro ao alterar senha' });
  }
});

// ================== ACCOUNT DELETION ENDPOINTS (VIA EMAIL) ==================

// POST /api/auth/request-deletion - Solicitar eliminação de conta (via email)
// Este endpoint é PÚBLICO para utilizadores não autenticados poderem solicitar
app.post('/api/auth/request-deletion', async (req, res) => {
  try {
    const { email, reason } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email é obrigatório' });
    }
    
    console.log('📧 Pedido de eliminação de conta recebido para:', email);
    
    // Verificar se utilizador existe
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase().trim())
    });
    
    // Por segurança, responder sempre com sucesso (não revelar se email existe)
    if (!user) {
      console.log('⚠️ Email não encontrado:', email);
      return res.json({ 
        success: true, 
        message: 'Se o email estiver registado, receberá instruções para eliminar a conta.' 
      });
    }
    
    // Gerar token de eliminação
    const deletionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas
    
    // Guardar token (reutilizar tabela de password reset)
    await db.insert(passwordResetTokens).values({
      id: crypto.randomUUID(),
      email: user.email,
      token: deletionToken,
      expiresAt,
      createdAt: new Date()
    });
    
    // Enviar email com link de confirmação
    if (resend) {
      const deletionUrl = `${process.env.VITE_API_URL || 'https://q-zero-afonsomarques80.replit.app'}/delete-account.html?token=${deletionToken}&email=${encodeURIComponent(user.email)}`;
      
      await resend.emails.send({
        from: 'QZero <noreply@waitless-qzero.com>',
        to: user.email,
        subject: 'Confirmação de Eliminação de Conta - QZero',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Pedido de Eliminação de Conta</h2>
            <p>Recebemos um pedido para eliminar a sua conta QZero.</p>
            <p>Se foi você que fez este pedido, clique no botão abaixo para confirmar:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${deletionUrl}" style="background-color: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">
                Confirmar Eliminação
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">
              Este link expira em 24 horas.<br>
              Se não solicitou a eliminação da conta, ignore este email.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              Razão indicada: ${reason || 'Não especificada'}
            </p>
          </div>
        `
      });
      console.log('✅ Email de confirmação de eliminação enviado para:', user.email);
    }
    
    logSecurityEvent(req, email, 'ACCOUNT_DELETION_REQUESTED', { reason: reason || 'not_specified' });
    
    res.json({ 
      success: true, 
      message: 'Se o email estiver registado, receberá instruções para eliminar a conta.' 
    });
  } catch (error) {
    console.error('❌ Erro ao processar pedido de eliminação:', error);
    res.status(500).json({ error: 'Erro ao processar pedido' });
  }
});

// POST /api/auth/confirm-deletion - Confirmar eliminação via token (público)
app.post('/api/auth/confirm-deletion', async (req, res) => {
  try {
    const { token, email } = req.body;
    
    if (!token || !email) {
      return res.status(400).json({ error: 'Token e email são obrigatórios' });
    }
    
    console.log('🔐 Confirmação de eliminação para:', email);
    
    // Verificar token
    const resetToken = await db.query.passwordResetTokens.findFirst({
      where: and(
        eq(passwordResetTokens.token, token),
        eq(passwordResetTokens.email, email.toLowerCase().trim()),
        gt(passwordResetTokens.expiresAt, new Date())
      )
    });
    
    if (!resetToken) {
      return res.status(400).json({ error: 'Token inválido ou expirado' });
    }
    
    // Buscar utilizador
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase().trim())
    });
    
    if (!user) {
      return res.status(404).json({ error: 'Utilizador não encontrado' });
    }
    
    // Cancelar subscrição Stripe se existir
    const userProfile = await db.query.companyProfiles.findFirst({
      where: eq(companyProfiles.adminUserId, user.id)
    });
    
    if (userProfile?.subscriptionId && stripe) {
      try {
        await stripe.subscriptions.cancel(userProfile.subscriptionId);
        console.log('✅ Subscrição Stripe cancelada:', userProfile.subscriptionId);
      } catch (stripeError) {
        console.warn('⚠️ Erro ao cancelar subscrição Stripe:', stripeError.message);
      }
    }
    
    // Eliminar perfil da empresa
    if (userProfile) {
      await db.delete(companyProfiles).where(eq(companyProfiles.id, userProfile.id));
    }
    
    // Eliminar todos os dados relacionados
    await db.delete(consents).where(eq(consents.userId, user.id));
    await db.delete(verificationCodes).where(eq(verificationCodes.email, user.email));
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.email, user.email));
    await db.delete(challengeTokens).where(eq(challengeTokens.email, user.email));
    
    // Eliminar utilizador
    await db.delete(users).where(eq(users.id, user.id));
    
    logSecurityEvent(req, user.email, 'ACCOUNT_DELETED_VIA_TOKEN');
    console.log('✅ Conta eliminada via token:', user.email);
    
    res.json({ 
      success: true, 
      message: 'Conta eliminada com sucesso. Todos os dados foram removidos permanentemente.' 
    });
  } catch (error) {
    console.error('❌ Erro ao confirmar eliminação:', error);
    res.status(500).json({ error: 'Erro ao eliminar conta' });
  }
});

// ================== COMPANY PROFILES CRUD ENDPOINTS ==================

// GET /api/company-profiles/:id - Buscar perfil por ID (com autenticação)
app.get('/api/company-profiles/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    console.log('🔍 Buscando perfil:', id, 'para utilizador:', userId);
    
    const profile = await db.query.companyProfiles.findFirst({
      where: eq(companyProfiles.id, id)
    });
    
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    // ✅ SEGURANÇA: Verificar ownership
    if (profile.adminUserId !== userId) {
      logger.warn('Unauthorized profile access attempt', {
        userId,
        requestedProfileId: id,
        actualOwner: profile.adminUserId
      });
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }
    
    console.log('✅ Perfil encontrado:', profile.companyName);
    res.json(profile);
  } catch (error) {
    console.error('❌ Error fetching profile:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/company-profiles/user/:userId - Buscar perfil por adminUserId
app.get('/api/company-profiles/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('🔍 Buscando perfil do usuário:', userId);
    
    const profile = await db.query.companyProfiles.findFirst({
      where: eq(companyProfiles.adminUserId, userId)
    });
    
    if (!profile) {
      console.log('⚠️ Perfil não encontrado para usuário:', userId);
      return res.json({ profile: null });
    }
    
    console.log('✅ Perfil encontrado:', profile.companyName);
    res.json({ profile });
  } catch (error) {
    console.error('❌ Error fetching profile by user:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/company-profiles - Criar novo perfil
// ✅ VALIDAÇÃO APLICADA
app.post('/api/company-profiles', validateCompanyProfile, handleValidationErrors, async (req, res) => {
  const profileData = req.body;
  
  try {
    console.log('📝 Criando novo perfil:', profileData.companyName);
    
    // Converter strings ISO para Date objects se necessário
    const createdAt = profileData.createdAt 
      ? (typeof profileData.createdAt === 'string' ? new Date(profileData.createdAt) : profileData.createdAt)
      : new Date();
    const updatedAt = profileData.updatedAt 
      ? (typeof profileData.updatedAt === 'string' ? new Date(profileData.updatedAt) : profileData.updatedAt)
      : new Date();
    
    // Definir defaults
    const newProfile = {
      ...profileData,
      status: profileData.status || 'pending_payment',
      createdAt,
      updatedAt,
      temporaryAccess: profileData.temporaryAccess || {
        enabled: false,
        expiresAt: null,
        grantedBy: null,
        reason: null
      },
      paymentRetry: profileData.paymentRetry || {
        failureCount: 0,
        lastFailureAt: null,
        lastFailureReason: null,
        canRetry: true
      }
    };
    
    const [created] = await db.insert(companyProfiles).values(newProfile).returning();
    
    console.log('✅ Perfil criado:', created.id);
    
    // Atualizar businessId na tabela users para linkar o utilizador ao perfil da empresa
    try {
      await db.update(users)
        .set({ 
          businessId: created.id,
          updatedAt: new Date()
        })
        .where(eq(users.id, created.adminUserId));
      console.log('✅ businessId atualizado no utilizador:', created.adminUserId);
    } catch (userUpdateError) {
      console.error('⚠️ Erro ao atualizar businessId do utilizador:', userUpdateError);
      // Não falhar a criação do perfil por causa disto
    }
    
    res.status(201).json(created);
  } catch (error) {
    // Tratar duplicate key como sucesso (perfil já existe)
    // CORREÇÃO: profileData agora está acessível neste escopo
    if (error.cause?.code === '23505') {
      console.log('ℹ️ Perfil já existe (duplicate key), retornando perfil existente...');
      try {
        const existing = await db.select().from(companyProfiles).where(eq(companyProfiles.id, profileData.id)).limit(1);
        if (existing.length > 0) {
          console.log('✅ Perfil existente retornado:', existing[0].id);
          return res.status(200).json(existing[0]);
        }
      } catch (fetchError) {
        console.error('❌ Erro ao buscar perfil existente:', fetchError);
      }
    }
    
    console.error('❌ Error creating profile:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/company-profiles/:id - Atualizar perfil
// ✅ VALIDAÇÃO DE ID APLICADA (validador de campos removido para permitir updates parciais)
app.put('/api/company-profiles/:id', validateId, handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    console.log('📝 Atualizando perfil:', id);
    console.log('Dados:', updates);
    
    // Converter strings ISO para Date objects se necessário
    if (updates.createdAt && typeof updates.createdAt === 'string') {
      updates.createdAt = new Date(updates.createdAt);
    }
    if (updates.updatedAt && typeof updates.updatedAt === 'string') {
      updates.updatedAt = new Date(updates.updatedAt);
    }
    
    // Adicionar timestamp de atualização
    updates.updatedAt = new Date();
    
    const [updated] = await db
      .update(companyProfiles)
      .set(updates)
      .where(eq(companyProfiles.id, id))
      .returning();
    
    if (!updated) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    console.log('✅ Perfil atualizado:', updated.companyName);
    res.json(updated);
  } catch (error) {
    console.error('❌ Error updating profile:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/company-profiles/:id - Deletar perfil
// ✅ VALIDAÇÃO APLICADA
app.delete('/api/company-profiles/:id', validateId, handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Deletando perfil:', id);
    
    const [deleted] = await db
      .delete(companyProfiles)
      .where(eq(companyProfiles.id, id))
      .returning();
    
    if (!deleted) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    console.log('✅ Perfil deletado:', deleted.companyName);
    res.json({ success: true, deleted });
  } catch (error) {
    console.error('❌ Error deleting profile:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/company-profiles/geocode-all - Fazer geocoding retroativo de todas as empresas
app.post('/api/company-profiles/geocode-all', async (req, res) => {
  try {
    console.log('🌍 Iniciando geocoding retroativo de todas as empresas...');
    
    // Buscar todas as empresas
    const allProfiles = await db.select().from(companyProfiles);
    
    const results = {
      total: allProfiles.length,
      updated: 0,
      skipped: 0,
      failed: 0,
      details: []
    };
    
    // Função para fazer geocoding usando Nominatim
    async function geocodeAddress(address) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
          {
            headers: {
              'User-Agent': 'QZero-App/1.0 (contact@qzero.app)'
            }
          }
        );
        const data = await response.json();
        
        if (data && data.length > 0) {
          return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon)
          };
        }
        return null;
      } catch (error) {
        console.error('Erro no geocoding:', error);
        return null;
      }
    }
    
    // Processar cada empresa
    for (const profile of allProfiles) {
      // Pular se já tem coordenadas
      if (profile.companyCoordinates) {
        results.skipped++;
        results.details.push({
          id: profile.id,
          name: profile.companyName,
          status: 'skipped',
          reason: 'Já tem coordenadas GPS'
        });
        continue;
      }
      
      // Verificar se tem pelo menos cidade OU código postal + país
      if (!profile.companyCountry || (!profile.companyCity && !profile.companyPostalCode)) {
        results.skipped++;
        results.details.push({
          id: profile.id,
          name: profile.companyName,
          status: 'skipped',
          reason: 'Morada incompleta - necessário pelo menos país + (cidade ou código postal)'
        });
        continue;
      }
      
      // Montar morada - priorizar morada completa, mas aceitar aproximações
      const addressParts = [
        profile.companyStreetName,
        profile.companyDoorNumber,
        profile.companyPostalCode,
        profile.companyCity,
        profile.companyDistrict,
        profile.companyCountry
      ].filter(Boolean);
      
      const fullAddress = addressParts.join(', ');
      
      console.log(`🌍 Fazendo geocoding: ${profile.companyName} - ${fullAddress}`);
      
      try {
        const coordinates = await geocodeAddress(fullAddress);
        
        // Aguardar 1 segundo entre requests (respeitar rate limit da API Nominatim)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (coordinates) {
          // Atualizar perfil com coordenadas
          await db
            .update(companyProfiles)
            .set({ 
              companyCoordinates: coordinates,
              updatedAt: new Date()
            })
            .where(eq(companyProfiles.id, profile.id));
          
          results.updated++;
          results.details.push({
            id: profile.id,
            name: profile.companyName,
            status: 'success',
            coordinates: coordinates
          });
          
          console.log(`✅ Coordenadas obtidas para ${profile.companyName}:`, coordinates);
        } else {
          results.failed++;
          results.details.push({
            id: profile.id,
            name: profile.companyName,
            status: 'failed',
            reason: 'Não foi possível obter coordenadas'
          });
          
          console.log(`⚠️ Não foi possível obter coordenadas para ${profile.companyName}`);
        }
      } catch (error) {
        results.failed++;
        results.details.push({
          id: profile.id,
          name: profile.companyName,
          status: 'error',
          reason: error.message
        });
        
        console.error(`❌ Erro ao processar ${profile.companyName}:`, error);
      }
    }
    
    console.log('🎉 Geocoding retroativo concluído:', results);
    res.json(results);
  } catch (error) {
    console.error('❌ Error in geocode-all:', error);
    res.status(500).json({ error: error.message });
  }
});

// ================== COMPANY PROFILES - PUBLIC API ==================

// Listar empresas públicas (sem autenticação necessária)
// 🔒 SEGURANÇA: Apenas campos públicos são retornados (SEM dados de Stripe/subscription)
app.get('/api/public/businesses', async (req, res) => {
  try {
    if (!IS_PRODUCTION) {
      console.log('🔍 Buscando empresas públicas ativas...');
    }
    
    // ✅ BUSCAR TODAS as empresas (active + cancelled)
    const allProfiles = await db.select({
      // ✅ APENAS campos públicos (NÃO expor Stripe/subscription data!)
      id: companyProfiles.id,
      companyName: companyProfiles.companyName,
      companyDescription: companyProfiles.companyDescription,
      companyAddress: companyProfiles.companyAddress,
      companyStreetName: companyProfiles.companyStreetName,
      companyDoorNumber: companyProfiles.companyDoorNumber,
      companyDistrict: companyProfiles.companyDistrict,
      companyCity: companyProfiles.companyCity,
      companyPostalCode: companyProfiles.companyPostalCode,
      companyCountry: companyProfiles.companyCountry,
      companyPhone: companyProfiles.companyPhone,
      companyEmail: companyProfiles.companyEmail,
      companyCategory: companyProfiles.companyCategory,
      customCategory: companyProfiles.customCategory,
      logoUrl: companyProfiles.logoUrl,
      mediaGallery: companyProfiles.mediaGallery,
      companyCoordinates: companyProfiles.companyCoordinates,
      status: companyProfiles.status,
      // ⏰ PRECISAMOS destes campos internamente para verificar acesso (mas serão removidos antes de enviar ao cliente)
      currentPeriodEnd: companyProfiles.currentPeriodEnd,
      trialEnd: companyProfiles.trialEnd,
      subscriptionStatus: companyProfiles.subscriptionStatus,
    })
      .from(companyProfiles);
    
    // ⏰ FILTRAR empresas com acesso VÁLIDO
    const now = new Date();
    const validProfiles = allProfiles.filter(profile => {
      // ✅ Empresas ativas = sempre visíveis
      if (profile.status === 'active') return true;
      
      // ✅ Trial ativo = sempre visível
      if (profile.subscriptionStatus === 'trialing') return true;
      
      // ⏰ Empresas canceladas MAS com tempo restante = ainda visíveis
      if (profile.status === 'cancelled') {
        // Verificar currentPeriodEnd (subscrições pagas)
        if (profile.currentPeriodEnd) {
          const periodEnd = new Date(profile.currentPeriodEnd);
          if (now < periodEnd) {
            if (!IS_PRODUCTION) {
              console.log(`⏰ Empresa "${profile.companyName}" cancelada mas visível até ${periodEnd.toISOString()}`);
            }
            return true; // ✅ Mantém visível até fim do período pago
          }
        }
        
        // Verificar trialEnd (subscrições em trial)
        if (profile.trialEnd) {
          const trialEndDate = new Date(profile.trialEnd);
          if (now < trialEndDate) {
            if (!IS_PRODUCTION) {
              console.log(`⏰ Empresa "${profile.companyName}" em trial até ${trialEndDate.toISOString()}`);
            }
            return true; // ✅ Mantém visível até fim do trial
          }
        }
      }
      
      // ❌ Empresas sem acesso válido = ocultar
      return false;
    });
    
    // 🔒 REMOVER campos internos e NORMALIZAR nomes para o frontend
    const publicProfiles = validProfiles.map((profile) => {
      const now = new Date();
      const hasValidAccess = profile.status === 'active' || 
        profile.subscriptionStatus === 'trialing' ||
        (profile.status === 'cancelled' && profile.currentPeriodEnd && new Date(profile.currentPeriodEnd) > now);
      
      return {
        id: profile.id,
        // ✅ CAMPOS NORMALIZADOS para o frontend (o frontend usa estes nomes)
        name: profile.companyName,
        description: profile.companyDescription,
        address: profile.companyAddress,
        country: profile.companyCountry,
        city: profile.companyCity,
        district: profile.companyDistrict,
        postal_code: profile.companyPostalCode,
        street_name: profile.companyStreetName,
        door_number: profile.companyDoorNumber,
        phone: profile.companyPhone,
        email: profile.companyEmail,
        category: profile.companyCategory,
        custom_category: profile.customCategory,
        logo_url: profile.logoUrl,
        media_gallery: profile.mediaGallery,
        coordinates: profile.companyCoordinates,
        latitude: profile.companyCoordinates?.lat || null,
        longitude: profile.companyCoordinates?.lng || null,
        status: profile.status,
        is_active: hasValidAccess,
        // ✅ Manter campos originais para compatibilidade
        companyName: profile.companyName,
        companyDescription: profile.companyDescription,
        companyAddress: profile.companyAddress,
        companyCountry: profile.companyCountry,
        companyCity: profile.companyCity,
        companyCategory: profile.companyCategory,
        companyCoordinates: profile.companyCoordinates,
        logoUrl: profile.logoUrl,
        mediaGallery: profile.mediaGallery,
      };
    });
    
    if (!IS_PRODUCTION) {
      console.log(`✅ Encontradas ${publicProfiles.length} empresas com acesso válido (de ${allProfiles.length} totais)`);
    }
    
    res.json(publicProfiles);
  } catch (error) {
    logger.error('Erro ao buscar empresas públicas:', error);
    res.status(500).json({ error: 'Erro ao buscar empresas' });
  }
});

// GET /api/public/businesses/:id - Buscar empresa específica por ID
app.get('/api/public/businesses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!IS_PRODUCTION) {
      console.log('🔍 Buscando empresa por ID:', id);
    }
    
    const profiles = await db.select({
      id: companyProfiles.id,
      companyName: companyProfiles.companyName,
      companyDescription: companyProfiles.companyDescription,
      companyAddress: companyProfiles.companyAddress,
      companyStreetName: companyProfiles.companyStreetName,
      companyDoorNumber: companyProfiles.companyDoorNumber,
      companyDistrict: companyProfiles.companyDistrict,
      companyCity: companyProfiles.companyCity,
      companyPostalCode: companyProfiles.companyPostalCode,
      companyCountry: companyProfiles.companyCountry,
      companyPhone: companyProfiles.companyPhone,
      companyEmail: companyProfiles.companyEmail,
      companyCategory: companyProfiles.companyCategory,
      customCategory: companyProfiles.customCategory,
      logoUrl: companyProfiles.logoUrl,
      mediaGallery: companyProfiles.mediaGallery,
      companyCoordinates: companyProfiles.companyCoordinates,
      status: companyProfiles.status,
      currentPeriodEnd: companyProfiles.currentPeriodEnd,
      trialEnd: companyProfiles.trialEnd,
      subscriptionStatus: companyProfiles.subscriptionStatus,
    })
      .from(companyProfiles)
      .where(eq(companyProfiles.id, id));
    
    if (profiles.length === 0) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }
    
    const profile = profiles[0];
    const now = new Date();
    
    // Verificar se tem acesso válido
    const hasValidAccess = profile.status === 'active' || 
      profile.subscriptionStatus === 'trialing' ||
      (profile.status === 'cancelled' && profile.currentPeriodEnd && new Date(profile.currentPeriodEnd) > now);
    
    if (!hasValidAccess) {
      return res.status(404).json({ error: 'Empresa não disponível' });
    }
    
    // Normalizar para formato do frontend
    const business = {
      id: profile.id,
      name: profile.companyName,
      description: profile.companyDescription,
      address: profile.companyAddress || `${profile.companyStreetName || ''} ${profile.companyDoorNumber || ''}`.trim(),
      country: profile.companyCountry,
      city: profile.companyCity,
      district: profile.companyDistrict,
      postal_code: profile.companyPostalCode,
      street_name: profile.companyStreetName,
      door_number: profile.companyDoorNumber,
      phone: profile.companyPhone,
      email: profile.companyEmail,
      category: profile.companyCategory,
      custom_category: profile.customCategory,
      logo_url: profile.logoUrl,
      media_gallery: profile.mediaGallery || [],
      coordinates: profile.companyCoordinates,
      latitude: profile.companyCoordinates?.lat || null,
      longitude: profile.companyCoordinates?.lng || null,
      is_active: true,
    };
    
    if (!IS_PRODUCTION) {
      console.log('✅ Empresa encontrada:', business.name);
    }
    
    res.json(business);
  } catch (error) {
    logger.error('Erro ao buscar empresa por ID:', error);
    res.status(500).json({ error: 'Erro ao buscar empresa' });
  }
});

// GET /api/company-profiles/my-businesses - Endpoint autenticado para buscar empresas do owner (incluindo inativas)
app.get('/api/company-profiles/my-businesses', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('🔍 Buscando empresas do owner:', userId);
    
    const profiles = await db.select()
      .from(companyProfiles)
      .where(eq(companyProfiles.adminUserId, userId));
    
    console.log(`✅ Encontradas ${profiles.length} empresas do owner`);
    
    res.json(profiles);
  } catch (error) {
    console.error('❌ Erro ao buscar empresas do owner:', error);
    res.status(500).json({ error: error.message });
  }
});

// ================== COMPANY PROFILE COORDINATES UPDATE ==================

app.patch('/api/company-profiles/:id/coordinates', async (req, res) => {
  try {
    const { id } = req.params;
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    console.log(`🗺️ Atualizando coordenadas da empresa ${id}:`, { lat, lng });

    const coordinates = { lat, lng };
    
    await db.update(companyProfiles)
      .set({ 
        companyCoordinates: coordinates,
        updatedAt: sql`NOW()`
      })
      .where(eq(companyProfiles.id, id));

    console.log('✅ Coordenadas atualizadas com sucesso!');
    
    res.json({ 
      success: true, 
      coordinates 
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar coordenadas:', error);
    res.status(500).json({ error: error.message });
  }
});

// ================== STRIPE ENDPOINTS ==================

app.post('/api/create-subscription-checkout', async (req, res) => {
  try {
    const { companyProfileId, email, successUrl, cancelUrl } = req.body;

    if (!companyProfileId || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 🔍 CRÍTICO: Buscar company profile para verificar se já tem stripeCustomerId
    const companyProfile = await db.query.companyProfiles.findFirst({
      where: eq(companyProfiles.id, companyProfileId)
    });

    if (!companyProfile) {
      return res.status(404).json({ error: 'Company profile not found' });
    }

    // ✅ CORREÇÃO: Se já tem stripeCustomerId, SEMPRE usar esse customer (garante histórico)
    // Trial de 7 dias é APENAS para novos clientes
    let existingCustomer = null;
    let hasHadPaidSubscription = false;
    
    try {
      // 🎯 PRIORIDADE 1: Se o perfil já tem stripeCustomerId, usar esse
      if (companyProfile.stripeCustomerId) {
        console.log(`🔄 Reativação: Usando customer existente do perfil: ${companyProfile.stripeCustomerId}`);
        existingCustomer = await stripe.customers.retrieve(companyProfile.stripeCustomerId);
        
        // Se conseguiu recuperar customer, verificar histórico
        if (existingCustomer && !existingCustomer.deleted) {
          const subscriptions = await stripe.subscriptions.list({
            customer: existingCustomer.id,
            limit: 100
          });
          
          // 🔒 ANTI-FRAUDE: Trial é oferecido APENAS a quem NUNCA teve subscrição
          // Mesmo que tenha cancelado durante o trial, NÃO pode ter trial novamente
          // Isto previne abuse de trials infinitos
          
          if (subscriptions.data.length > 0) {
            hasHadPaidSubscription = true;
            console.log(`🔒 ANTI-FRAUDE: Customer já teve ${subscriptions.data.length} subscrição(ões) - SEM TRIAL`);
            
            // Log de todas as subscrições encontradas (para debug)
            subscriptions.data.forEach(sub => {
              console.log(`  📋 Subscrição ${sub.id}: status=${sub.status}, created=${new Date(sub.created * 1000).toISOString()}`);
            });
          } else {
            console.log(`✅ Customer SEM subscrições anteriores - COM TRIAL de 7 dias`);
          }
        }
      } else {
        // 🎯 PRIORIDADE 2: Procurar customer por email (primeira vez)
        const customers = await stripe.customers.list({
          email: email,
          limit: 1
        });
        
        if (customers.data.length > 0) {
          existingCustomer = customers.data[0];
          console.log(`🔍 Cliente encontrado por email: ${existingCustomer.id}`);
          
          // Verificar histórico de subscrições deste cliente
          const subscriptions = await stripe.subscriptions.list({
            customer: existingCustomer.id,
            limit: 100
          });
          
          // 🔒 ANTI-FRAUDE: Mesma lógica - QUALQUER subscrição = SEM TRIAL
          if (subscriptions.data.length > 0) {
            hasHadPaidSubscription = true;
            console.log(`🔒 ANTI-FRAUDE: Customer já teve ${subscriptions.data.length} subscrição(ões) - SEM TRIAL`);
            
            subscriptions.data.forEach(sub => {
              console.log(`  📋 Subscrição ${sub.id}: status=${sub.status}, created=${new Date(sub.created * 1000).toISOString()}`);
            });
          } else {
            console.log(`✅ Customer SEM subscrições anteriores - COM TRIAL de 7 dias`);
          }
        } else {
          console.log(`✅ Cliente completamente novo - COM TRIAL de 7 dias`);
        }
      }
      
      if (hasHadPaidSubscription) {
        console.log(`⚠️ Cliente já teve subscrição paga antes - SEM TRIAL`);
      } else if (existingCustomer) {
        console.log(`✅ Cliente existente mas sem subscrição paga - COM TRIAL de 7 dias`);
      }
    } catch (customerError) {
      console.warn('⚠️ Erro ao verificar histórico do cliente:', customerError.message);
      // Em caso de erro, continuar SEM trial por segurança
      hasHadPaidSubscription = true;
    }

    // 🎁 TRIAL + DESCONTO: Apenas para clientes que NUNCA pagaram antes
    // Cupão "Desconto Primeiro Mês" - €30 de desconto no primeiro pagamento (€49.99 → €19.99)
    const FIRST_MONTH_DISCOUNT_COUPON = 'LStVoJAq';
    
    const subscriptionData = hasHadPaidSubscription ? {
      description: 'Plano Empresarial QZero - €49.99/mês',
    } : {
      trial_period_days: 7,
      description: '7 dias grátis para testar. Após o trial, primeiro mês por €19.99, depois €49.99/mês.',
    };
    
    // 🏷️ Aplicar cupão de desconto apenas para novos clientes
    const discountConfig = hasHadPaidSubscription ? {} : {
      discounts: [{
        coupon: FIRST_MONTH_DISCOUNT_COUPON,
      }],
    };
    
    console.log(`💳 Criando checkout ${hasHadPaidSubscription ? 'SEM trial/desconto' : 'COM trial de 7 dias + desconto €30 no primeiro pagamento'}`);

    // ✅ IMPORTANTE: Stripe só aceita UM destes parâmetros (customer OU customer_email)
    const customerConfig = existingCustomer 
      ? { customer: existingCustomer.id } // Se cliente existe, usar ID
      : { customer_email: email };        // Se não existe, usar email
    
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'QZero - Plano Empresarial',
              description: 'Gestão completa de filas e agendamentos para empresas',
            },
            unit_amount: 4999,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      ...customerConfig, // ✅ Apenas UM parâmetro (customer OU customer_email)
      ...discountConfig, // 🏷️ Cupão de desconto para novos clientes
      client_reference_id: companyProfileId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: subscriptionData,
      metadata: {
        companyProfileId,
      },
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/check-trial-eligibility - Verificar se utilizador é elegível para trial de 7 dias
app.get('/api/check-trial-eligibility', async (req, res) => {
  try {
    const { email, profileId } = req.query;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    let isEligibleForTrial = true; // Por defeito, assumir que é elegível
    
    try {
      // 🔍 PRIMEIRO: Verificar se o perfil já teve subscrição (tem stripeCustomerId ou status cancelled)
      if (profileId) {
        const profile = await db.query.companyProfiles.findFirst({
          where: eq(companyProfiles.id, profileId)
        });
        
        if (profile) {
          // Se perfil já teve uma subscrição (tem customer ID ou status cancelled) = NÃO elegível
          if (profile.stripeCustomerId || profile.status === 'cancelled' || profile.subscriptionStatus === 'cancelled') {
            console.log(`🔒 ANTI-FRAUDE: Perfil ${profileId} já teve subscrição anterior (customerId=${profile.stripeCustomerId}, status=${profile.status})`);
            return res.json({ isEligibleForTrial: false });
          }
        }
      }
      
      // 🔍 Buscar TODOS os customers com este email
      const allCustomers = await stripe.customers.search({
        query: `email:'${email}'`,
        limit: 10
      });
      
      console.log(`🔍 Encontrados ${allCustomers.data.length} customers para ${email}`);
      
      // 🔒 ANTI-FRAUDE: Se encontrar QUALQUER customer com QUALQUER subscrição = SEM TRIAL
      let hasHadAnySubscription = false;
      
      for (const customer of allCustomers.data) {
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          limit: 100
        });
        
        if (subscriptions.data.length > 0) {
          hasHadAnySubscription = true;
          console.log(`🔒 ANTI-FRAUDE: Customer ${customer.id} já teve ${subscriptions.data.length} subscrição(ões)`);
          
          subscriptions.data.forEach(sub => {
            console.log(`  📋 Subscrição ${sub.id}: status=${sub.status}`);
          });
          
          break; // Não precisa verificar mais
        }
      }
      
      isEligibleForTrial = !hasHadAnySubscription;
      
      console.log(`🎁 Trial eligibility for ${email}: ${isEligibleForTrial ? 'ELIGIBLE (first time)' : 'NOT ELIGIBLE (already used trial)'}`);
    } catch (stripeError) {
      console.warn('⚠️ Error checking trial eligibility:', stripeError.message);
      // Em caso de erro, assumir que NÃO é elegível por segurança
      isEligibleForTrial = false;
    }
    
    res.json({ isEligibleForTrial });
  } catch (error) {
    console.error('❌ Error checking trial eligibility:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/verify-payment', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing session_id' });
    }

    console.log('🔍 Verifying payment for session:', sessionId);

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    console.log('📊 Session status:', session.payment_status);
    console.log('📊 Session details:', {
      customer: session.customer,
      subscription: session.subscription,
      client_reference_id: session.client_reference_id
    });

    // ✅ Aceitar tanto 'paid' quanto 'unpaid' (trial period)
    // Durante os 7 dias grátis, payment_status será 'unpaid'
    if (session.payment_status === 'paid' || session.payment_status === 'unpaid') {
      const companyProfileId = session.client_reference_id || session.metadata?.companyProfileId;
      
      if (companyProfileId) {
        // Buscar informações da subscription para verificar se está em trial
        let subscriptionStatus = 'active';
        let isTrialing = false;
        let trialStart = null;
        let trialEnd = null;
        let currentPeriodEnd = null;
        
        if (session.subscription) {
          try {
            const subscription = await stripe.subscriptions.retrieve(session.subscription);
            subscriptionStatus = subscription.status; // 'trialing', 'active', 'canceled', etc.
            isTrialing = subscription.status === 'trialing';
            
            // ✅ Guardar datas de trial (como objetos Date, NÃO strings)
            if (isTrialing && subscription.trial_start && subscription.trial_end) {
              trialStart = new Date(subscription.trial_start * 1000);
              trialEnd = new Date(subscription.trial_end * 1000);
            }
            
            // ✅ Guardar data de fim do período atual (para subscrições canceladas)
            if (subscription.current_period_end) {
              currentPeriodEnd = new Date(subscription.current_period_end * 1000);
            }
            
            console.log(`📊 Subscription status: ${subscriptionStatus} (trial: ${isTrialing})`);
            if (isTrialing) {
              console.log(`⏰ Trial period: ${trialStart} → ${trialEnd}`);
            }
            if (currentPeriodEnd) {
              console.log(`📅 Current period ends: ${currentPeriodEnd}`);
            }
          } catch (subError) {
            console.warn('⚠️ Could not retrieve subscription details:', subError.message);
          }
        }
        
        // ✅ CORRIGIDO: Status deve ser PENDING_PAYMENT durante trial, só ACTIVE após pagamento
        const profileStatus = isTrialing ? SUBSCRIPTION_STATUS.PENDING_PAYMENT : SUBSCRIPTION_STATUS.ACTIVE;
        
        // ⚠️ CRÍTICO: Usar Drizzle diretamente no backend, não o client fetch()
        await db.update(companyProfiles)
          .set({
            status: profileStatus,
            stripeCustomerId: session.customer,
            subscriptionId: session.subscription,
            subscriptionStatus: subscriptionStatus,
            trialStart: trialStart,
            trialEnd: trialEnd,
            currentPeriodEnd: currentPeriodEnd,
          })
          .where(eq(companyProfiles.id, companyProfileId));
        
        const statusMessage = isTrialing 
          ? `✅ Company profile ${companyProfileId} activated with 7-day trial`
          : `✅ Company profile ${companyProfileId} activated after payment`;
        console.log(statusMessage);
        
        return res.json({ 
          success: true, 
          status: subscriptionStatus,
          companyProfileId,
          isTrialing
        });
      }
    }

    return res.json({ 
      success: false, 
      status: session.payment_status,
      message: 'Payment not completed yet'
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// ⚠️ WEBHOOK MOVIDO PARA O INÍCIO DO ARQUIVO (antes do express.json())
// Ver linha ~110 para o endpoint /api/stripe-webhook

app.post('/api/send-ticket-email', async (req, res) => {
  try {
    const { to, subject, body } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, body' });
    }

    const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
    const xReplitToken = process.env.REPL_IDENTITY 
      ? 'repl ' + process.env.REPL_IDENTITY 
      : process.env.WEB_REPL_RENEWAL 
      ? 'depl ' + process.env.WEB_REPL_RENEWAL 
      : null;

    if (!hostname || !xReplitToken) {
      return res.status(500).json({ error: 'Replit connector not configured' });
    }

    const connectionSettings = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    ).then(res => res.json()).then(data => data.items?.[0]);

    if (!connectionSettings || !connectionSettings.settings.api_key) {
      return res.status(500).json({ error: 'Resend not connected' });
    }

    const resend = new Resend(connectionSettings.settings.api_key);
    const fromEmail = 'QZero <noreply@waitless-qzero.com>';

    const result = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: subject,
      text: body,
    });

    console.log('✅ Email enviado via Resend:', result);
    res.json({ success: true, id: result.id });

  } catch (error) {
    console.error('❌ Erro ao enviar email via Resend:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// 📱 PUSH NOTIFICATIONS - iOS/Android
// =====================================================

app.post('/api/push-notifications/register-token', authenticateToken, async (req, res) => {
  try {
    const { token, platform, deviceInfo } = req.body;
    const userId = req.user.userId;

    if (!token || !platform) {
      return res.status(400).json({ error: 'Token and platform are required' });
    }

    const tokenId = await pushNotificationService.registerDeviceToken(userId, token, platform, deviceInfo);
    
    res.json({ success: true, tokenId });
  } catch (error) {
    console.error('❌ Error registering push token:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/push-notifications/unregister-token', authenticateToken, async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.userId;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    await pushNotificationService.unregisterDeviceToken(userId, token);
    
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error unregistering push token:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/push-notifications/send', authenticateToken, async (req, res) => {
  try {
    const { userId, title, body, data, type } = req.body;

    if (!userId || !title || !body) {
      return res.status(400).json({ error: 'userId, title, and body are required' });
    }

    const result = await pushNotificationService.sendPushNotification(userId, title, body, data, type);
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error sending push notification:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/push-notifications/my-tokens', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const tokens = await pushNotificationService.getUserTokens(userId);
    
    res.json({ tokens });
  } catch (error) {
    console.error('❌ Error getting push tokens:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/push-notifications/test', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Obter idioma preferido do utilizador
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });
    const userLang = user?.preferredLanguage || 'pt';
    
    let title = 'Teste de Notificação';
    let body = 'Se está a ver esta mensagem, as notificações push estão a funcionar corretamente!';
    
    if (userLang !== 'pt') {
      title = await translateText(title, userLang, 'pt');
      body = await translateText(body, userLang, 'pt');
    }
    
    const result = await pushNotificationService.sendPushNotification(
      userId,
      title,
      body,
      { test: true },
      'test'
    );
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error sending test notification:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ NOTIFICAÇÃO "A SUA VEZ ESTÁ A CHEGAR" - quando faltam 2 senhas
app.post('/api/push-notifications/queue-alert', authenticateToken, async (req, res) => {
  try {
    const { userEmail, queueName, ticketNumber, position, businessName } = req.body;

    if (!userEmail || !queueName || !ticketNumber) {
      return res.status(400).json({ error: 'userEmail, queueName, and ticketNumber are required' });
    }

    // Encontrar userId pelo email
    const user = await db.query.users.findFirst({
      where: eq(users.email, userEmail)
    });

    if (!user) {
      console.log(`⚠️ User not found for queue alert: ${userEmail}`);
      return res.json({ success: false, reason: 'user_not_found' });
    }

    const result = await pushNotificationService.sendQueueNotification(
      user.id,
      queueName,
      ticketNumber,
      position || 2,
      businessName || ''
    );
    
    console.log(`📬 Queue alert sent to ${userEmail}: faltam ${position} senhas`);
    res.json(result);
  } catch (error) {
    console.error('❌ Error sending queue alert:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ NOTIFICAÇÃO "A SUA SENHA FOI CHAMADA" - quando é chamado
app.post('/api/push-notifications/ticket-called', authenticateToken, async (req, res) => {
  try {
    const { userEmail, queueName, ticketNumber, businessName, toleranceMinutes } = req.body;

    if (!userEmail || !queueName || !ticketNumber) {
      return res.status(400).json({ error: 'userEmail, queueName, and ticketNumber are required' });
    }

    // Encontrar userId pelo email
    const user = await db.query.users.findFirst({
      where: eq(users.email, userEmail)
    });

    if (!user) {
      console.log(`⚠️ User not found for ticket called: ${userEmail}`);
      return res.json({ success: false, reason: 'user_not_found' });
    }

    const result = await pushNotificationService.sendTicketCalledNotification(
      user.id,
      queueName,
      ticketNumber,
      businessName || '',
      toleranceMinutes || 15
    );
    
    console.log(`📬 Ticket called notification sent to ${userEmail}: Senha #${ticketNumber} (tolerância: ${toleranceMinutes || 15}min)`);
    res.json(result);
  } catch (error) {
    console.error('❌ Error sending ticket called notification:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ NOTIFICAÇÃO "MARCAÇÃO CONFIRMADA" - quando é confirmada
app.post('/api/push-notifications/appointment-confirmed', authenticateToken, async (req, res) => {
  try {
    const { userEmail, serviceName, businessName, date, time } = req.body;

    if (!userEmail || !serviceName || !businessName || !date || !time) {
      return res.status(400).json({ error: 'userEmail, serviceName, businessName, date, and time are required' });
    }

    // Encontrar userId pelo email
    const user = await db.query.users.findFirst({
      where: eq(users.email, userEmail)
    });

    if (!user) {
      console.log(`⚠️ User not found for appointment confirmed: ${userEmail}`);
      return res.json({ success: false, reason: 'user_not_found' });
    }

    const result = await pushNotificationService.sendAppointmentConfirmationNotification(
      user.id,
      serviceName,
      businessName,
      date,
      time
    );
    
    console.log(`📬 Appointment confirmed notification sent to ${userEmail}: ${serviceName} em ${date} às ${time}`);
    res.json(result);
  } catch (error) {
    console.error('❌ Error sending appointment confirmed notification:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ NOTIFICAÇÃO "LEMBRETE DE MARCAÇÃO" - 24h antes
app.post('/api/push-notifications/appointment-reminder', authenticateToken, async (req, res) => {
  try {
    const { userEmail, serviceName, businessName, date, time } = req.body;

    if (!userEmail || !serviceName || !businessName || !date || !time) {
      return res.status(400).json({ error: 'userEmail, serviceName, businessName, date, and time are required' });
    }

    // Encontrar userId pelo email
    const user = await db.query.users.findFirst({
      where: eq(users.email, userEmail)
    });

    if (!user) {
      console.log(`⚠️ User not found for appointment reminder: ${userEmail}`);
      return res.json({ success: false, reason: 'user_not_found' });
    }

    const result = await pushNotificationService.sendAppointmentReminderNotification(
      user.id,
      serviceName,
      businessName,
      date,
      time
    );
    
    console.log(`📬 Appointment reminder notification sent to ${userEmail}: ${serviceName} em ${date} às ${time}`);
    res.json(result);
  } catch (error) {
    console.error('❌ Error sending appointment reminder notification:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ CANCELAR SUBSCRIÇÃO STRIPE (CRÍTICO - INTEGRAÇÃO REAL)
// Endpoint para cancelamento REAL da subscrição no Stripe
app.post('/api/stripe/cancel-subscription', 
  authenticateToken, 
  validateCancelSubscription, 
  handleValidationErrors, 
  async (req, res) => {
  try {
    const { companyProfileId } = req.body;
    const userId = req.user.userId;
    
    console.log('🔴 CANCEL REQUEST RECEIVED:', { userId, companyProfileId });
    logger.info('Cancellation request received', {
      userId,
      companyProfileId,
      ip: req.ip
    });
    
    // 1. Buscar perfil da empresa com subscriptionId
    const profile = await db.query.companyProfiles.findFirst({
      where: eq(companyProfiles.id, companyProfileId)
    });
    
    if (!profile) {
      logger.warn('Profile not found for cancellation', { companyProfileId });
      return res.status(404).json({ error: 'Perfil da empresa não encontrado' });
    }
    
    // 2. Validar ownership (utilizador é dono do perfil)
    if (profile.adminUserId !== userId) {
      logSecurityEvent('UNAUTHORIZED_CANCELLATION_ATTEMPT', {
        userId,
        attemptedProfileId: companyProfileId,
        adminUserId: profile.adminUserId,
        actualUserId: userId
      });
      return res.status(403).json({ error: 'Não tem permissão para cancelar esta subscrição' });
    }
    
    if (!profile.subscriptionId) {
      logger.warn('No Stripe subscription found', { companyProfileId });
      return res.status(404).json({ error: 'Subscrição não encontrada no Stripe' });
    }
    
    // 3. CANCELAR NO STRIPE (mantém acesso até fim do período pago)
    // ⚠️ cancel_at_period_end: true → Utilizador mantém acesso até data de renovação
    const cancelledSubscription = await stripe.subscriptions.update(
      profile.subscriptionId,
      { 
        cancel_at_period_end: true,
        metadata: {
          cancelled_by_user: 'true',
          cancelled_at: new Date().toISOString(),
          user_id: userId
        }
      }
    );
    
    logger.info('Stripe subscription cancelled successfully', {
      subscriptionId: profile.subscriptionId,
      cancel_at: new Date(cancelledSubscription.cancel_at * 1000).toISOString(),
      current_period_end: new Date(cancelledSubscription.current_period_end * 1000).toISOString()
    });
    
    // 4. Atualizar DB local
    const accessEndDate = new Date(cancelledSubscription.current_period_end * 1000);
    
    console.log('🔴 UPDATING DB:', { companyProfileId, accessEndDate });
    
    const updateResult = await db.update(companyProfiles)
      .set({ 
        status: 'cancelled',
        subscriptionStatus: 'cancelled',
        currentPeriodEnd: accessEndDate,
        updatedAt: new Date()
      })
      .where(eq(companyProfiles.id, companyProfileId))
      .returning();
    
    console.log('🔴 DB UPDATE RESULT:', updateResult);
    
    // 5. Log de segurança
    logSecurityEvent('SUBSCRIPTION_CANCELLED', {
      userId,
      email: req.user.email,
      companyProfileId,
      subscriptionId: profile.subscriptionId,
      accessUntil: accessEndDate.toISOString()
    });
    
    // 6. Retornar detalhes da cancelação
    res.json({ 
      success: true,
      cancelled: true,
      access_until: accessEndDate.toISOString(),
      current_period_end: cancelledSubscription.current_period_end,
      cancel_at_period_end: cancelledSubscription.cancel_at_period_end,
      message: `Subscrição cancelada com sucesso. Terá acesso até ${accessEndDate.toLocaleDateString('pt-PT', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      })}`
    });
    
  } catch (error) {
    logger.error('Stripe cancellation error:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      companyProfileId: req.body?.companyProfileId
    });
    
    res.status(500).json({ 
      error: 'Erro ao cancelar subscrição. Por favor, tente novamente ou contacte o suporte.' 
    });
  }
});

// ✅ REATIVAR SUBSCRIÇÃO CANCELADA (CRIAR NOVA SUBSCRIÇÃO)
// Endpoint para reativar subscrições que foram canceladas
app.post('/api/stripe/reactivate-subscription', 
  authenticateToken, 
  async (req, res) => {
  try {
    const { companyProfileId } = req.body;
    const userId = req.user.userId;
    const email = req.user.email;
    
    logger.info('Reactivation request received', {
      userId,
      companyProfileId,
      ip: req.ip
    });
    
    // 1. Buscar perfil da empresa
    const profile = await db.query.companyProfiles.findFirst({
      where: eq(companyProfiles.id, companyProfileId)
    });
    
    if (!profile) {
      logger.warn('Profile not found for reactivation', { companyProfileId });
      return res.status(404).json({ error: 'Perfil da empresa não encontrado' });
    }
    
    // 2. Validar ownership
    if (profile.adminUserId !== userId) {
      logSecurityEvent('UNAUTHORIZED_REACTIVATION_ATTEMPT', {
        userId,
        attemptedProfileId: companyProfileId,
        adminUserId: profile.adminUserId
      });
      return res.status(403).json({ error: 'Não tem permissão para reativar esta subscrição' });
    }
    
    // 3. Verificar se subscrição já está ativa
    if (profile.status === 'active' && profile.subscriptionStatus === 'active') {
      return res.status(400).json({ error: 'Subscrição já está ativa' });
    }
    
    // 4. Se já tem subscriptionId no Stripe, tentar reativar
    if (profile.subscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(profile.subscriptionId);
        
        // Se está marcada para cancelar no fim do período, remover cancelamento
        if (subscription.cancel_at_period_end) {
          const reactivatedSub = await stripe.subscriptions.update(
            profile.subscriptionId,
            { cancel_at_period_end: false }
          );
          
          logger.info('Stripe subscription reactivated (cancel removed)', {
            subscriptionId: profile.subscriptionId
          });
          
          // Atualizar DB local
          await db.update(companyProfiles)
            .set({ 
              status: 'active',
              subscriptionStatus: reactivatedSub.status,
              updatedAt: new Date()
            })
            .where(eq(companyProfiles.id, companyProfileId));
          
          logSecurityEvent('SUBSCRIPTION_REACTIVATED', {
            userId,
            email,
            companyProfileId,
            subscriptionId: profile.subscriptionId
          });
          
          return res.json({ 
            success: true,
            message: 'Subscrição reativada com sucesso!' 
          });
        }
        
        // Se subscrição está cancelada (status = 'canceled'), criar nova subscrição para a mesma empresa
        if (subscription.status === 'canceled') {
          logger.info('Subscription canceled, will create new subscription for same company', {
            oldSubscriptionId: profile.subscriptionId,
            companyProfileId
          });
          // Retornar flag para criar nova subscrição
          return res.json({ 
            success: false,
            requires_new_checkout: true,
            existing_profile_id: companyProfileId,
            message: 'Subscrição expirada. Vamos criar uma nova subscrição para a sua empresa.'
          });
        }
        
      } catch (stripeError) {
        logger.warn('Could not retrieve subscription, will create new one', {
          error: stripeError.message,
          subscriptionId: profile.subscriptionId
        });
      }
    }
    
    // 5. Se não tem subscrição Stripe, criar nova subscrição para a mesma empresa
    logger.info('No active subscription found, will create new subscription', {
      companyProfileId
    });
    
    res.json({ 
      success: false,
      requires_new_checkout: true,
      existing_profile_id: companyProfileId,
      message: 'Vamos criar uma nova subscrição para a sua empresa.'
    });
    
  } catch (error) {
    logger.error('Stripe reactivation error:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      companyProfileId: req.body?.companyProfileId
    });
    
    res.status(500).json({ 
      error: 'Erro ao reativar subscrição. Por favor, tente novamente ou contacte o suporte.' 
    });
  }
});

// ============================================
// DEMO API - In-memory storage for demo mode
// ============================================
// Load demoStore from file or create default
function loadDemoStore() {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const data = fs.readFileSync(STORAGE_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading demoStore:', error);
  }
  return {
    tickets: [],
    queues: [],
    businesses: [],
    services: [],
    appointments: [],
    reviews: []
  };
}

// Save demoStore to file
function saveDemoStore() {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(demoStore, null, 2));
  } catch (error) {
    console.error('Error saving demoStore:', error);
  }
}

let demoStore = loadDemoStore();

// Seed default demo data
function seedDemoData() {
  if (demoStore.businesses.length === 0) {
    demoStore.businesses = [
      {
        id: '1',
        name: 'Clínica Saúde+',
        description: 'Clínica médica com especialidades diversas',
        address: 'Rua das Flores 123, 1200-000 Lisboa, Lisboa, Portugal',
        street_name: 'Rua das Flores',
        door_number: '123',
        postal_code: '1200-000',
        city: 'Lisboa',
        district: 'Lisboa',
        country: 'PT',
        logo_url: '',
        is_active: true,
        rating: 4.5,
        phone: '210000000',
        email: 'contato@clinicasaude.pt',
        website: 'https://clinicasaude.pt',
        latitude: 38.7223,
        longitude: -9.1393,
        business_hours: 'Seg-Sex: 09:00-18:00',
        total_queues: 1,
        owner_email: 'demo@example.com',
        category: 'saude'
      },
      {
        id: '2',
        name: 'Restaurante Sabor',
        description: 'Cozinha tradicional portuguesa',
        address: 'Avenida da Liberdade 456, 1250-000 Lisboa, Lisboa, Portugal',
        street_name: 'Avenida da Liberdade',
        door_number: '456',
        postal_code: '1250-000',
        city: 'Lisboa',
        district: 'Lisboa',
        country: 'PT',
        is_active: true,
        rating: 4.7,
        phone: '210111111',
        email: 'info@sabor.pt',
        latitude: 38.7252,
        longitude: -9.1500,
        business_hours: 'Ter-Dom: 12:00-23:00',
        total_queues: 1,
        owner_email: 'demo2@example.com',
        category: 'restauracao'
      }
    ];
  }
  
  if (demoStore.queues.length === 0) {
    demoStore.queues = [
      {
        id: 'q1',
        business_id: '1',
        name: 'Consultas Gerais',
        is_active: true,
        current_number: 5,
        last_issued_number: 12,
        average_service_time: 15,
        tolerance_time: 5,
        max_capacity: 100,
        status: 'aberta',
        notifications_enabled: true,
        notification_settings: {
          email: true,
          sms: true,
          advance_notice: 2
        },
        working_hours: {
          monday: { enabled: true, start: '09:00', end: '18:00', break_start: '12:00', break_end: '13:00' },
          tuesday: { enabled: true, start: '09:00', end: '18:00', break_start: '12:00', break_end: '13:00' },
          wednesday: { enabled: true, start: '09:00', end: '18:00', break_start: '12:00', break_end: '13:00' },
          thursday: { enabled: true, start: '09:00', end: '18:00', break_start: '12:00', break_end: '13:00' },
          friday: { enabled: true, start: '09:00', end: '18:00', break_start: '12:00', break_end: '13:00' }
        }
      },
      {
        id: 'q2',
        business_id: '2',
        name: 'Mesas',
        is_active: true,
        current_number: 3,
        last_issued_number: 8,
        average_service_time: 20,
        tolerance_time: 5,
        max_capacity: 50,
        status: 'aberta',
        notifications_enabled: true,
        notification_settings: {
          email: true,
          sms: true,
          advance_notice: 2
        },
        working_hours: {
          monday: { enabled: true, start: '12:00', end: '23:00', break_start: '15:00', break_end: '16:00' },
          tuesday: { enabled: true, start: '12:00', end: '23:00', break_start: '15:00', break_end: '16:00' },
          wednesday: { enabled: true, start: '12:00', end: '23:00', break_start: '15:00', break_end: '16:00' },
          thursday: { enabled: true, start: '12:00', end: '23:00', break_start: '15:00', break_end: '16:00' },
          friday: { enabled: true, start: '12:00', end: '00:00', break_start: '15:00', break_end: '16:00' },
          saturday: { enabled: true, start: '12:00', end: '00:00', break_start: '15:00', break_end: '16:00' }
        }
      }
    ];
  }
  
  if (demoStore.services.length === 0) {
    demoStore.services = [
      {
        id: 's1',
        business_id: '1',
        name: 'Consulta Médica',
        description: 'Consulta com clínico geral',
        price: 50,
        duration: 30,
        buffer_time: 5,
        start_time: '09:00',
        end_time: '18:00',
        is_active: true,
        allows_booking: true
      },
      {
        id: 's2',
        business_id: '2',
        name: 'Jantar',
        description: 'Menu completo de jantar',
        price: 25,
        duration: 90,
        buffer_time: 15,
        start_time: '19:00',
        end_time: '23:00',
        is_active: true,
        allows_booking: true
      }
    ];
  }
  
  console.log('✅ Demo data seeded:', {
    businesses: demoStore.businesses.length,
    queues: demoStore.queues.length,
    services: demoStore.services.length
  });
  
  // Save seeded data to file for persistence
  saveDemoStore();
}

// Seed data on server start - DESABILITADO para limpeza completa
// seedDemoData();

// ================== PROTEÇÃO GLOBAL DE ENDPOINTS EMPRESARIAIS ==================
// 🚫 BLOQUEIO AUTOMÁTICO: Todos os endpoints POST/PUT/DELETE de /api/demo/* 
// verificam subscrição ativa ANTES de processar a requisição
// Isto funciona mesmo em apps móveis antigas que não têm o código atualizado

app.use('/api/demo', async (req, res, next) => {
  // 🔍 Verificar token para identificar utilizador
  const cookieToken = req.cookies?.auth_token;
  const authHeader = req.headers['authorization'];
  const bearerToken = authHeader?.replace('Bearer ', '');
  const token = cookieToken || bearerToken;
  
  // GET é permitido para leitura (permite ver dashboard e opção de renovar)
  if (req.method === 'GET') {
    return next();
  }
  
  // POST/PUT/DELETE requerem autenticação e subscrição ativa
  if (!token) {
    console.log('🚫 /api/demo/* - Sem token de autenticação');
    return res.status(401).json({ error: 'Não autenticado' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    
    // Buscar utilizador
    const user = await db.query.users.findFirst({
      where: eq(users.id, decoded.userId)
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Utilizador não encontrado' });
    }
    
    // Contas pessoais só podem criar tickets/appointments (como clientes)
    if (user.accountType !== 'empresa') {
      // Permitir que clientes criem tickets e marcações
      const isClientAction = req.path.includes('/tickets') || req.path.includes('/appointments');
      if (isClientAction) {
        return next();
      }
      return res.status(403).json({ error: 'Apenas contas empresariais podem usar esta funcionalidade' });
    }
    
    // Verificar subscrição para contas empresariais
    if (!user.businessId) {
      console.log('🚫 BLOQUEIO - Conta empresarial sem businessId:', user.email);
      return res.status(403).json({ 
        error: 'Subscrição necessária para usar funcionalidades empresariais',
        subscription_required: true,
        is_expired: true
      });
    }
    
    const profile = await db.query.companyProfiles.findFirst({
      where: eq(companyProfiles.id, user.businessId)
    });
    
    if (!profile) {
      console.log('🚫 BLOQUEIO - Perfil empresarial não encontrado:', user.email);
      return res.status(403).json({ 
        error: 'Perfil empresarial não encontrado',
        subscription_required: true
      });
    }
    
    // 🚫 VERIFICAR EXPIRAÇÃO
    const now = new Date();
    const periodEnd = profile.currentPeriodEnd ? new Date(profile.currentPeriodEnd) : null;
    const isExpired = profile.subscriptionStatus === 'expired' || 
                      profile.status === 'expired' ||
                      profile.status === 'cancelled' ||
                      (periodEnd && now > periodEnd);
    
    console.log('🔍 /api/demo/* Verificação de subscrição:', {
      email: user.email,
      path: req.path,
      method: req.method,
      status: profile.status,
      subscriptionStatus: profile.subscriptionStatus,
      currentPeriodEnd: profile.currentPeriodEnd,
      isExpired: isExpired
    });
    
    if (isExpired) {
      console.log('🚫 BLOQUEIO IMEDIATO - Subscrição expirada:', user.email);
      return res.status(403).json({ 
        error: 'A sua subscrição expirou. Por favor, renove para continuar a usar as funcionalidades empresariais.',
        subscription_expired: true,
        is_expired: true,
        subscription_status: profile.subscriptionStatus,
        current_period_end: profile.currentPeriodEnd
      });
    }
    
    // ✅ Subscrição ativa - permitir acesso
    next();
  } catch (error) {
    console.error('❌ Erro na verificação de subscrição /api/demo/*:', error);
    return res.status(403).json({ error: 'Token inválido ou sessão expirada' });
  }
});

// ENDPOINT DE LIMPEZA COMPLETA - Remove TODOS os dados demo
app.post('/api/demo/clear-all', (req, res) => {
  console.log('🧹 LIMPANDO TODOS OS DADOS DEMO...');
  
  // Limpar store em memória
  demoStore = {
    tickets: [],
    queues: [],
    businesses: [],
    services: [],
    appointments: [],
    reviews: []
  };
  
  // Salvar store vazio no ficheiro
  saveDemoStore();
  
  console.log('✅ TODOS os dados demo removidos!');
  res.json({ 
    success: true, 
    message: 'Todos os dados demo foram removidos',
    store: demoStore
  });
});

// GET all tickets (PostgreSQL)
app.get('/api/demo/tickets', async (req, res) => {
  try {
    const { queue_id, business_id, id, user_email, status } = req.query;
    
    let result = await db.select().from(tickets).orderBy(desc(tickets.createdAt));
    
    if (id) result = result.filter(t => t.id === id);
    if (queue_id) result = result.filter(t => t.queueId === queue_id);
    if (business_id) result = result.filter(t => t.businessId === business_id);
    if (user_email) result = result.filter(t => t.userEmail === user_email);
    if (status) {
      const statuses = status.split(',');
      result = result.filter(t => statuses.includes(t.status));
    }
    
    const mapped = result.map(t => ({
      id: t.id,
      ticket_number: t.ticketNumber,
      queue_id: t.queueId,
      business_id: t.businessId,
      user_email: t.userEmail,
      user_name: t.userName,
      user_phone: t.userPhone,
      status: t.status,
      is_manual: t.isManual,
      manual_name: t.manualName,
      estimated_time: t.estimatedTime,
      position: t.position,
      called_at: t.calledAt,
      completed_at: t.completedAt,
      attending_started_at: t.attendingStartedAt,
      created_date: t.createdAt
    }));
    
    res.json(mapped);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// POST create ticket (PostgreSQL)
app.post('/api/demo/tickets', async (req, res) => {
  try {
    const ticketId = `ticket_${Date.now()}`;
    let ticketNumber = req.body.ticket_number || 1;
    
    // ✅ CALCULAR TICKET NUMBER NO SERVIDOR (não confiar no cliente)
    if (req.body.queue_id) {
      try {
        const [queue] = await db.select().from(queues).where(eq(queues.id, req.body.queue_id));
        if (queue) {
          const today = new Date().toISOString().split('T')[0];
          // ✅ CORRIGIDO: lastResetDate já é string (varchar), não converter para Date
          const lastResetDate = queue.lastResetDate || null;
          
          if (lastResetDate !== today) {
            // Novo dia - resetar contadores
            console.log(`🔄 Novo dia detectado! Resetando fila "${queue.name}" (lastReset: ${lastResetDate}, today: ${today})`);
            await db.update(queues)
              .set({ 
                currentNumber: 0, 
                lastIssuedNumber: 0, 
                lastResetDate: today 
              })
              .where(eq(queues.id, req.body.queue_id));
            ticketNumber = 1;
            console.log(`✅ Fila resetada - nova senha #1`);
          } else {
            // Mesmo dia - incrementar
            ticketNumber = (queue.lastIssuedNumber || 0) + 1;
            console.log(`📋 Mesmo dia - nova senha #${ticketNumber} (anterior: ${queue.lastIssuedNumber || 0})`);
          }
          
          // Atualizar o lastIssuedNumber imediatamente
          await db.update(queues)
            .set({ lastIssuedNumber: ticketNumber })
            .where(eq(queues.id, req.body.queue_id));
        }
      } catch (resetErr) {
        console.warn('⚠️ Erro ao verificar/resetar fila (continuando):', resetErr.message);
      }
    }
    
    const newTicket = {
      id: ticketId,
      ticketNumber: ticketNumber,
      queueId: req.body.queue_id,
      businessId: req.body.business_id,
      userEmail: req.body.user_email,
      userName: req.body.user_name || null,
      userPhone: req.body.user_phone || null,
      status: req.body.status || 'aguardando',
      isManual: req.body.is_manual || false,
      manualName: req.body.manual_name || null,
      estimatedTime: req.body.estimated_time || null,
      position: req.body.position || null
    };
    
    await db.insert(tickets).values(newTicket);
    
    const [created] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
    
    console.log(`✅ Ticket criado: #${created.ticketNumber} para fila ${created.queueId}`);
    
    res.json({
      id: created.id,
      ticket_number: created.ticketNumber,
      queue_id: created.queueId,
      business_id: created.businessId,
      user_email: created.userEmail,
      user_name: created.userName,
      user_phone: created.userPhone,
      status: created.status,
      is_manual: created.isManual,
      manual_name: created.manualName,
      estimated_time: created.estimatedTime,
      position: created.position,
      created_date: created.createdAt
    });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// PUT update ticket (PostgreSQL)
app.put('/api/demo/tickets/:id', async (req, res) => {
  try {
    const [existing] = await db.select().from(tickets).where(eq(tickets.id, req.params.id));
    if (!existing) return res.status(404).json({ error: 'Ticket not found' });
    
    const updates = {};
    if (req.body.status !== undefined) updates.status = req.body.status;
    if (req.body.called_at !== undefined) updates.calledAt = new Date(req.body.called_at);
    if (req.body.completed_at !== undefined) updates.completedAt = new Date(req.body.completed_at);
    if (req.body.attending_started_at !== undefined) updates.attendingStartedAt = new Date(req.body.attending_started_at);
    if (req.body.is_manual !== undefined) updates.isManual = req.body.is_manual;
    if (req.body.manual_name !== undefined) updates.manualName = req.body.manual_name;
    if (req.body.estimated_time !== undefined) updates.estimatedTime = req.body.estimated_time;
    if (req.body.position !== undefined) updates.position = req.body.position;
    
    await db.update(tickets).set(updates).where(eq(tickets.id, req.params.id));
    
    const [updated] = await db.select().from(tickets).where(eq(tickets.id, req.params.id));
    
    res.json({
      id: updated.id,
      ticket_number: updated.ticketNumber,
      queue_id: updated.queueId,
      business_id: updated.businessId,
      user_email: updated.userEmail,
      user_name: updated.userName,
      user_phone: updated.userPhone,
      status: updated.status,
      is_manual: updated.isManual,
      manual_name: updated.manualName,
      estimated_time: updated.estimatedTime,
      position: updated.position,
      called_at: updated.calledAt,
      completed_at: updated.completedAt,
      attending_started_at: updated.attendingStartedAt,
      created_date: updated.createdAt
    });
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

// DELETE ticket (PostgreSQL)
app.delete('/api/demo/tickets/:id', async (req, res) => {
  try {
    const [existing] = await db.select().from(tickets).where(eq(tickets.id, req.params.id));
    if (!existing) return res.status(404).json({ error: 'Ticket not found' });
    
    await db.delete(tickets).where(eq(tickets.id, req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    res.status(500).json({ error: 'Failed to delete ticket' });
  }
});

// GET all queues (PostgreSQL)
app.get('/api/demo/queues', async (req, res) => {
  try {
    const { business_id, id, is_active } = req.query;
    
    let result = await db.select().from(queues).orderBy(desc(queues.createdAt));
    
    if (id) result = result.filter(q => q.id === id);
    if (business_id) result = result.filter(q => q.businessId === business_id);
    if (is_active !== undefined) result = result.filter(q => q.isActive === (is_active === 'true'));
    
    const mapped = result.map(q => ({
      id: q.id,
      name: q.name,
      description: q.description,
      business_id: q.businessId,
      current_number: q.currentNumber,
      last_issued_number: q.lastIssuedNumber || q.currentNumber,
      average_service_time: q.averageServiceTime,
      tolerance_time: q.toleranceTime,
      max_capacity: q.maxCapacity,
      status: q.status || 'aberta',
      is_active: q.isActive,
      working_hours: q.workingHours,
      last_reset_date: q.lastResetDate,
      notifications_enabled: q.notificationsEnabled,
      notification_settings: q.notificationSettings,
      created_at: q.createdAt
    }));
    
    res.json(mapped);
  } catch (error) {
    console.error('Error fetching queues:', error);
    res.status(500).json({ error: 'Failed to fetch queues' });
  }
});

// POST create queue (PostgreSQL)
app.post('/api/demo/queues', async (req, res) => {
  try {
    // 🚫 VERIFICAR SUBSCRIÇÃO EXPIRADA
    const businessId = req.body.business_id;
    if (businessId) {
      const [profile] = await db.select().from(companyProfiles).where(eq(companyProfiles.id, businessId));
      if (profile) {
        const now = new Date();
        const periodEnd = profile.currentPeriodEnd ? new Date(profile.currentPeriodEnd) : null;
        const isExpired = profile.subscriptionStatus === 'expired' || 
                          profile.status === 'expired' ||
                          (periodEnd && now > periodEnd);
        if (isExpired) {
          console.log('🚫 BLOQUEADO: Tentativa de criar queue com subscrição expirada:', businessId);
          return res.status(403).json({ error: 'Subscrição expirada. Renove para continuar.' });
        }
      }
    }

    const queueId = `q${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];
    const newQueue = {
      id: queueId,
      name: req.body.name,
      description: req.body.description || '',
      businessId: req.body.business_id,
      currentNumber: req.body.current_number || 0,
      lastIssuedNumber: req.body.last_issued_number || 0,
      averageServiceTime: req.body.average_service_time || 10,
      toleranceTime: req.body.tolerance_time || 15,
      maxCapacity: req.body.max_capacity || 100,
      status: req.body.status || 'aberta',
      isActive: req.body.is_active !== false,
      workingHours: req.body.working_hours || null,
      lastResetDate: req.body.last_reset_date || today,
      notificationsEnabled: req.body.notifications_enabled || false,
      notificationSettings: req.body.notification_settings || null
    };
    
    await db.insert(queues).values(newQueue);
    
    const [created] = await db.select().from(queues).where(eq(queues.id, queueId));
    
    res.json({
      id: created.id,
      name: created.name,
      description: created.description,
      business_id: created.businessId,
      current_number: created.currentNumber,
      last_issued_number: created.lastIssuedNumber,
      average_service_time: created.averageServiceTime,
      tolerance_time: created.toleranceTime,
      max_capacity: created.maxCapacity,
      status: created.status,
      is_active: created.isActive,
      working_hours: created.workingHours,
      last_reset_date: created.lastResetDate,
      notifications_enabled: created.notificationsEnabled,
      notification_settings: created.notificationSettings,
      created_at: created.createdAt
    });
  } catch (error) {
    console.error('Error creating queue:', error);
    res.status(500).json({ error: 'Failed to create queue' });
  }
});

// PUT update queue (PostgreSQL)
app.put('/api/demo/queues/:id', async (req, res) => {
  try {
    const [existing] = await db.select().from(queues).where(eq(queues.id, req.params.id));
    if (!existing) return res.status(404).json({ error: 'Queue not found' });
    
    // 🚫 VERIFICAR SUBSCRIÇÃO EXPIRADA
    const businessId = existing.businessId;
    if (businessId) {
      const [profile] = await db.select().from(companyProfiles).where(eq(companyProfiles.id, businessId));
      if (profile) {
        const now = new Date();
        const periodEnd = profile.currentPeriodEnd ? new Date(profile.currentPeriodEnd) : null;
        const isExpired = profile.subscriptionStatus === 'expired' || 
                          profile.status === 'expired' ||
                          (periodEnd && now > periodEnd);
        if (isExpired) {
          console.log('🚫 BLOQUEADO: Tentativa de editar queue com subscrição expirada:', businessId);
          return res.status(403).json({ error: 'Subscrição expirada. Renove para continuar.' });
        }
      }
    }
    
    const updates = { updatedAt: new Date() };
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.current_number !== undefined) updates.currentNumber = req.body.current_number;
    if (req.body.last_issued_number !== undefined) updates.lastIssuedNumber = req.body.last_issued_number;
    if (req.body.average_service_time !== undefined) updates.averageServiceTime = req.body.average_service_time;
    if (req.body.tolerance_time !== undefined) updates.toleranceTime = req.body.tolerance_time;
    if (req.body.max_capacity !== undefined) updates.maxCapacity = req.body.max_capacity;
    if (req.body.status !== undefined) updates.status = req.body.status;
    if (req.body.is_active !== undefined) updates.isActive = req.body.is_active;
    if (req.body.working_hours !== undefined) updates.workingHours = req.body.working_hours;
    if (req.body.last_reset_date !== undefined) updates.lastResetDate = req.body.last_reset_date;
    if (req.body.notifications_enabled !== undefined) updates.notificationsEnabled = req.body.notifications_enabled;
    if (req.body.notification_settings !== undefined) updates.notificationSettings = req.body.notification_settings;
    
    await db.update(queues).set(updates).where(eq(queues.id, req.params.id));
    
    const [updated] = await db.select().from(queues).where(eq(queues.id, req.params.id));
    
    res.json({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      business_id: updated.businessId,
      current_number: updated.currentNumber,
      last_issued_number: updated.lastIssuedNumber,
      average_service_time: updated.averageServiceTime,
      tolerance_time: updated.toleranceTime,
      max_capacity: updated.maxCapacity,
      status: updated.status,
      is_active: updated.isActive,
      working_hours: updated.workingHours,
      last_reset_date: updated.lastResetDate,
      notifications_enabled: updated.notificationsEnabled,
      notification_settings: updated.notificationSettings,
      created_at: updated.createdAt
    });
  } catch (error) {
    console.error('Error updating queue:', error);
    res.status(500).json({ error: 'Failed to update queue' });
  }
});

// DELETE queue (PostgreSQL)
app.delete('/api/demo/queues/:id', async (req, res) => {
  try {
    const [existing] = await db.select().from(queues).where(eq(queues.id, req.params.id));
    if (!existing) return res.status(404).json({ error: 'Queue not found' });
    
    // 🚫 VERIFICAR SUBSCRIÇÃO EXPIRADA
    const businessId = existing.businessId;
    if (businessId) {
      const [profile] = await db.select().from(companyProfiles).where(eq(companyProfiles.id, businessId));
      if (profile) {
        const now = new Date();
        const periodEnd = profile.currentPeriodEnd ? new Date(profile.currentPeriodEnd) : null;
        const isExpired = profile.subscriptionStatus === 'expired' || 
                          profile.status === 'expired' ||
                          (periodEnd && now > periodEnd);
        if (isExpired) {
          console.log('🚫 BLOQUEADO: Tentativa de eliminar queue com subscrição expirada:', businessId);
          return res.status(403).json({ error: 'Subscrição expirada. Renove para continuar.' });
        }
      }
    }
    
    await db.delete(queues).where(eq(queues.id, req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting queue:', error);
    res.status(500).json({ error: 'Failed to delete queue' });
  }
});

// GET all businesses
app.get('/api/demo/businesses', (req, res) => {
  const { id, is_active, owner_email } = req.query;
  let filtered = [...demoStore.businesses];
  
  if (id) filtered = filtered.filter(b => b.id === id);
  if (is_active !== undefined) filtered = filtered.filter(b => b.is_active === (is_active === 'true'));
  if (owner_email) filtered = filtered.filter(b => b.owner_email === owner_email);
  
  res.json(filtered);
});

// POST create business
app.post('/api/demo/businesses', (req, res) => {
  const business = {
    id: `${Date.now()}`,
    ...req.body,
    created_at: new Date().toISOString()
  };
  demoStore.businesses.push(business);
  saveDemoStore();
  res.json(business);
});

// PUT update business
app.put('/api/demo/businesses/:id', (req, res) => {
  const index = demoStore.businesses.findIndex(b => b.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Business not found' });
  
  demoStore.businesses[index] = { ...demoStore.businesses[index], ...req.body };
  saveDemoStore();
  res.json(demoStore.businesses[index]);
});

// GET all services (PostgreSQL)
app.get('/api/demo/services', async (req, res) => {
  try {
    const { business_id, id, is_active } = req.query;
    
    let result = await db.select().from(services).orderBy(desc(services.createdAt));
    
    if (id) result = result.filter(s => s.id === id);
    if (business_id) result = result.filter(s => s.businessId === business_id);
    if (is_active !== undefined) result = result.filter(s => s.isActive === (is_active === 'true'));
    
    const mapped = result.map(s => ({
      id: s.id,
      business_id: s.businessId,
      name: s.name,
      description: s.description,
      category: s.category,
      duration: s.duration,
      tolerance_time: s.toleranceTime,
      price: s.price,
      max_daily_slots: s.maxDailySlots,
      available_days: s.availableDays,
      working_hours: s.workingHours,
      is_active: s.isActive,
      created_at: s.createdAt
    }));
    
    res.json(mapped);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// POST create service (PostgreSQL)
app.post('/api/demo/services', async (req, res) => {
  try {
    // 🚫 VERIFICAR SUBSCRIÇÃO EXPIRADA
    const businessId = req.body.business_id;
    if (businessId) {
      const [profile] = await db.select().from(companyProfiles).where(eq(companyProfiles.id, businessId));
      if (profile) {
        const now = new Date();
        const periodEnd = profile.currentPeriodEnd ? new Date(profile.currentPeriodEnd) : null;
        const isExpired = profile.subscriptionStatus === 'expired' || 
                          profile.status === 'expired' ||
                          (periodEnd && now > periodEnd);
        if (isExpired) {
          console.log('🚫 BLOQUEADO: Tentativa de criar service com subscrição expirada:', businessId);
          return res.status(403).json({ error: 'Subscrição expirada. Renove para continuar.' });
        }
      }
    }

    const serviceId = `service_${Date.now()}`;
    const newService = {
      id: serviceId,
      businessId: req.body.business_id,
      name: req.body.name,
      description: req.body.description || null,
      category: req.body.category || null,
      duration: req.body.duration || 30,
      toleranceTime: req.body.tolerance_time || 15,
      price: req.body.price || 0,
      maxDailySlots: req.body.max_daily_slots || 10,
      availableDays: req.body.available_days || null,
      workingHours: req.body.working_hours || null,
      isActive: req.body.is_active !== false
    };
    
    await db.insert(services).values(newService);
    
    const [created] = await db.select().from(services).where(eq(services.id, serviceId));
    
    res.json({
      id: created.id,
      business_id: created.businessId,
      name: created.name,
      description: created.description,
      category: created.category,
      duration: created.duration,
      tolerance_time: created.toleranceTime,
      price: created.price,
      max_daily_slots: created.maxDailySlots,
      available_days: created.availableDays,
      working_hours: created.workingHours,
      is_active: created.isActive,
      created_at: created.createdAt
    });
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ error: 'Failed to create service' });
  }
});

// PUT update service (PostgreSQL)
app.put('/api/demo/services/:id', async (req, res) => {
  try {
    const [existing] = await db.select().from(services).where(eq(services.id, req.params.id));
    if (!existing) return res.status(404).json({ error: 'Service not found' });
    
    // 🚫 VERIFICAR SUBSCRIÇÃO EXPIRADA
    const businessId = existing.businessId || req.body.business_id;
    if (businessId) {
      const [profile] = await db.select().from(companyProfiles).where(eq(companyProfiles.id, businessId));
      if (profile) {
        const now = new Date();
        const periodEnd = profile.currentPeriodEnd ? new Date(profile.currentPeriodEnd) : null;
        const isExpired = profile.subscriptionStatus === 'expired' || 
                          profile.status === 'expired' ||
                          (periodEnd && now > periodEnd);
        if (isExpired) {
          console.log('🚫 BLOQUEADO: Tentativa de editar service com subscrição expirada:', businessId);
          return res.status(403).json({ error: 'Subscrição expirada. Renove para continuar.' });
        }
      }
    }
    
    const updates = { updatedAt: new Date() };
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.category !== undefined) updates.category = req.body.category;
    if (req.body.duration !== undefined) updates.duration = req.body.duration;
    if (req.body.tolerance_time !== undefined) updates.toleranceTime = req.body.tolerance_time;
    if (req.body.price !== undefined) updates.price = req.body.price;
    if (req.body.max_daily_slots !== undefined) updates.maxDailySlots = req.body.max_daily_slots;
    if (req.body.available_days !== undefined) updates.availableDays = req.body.available_days;
    if (req.body.working_hours !== undefined) updates.workingHours = req.body.working_hours;
    if (req.body.is_active !== undefined) updates.isActive = req.body.is_active;
    
    await db.update(services).set(updates).where(eq(services.id, req.params.id));
    
    const [updated] = await db.select().from(services).where(eq(services.id, req.params.id));
    
    res.json({
      id: updated.id,
      business_id: updated.businessId,
      name: updated.name,
      description: updated.description,
      category: updated.category,
      duration: updated.duration,
      tolerance_time: updated.toleranceTime,
      price: updated.price,
      max_daily_slots: updated.maxDailySlots,
      available_days: updated.availableDays,
      working_hours: updated.workingHours,
      is_active: updated.isActive,
      created_at: updated.createdAt
    });
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ error: 'Failed to update service' });
  }
});

// DELETE service (PostgreSQL)
app.delete('/api/demo/services/:id', async (req, res) => {
  try {
    const [existing] = await db.select().from(services).where(eq(services.id, req.params.id));
    if (!existing) return res.status(404).json({ error: 'Service not found' });
    
    // 🚫 VERIFICAR SUBSCRIÇÃO EXPIRADA
    const businessId = existing.businessId;
    if (businessId) {
      const [profile] = await db.select().from(companyProfiles).where(eq(companyProfiles.id, businessId));
      if (profile) {
        const now = new Date();
        const periodEnd = profile.currentPeriodEnd ? new Date(profile.currentPeriodEnd) : null;
        const isExpired = profile.subscriptionStatus === 'expired' || 
                          profile.status === 'expired' ||
                          (periodEnd && now > periodEnd);
        if (isExpired) {
          console.log('🚫 BLOQUEADO: Tentativa de eliminar service com subscrição expirada:', businessId);
          return res.status(403).json({ error: 'Subscrição expirada. Renove para continuar.' });
        }
      }
    }
    
    await db.delete(services).where(eq(services.id, req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

// GET all appointments (PostgreSQL)
app.get('/api/demo/appointments', async (req, res) => {
  try {
    const { business_id, user_email, status, id } = req.query;
    
    let result = await db.select().from(appointments).orderBy(desc(appointments.createdAt));
    
    if (id) result = result.filter(a => a.id === id);
    if (business_id) result = result.filter(a => a.businessId === business_id);
    if (user_email) result = result.filter(a => a.userEmail === user_email);
    if (status) {
      const statuses = status.split(',');
      result = result.filter(a => statuses.includes(a.status));
    }
    
    const mapped = result.map(a => ({
      id: a.id,
      business_id: a.businessId,
      service_id: a.serviceId,
      service_name: a.serviceName,
      user_email: a.userEmail,
      user_name: a.userName,
      user_phone: a.userPhone,
      status: a.status,
      appointment_date: a.appointmentDate,
      appointment_time: a.appointmentTime,
      duration: a.duration,
      buffer_time: a.bufferTime,
      notes: a.notes,
      business_response: a.businessResponse,
      rating: a.rating,
      feedback: a.feedback,
      reminder_sent: a.reminderSent,
      management_token: a.managementToken,
      created_date: a.createdAt,
      updated_at: a.updatedAt
    }));
    
    res.json(mapped);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// POST create appointment (PostgreSQL)
app.post('/api/demo/appointments', async (req, res) => {
  try {
    const appointmentId = `appointment_${Date.now()}`;
    const newAppointment = {
      id: appointmentId,
      businessId: req.body.business_id,
      serviceId: req.body.service_id || null,
      serviceName: req.body.service_name || null,
      userEmail: req.body.user_email,
      userName: req.body.user_name || null,
      userPhone: req.body.user_phone || null,
      status: req.body.status || 'agendado',
      appointmentDate: req.body.appointment_date,
      appointmentTime: req.body.appointment_time,
      duration: req.body.duration || 30,
      bufferTime: req.body.buffer_time || 0,
      notes: req.body.notes || null,
      businessResponse: req.body.business_response || null,
      managementToken: req.body.management_token || null
    };
    
    await db.insert(appointments).values(newAppointment);
    
    const [created] = await db.select().from(appointments).where(eq(appointments.id, appointmentId));
    
    res.json({
      id: created.id,
      business_id: created.businessId,
      service_id: created.serviceId,
      service_name: created.serviceName,
      user_email: created.userEmail,
      user_name: created.userName,
      user_phone: created.userPhone,
      status: created.status,
      appointment_date: created.appointmentDate,
      appointment_time: created.appointmentTime,
      duration: created.duration,
      buffer_time: created.bufferTime,
      notes: created.notes,
      business_response: created.businessResponse,
      management_token: created.managementToken,
      created_date: created.createdAt
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// PUT update appointment (PostgreSQL)
app.put('/api/demo/appointments/:id', async (req, res) => {
  try {
    const [existing] = await db.select().from(appointments).where(eq(appointments.id, req.params.id));
    if (!existing) return res.status(404).json({ error: 'Appointment not found' });
    
    const oldStatus = existing.status;
    
    const updates = { updatedAt: new Date() };
    if (req.body.status !== undefined) updates.status = req.body.status;
    if (req.body.appointment_date !== undefined) updates.appointmentDate = req.body.appointment_date;
    if (req.body.appointment_time !== undefined) updates.appointmentTime = req.body.appointment_time;
    if (req.body.notes !== undefined) updates.notes = req.body.notes;
    if (req.body.business_response !== undefined) updates.businessResponse = req.body.business_response;
    if (req.body.rating !== undefined) updates.rating = req.body.rating;
    if (req.body.feedback !== undefined) updates.feedback = req.body.feedback;
    if (req.body.reminder_sent !== undefined) updates.reminderSent = req.body.reminder_sent;
    
    await db.update(appointments).set(updates).where(eq(appointments.id, req.params.id));
    
    const [updated] = await db.select().from(appointments).where(eq(appointments.id, req.params.id));
    
    const updatedAppointment = {
      id: updated.id,
      business_id: updated.businessId,
      service_id: updated.serviceId,
      service_name: updated.serviceName,
      user_email: updated.userEmail,
      user_name: updated.userName,
      user_phone: updated.userPhone,
      status: updated.status,
      appointment_date: updated.appointmentDate,
      appointment_time: updated.appointmentTime,
      duration: updated.duration,
      buffer_time: updated.bufferTime,
      notes: updated.notes,
      business_response: updated.businessResponse,
      rating: updated.rating,
      feedback: updated.feedback,
      reminder_sent: updated.reminderSent,
      management_token: updated.managementToken,
      created_date: updated.createdAt,
      updated_at: updated.updatedAt
    };
    
    // ✅ ENVIAR NOTIFICAÇÕES quando status muda para "confirmado"
    if (req.body.status === 'confirmado' && oldStatus !== 'confirmado') {
      // Buscar dados da empresa do PostgreSQL company_profiles
      let business = null;
      console.log('🔍 Procurando empresa no PostgreSQL...');
      try {
        const [companyProfile] = await db.select().from(companyProfiles).where(eq(companyProfiles.id, updated.businessId));
        if (companyProfile) {
          business = {
            id: companyProfile.id,
            name: companyProfile.companyName,
            address: companyProfile.companyAddress,
            phone: companyProfile.companyPhone
          };
          console.log('✅ Empresa encontrada no PostgreSQL:', business.name);
        }
      } catch (dbError) {
        console.log('⚠️ Erro ao procurar empresa no PostgreSQL:', dbError.message);
      }

      // 📱 PUSH NOTIFICATION: "Marcação Confirmada" (independente do email)
      if (updated.userEmail && business) {
        try {
          const appointmentDate = new Date(updated.appointmentDate);
          const formattedDate = appointmentDate.toLocaleDateString('pt-PT', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
          });
          
          const user = await db.query.users.findFirst({ where: eq(users.email, updated.userEmail.toLowerCase()) });
          if (user) {
            await pushNotificationService.sendAppointmentConfirmationNotification(
              user.id,
              updated.serviceName || 'Serviço',
              business.name,
              formattedDate,
              updated.appointmentTime
            );
            console.log(`📱 Push "Marcação Confirmada" enviado para: ${updated.userEmail}`);
          }
        } catch (pushError) {
          console.error('⚠️ Erro ao enviar push de confirmação:', pushError);
        }
      }

      // 📧 ENVIAR E-MAIL DE CONFIRMAÇÃO
      try {
        console.log('📧 Tentando enviar e-mail de confirmação de marcação...');
        console.log('📧 business_id:', updated.businessId);
        console.log('📧 user_email:', updated.userEmail);
        console.log('📧 business encontrado:', business ? business.name : 'NÃO ENCONTRADO');
        
        if (business && updated.userEmail) {
          const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
          const xReplitToken = process.env.REPL_IDENTITY 
            ? 'repl ' + process.env.REPL_IDENTITY 
            : process.env.WEB_REPL_RENEWAL 
            ? 'depl ' + process.env.WEB_REPL_RENEWAL 
            : null;

          console.log('📧 Resend hostname disponível:', !!hostname);
          console.log('📧 Resend token disponível:', !!xReplitToken);

          if (hostname && xReplitToken) {
            console.log('📧 Conectando ao Resend...');
            const connectionSettings = await fetch(
              'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
              {
                headers: {
                  'Accept': 'application/json',
                  'X_REPLIT_TOKEN': xReplitToken
                }
              }
            ).then(res => res.json()).then(data => data.items?.[0]);

            if (connectionSettings && connectionSettings.settings.api_key) {
              const resend = new Resend(connectionSettings.settings.api_key);
              const fromEmail = 'QZero <noreply@waitless-qzero.com>';
              
              // Buscar idioma preferido do utilizador
              let userLang = 'pt';
              try {
                const [appointmentUser] = await db.select().from(users).where(eq(users.email, updated.userEmail.toLowerCase()));
                userLang = appointmentUser?.preferredLanguage || 'pt';
              } catch (e) {
                console.log('Usando idioma padrão pt para email');
              }
              
              // Formatar data e hora
              const appointmentDate = new Date(updated.appointmentDate);
              const formattedDate = appointmentDate.toLocaleDateString('pt-PT', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric' 
              });

              // Traduzir textos do email
              const txtSubject = await translateText('Marcação Confirmada', userLang, 'pt');
              const txtHello = await translateText('Olá', userLang, 'pt');
              const txtClient = await translateText('Cliente', userLang, 'pt');
              const txtConfirmed = await translateText('A sua marcação foi CONFIRMADA!', userLang, 'pt');
              const txtDetails = await translateText('Detalhes da Marcação', userLang, 'pt');
              const txtBusiness = await translateText('Empresa', userLang, 'pt');
              const txtDate = await translateText('Data', userLang, 'pt');
              const txtTime = await translateText('Hora', userLang, 'pt');
              const txtService = await translateText('Serviço', userLang, 'pt');
              const txtAddress = await translateText('Morada', userLang, 'pt');
              const txtNotSpecified = await translateText('Não especificada', userLang, 'pt');
              const txtContact = await translateText('Contacto', userLang, 'pt');
              const txtImportant = await translateText('IMPORTANTE', userLang, 'pt');
              const txtArriveEarly = await translateText('Por favor, chegue 5-10 minutos antes da hora marcada', userLang, 'pt');
              const txtCancelAdvance = await translateText('Em caso de impossibilidade de comparência, cancele com antecedência', userLang, 'pt');
              const txtThankYou = await translateText('Obrigado por escolher', userLang, 'pt');

              const emailBody = `
${txtHello} ${updated.userName || txtClient},

${txtConfirmed} ✅

📋 ${txtDetails}:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏢 ${txtBusiness}: ${business.name}
📅 ${txtDate}: ${formattedDate}
⏰ ${txtTime}: ${updated.appointmentTime}
${updated.serviceName ? `🔧 ${txtService}: ${updated.serviceName}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 ${txtAddress}: ${business.address || txtNotSpecified}
${business.phone ? `📞 ${txtContact}: ${business.phone}` : ''}

⚠️ ${txtImportant}:
• ${txtArriveEarly}
• ${txtCancelAdvance}

${txtThankYou} ${business.name}!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QZero - Sistema de Gestão de Filas
              `.trim();

              await resend.emails.send({
                from: fromEmail,
                to: [updated.userEmail],
                subject: `✅ ${txtSubject} - ${business.name}`,
                text: emailBody,
              });

              console.log(`✅ E-mail de confirmação enviado para: ${updated.userEmail}`);
            } else {
              console.log('⚠️ Resend API key não encontrada nas connectionSettings');
            }
          } else {
            console.log('⚠️ Hostname ou token Resend não disponíveis');
          }
        } else {
          console.log('⚠️ Não foi possível enviar e-mail: business=', !!business, ', user_email=', !!updated.userEmail);
        }
      } catch (emailError) {
        console.error('❌ Erro ao enviar e-mail de confirmação:', emailError);
      }
    }
    
    res.json(updatedAppointment);
  } catch (error) {
    console.error('❌ Erro ao atualizar marcação:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE appointment (PostgreSQL)
app.delete('/api/demo/appointments/:id', async (req, res) => {
  try {
    const [existing] = await db.select().from(appointments).where(eq(appointments.id, req.params.id));
    if (!existing) return res.status(404).json({ error: 'Appointment not found' });
    
    await db.delete(appointments).where(eq(appointments.id, req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    res.status(500).json({ error: 'Failed to delete appointment' });
  }
});

// ============================================
// REVIEWS Endpoints
// ============================================

// GET reviews
app.get('/api/demo/reviews', (req, res) => {
  const { business_id, user_email } = req.query;
  let filtered = [...demoStore.reviews];
  
  if (business_id) {
    filtered = filtered.filter(r => r.business_id === business_id);
  }
  
  if (user_email) {
    filtered = filtered.filter(r => r.user_email === user_email);
  }
  
  res.json(filtered);
});

// POST create review
app.post('/api/demo/reviews', (req, res) => {
  const review = {
    id: `review_${Date.now()}`,
    created_date: new Date().toISOString(),
    ...req.body
  };
  demoStore.reviews.push(review);
  saveDemoStore();
  res.json(review);
});

// PUT update review
app.put('/api/demo/reviews/:id', (req, res) => {
  const index = demoStore.reviews.findIndex(r => r.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Review not found' });
  
  demoStore.reviews[index] = { ...demoStore.reviews[index], ...req.body };
  saveDemoStore();
  res.json(demoStore.reviews[index]);
});

// DELETE review
app.delete('/api/demo/reviews/:id', (req, res) => {
  const index = demoStore.reviews.findIndex(r => r.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Review not found' });
  
  demoStore.reviews.splice(index, 1);
  saveDemoStore();
  res.json({ success: true });
});

// ============================================================================
// STAFF INVITES
// ============================================================================

// GET staff invites
app.get('/api/demo/staff-invites', (req, res) => {
  if (!demoStore.staffInvites) demoStore.staffInvites = [];
  
  let filtered = demoStore.staffInvites;
  
  if (req.query.business_id) {
    filtered = filtered.filter(i => i.business_id === req.query.business_id);
  }
  if (req.query.email) {
    filtered = filtered.filter(i => i.email === req.query.email);
  }
  if (req.query.status) {
    filtered = filtered.filter(i => i.status === req.query.status);
  }
  if (req.query.token) {
    filtered = filtered.filter(i => i.token === req.query.token);
  }
  
  res.json(filtered);
});

// POST create staff invite
app.post('/api/demo/staff-invites', (req, res) => {
  if (!demoStore.staffInvites) demoStore.staffInvites = [];
  
  const invite = {
    id: `invite_${Date.now()}`,
    created_at: new Date().toISOString(),
    ...req.body
  };
  demoStore.staffInvites.push(invite);
  saveDemoStore();
  res.json(invite);
});

// PUT update staff invite
app.put('/api/demo/staff-invites/:id', (req, res) => {
  if (!demoStore.staffInvites) demoStore.staffInvites = [];
  
  const index = demoStore.staffInvites.findIndex(i => i.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Invite not found' });
  
  demoStore.staffInvites[index] = { ...demoStore.staffInvites[index], ...req.body };
  saveDemoStore();
  res.json(demoStore.staffInvites[index]);
});

// DELETE staff invite
app.delete('/api/demo/staff-invites/:id', (req, res) => {
  if (!demoStore.staffInvites) demoStore.staffInvites = [];
  
  const index = demoStore.staffInvites.findIndex(i => i.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Invite not found' });
  
  demoStore.staffInvites.splice(index, 1);
  saveDemoStore();
  res.json({ success: true });
});

// ============================================================================
// SUPPORT MESSAGES
// ============================================================================

// GET support messages
app.get('/api/demo/support-messages', (req, res) => {
  if (!demoStore.supportMessages) demoStore.supportMessages = [];
  
  let filtered = demoStore.supportMessages;
  
  if (req.query.business_id) {
    filtered = filtered.filter(m => m.business_id === req.query.business_id);
  }
  if (req.query.user_email) {
    filtered = filtered.filter(m => m.user_email === req.query.user_email);
  }
  if (req.query.status) {
    filtered = filtered.filter(m => m.status === req.query.status);
  }
  
  res.json(filtered);
});

// POST create support message
app.post('/api/demo/support-messages', (req, res) => {
  if (!demoStore.supportMessages) demoStore.supportMessages = [];
  
  const message = {
    id: `msg_${Date.now()}`,
    created_at: new Date().toISOString(),
    ...req.body
  };
  demoStore.supportMessages.push(message);
  saveDemoStore();
  res.json(message);
});

// PUT update support message
app.put('/api/demo/support-messages/:id', (req, res) => {
  if (!demoStore.supportMessages) demoStore.supportMessages = [];
  
  const index = demoStore.supportMessages.findIndex(m => m.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Message not found' });
  
  demoStore.supportMessages[index] = { ...demoStore.supportMessages[index], ...req.body };
  saveDemoStore();
  res.json(demoStore.supportMessages[index]);
});

// DELETE support message
app.delete('/api/demo/support-messages/:id', (req, res) => {
  if (!demoStore.supportMessages) demoStore.supportMessages = [];
  
  const index = demoStore.supportMessages.findIndex(m => m.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Message not found' });
  
  demoStore.supportMessages.splice(index, 1);
  saveDemoStore();
  res.json({ success: true });
});

// ============================================================================
// USERS (for staff management)
// ============================================================================

// GET users
// 🔒 SEGURANÇA: NÃO expor passwordHash nas respostas
app.get('/api/demo/users', async (req, res) => {
  try {
    let users = [];
    
    // Buscar utilizadores da base de dados PostgreSQL
    if (req.query.business_id && req.query.is_staff_member !== undefined) {
      const isStaff = req.query.is_staff_member === 'true' || req.query.is_staff_member === true;
      users = await db.query.users.findMany({
        where: (user, { eq, and }) => and(
          eq(user.businessId, req.query.business_id),
          eq(user.isStaffMember, isStaff)
        )
      });
    } else if (req.query.email) {
      const user = await db.query.users.findFirst({
        where: (user, { eq }) => eq(user.email, req.query.email)
      });
      users = user ? [user] : [];
    } else {
      users = await db.query.users.findMany();
    }
    
    // 🔒 SEGURANÇA: Remover passwordHash dos resultados (SEM quebrar outros campos)
    const sanitizedUsers = users.map(user => {
      const { passwordHash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    
    res.json(sanitizedUsers);
  } catch (error) {
    logger.error('Erro ao buscar utilizadores:', error);
    res.status(500).json({ error: 'Erro ao buscar utilizadores' });
  }
});

// PUT update user
app.put('/api/demo/users/:id', async (req, res) => {
  try {
    const updated = await db.update(users)
      .set({
        ...req.body,
        updatedAt: new Date()
      })
      .where(eq(users.id, req.params.id))
      .returning();
    
    if (updated.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(updated[0]);
  } catch (error) {
    console.error('Erro ao atualizar utilizador:', error);
    res.status(500).json({ error: 'Erro ao atualizar utilizador' });
  }
});

// DELETE user
app.delete('/api/demo/users/:id', async (req, res) => {
  try {
    const deleted = await db.delete(users)
      .where(eq(users.id, req.params.id))
      .returning();
    
    if (deleted.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao apagar utilizador:', error);
    res.status(500).json({ error: 'Erro ao apagar utilizador' });
  }
});

// ============================================================================
// OBJECT STORAGE (uploads permanentes)
// ============================================================================

// Endpoint para obter URL de upload (presigned URL)
app.post('/api/objects/upload', async (req, res) => {
  try {
    const { filename = 'image.jpg' } = req.body;
    const { uploadURL, objectPath } = await objectStorageService.getUploadURL(filename);
    res.json({ uploadURL, objectPath });
  } catch (error) {
    console.error('Erro ao obter URL de upload:', error);
    
    if (error.message?.includes('PRIVATE_OBJECT_DIR')) {
      return res.status(503).json({ 
        error: 'Object Storage não configurado. Use o upload local.',
        fallback: true
      });
    }
    
    res.status(500).json({ error: 'Erro ao obter URL de upload' });
  }
});

// Endpoint para servir objectos do Object Storage
app.get(/^\/objects\/(.+)$/, async (req, res) => {
  // ✅ CAPACITOR FIX: Adicionar headers CORS para apps móveis
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  
  try {
    const objectPath = req.path;
    const objectFile = await objectStorageService.getObjectFile(objectPath);
    await objectStorageService.downloadObject(objectFile, res);
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      return res.status(404).json({ error: 'Ficheiro não encontrado' });
    }
    console.error('Erro ao servir objeto:', error);
    res.status(500).json({ error: 'Erro ao servir ficheiro' });
  }
});

// ============================================================================
// UPLOAD DE IMAGENS (fallback local + Object Storage)
// ============================================================================

// ✅ UPLOAD SEGURO: Valida MAGIC NUMBERS (não apenas MIME type)
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum ficheiro foi enviado' });
    }

    // 🔒 VALIDAÇÃO DE CONTEÚDO REAL (magic numbers)
    const buffer = fs.readFileSync(req.file.path);
    const fileType = await fileTypeFromBuffer(buffer);
    
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (!fileType || !allowedMimeTypes.includes(fileType.mime)) {
      // ❌ Ficheiro malicioso detectado - apagar imediatamente
      fs.unlinkSync(req.file.path);
      logSecurityEvent('MALICIOUS_FILE_UPLOAD', {
        ip: req.ip,
        filename: req.file.originalname,
        detectedMime: fileType?.mime || 'unknown',
        uploadedMime: req.file.mimetype
      });
      return res.status(400).json({ 
        error: 'Tipo de ficheiro não permitido. Apenas imagens são aceites.' 
      });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    
    safeLog('✅ Ficheiro validado e carregado:', {
      filename: req.file.filename,
      size: req.file.size,
      realType: fileType.mime
    });

    res.json({
      success: true,
      file_url: fileUrl,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: fileType.mime
    });
  } catch (error) {
    logger.error('Upload error:', error);
    res.status(500).json({ error: 'Erro ao fazer upload do ficheiro' });
  }
});

// Endpoint para apagar imagem
app.delete('/api/delete-image', (req, res) => {
  try {
    const { fileUrl } = req.body;
    
    if (!fileUrl) {
      return res.status(400).json({ error: 'URL do ficheiro não fornecido' });
    }

    // Extrair nome do ficheiro da URL
    const filename = path.basename(fileUrl);
    const filePath = path.join(UPLOADS_DIR, filename);

    // Verificar se o ficheiro existe
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('✅ Ficheiro apagado:', filename);
      res.json({ success: true, message: 'Ficheiro apagado com sucesso' });
    } else {
      res.status(404).json({ error: 'Ficheiro não encontrado' });
    }
  } catch (error) {
    console.error('❌ Erro ao apagar ficheiro:', error);
    res.status(500).json({ error: error.message || 'Erro ao apagar ficheiro' });
  }
});

// ============================================================================
// TRADUÇÃO COM GOOGLE TRANSLATE API
// ============================================================================

// ✅ Rate limiter específico para traduções (muito generoso para desenvolvimento)
const translateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 3000, // ✅ AUMENTADO: 3000 req/min para suportar muitas traduções simultâneas
  message: 'Muitas requisições de tradução. Tente novamente em 1 minuto.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/api/translate', translateLimiter, async (req, res) => {
  try {
    const { text, texts, targetLang, sourceLang } = req.body;

    if (!targetLang || typeof targetLang !== 'string' || targetLang.length !== 2) {
      return res.status(400).json({ error: 'targetLang é obrigatório e deve ser um código de idioma de 2 letras' });
    }

    if (text !== undefined) {
      if (typeof text !== 'string') {
        return res.status(400).json({ error: 'text deve ser uma string' });
      }
      if (text.length > 5000) {
        return res.status(400).json({ error: 'text excede o limite de 5000 caracteres' });
      }
      const translation = await translateText(text, targetLang, sourceLang);
      return res.json({ translation });
    }

    if (texts !== undefined) {
      if (!Array.isArray(texts)) {
        return res.status(400).json({ error: 'texts deve ser um array' });
      }
      if (texts.length > 100) {
        return res.status(400).json({ error: 'texts excede o limite de 100 elementos' });
      }
      if (!texts.every(t => typeof t === 'string' && t.length <= 5000)) {
        return res.status(400).json({ error: 'todos os elementos de texts devem ser strings com no máximo 5000 caracteres' });
      }
      const translations = await translateBatch(texts, targetLang, sourceLang);
      return res.json({ translations });
    }

    return res.status(400).json({ error: 'text ou texts é obrigatório' });
  } catch (error) {
    logger.error('Translation endpoint error:', error);
    res.status(500).json({ error: 'Erro ao traduzir texto' });
  }
});

app.post('/api/translate/detect', translateLimiter, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'text é obrigatório' });
    }

    const language = await detectLanguage(text);
    res.json({ language });
  } catch (error) {
    logger.error('Language detection endpoint error:', error);
    res.status(500).json({ error: 'Erro ao detectar idioma' });
  }
});

// ================== GOOGLE PLACES PROXY (Capacitor iOS/Android) ==================
// O WebView do Capacitor tem CORS restrito, então precisamos de um proxy no backend

// Rate limiter específico para Places API (mais restritivo)
const placesRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 60, // 60 requests por minuto por IP
  message: { error: 'Muitas pesquisas de moradas. Aguarde um minuto.' },
  standardHeaders: true,
  legacyHeaders: false
});

// GET /api/places/autocomplete - Proxy para Google Places Autocomplete
// Com fallback para OpenStreetMap/Nominatim quando Google falha
app.get('/api/places/autocomplete', placesRateLimiter, async (req, res) => {
  try {
    const { input, country } = req.query;
    
    // Validação robusta do input - SEMPRE retornar estrutura consistente
    if (!input || typeof input !== 'string') {
      return res.json({ predictions: [], status: 'INVALID_INPUT' });
    }
    
    const sanitizedInput = input.trim().slice(0, 200);
    if (sanitizedInput.length < 2) {
      return res.json({ predictions: [], status: 'INPUT_TOO_SHORT' });
    }
    
    // Validar country code (2 letras)
    const sanitizedCountry = (country && typeof country === 'string') 
      ? country.slice(0, 2).toLowerCase().replace(/[^a-z]/g, '') 
      : 'pt';
    
    // Tentar Google primeiro (chave sem restrições de referrer)
    const serverApiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (serverApiKey) {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(sanitizedInput)}&types=address&components=country:${sanitizedCountry}&key=${serverApiKey}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status === 'OK' && data.predictions) {
          const normalizedPredictions = data.predictions.map(p => ({
            place_id: p.place_id,
            description: p.description,
            structured_formatting: p.structured_formatting
          }));
          return res.json({ predictions: normalizedPredictions, status: 'OK', source: 'google' });
        } else if (data.status === 'REQUEST_DENIED') {
          logger.warn('Google Places API denied - using fallback. Error:', data.error_message);
        } else if (data.status !== 'ZERO_RESULTS') {
          logger.warn('Google Places API status:', data.status);
        }
      } catch (googleError) {
        logger.warn('Google Places API failed, using OpenStreetMap fallback:', googleError.message);
      }
    }
    
    // Fallback para OpenStreetMap/Nominatim (gratuito, sem API key)
    logger.info('Using OpenStreetMap/Nominatim for address search');
    
    // Converter country code para código de país Nominatim
    const countryCodesMap = {
      'pt': 'pt', 'br': 'br', 'es': 'es', 'fr': 'fr', 'de': 'de', 
      'it': 'it', 'gb': 'gb', 'uk': 'gb', 'us': 'us', 'nl': 'nl'
    };
    const nominatimCountry = countryCodesMap[sanitizedCountry] || sanitizedCountry;
    
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(sanitizedInput)}&countrycodes=${nominatimCountry}&addressdetails=1&limit=5`;
    
    const nominatimResponse = await fetch(nominatimUrl, {
      headers: { 'User-Agent': 'QZero-App/1.8.3' }
    });
    
    if (!nominatimResponse.ok) {
      logger.error('Nominatim API HTTP error:', nominatimResponse.status);
      return res.json({ predictions: [], status: 'HTTP_ERROR', error: 'Serviço de pesquisa indisponível' });
    }
    
    const nominatimData = await nominatimResponse.json();
    
    if (!nominatimData || nominatimData.length === 0) {
      return res.json({ predictions: [], status: 'ZERO_RESULTS' });
    }
    
    // Converter formato Nominatim para formato compatível com Google Places
    const normalizedPredictions = nominatimData.map(item => ({
      place_id: `osm_${item.osm_type}_${item.osm_id}`,
      description: item.display_name,
      structured_formatting: {
        main_text: item.address?.road || item.address?.city || item.name || '',
        secondary_text: [
          item.address?.city || item.address?.town || item.address?.village || '',
          item.address?.state || item.address?.region || '',
          item.address?.country || ''
        ].filter(Boolean).join(', ')
      },
      osm_data: {
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        address: item.address
      }
    }));
    
    res.json({ predictions: normalizedPredictions, status: 'OK', source: 'openstreetmap' });
  } catch (error) {
    logger.error('Places autocomplete proxy error:', error);
    res.json({ predictions: [], status: 'ERROR', error: 'Erro ao pesquisar moradas' });
  }
});

// GET /api/places/details - Proxy para Google Places Details
// Suporta place_ids do Google (ChIJ...) e OpenStreetMap (osm_*)
app.get('/api/places/details', placesRateLimiter, async (req, res) => {
  try {
    const { place_id, osm_lat, osm_lng, osm_address } = req.query;
    
    // Validação robusta do place_id
    if (!place_id || typeof place_id !== 'string') {
      return res.json({ result: null, status: 'INVALID_INPUT', error: 'place_id é obrigatório' });
    }
    
    const sanitizedPlaceId = place_id.trim().slice(0, 300);
    
    // Verificar se é um place_id do OpenStreetMap (fallback)
    if (sanitizedPlaceId.startsWith('osm_')) {
      // Para OSM, os dados já foram passados via query params do autocomplete
      const lat = osm_lat ? parseFloat(osm_lat) : null;
      const lng = osm_lng ? parseFloat(osm_lng) : null;
      let addressData = null;
      
      try {
        if (osm_address) {
          addressData = JSON.parse(decodeURIComponent(osm_address));
        }
      } catch (e) {
        logger.warn('Failed to parse OSM address data');
      }
      
      // Se temos coordenadas, fazer reverse geocode para obter detalhes completos
      if (lat && lng) {
        const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
        
        const nominatimResponse = await fetch(nominatimUrl, {
          headers: { 'User-Agent': 'QZero-App/1.8.3' }
        });
        
        if (nominatimResponse.ok) {
          const nominatimData = await nominatimResponse.json();
          
          if (nominatimData && nominatimData.address) {
            const addr = nominatimData.address;
            const addressComponents = [];
            
            if (addr.house_number) {
              addressComponents.push({ long_name: addr.house_number, short_name: addr.house_number, types: ['street_number'] });
            }
            if (addr.road || addr.street) {
              const street = addr.road || addr.street;
              addressComponents.push({ long_name: street, short_name: street, types: ['route'] });
            }
            if (addr.city || addr.town || addr.village || addr.municipality) {
              const city = addr.city || addr.town || addr.village || addr.municipality;
              addressComponents.push({ long_name: city, short_name: city, types: ['locality', 'political'] });
            }
            if (addr.state || addr.region || addr.county) {
              const district = addr.state || addr.region || addr.county;
              addressComponents.push({ long_name: district, short_name: district, types: ['administrative_area_level_1', 'political'] });
            }
            if (addr.postcode) {
              addressComponents.push({ long_name: addr.postcode, short_name: addr.postcode, types: ['postal_code'] });
            }
            if (addr.country) {
              const countryCode = addr.country_code ? addr.country_code.toUpperCase() : '';
              addressComponents.push({ long_name: addr.country, short_name: countryCode, types: ['country', 'political'] });
            }
            
            return res.json({
              result: {
                address_components: addressComponents,
                formatted_address: nominatimData.display_name || '',
                geometry: { location: { lat, lng } }
              },
              status: 'OK',
              source: 'openstreetmap'
            });
          }
        }
      }
      
      // Fallback se não conseguiu obter detalhes
      return res.json({ result: null, status: 'NOT_FOUND', error: 'Detalhes não disponíveis' });
    }
    
    // Place_id do Google - validar formato
    if (sanitizedPlaceId.length < 10 || !/^[a-zA-Z0-9_-]+$/.test(sanitizedPlaceId)) {
      return res.json({ result: null, status: 'INVALID_PLACE_ID', error: 'place_id inválido' });
    }
    
    // Tentar Google (chave sem restrições de referrer)
    const serverApiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!serverApiKey) {
      logger.error('Google Maps API key não configurada');
      return res.json({ result: null, status: 'CONFIG_ERROR', error: 'Serviço não configurado' });
    }
    
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(sanitizedPlaceId)}&fields=address_components,geometry,formatted_address&key=${serverApiKey}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      logger.error('Google Places Details API HTTP error:', response.status);
      return res.json({ result: null, status: 'HTTP_ERROR', error: 'Google API unavailable' });
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK') {
      logger.warn('Google Places Details API status:', data.status);
      return res.json({ result: null, status: data.status || 'UNKNOWN_ERROR' });
    }
    
    const place = data.result || {};
    res.json({
      result: {
        address_components: place.address_components || [],
        formatted_address: place.formatted_address || '',
        geometry: place.geometry ? {
          location: {
            lat: place.geometry.location?.lat,
            lng: place.geometry.location?.lng
          }
        } : null
      },
      status: 'OK',
      source: 'google'
    });
  } catch (error) {
    logger.error('Places details proxy error:', error);
    res.json({ result: null, status: 'ERROR', error: 'Erro ao obter detalhes da morada' });
  }
});

// GET /api/places/reverse-geocode - Converter coordenadas GPS em morada
// Com fallback para OpenStreetMap/Nominatim quando Google falha
app.get('/api/places/reverse-geocode', placesRateLimiter, async (req, res) => {
  try {
    const { lat, lng } = req.query;
    
    if (!lat || !lng) {
      return res.json({ result: null, status: 'INVALID_INPUT', error: 'Coordenadas são obrigatórias' });
    }
    
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    
    if (isNaN(latitude) || isNaN(longitude)) {
      return res.json({ result: null, status: 'INVALID_INPUT', error: 'Coordenadas inválidas' });
    }
    
    // Tentar Google primeiro (chave sem restrições de referrer)
    const serverApiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (serverApiKey) {
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${serverApiKey}&language=pt`;
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'OK' && data.results && data.results.length > 0) {
            const place = data.results[0];
            return res.json({
              result: {
                address_components: place.address_components || [],
                formatted_address: place.formatted_address || '',
                geometry: { location: { lat: latitude, lng: longitude } }
              },
              status: 'OK',
              source: 'google'
            });
          }
        }
      } catch (googleError) {
        logger.warn('Google Geocoding failed, using OpenStreetMap fallback:', googleError.message);
      }
    }
    
    // Fallback para OpenStreetMap/Nominatim (gratuito, sem API key)
    logger.info('Using OpenStreetMap/Nominatim for reverse geocoding');
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
    
    const nominatimResponse = await fetch(nominatimUrl, {
      headers: { 'User-Agent': 'QZero-App/1.8.3' }
    });
    
    if (!nominatimResponse.ok) {
      logger.error('Nominatim API HTTP error:', nominatimResponse.status);
      return res.json({ result: null, status: 'HTTP_ERROR', error: 'Serviço de geocoding indisponível' });
    }
    
    const nominatimData = await nominatimResponse.json();
    
    if (!nominatimData || !nominatimData.address) {
      return res.json({ result: null, status: 'ZERO_RESULTS', error: 'Morada não encontrada' });
    }
    
    // Converter formato Nominatim para formato compatível com Google
    const addr = nominatimData.address;
    const addressComponents = [];
    
    // Street number
    if (addr.house_number) {
      addressComponents.push({ long_name: addr.house_number, short_name: addr.house_number, types: ['street_number'] });
    }
    
    // Street name
    const streetName = addr.road || addr.street || addr.pedestrian || addr.footway || '';
    if (streetName) {
      addressComponents.push({ long_name: streetName, short_name: streetName, types: ['route'] });
    }
    
    // City
    const city = addr.city || addr.town || addr.village || addr.municipality || addr.hamlet || '';
    if (city) {
      addressComponents.push({ long_name: city, short_name: city, types: ['locality', 'political'] });
    }
    
    // District/State
    const district = addr.state || addr.region || addr.county || addr.state_district || '';
    if (district) {
      addressComponents.push({ long_name: district, short_name: district, types: ['administrative_area_level_1', 'political'] });
    }
    
    // Postal code
    if (addr.postcode) {
      addressComponents.push({ long_name: addr.postcode, short_name: addr.postcode, types: ['postal_code'] });
    }
    
    // Country
    if (addr.country) {
      const countryCode = addr.country_code ? addr.country_code.toUpperCase() : '';
      addressComponents.push({ long_name: addr.country, short_name: countryCode, types: ['country', 'political'] });
    }
    
    const formattedAddress = nominatimData.display_name || '';
    
    res.json({
      result: {
        address_components: addressComponents,
        formatted_address: formattedAddress,
        geometry: { location: { lat: latitude, lng: longitude } }
      },
      status: 'OK',
      source: 'openstreetmap'
    });
  } catch (error) {
    logger.error('Reverse geocode error:', error);
    res.json({ result: null, status: 'ERROR', error: 'Erro ao converter coordenadas' });
  }
});

// POST /api/geocode-address - Geocoding de endereço para coordenadas usando Google Maps Geocoding API
// Converte um endereço em coordenadas GPS precisas
app.post('/api/geocode-address', placesRateLimiter, async (req, res) => {
  try {
    const { address, city, postalCode, country } = req.body;
    
    // Validação
    if (!address || typeof address !== 'string') {
      return res.status(400).json({ error: 'Endereço é obrigatório' });
    }
    
    // Construir endereço completo para geocoding
    const addressParts = [address.trim()];
    if (postalCode) addressParts.push(postalCode.trim());
    if (city) addressParts.push(city.trim());
    if (country) addressParts.push(country.trim());
    
    const fullAddress = addressParts.join(', ');
    
    logger.info('Geocoding address:', { fullAddress });
    
    // Usar Google Maps Geocoding API
    const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      logger.error('Google Maps API key não configurada');
      return res.status(500).json({ error: 'Serviço de geocoding não configurado' });
    }
    
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      logger.error('Google Geocoding API HTTP error:', response.status);
      return res.status(502).json({ error: 'Erro ao comunicar com Google Maps' });
    }
    
    const data = await response.json();
    
    if (data.status === 'REQUEST_DENIED') {
      logger.error('Google Geocoding API denied:', data.error_message);
      return res.status(403).json({ error: 'API key inválida' });
    }
    
    if (data.status === 'ZERO_RESULTS') {
      logger.warn('Geocoding: nenhum resultado para:', fullAddress);
      return res.status(404).json({ error: 'Endereço não encontrado' });
    }
    
    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      logger.warn('Geocoding status:', data.status);
      return res.status(400).json({ error: 'Não foi possível geocodificar o endereço' });
    }
    
    // Pegar o primeiro resultado (mais relevante)
    const result = data.results[0];
    const location = result.geometry?.location;
    
    if (!location || !location.lat || !location.lng) {
      return res.status(400).json({ error: 'Coordenadas não encontradas' });
    }
    
    // Determinar precisão baseada no location_type
    // ROOFTOP = exato, RANGE_INTERPOLATED = aproximado, GEOMETRIC_CENTER = centro, APPROXIMATE = aproximado
    const locationType = result.geometry?.location_type || 'UNKNOWN';
    let precision = 'approximate';
    if (locationType === 'ROOFTOP') precision = 'exact';
    else if (locationType === 'RANGE_INTERPOLATED') precision = 'interpolated';
    else if (locationType === 'GEOMETRIC_CENTER') precision = 'center';
    
    logger.info('Geocoding successful:', {
      lat: location.lat,
      lng: location.lng,
      precision,
      locationType,
      formattedAddress: result.formatted_address
    });
    
    res.json({
      lat: location.lat,
      lng: location.lng,
      precision,
      locationType,
      formattedAddress: result.formatted_address
    });
    
  } catch (error) {
    logger.error('Geocode address error:', error);
    res.status(500).json({ error: 'Erro interno no geocoding' });
  }
});

// ================== SUPORTE - FORMULÁRIO DE CONTACTO ==================
app.post('/api/public/support/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Nome, email e mensagem são obrigatórios' });
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    logger.info('Support contact form submission', { name, email, subject });

    // Enviar email via Resend
    const hostname = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS?.split(',')[0];
    const xReplitToken = process.env.REPLIT_IDENTITY;

    if (!hostname || !xReplitToken) {
      logger.error('Resend not configured for support form');
      return res.status(500).json({ error: 'Serviço de email não configurado' });
    }

    const connectionResponse = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
      { headers: { 'X-Replit-Identity': xReplitToken } }
    );

    const connections = await connectionResponse.json();
    const connectionSettings = connections.find(c => c.name === 'resend');

    if (!connectionSettings?.settings?.api_key) {
      logger.error('Resend API key not found');
      return res.status(500).json({ error: 'Serviço de email não configurado' });
    }

    const { Resend } = await import('resend');
    const resend = new Resend(connectionSettings.settings.api_key);

    const subjectLine = subject || 'Contacto via QZero App';

    await resend.emails.send({
      from: 'QZero Suporte <onboarding@resend.dev>',
      to: 'suporteqzero@gmail.com',
      replyTo: email,
      subject: `[QZero Suporte] ${subjectLine}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">Nova Mensagem de Suporte</h2>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Nome:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Assunto:</strong> ${subjectLine}</p>
          </div>
          <div style="background: #ffffff; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h3 style="color: #475569; margin-top: 0;">Mensagem:</h3>
            <p style="white-space: pre-wrap; color: #334155;">${message}</p>
          </div>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 20px;">
            Enviado via QZero App em ${new Date().toLocaleString('pt-PT')}
          </p>
        </div>
      `
    });

    logger.info('Support email sent successfully', { to: 'suporteqzero@gmail.com', from: email });

    res.json({ success: true, message: 'Mensagem enviada com sucesso' });

  } catch (error) {
    logger.error('Support contact form error:', error);
    res.status(500).json({ error: 'Erro ao enviar mensagem' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: IS_PRODUCTION ? 'production' : 'development',
    version: '1.0.0'
  });
});

// 🔥 Firebase/Push Notifications Diagnostic Endpoint
app.get('/api/diagnostics/firebase', async (req, res) => {
  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      firebase: {
        configured: false,
        projectId: null,
        initialized: false,
        error: null
      },
      deviceTokens: {
        total: 0,
        active: 0
      }
    };

    // Check if Service Account is configured
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (serviceAccountJson) {
      try {
        const parsed = JSON.parse(serviceAccountJson);
        diagnostics.firebase.configured = true;
        diagnostics.firebase.projectId = parsed.project_id;
        diagnostics.firebase.clientEmail = parsed.client_email ? '✅ Present' : '❌ Missing';
        diagnostics.firebase.privateKey = parsed.private_key ? '✅ Present' : '❌ Missing';
      } catch (parseError) {
        diagnostics.firebase.error = 'Invalid JSON format: ' + parseError.message;
      }
    } else {
      diagnostics.firebase.error = 'FIREBASE_SERVICE_ACCOUNT_JSON not configured';
    }

    // Check device tokens in database
    try {
      const allTokens = await db.select().from(deviceTokens);
      const activeTokens = allTokens.filter(t => t.isActive);
      diagnostics.deviceTokens.total = allTokens.length;
      diagnostics.deviceTokens.active = activeTokens.length;
    } catch (dbError) {
      diagnostics.deviceTokens.error = dbError.message;
    }

    // Test Firebase initialization
    try {
      const admin = await import('firebase-admin');
      const adminDefault = admin.default || admin;
      if (adminDefault.apps && adminDefault.apps.length > 0) {
        diagnostics.firebase.initialized = true;
      } else if (diagnostics.firebase.configured && !diagnostics.firebase.error) {
        try {
          const serviceAccount = JSON.parse(serviceAccountJson);
          adminDefault.initializeApp({
            credential: adminDefault.credential.cert(serviceAccount),
          });
          diagnostics.firebase.initialized = true;
        } catch (initError) {
          diagnostics.firebase.error = 'Initialization failed: ' + initError.message;
        }
      }
    } catch (adminError) {
      diagnostics.firebase.error = 'Firebase Admin import error: ' + adminError.message;
    }

    res.json(diagnostics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🛡️ API 404 HANDLER - Retorna JSON para rotas API não encontradas
// CRÍTICO: Deve vir ANTES do catch-all do SPA para evitar retornar HTML
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      error: 'Endpoint não encontrado',
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }
  next();
});

// 🛡️ ERROR HANDLER GLOBAL - DEVE SER O ÚLTIMO MIDDLEWARE
// Captura TODOS os erros e esconde detalhes sensíveis em produção
app.use(errorHandler);

// ================== SERVIR FRONTEND EM PRODUÇÃO ==================
// Em produção, servir o frontend compilado (dist/)
if (IS_PRODUCTION) {
  const distPath = path.join(__dirname, '../dist');
  
  console.log('🌐 Modo PRODUÇÃO: Servindo frontend de', distPath);
  
  // Servir ficheiros estáticos do build
  app.use(express.static(distPath));
  
  // Todas as rotas não-API vão para o index.html (SPA routing)
  app.use((req, res, next) => {
    // Excluir rotas da API e uploads (estas já foram tratadas acima)
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
      // Se chegou aqui, já foi tratado pelo 404 handler
      return res.status(404).json({ error: 'Not found' });
    }
    
    // Servir index.html para todas as outras rotas (SPA routing)
    res.sendFile(path.join(distPath, 'index.html'));
  });
  
  console.log('✅ Frontend e API servindo em: waitless-qzero.com (same-origin)');
} else {
  console.log('🔧 Modo DESENVOLVIMENTO: Frontend servido via Vite (porta 5000)');
}

// ✅ SCHEDULER: Enviar lembretes de marcação 24h antes
async function sendAppointmentReminders() {
  try {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Formatar data de amanhã no formato YYYY-MM-DD
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    // Buscar marcações para amanhã que estão confirmadas e não tiveram lembrete enviado
    const upcomingAppointments = await db.select()
      .from(appointments)
      .where(and(
        eq(appointments.appointmentDate, tomorrowStr),
        eq(appointments.status, 'confirmado'),
        eq(appointments.reminderSent, false)
      ));
    
    console.log(`⏰ Verificando lembretes de marcação: ${upcomingAppointments.length} marcações para amanhã`);
    
    for (const appointment of upcomingAppointments) {
      try {
        // Buscar dados da empresa
        let businessName = 'QZero';
        try {
          const [company] = await db.select().from(companyProfiles).where(eq(companyProfiles.id, appointment.businessId));
          if (company) {
            businessName = company.companyName;
          }
        } catch (e) {
          console.log('⚠️ Empresa não encontrada para lembrete');
        }
        
        // Encontrar userId pelo email
        if (appointment.userEmail) {
          const user = await db.query.users.findFirst({
            where: eq(users.email, appointment.userEmail.toLowerCase())
          });
          
          if (user) {
            // Enviar push notification
            await pushNotificationService.sendAppointmentReminderNotification(
              user.id,
              appointment.serviceName || 'Serviço',
              businessName,
              tomorrowStr,
              appointment.appointmentTime
            );
            
            // Marcar lembrete como enviado
            await db.update(appointments)
              .set({ reminderSent: true })
              .where(eq(appointments.id, appointment.id));
            
            console.log(`📬 Lembrete de marcação enviado para: ${appointment.userEmail} (${appointment.appointmentTime})`);
          }
        }
      } catch (error) {
        console.error(`❌ Erro ao enviar lembrete para ${appointment.userEmail}:`, error);
      }
    }
  } catch (error) {
    console.error('❌ Erro no scheduler de lembretes:', error);
  }
}

// Executar verificação de lembretes a cada hora
setInterval(sendAppointmentReminders, 60 * 60 * 1000);

// Executar uma vez ao iniciar o servidor
setTimeout(sendAppointmentReminders, 10000);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Demo API available at http://localhost:${PORT}/api/demo/`);
  console.log(`🔐 Auth endpoints: /api/auth/*`);
  console.log(`💳 Stripe endpoints: /api/*stripe*`);
  console.log(`⏰ Appointment reminders scheduler: Active (checks every hour)`);
  if (IS_PRODUCTION) {
    console.log(`🌐 Frontend servindo de: dist/`);
  }
});

export default app;
