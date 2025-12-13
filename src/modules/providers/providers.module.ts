import { EnvModule } from '@/modules/env/env.module';
import { NlpModule } from '@/modules/nlp/nlp.module';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { ProvidersService } from '@/modules/providers/providers.service';
import { ProvidersTrendingService } from '@/modules/providers/services/trending.service';
import { TmdbModule } from '@/modules/tmdb/tmdb.module';
import { RedeCanaisModule } from '@/providers/redecanais/redecanais.module';
import { SuperflixApiModule } from '@/providers/superflixapi/superflixapi.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    EnvModule,
    PrismaModule,
    NlpModule,
    TmdbModule,
    RedeCanaisModule,
    SuperflixApiModule,
  ],
  providers: [ProvidersService, ProvidersTrendingService],
  exports: [ProvidersService, ProvidersTrendingService],
})
export class ProvidersModule {}


