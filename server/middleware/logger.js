// 🔒 SECURITY LOGGER COM WINSTON
import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// 📝 Configuração do Winston Logger
const logger = winston.createLogger({
  level: IS_PRODUCTION ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'qzero-api' },
  transports: [
    // ✅ ARQUIVO DE ERROS
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // ✅ ARQUIVO DE SEGURANÇA (tentativas falhadas, acessos suspeitos)
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/security.log'),
      level: 'warn',
      maxsize: 5242880,
      maxFiles: 5,
    }),
    
    // ✅ ARQUIVO GERAL
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
  ],
});

// 🔓 DESENVOLVIMENTO: Também logar no console
if (!IS_PRODUCTION) {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

// 🛡️ LOGS DE SEGURANÇA ESPECÍFICOS

export const logSecurityEvent = (event, details) => {
  logger.warn('SECURITY_EVENT', {
    event,
    ...details,
    timestamp: new Date().toISOString()
  });
};

export const logAuthFailure = (req, reason) => {
  logSecurityEvent('AUTH_FAILURE', {
    ip: req.ip,
    path: req.path,
    method: req.method,
    reason,
    userAgent: req.headers['user-agent'],
  });
};

export const logAuthSuccess = (req, userId, email) => {
  logger.info('AUTH_SUCCESS', {
    event: 'LOGIN',
    userId,
    email,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString()
  });
};

export const logSuspiciousActivity = (req, reason, details = {}) => {
  logSecurityEvent('SUSPICIOUS_ACTIVITY', {
    ip: req.ip,
    path: req.path,
    method: req.method,
    reason,
    ...details,
    userAgent: req.headers['user-agent'],
  });
};

export const logDataAccess = (userId, resource, action) => {
  logger.info('DATA_ACCESS', {
    userId,
    resource,
    action,
    timestamp: new Date().toISOString()
  });
};

export default logger;
