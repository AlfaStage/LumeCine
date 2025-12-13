import { envSchema } from '@/modules/env/env';
import { EnvService } from '@/modules/env/env.service';
import { ProviderUrlsService } from '@/modules/env/provider-urls.service';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => envSchema.parse(config),
    }),
  ],
  providers: [EnvService, ProviderUrlsService],
  exports: [EnvService, ProviderUrlsService],
})
export class EnvModule {}

