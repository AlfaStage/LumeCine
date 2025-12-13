import { EnvModule } from '@/modules/env/env.module';
import { ProvidersModule } from '@/modules/providers/providers.module';
import { StremioService } from '@/modules/stremio//stremio.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [EnvModule, ProvidersModule],
  providers: [StremioService],
  exports: [StremioService],
})
export class StremioModule {}
