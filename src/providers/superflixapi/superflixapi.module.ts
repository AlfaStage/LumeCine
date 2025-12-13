import { EnvModule } from '@/modules/env/env.module';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { TmdbModule } from '@/modules/tmdb/tmdb.module';
import { SuperflixApiProvider } from '@/providers/superflixapi/superflixapi.provider';
import { SuperflixApiService } from '@/providers/superflixapi/services/api.service';
import { SuperflixMovieSourcesService } from '@/providers/superflixapi/services/sources/movie.service';
import { SuperflixSeriesSourcesService } from '@/providers/superflixapi/services/sources/series.service';
import { SuperflixMovieStreamsService } from '@/providers/superflixapi/services/streams/movie.service';
import { SuperflixSeriesStreamsService } from '@/providers/superflixapi/services/streams/series.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [EnvModule, PrismaModule, TmdbModule],
  providers: [
    SuperflixApiProvider,
    SuperflixApiService,
    SuperflixMovieSourcesService,
    SuperflixSeriesSourcesService,
    SuperflixMovieStreamsService,
    SuperflixSeriesStreamsService,
  ],
  exports: [],
})
export class SuperflixApiModule {}
