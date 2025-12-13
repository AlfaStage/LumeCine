import { EnvModule } from '@/modules/env/env.module';
import { NlpModule } from '@/modules/nlp/nlp.module';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { TmdbModule } from '@/modules/tmdb/tmdb.module';
import { RedeCanaisProvider } from '@/providers/redecanais/redecanais.provider';
import { RedeCanaisApiService } from '@/providers/redecanais/services/api.service';
import { RedeCanaisGetterService } from '@/providers/redecanais/services/getter.service';
import { RedeCanaisProcessorService } from '@/providers/redecanais/services/processor.service';
import { RedeCanaisMovieSeriesSourcesService } from '@/providers/redecanais/services/sources/movie-series.service';
import { RedeCanaisSeriesSourcesService } from '@/providers/redecanais/services/sources/series.service';
import { RedeCanaisMovieStreamsService } from '@/providers/redecanais/services/streams/movie.service';
import { RedeCanaisSeriesStreamsService } from '@/providers/redecanais/services/streams/series.service';
import { RedeCanaisUrlService } from '@/providers/redecanais/services/url.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [EnvModule, PrismaModule, NlpModule, TmdbModule],
  providers: [
    RedeCanaisProvider,
    RedeCanaisApiService,
    RedeCanaisGetterService,
    RedeCanaisProcessorService,
    RedeCanaisMovieSeriesSourcesService,
    RedeCanaisSeriesSourcesService,
    RedeCanaisMovieStreamsService,
    RedeCanaisSeriesStreamsService,
    RedeCanaisUrlService,
  ],
  exports: [],
})
export class RedeCanaisModule {}
