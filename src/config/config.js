import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 8000,
  apiVersion: process.env.API_VERSION || 'v1',

  // Database
  database: {
    url: process.env.DATABASE_URL,
  },

  // Redis
  redis: {
    enabled: process.env.REDIS_ENABLED === 'true',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
  },

  // JWT
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  // Security
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  // CORS
  cors: {
    origin: (origin, callback) => {
      const allowed = [
        'https://railway-project-frontend.vercel.app',
        'http://localhost:3000',
        'http://localhost:5173',
        'https://www.dutyhours.in/',
        'https://dutyhours.in/'
      ];
      if (!origin || allowed.includes(origin)) return callback(null, true);
      return callback(new Error('CORS blocked: origin not allowed'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
    ],
    exposedHeaders: ['Content-Length', 'X-Request-Id'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  },

  // Socket.io
  socket: {
    corsOrigin: process.env.SOCKET_IO_CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  },

  // Monitoring
  prometheus: {
    port: parseInt(process.env.PROMETHEUS_PORT, 10) || 9090,
  },

  // to manage diff features , better testing , 1 by 1
  features: {
    monitoringEnabled: process.env.MONITORING_ENABLED === 'true',
    socketEnabled: process.env.SOCKET_ENABLED === 'true',
    seedOnStartup: process.env.SEED_ON_STARTUP === 'false',
  },

//(in hours)
  dutyAlerts: {
    alert8Hr: parseInt(process.env.DUTY_ALERT_8HR, 10) || 8,
    alert9Hr: parseInt(process.env.DUTY_ALERT_9HR, 10) || 9,
    alert11Hr: parseInt(process.env.DUTY_ALERT_11HR, 10) || 11,
    alert12Hr: parseInt(process.env.DUTY_ALERT_12HR, 10) || 12,
    alert14Hr: parseInt(process.env.DUTY_ALERT_14HR, 10) || 14,
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
];

const missingEnvVars = requiredEnvVars.filter(
  (envVar) => !process.env[envVar]
);

if (missingEnvVars.length > 0 && config.env === 'production') {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(', ')}`
  );
}

export default config;
