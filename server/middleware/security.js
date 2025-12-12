// 🔒 MIDDLEWARE DE SEGURANÇA CENTRALIZADO
import { body, param, query, validationResult } from 'express-validator';
import validator from 'validator';
import xss from 'xss';

// 🛡️ SANITIZAÇÃO GLOBAL - Remove XSS de todos os inputs
export const sanitizeInput = (value) => {
  if (typeof value === 'string') {
    // Remove tags HTML perigosas
    return xss(value, {
      whiteList: {}, // Sem tags permitidas
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script', 'style']
    });
  }
  return value;
};

// 🛡️ Sanitizar req.body, req.query, req.params
export const sanitizeMiddleware = (req, res, next) => {
  // Sanitizar body
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      req.body[key] = sanitizeInput(req.body[key]);
    });
  }
  
  // Sanitizar query
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      req.query[key] = sanitizeInput(req.query[key]);
    });
  }
  
  // Sanitizar params
  if (req.params) {
    Object.keys(req.params).forEach(key => {
      req.params[key] = sanitizeInput(req.params[key]);
    });
  }
  
  next();
};

// ✅ VALIDADORES DE EMAIL
export const validateEmail = [
  body('email')
    .trim()
    .isEmail().withMessage('Email inválido')
    .normalizeEmail()
    .custom(value => {
      if (!validator.isEmail(value)) {
        throw new Error('Formato de email inválido');
      }
      return true;
    })
];

// ✅ VALIDADORES DE PASSWORD
export const validatePassword = [
  body('password')
    .trim()
    .isLength({ min: 6, max: 128 }).withMessage('Password deve ter entre 6 e 128 caracteres')
];

// ✅ VALIDADORES DE REGISTO
export const validateRegister = [
  ...validateEmail,
  ...validatePassword,
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Nome deve ter entre 2 e 100 caracteres')
    .matches(/^[a-zA-Z0-9À-ÿ\s]+$/).withMessage('Nome deve conter apenas letras, números e espaços'),
  body('phone')
    .optional()
    .trim()
    .customSanitizer(value => value ? value.replace(/[\s\-\(\)]/g, '') : value)
    .matches(/^\+?[0-9]{9,15}$/).withMessage('Telefone inválido'),
  body('accountType')
    .isIn(['pessoal', 'empresa']).withMessage('Tipo de conta inválido')
];

// ✅ VALIDADOR DE VERIFICATION CODE
export const validateVerificationCode = [
  body('code')
    .trim()
    .isLength({ min: 6, max: 6 }).withMessage('Código deve ter 6 dígitos')
    .isNumeric().withMessage('Código deve conter apenas números'),
  body('challengeToken')
    .trim()
    .notEmpty().withMessage('Challenge token é obrigatório')
];

// ✅ VALIDADOR DE COMPANY PROFILE
export const validateCompanyProfile = [
  body('companyName')
    .trim()
    .isLength({ min: 2, max: 200 }).withMessage('Nome da empresa deve ter entre 2 e 200 caracteres'),
  body('companyEmail')
    .optional()
    .trim()
    .isEmail().withMessage('Email da empresa inválido'),
  body('companyPhone')
    .optional()
    .trim()
    .customSanitizer(value => value ? value.replace(/[\s\-\(\)]/g, '') : value)
    .matches(/^\+?[0-9]{9,15}$/).withMessage('Telefone inválido')
];

// ✅ VALIDADOR DE CANCELAMENTO DE SUBSCRIÇÃO
export const validateCancelSubscription = [
  body('companyProfileId')
    .trim()
    .notEmpty().withMessage('ID do perfil da empresa é obrigatório')
];

// ✅ VALIDADORES DE LOGIN
export const validateLogin = [
  ...validateEmail,
  body('password')
    .trim()
    .notEmpty().withMessage('Password é obrigatória')
];

// ✅ VALIDADOR DE REQUEST PASSWORD RESET
export const validateRequestPasswordReset = [
  ...validateEmail
];

// ✅ VALIDADOR DE RESET PASSWORD
export const validateResetPassword = [
  ...validateEmail,
  body('code')
    .trim()
    .isLength({ min: 6, max: 6 }).withMessage('Código deve ter 6 dígitos')
    .isNumeric().withMessage('Código deve conter apenas números'),
  body('newPassword')
    .trim()
    .isLength({ min: 8 }).withMessage('Nova password deve ter pelo menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Nova password deve conter maiúsculas, minúsculas e números')
];

// ✅ VALIDADOR DE ID (UUID, número, ou IDs alfanuméricos com hífens/underscores)
export const validateId = [
  param('id')
    .trim()
    .custom(value => {
      // Aceitar UUID, número, ou IDs alfanuméricos (ex: demo-empresa-profile-001, user_123)
      if (validator.isUUID(value) || validator.isNumeric(value) || /^[a-zA-Z0-9_-]+$/.test(value)) {
        return true;
      }
      throw new Error('ID inválido');
    })
];

// ✅ MIDDLEWARE DE VALIDAÇÃO DE ERROS
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path,
      message: err.msg
    }));
    
    return res.status(400).json({
      error: 'Dados inválidos',
      details: formattedErrors
    });
  }
  
  next();
};

// 🛡️ MIDDLEWARE DE ERRO GLOBAL - Esconde detalhes sensíveis
export const errorHandler = (err, req, res, next) => {
  const IS_PRODUCTION = process.env.NODE_ENV === 'production';
  
  // 📊 Log do erro (APENAS servidor, nunca enviar ao cliente)
  console.error('🚨 ERRO:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: req.ip,
    error: err.message,
    stack: err.stack
  });
  
  // ⚠️ PRODUÇÃO: Mensagem genérica (não expor detalhes)
  if (IS_PRODUCTION) {
    return res.status(err.status || 500).json({
      error: 'Ocorreu um erro no servidor. Por favor, tente novamente.'
    });
  }
  
  // 🔓 DESENVOLVIMENTO: Detalhes para debug
  return res.status(err.status || 500).json({
    error: err.message,
    stack: err.stack?.split('\n').slice(0, 5) // Apenas primeiras 5 linhas
  });
};

// 🛡️ SAFE LOGGER - Nunca loga passwords ou dados sensíveis
const SENSITIVE_FIELDS = ['password', 'passwordHash', 'token', 'secret', 'apiKey', 'creditCard'];

export const safeLog = (message, data) => {
  if (!data) {
    console.log(message);
    return;
  }
  
  // Clone e remove campos sensíveis
  const safeCopy = JSON.parse(JSON.stringify(data));
  
  const removeSensitive = (obj) => {
    if (typeof obj !== 'object' || obj === null) return;
    
    Object.keys(obj).forEach(key => {
      const lowerKey = key.toLowerCase();
      
      // Remover campos sensíveis
      if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))) {
        obj[key] = '***REDACTED***';
      } else if (typeof obj[key] === 'object') {
        removeSensitive(obj[key]);
      }
    });
  };
  
  removeSensitive(safeCopy);
  console.log(message, safeCopy);
};

// ✅ EXPORTAÇÕES
export default {
  sanitizeInput,
  sanitizeMiddleware,
  validateEmail,
  validatePassword,
  validateRegister,
  validateLogin,
  validateId,
  validateVerificationCode,
  validateRequestPasswordReset,
  validateResetPassword,
  validateCompanyProfile,
  validateCancelSubscription,
  handleValidationErrors,
  errorHandler,
  safeLog
};
