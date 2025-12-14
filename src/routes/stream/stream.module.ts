import { EnvModule } from '@/modules/env/env.module';
import { ProvidersModule } from '@/modules/providers/providers.module';
import { StremioModule } from '@/modules/stremio/stremio.module';
import { TmdbModule } from '@/modules/tmdb/tmdb.module';
import { StreamController } from '@/routes/stream/stream.controller';
import { Module } from '@nestjs/common';

@Module({
  imports: [EnvModule, ProvidersModule, StremioModule, TmdbModule],
  controllers: [StreamController],
})
export class StreamModule {}
