import { ProvidersModule } from '@/modules/providers/providers.module';
import { StremioModule } from '@/modules/stremio/stremio.module';
import { MetaController } from '@/routes/meta/meta.controller';
import { Module } from '@nestjs/common';

@Module({
  imports: [ProvidersModule, StremioModule],
  controllers: [MetaController],
})
export class MetaModule {}
