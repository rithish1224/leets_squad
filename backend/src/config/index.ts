import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env'),
];

for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
  }
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dsa_accountability',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  leetcode: {
    graphqlUrl: 'https://leetcode.com/graphql',
  },
  email: {
    service: process.env.EMAIL_SERVICE || 'gmail',
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
    from: process.env.EMAIL_FROM || 'noreply@leetsquad.com',
    resendApiKey: process.env.RESEND_API_KEY || '',
  },
};

// Validate production configuration
export function validateProductionConfig() {
  const isProduction = config.nodeEnv === 'production';
  
  if (isProduction) {
    const required = [
      { key: 'DATABASE_URL', value: process.env.DATABASE_URL },
      { key: 'JWT_SECRET', value: process.env.JWT_SECRET },
      { key: 'CORS_ORIGIN', value: process.env.CORS_ORIGIN },
      { key: 'RESEND_API_KEY', value: config.email.resendApiKey },
    ];

    const missing = required.filter(item => !item.value);
    
    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables for production: ${missing.map(m => m.key).join(', ')}`
      );
    }

    // Validate JWT secret strength (should be at least 32 chars)
    if (config.jwt.secret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters for production');
    }

    if (config.corsOrigin.includes('localhost')) {
      throw new Error('CORS_ORIGIN must not include localhost in production');
    }
  }
}
