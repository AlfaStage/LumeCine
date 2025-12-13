import {
  DelegateMovieProperties,
  DelegateMovieProviders,
  DelegateSeriesEpisodes,
  DelegateSeriesProperties,
  DelegateSeriesProviders,
} from '@/modules/providers/providers.service';
import { ProvidersRegistryService } from '@/modules/providers/services/registry.service';
import { RedeCanaisGetterService } from '@/providers/redecanais/services/getter.service';
import { RedeCanaisProcessorService } from '@/providers/redecanais/services/processor.service';
import { RedeCanaisMovieStreamsService } from '@/providers/redecanais/services/streams/movie.service';
import { RedeCanaisSeriesStreamsService } from '@/providers/redecanais/services/streams/series.service';
import { Injectable } from '@nestjs/common';
import { Audio, Provider, Quality } from '@prisma/client';

@Injectable()
export class RedeCanaisProvider extends ProvidersRegistryService {
  public readonly provider = Provider.REDECANAIS;

  public movies: DelegateMovieProperties[] = [];
  public series: DelegateSeriesProperties[] = [];

  public constructor(
    private readonly redeCanaisGetterService: RedeCanaisGetterService,
    private readonly redeCanaisProcessorService: RedeCanaisProcessorService,
    private readonly redeCanaisMovieStreamsService: RedeCanaisMovieStreamsService,
    private readonly redeCanaisSeriesStreamsService: RedeCanaisSeriesStreamsService,
  ) {
    super();
    this.register(this.provider);
  }

  public async fetchMovies(): Promise<DelegateMovieProviders[]> {
    return await this.redeCanaisGetterService.fetchMovies();
  }

  public async fetchSeries(): Promise<DelegateSeriesProviders[]> {
    return await this.redeCanaisGetterService.fetchSeries();
  }

  public async indexMovies(movies: DelegateMovieProviders[]): Promise<void> {
    const index = await this.redeCanaisProcessorService.indexMovies(movies);
    const save = await this.redeCanaisProcessorService.saveMovies(index);

    this.movies = save;
  }

  public async indexSeries(series: DelegateSeriesProviders[]): Promise<void> {
    const index = await this.redeCanaisProcessorService.indexSeries(series);
    const save = await this.redeCanaisProcessorService.saveSeries(index);

    this.series = save;
  }

  public async refreshMovieUrl(
    movie: DelegateMovieProperties,
    audio: Audio,
    quality: Quality,
  ): Promise<string> {
    return await this.redeCanaisMovieStreamsService.getStream(
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
    return await this.redeCanaisSeriesStreamsService.getStream(
      series,
      season,
      episode,
      audio,
    );
  }

  public async getSeriesEpisodes(
    series: DelegateSeriesProperties,
  ): Promise<DelegateSeriesEpisodes[]> {
    const seasons =
      await this.redeCanaisSeriesStreamsService.getSeasons(series);
    const episodes: DelegateSeriesEpisodes[] = [];

    for (let i = 0; i < seasons.length; i++) {
      for (let j = 0; j < seasons[i].length; j++) {
        episodes.push({
          title: seasons[i][j].title,
          season: i,
          episode: j,
          tracks: seasons[i][j].tracks,
        });
      }
    }

    return episodes;
  }
}
