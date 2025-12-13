import { join } from 'node:path';
import { EnvModule } from '@/modules/env/env.module';
import { GenresModule } from '@/modules/genres/genres.module';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { ProvidersModule } from '@/modules/providers/providers.module';
import { CatalogModule } from '@/routes/catalog/catalog.module';
import { ManifestModule } from '@/routes/manifest/manifest.module';
import { MetaModule } from '@/routes/meta/meta.module';
import { StreamModule } from '@/routes/stream/stream.module';
import { Module } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { createZodValidationPipe } from 'nestjs-zod';

@Module({
  imports: [
    EnvModule,
    PrismaModule,
    ProvidersModule,
    GenresModule,
    CatalogModule,
    ManifestModule,
    MetaModule,
    StreamModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'public'),
      serveRoot: '/public/',
    }),
  ],
  providers: [{ provide: APP_PIPE, useClass: createZodValidationPipe() }],
})
export class AppModule {}
