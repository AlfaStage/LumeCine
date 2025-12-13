import { AppModule } from '@/app.module';
import { EnvService } from '@/modules/env/env.service';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import * as packageJson from '@package';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(EnvService);

  const environment = config.get('NODE_ENV');
  const appPort = config.get('APP_PORT');
  const appUrl = config.get('APP_URL');
  const manifestUrl = `${appUrl}/manifest.json`;

  app.enableCors({ origin: '*', allowedHeaders: '*', methods: '*' });
  app.disable('x-powered-by');

  await app.listen(appPort, () => {
    const startDate = new Date().toLocaleString();

    console.log();
    console.log('🌉 HTTP server was successfully started.');
    console.log(`🚀 LumeCine: v${packageJson.version}`);
    console.log(`🔒 Environment: ${environment}`);
    console.log(`✨ Manifest URL: ${manifestUrl}`);
    console.log(`🕒 Started at: ${startDate}`);
    console.log();
  });
}

bootstrap();
