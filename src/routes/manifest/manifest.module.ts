import { EnvModule } from '@/modules/env/env.module';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { ProvidersModule } from '@/modules/providers/providers.module';
import { ManifestController } from '@/routes/manifest/manifest.controller';
import { ManifestService } from '@/routes/manifest/manifest.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [EnvModule, PrismaModule, ProvidersModule],
  providers: [ManifestService],
  controllers: [ManifestController],
})
export class ManifestModule {}
