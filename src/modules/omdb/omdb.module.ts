import { EnvModule } from '@/modules/env/env.module';
import { OmdbService } from '@/modules/omdb/omdb.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [EnvModule],
  providers: [OmdbService],
  exports: [OmdbService],
})
export class OmdbModule {}
