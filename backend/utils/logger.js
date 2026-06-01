const pino = require('pino');

// Sensitive fields to redact from logs
const redactPaths = [
  'password',
  'confirmPassword',
  'currentPassword',
  'newPassword',
  'token',
  'session_token',
  'sessionId',
  'cookie',
  'authorization',
  'razorpay_signature'
];

const isProduction = process.env.NODE_ENV === 'production';

// In development, use pino-pretty for human-readable output
const transport = isProduction
  ? undefined
  : {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
        ignore: 'pid,hostname',
      },
    };

const pinoLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: redactPaths,
    censor: '[REDACTED]'
  },
  base: null, // Remove pid and hostname
  timestamp: pino.stdTimeFunctions.isoTime
}, transport ? pino.transport(transport) : undefined);

// Structured logger wrapper
const logger = {
  info: (msg, details = {}) => {
    pinoLogger.info(details, msg);
  },
  error: (msg, details = {}) => {
    if (details instanceof Error) {
      pinoLogger.error({ err: { message: details.message, stack: details.stack } }, msg);
    } else {
      pinoLogger.error(details, msg);
    }
  },
  warn: (msg, details = {}) => {
    pinoLogger.warn(details, msg);
  },
  debug: (msg, details = {}) => {
    pinoLogger.debug(details, msg);
  }
};

module.exports = logger;
