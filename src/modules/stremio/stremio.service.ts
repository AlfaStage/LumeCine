import { EnvService } from '@/modules/env/env.service';
import {
  DelegateMovieProperties,
  DelegateSeriesProperties,
  ProvidersService,
} from '@/modules/providers/providers.service';
import { ProvidersTrendingService } from '@/modules/providers/services/trending.service';
import { ContentType, TrendingType } from '@/modules/tmdb/types/tmdb';
import { Injectable } from '@nestjs/common';
import { Audio, MovieStream, Quality, SeriesStream } from '@prisma/client';

export type DelegateMetaProperties = {
  type: string;
  id: string;
  moviedb_id: number;
  background: string;
  poster: string;
  name: string;
  description: string;
  genres: string[];
  imdbRating: string;
  releaseInfo: number;
  videos: DelegateMetaVideoProperties[];
};

export type DelegateMetaVideoProperties = {
  id: string;
  season: number;
  episode: number;
  number: number;
  name: string;
  thumbnail: string;
};

@Injectable()
export class StremioService {
  public constructor(
    private readonly envService: EnvService,
    private readonly providersService: ProvidersService,
    private readonly providersTrendingService: ProvidersTrendingService,
  ) {}

  public async getCatalog(options?: {
    type: ContentType;
    trending?: TrendingType;
    search?: string;
    genre?: string;
    skip?: number;
    take?: number;
  }) {
    let metas: (DelegateMovieProperties | DelegateSeriesProperties)[] = [];

    if (options.type === ContentType.MOVIE) {
      metas = await this.providersService.getMovieList({
        trending: options?.trending,
        query: options?.search,
        genre: options?.genre,
        skip: options?.skip,
        take: options?.take,
      });
    } else if (options.type === ContentType.TV) {
      metas = await this.providersService.getSeriesList({
        trending: options?.trending,
        query: options?.search,
        genre: options?.genre,
        skip: options?.skip,
        take: options?.take,
      });
    }

    return Promise.all(
      metas.map(async (meta) => await this.convertMeta(options.type, meta)),
    );
  }

  public async getMeta(options: {
    type: ContentType;
    id: number;
  }) {
    let meta: DelegateMovieProperties | DelegateSeriesProperties;

    if (options.type === ContentType.MOVIE) {
      meta = await this.providersService.getMovie(options.id);
    } else if (options.type === ContentType.TV) {
      meta = await this.providersService.getSeries(options.id);
    }

    return await this.convertMeta(options.type, meta, true);
  }

  public async getStreams(streams: (MovieStream | SeriesStream)[]) {
    return streams.map((stream) => {
      const audio = this.convertAudio(stream.audio);
      const quality = this.convertQuality((stream as MovieStream).quality);
      const title = [audio, quality].filter(Boolean).join(' - ');

      return {
        name: stream.provider,
        title,
        url: `${this.envService.get('APP_URL')}/stream/watch/${stream.id}`,
      };
    });
  }

  public async convertMeta(
    type: ContentType,
    meta: DelegateMovieProperties | DelegateSeriesProperties,
    deep?: boolean,
  ) {
    const videos: DelegateMetaVideoProperties[] = [];

    if (type === ContentType.TV && deep) {
      for (const providers of this.providersService.getProviders()) {
        const episodes = await this.providersService.getSeriesEpisodes(
          providers.type,
          meta,
        );

        for (const episode of episodes) {
          videos.push({
            id: `lumecine:${meta.id}.${episode.season}.${episode.episode}`,
            season: episode.season + 1,
            episode: episode.episode + 1,
            number: episode.episode + 1,
            name: episode.title,
            thumbnail: meta.thumbnail,
          });
        }
      }
    }

    return {
      type: this.providersTrendingService.convertContentTypeToString(type),
      id: `lumecine:${meta.id}`,
      moviedb_id: meta.id,
      background: meta.thumbnail,
      poster: meta.poster,
      name: meta.title,
      description: meta.description,
      genres: meta.genres.map((genre) => genre.name),
      imdbRating: String(meta.rating),
      releaseInfo: meta.releasedAt.getFullYear(),
      videos,
    };
  }

  public convertAudio(audio: Audio) {
    switch (audio) {
      case Audio.UNKNOWN:
        return 'Desconhecido';

      case Audio.DUBBED:
        return 'Dublado';

      case Audio.SUBTITLED:
        return 'Legendado';

      case Audio.ORIGINAL:
        return 'Original';
    }
  }

  public convertQuality(quality: Quality) {
    switch (quality) {
      case Quality.UNKNOWN:
        return 'Desconhecido';

      case Quality.SD:
        return 'SD';

      case Quality.HD:
        return 'HD';

      case Quality.FHD:
        return 'Full HD';

      case Quality.UHD:
        return '4k';
    }
  }
}
