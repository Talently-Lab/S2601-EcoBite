// NOTE: Defines application-level environment configuration.
import { registerAs } from '@nestjs/config';

export default registerAs('app', () => {
  const portRaw = process.env.PORT;
  const port = portRaw !== undefined && portRaw !== '' ? Number(portRaw) : 3000;

  return {
    appName: process.env.APP_NAME?.trim() || 'EcoBite API',
    port: Number.isFinite(port) ? port : 3000,
    nodeEnv: process.env.NODE_ENV ?? 'development',
    frontendOrigins: process.env.FRONTEND_ORIGINS,
    trustProxy: process.env.TRUST_PROXY === 'true',
    logLevel: process.env.LOG_LEVEL?.trim() || undefined,
    swaggerEnabled: process.env.SWAGGER_ENABLED === 'true',
    accessCookieName: process.env.ACCESS_COOKIE_NAME?.trim() || 'access_token',
    sentryDsn: process.env.SENTRY_DSN?.trim() || undefined,
    sentryEnabled: process.env.SENTRY_ENABLED === 'true',
    sentrySendDefaultPii: process.env.SENTRY_SEND_DEFAULT_PII === 'true',
  };
});
