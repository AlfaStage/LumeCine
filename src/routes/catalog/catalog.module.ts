import { ProvidersModule } from '@/modules/providers/providers.module';
import { StremioModule } from '@/modules/stremio/stremio.module';
import { CatalogController } from '@/routes/catalog/catalog.controller';
import { Module } from '@nestjs/common';

@Module({
  imports: [ProvidersModule, StremioModule],
  controllers: [CatalogController],
})
export class CatalogModule {}
