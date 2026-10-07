// NOTE: Bootstraps the Nest application and starts the HTTP server.
import './bootstrap/instrument';
import type { ConfigType } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { setupHttpLayer } from './bootstrap/http-app.setup';
import appConfig from './config/app.config';
import { setupSwagger } from './common/swagger/setup-swagger';
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.setGlobalPrefix('api');
  const appCfg = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);
  setupHttpLayer(app, appCfg);
  app.useLogger(app.get(Logger));
  setupSwagger(app, appCfg);
  await app.listen(appCfg.port);
  app
    .get(Logger)
    .log(`[OK] Application ${appCfg.appName} running on port ${appCfg.port}`);
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
