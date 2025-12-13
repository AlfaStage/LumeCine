import { EnvService } from '@/modules/env/env.service';
import { NlpProcessingService } from '@/modules/nlp/services/processing.service';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { ProvidersRegistryService } from '@/modules/providers/services/registry.service';
import { ProvidersTrendingService } from '@/modules/providers/services/trending.service';
import { ContentType, TrendingType } from '@/modules/tmdb/types/tmdb';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  Audio,
  Movie,
  MovieGenre,
  MovieStream,
  Provider,
  Quality,
  Series,
  SeriesGenre,
  SeriesStream,
} from '@prisma/client';

export type DelegateMovieProperties = Movie & {
  genres: MovieGenre[];
};

export type DelegateSeriesProperties = Series & {
  genres: SeriesGenre[];
};

export type DelegateMovieProviders = {
  url: string;
  title: string;
  audio: Audio;
  quality: Quality;
};

export type DelegateSeriesProviders = {
  url: string;
  title: string;
};

export type DelegateMovieStreams = DelegateMovieProperties & {
  provider: DelegateMovieProviders;
};

export type DelegateSeriesStreams = DelegateSeriesProperties & {
  provider: DelegateSeriesProviders;
};

export type DelegateSeriesEpisodes = {
  title: string;
  season: number;
  episode: number;
  tracks: {
    url: string;
    audio: Audio;
  }[];
};

export type DelegateStreamProperties = MovieStream | SeriesStream;

@Injectable()
export class ProvidersService implements OnModuleInit {
  private readonly logger = new Logger(ProvidersService.name);

  public movies: DelegateMovieProperties[] = [];
  public series: DelegateSeriesProperties[] = [];

  public constructor(
    private readonly envService: EnvService,
    private readonly prismaService: PrismaService,
    private readonly nlpProcessingService: NlpProcessingService,
    private readonly providersTrendingService: ProvidersTrendingService,
  ) {}

  public async onModuleInit(): Promise<void> {
    if (this.envService.get('NODE_ENV') === 'seed') {
      this.logger.log(
        'Indexing providers, this process can take up to 1 hour, please wait...',
      );

      // TMDb sometimes blocks requests, so we need to multiply the requests.
      // Also, we need to make requests in parallel to speed up the process.
      for (let i = 0; i < 50; i++) {
        await Promise.all([this.indexMovies(), this.indexSeries()]);
      }

      this.logger.log('Providers was successfully indexed.');
    }

    this.logger.log('Fetching providers, please wait...');
    await Promise.all([this.fetchMovies(), this.fetchSeries()]);
    this.logger.log('Providers was successfully fetched.');
  }

  public async getMovie(id: number): Promise<DelegateMovieProperties> {
    return await this.prismaService.movie.findFirst({
      where: { id },
      include: { genres: true },
    });
  }

  public async getSeries(id: number): Promise<DelegateSeriesProperties> {
    return await this.prismaService.series.findFirst({
      where: { id },
      include: { genres: true },
    });
  }

  public async getMovieList(options?: {
    trending?: TrendingType;
    query?: string;
    genre?: string;
    skip?: number;
    take?: number;
  }): Promise<DelegateMovieProperties[]> {
    if (!options?.trending || options?.trending === TrendingType.ALL) {
      return this.movies
        .filter((movie) =>
          options?.query
            ? this.nlpProcessingService.isPhraseSimilar(
                movie.title,
                options.query,
              ) ||
              this.nlpProcessingService
                .normalize(movie.title)
                .indexOf(this.nlpProcessingService.normalize(options.query)) !==
                -1
            : true,
        )
        .filter((movie) =>
          options?.genre
            ? movie.genres.some((genre) => genre.name === options.genre)
            : true,
        )
        .slice(
          options?.skip ?? 0,
          (options?.skip ?? 0) + (options?.take ?? 25),
        );
    }

    const trending = Array.from(
      this.providersTrendingService.trendingMovies.values(),
    );

    return trending
      .filter((movie) => movie.type === options.trending)
      .filter((movie) =>
        options?.query
          ? this.nlpProcessingService.isPhraseSimilar(
              movie.data.title,
              options.query,
            ) ||
            this.nlpProcessingService
              .normalize(movie.data.title)
              .indexOf(this.nlpProcessingService.normalize(options.query)) !==
              -1
          : true,
      )
      .filter((movie) =>
        options?.genre
          ? movie.data.genres.some((genre) => genre.name === options.genre)
          : true,
      )
      .slice(options?.skip ?? 0, (options?.skip ?? 0) + (options?.take ?? 25))
      .map((movie) => movie.data);
  }

  public async getSeriesList(options?: {
    trending?: TrendingType;
    query?: string;
    genre?: string;
    skip?: number;
    take?: number;
  }): Promise<DelegateSeriesProperties[]> {
    if (!options?.trending || options?.trending === TrendingType.ALL) {
      return this.series
        .filter((series) =>
          options?.query
            ? this.nlpProcessingService.isPhraseSimilar(
                series.title,
                options.query,
              ) ||
              this.nlpProcessingService
                .normalize(series.title)
                .indexOf(this.nlpProcessingService.normalize(options.query)) !==
                -1
            : true,
        )
        .filter((series) =>
          options?.genre
            ? series.genres.some((genre) => genre.name === options.genre)
            : true,
        )
        .slice(
          options?.skip ?? 0,
          (options?.skip ?? 0) + (options?.take ?? 25),
        );
    }

    const trending = Array.from(
      this.providersTrendingService.trendingSeries.values(),
    );

    return trending
      .filter((series) => series.type === options.trending)
      .filter((series) =>
        options?.query
          ? this.nlpProcessingService.isPhraseSimilar(
              series.data.title,
              options.query,
            ) ||
            this.nlpProcessingService
              .normalize(series.data.title)
              .indexOf(this.nlpProcessingService.normalize(options.query)) !==
              -1
          : true,
      )
      .filter((series) =>
        options?.genre
          ? series.data.genres.some((genre) => genre.name === options.genre)
          : true,
      )
      .slice(options?.skip ?? 0, (options?.skip ?? 0) + (options?.take ?? 25))
      .map((series) => series.data);
  }

  public async getStream(id: string): Promise<DelegateStreamProperties> {
    const movieStream = await this.prismaService.movieStream.findFirst({
      where: { id },
    });

    if (movieStream) {
      return movieStream;
    }

    const seriesStream = await this.prismaService.seriesStream.findFirst({
      where: { id },
    });

    return seriesStream;
  }

  public async getMovieStreams(
    movie: DelegateMovieProperties,
  ): Promise<MovieStream[]> {
    const streams: MovieStream[] = [];

    // First, get existing streams from database
    const existingStreams = await this.prismaService.movieStream.findMany({
      where: { movieId: movie.id },
    });
    streams.push(...existingStreams);

    // Then check if we need to generate streams for on-demand providers
    for (const provider of this.getProviders()) {
      // Skip if we already have a stream from this provider
      const hasStreamFromProvider = streams.some(
        (s) => s.provider === provider.type,
      );
      if (hasStreamFromProvider) continue;

      // Try to generate a stream from this provider (on-demand)
      try {
        const url = await provider.refreshMovieUrl(
          movie,
          Audio.DUBBED,
          Quality.UNKNOWN,
        );

        if (url) {
          // Create a stream entry in the database
          const newStream = await this.prismaService.movieStream.create({
            data: {
              provider: provider.type,
              refreshUrl: String(movie.id),
              accessUrl: url,
              audio: Audio.DUBBED,
              quality: Quality.UNKNOWN,
              movieId: movie.id,
              expiresAt: new Date(Date.now() + 3600000), // 1 hour
            },
          });
          streams.push(newStream);
        }
      } catch {
        // Provider doesn't support this movie, skip silently
      }
    }

    return streams;
  }

  public async getSeriesStreams(
    series: DelegateSeriesProperties,
    season: number,
    episode: number,
  ): Promise<SeriesStream[]> {
    const streams: SeriesStream[] = [];

    for (const providers of this.getProviders()) {
      const seasons = await providers.getSeriesEpisodes(series);
      const episodes = seasons.find(
        (s) => s.season === season && s.episode === episode,
      );

      if (!episodes) {
        continue;
      }

      for (const track of episodes.tracks) {
        const stream = await this.prismaService.seriesStream.findFirst({
          where: {
            seriesId: series.id,
            season,
            episode,
            audio: track.audio,
          },
        });

        if (stream) {
          streams.push(stream);
          continue;
        }

        streams.push(
          await this.prismaService.seriesStream.create({
            data: {
              provider: providers.type,
              season,
              episode,
              audio: track.audio,
              refreshUrl: track.url,
              expiresAt: new Date(0),
              seriesId: series.id,
            },
          }),
        );
      }
    }

    return streams;
  }

  public async refreshMovieUrl(
    provider: Provider,
    movie: DelegateMovieProperties,
    audio: Audio,
    quality: Quality,
  ): Promise<string> {
    const providers = this.getProvider(provider);

    if (providers) {
      return await providers.refreshMovieUrl(movie, audio, quality);
    }

    return '';
  }

  public async refreshSeriesUrl(
    provider: Provider,
    series: DelegateSeriesProperties,
    season: number,
    episode: number,
    audio: Audio,
  ): Promise<string> {
    const providers = this.getProvider(provider);

    if (providers) {
      return await providers.refreshSeriesUrl(series, season, episode, audio);
    }

    return '';
  }

  public async getSeriesEpisodes(
    providers: Provider,
    series: DelegateSeriesProperties,
  ): Promise<DelegateSeriesEpisodes[]> {
    const provider = this.getProvider(providers);

    if (provider) {
      return await provider.getSeriesEpisodes(series);
    }

    return [];
  }

  public getProvider(provider: Provider): ProvidersRegistryService {
    return ProvidersRegistryService.providers.get(provider);
  }

  public getProviders(): ProvidersRegistryService[] {
    return Array.from(ProvidersRegistryService.providers.values());
  }

  private async indexMovies(): Promise<void> {
    for (const provider of this.getProviders()) {
      const fetch = await provider.fetchMovies();
      await provider.indexMovies(fetch);
    }
  }

  private async indexSeries(): Promise<void> {
    for (const provider of this.getProviders()) {
      const fetch = await provider.fetchSeries();
      await provider.indexSeries(fetch);
    }
  }

  private async fetchMovies(): Promise<void> {
    this.movies = await this.prismaService.movie.findMany({
      include: { genres: true },
    });
  }

  private async fetchSeries(): Promise<void> {
    this.series = await this.prismaService.series.findMany({
      include: { genres: true },
    });
  }
}
