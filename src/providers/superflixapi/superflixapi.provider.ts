import {
  DelegateMovieProperties,
  DelegateSeriesEpisodes,
  DelegateSeriesProperties,
} from '@/modules/providers/providers.service';
import { ProvidersRegistryService } from '@/modules/providers/services/registry.service';
import { SuperflixMovieStreamsService } from '@/providers/superflixapi/services/streams/movie.service';
import { SuperflixSeriesStreamsService } from '@/providers/superflixapi/services/streams/series.service';
import { Injectable } from '@nestjs/common';
import { Audio, Provider, Quality } from '@prisma/client';

@Injectable()
export class SuperflixApiProvider extends ProvidersRegistryService {
  public readonly provider = Provider.SUPERFLIXAPI;

  public movies: DelegateMovieProperties[] = [];
  public series: DelegateSeriesProperties[] = [];

  public constructor(
    private readonly superflixMovieStreamsService: SuperflixMovieStreamsService,
    private readonly superflixSeriesStreamsService: SuperflixSeriesStreamsService,
  ) {
    super();
    this.register(this.provider);
  }

  // SuperflixAPI doesn't need to index movies/series like RedeCanais
  // because it uses TMDB/IMDB IDs directly for on-demand streaming
  public async fetchMovies() {
    return [];
  }

  public async fetchSeries() {
    return [];
  }

  public async indexMovies() {}

  public async indexSeries() {}

  public async refreshMovieUrl(
    movie: DelegateMovieProperties,
    audio: Audio,
    quality: Quality,
  ): Promise<string> {
    return await this.superflixMovieStreamsService.getStream(
      movie,
      audio,
      quality,
    );
  }

  public async refreshSeriesUrl(
    series: DelegateSeriesProperties,
    season: number,
    episode: number,
    audio: Audio,
  ): Promise<string> {
    return await this.superflixSeriesStreamsService.getStream(
      series,
      season,
      episode,
      audio,
    );
  }

  public async getSeriesEpisodes(
    series: DelegateSeriesProperties,
  ): Promise<DelegateSeriesEpisodes[]> {
    // SuperflixAPI doesn't provide a catalog of episodes
    // It works on-demand with direct season/episode access
    // Episodes info comes from TMDB/other providers
    return [];
  }
}
