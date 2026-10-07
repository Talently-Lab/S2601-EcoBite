// NOTE: Configures OpenAPI document generation and Swagger UI.
import { type INestApplication } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import appConfig from '../../config/app.config';

export function setupSwagger(
  app: INestApplication,
  appCfg: ConfigType<typeof appConfig>,
): void {
  const disableInProd =
    appCfg.nodeEnv === 'production' && !appCfg.swaggerEnabled;
  if (disableInProd) {
    return;
  }

  const config = new DocumentBuilder()
    .setTitle('EcoBite API')
    .setDescription(
      [
        'REST API for the EcoBite web platform.',
        '',
        '**Authentication:** protected endpoints require a valid access token. Public endpoints are explicitly marked as public.',
        '',
        '**CSRF:** cookie-based mutations require a valid CSRF token obtained from `GET /api/auth/csrf`.',
        '',
        '**Successful responses:** every endpoint returns JSON wrapped by the global interceptor:',
        '`success`, `statusCode`, `statusText`, `timestamp`, `path`, `data`.',
        '',
        '**Errors:** error responses include `success: false`, `message`, and `errors` for validation failures when applicable.',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addCookieAuth('access-cookie', {
      type: 'apiKey',
      in: 'cookie',
      name: appCfg.accessCookieName,
      description:
        'Access JWT in an httpOnly cookie (the bearer scheme can also use the same token).',
    })
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Access JWT (same value as the httpOnly `access_token` cookie or the name configured in `ACCESS_COOKIE_NAME`).',
      },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs/swagger.json',
  });
}
