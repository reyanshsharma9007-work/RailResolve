// source/config/env.js
// Centralized environment configuration. Every other module reads config
// from here instead of touching process.env directly, so defaults and
// validation live in exactly one place.

require('dotenv').config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),

  MONGODB_URI: required('MONGODB_URI', 'mongodb://localhost:27017/railresolve'),

  JWT_SECRET: required('JWT_SECRET', 'dev_only_insecure_secret_change_me'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',

  BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),

  FASTAPI_URL: process.env.FASTAPI_URL || 'http://localhost:8000',
  INTERNAL_SERVICE_TOKEN: process.env.INTERNAL_SERVICE_TOKEN || 'dev_only_internal_token',
  FASTAPI_REQUEST_TIMEOUT_MS: parseInt(process.env.FASTAPI_REQUEST_TIMEOUT_MS || '8000', 10),

  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  MAX_IMAGE_SIZE_BYTES: parseInt(process.env.MAX_IMAGE_SIZE_BYTES || `${5 * 1024 * 1024}`, 10),
  MAX_DOCUMENT_SIZE_BYTES: parseInt(process.env.MAX_DOCUMENT_SIZE_BYTES || `${10 * 1024 * 1024}`, 10),

  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || `${15 * 60 * 1000}`, 10),
  AUTH_RATE_LIMIT_MAX: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10', 10),
  COMPLAINT_RATE_LIMIT_MAX: parseInt(process.env.COMPLAINT_RATE_LIMIT_MAX || '30', 10),
  UPLOAD_RATE_LIMIT_MAX: parseInt(process.env.UPLOAD_RATE_LIMIT_MAX || '20', 10),

  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  isProduction() {
    return this.NODE_ENV === 'production';
  },
};

module.exports = env;
