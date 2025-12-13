import { EnvService } from '@/modules/env/env.service';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { API_URL, IMAGE_URL } from '@/modules/tmdb/constants/url';
import {
  ContentType,
  Genre,
  Search,
  SearchMovie,
  SearchTv,
  TrendingType,
} from '@/modules/tmdb/types/tmdb';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import axios from 'axios';

export type DelegateMedias = Prisma.MovieDelegate & Prisma.SeriesDelegate;

export type DelegateGenres = Prisma.MovieGenreDelegate &
  Prisma.SeriesGenreDelegate;

@Injectable()
export class TmdbService implements OnModuleInit {
  private readonly logger = new Logger(TmdbService.name);
  private readonly api = axios.create({
    baseURL: API_URL,
    headers: { authorization: `Bearer ${this.envService.get('TMDB_KEY')}` },
  });

  public constructor(
    private readonly envService: EnvService,
    private readonly prismaService: PrismaService,
  ) {}

  public async onModuleInit(): Promise<void> {
    const isSessionValid = await this.validateKey();

    if (!isSessionValid) {
      this.logger.error('Invalid TMDB api key, check environment settings.');
      process.exit(1);
    }
  }

  public convertMediaContentType(type: ContentType): DelegateMedias {
    switch (type) {
      case 'movie':
        return this.prismaService.movie as DelegateMedias;
      case 'tv':
        return this.prismaService.series as DelegateMedias;
    }
  }

  public convertGenreContentType(type: ContentType): DelegateGenres {
    switch (type) {
      case 'movie':
        return this.prismaService.movieGenre as DelegateGenres;
      case 'tv':
        return this.prismaService.seriesGenre as DelegateGenres;
    }
  }

  public async validateKey(): Promise<boolean> {
    const { status } = await this.api.get('authentication');
    return status === 200;
  }

  public async listGenres(type: ContentType): Promise<{ genres: Genre[] }> {
    const searchParams = new URLSearchParams();
    searchParams.append('language', 'pt-BR');

    const params = searchParams.toString();
    const uri = `genre/${type}/list?${params}`;

    const { status, data } = await this.api.get<{ genres: Genre[] }>(uri);
    return status === 200 ? data : { genres: [] };
  }

  public async searchMedia(
    type: ContentType,
    query: string,
    page: number = 1,
  ): Promise<(SearchMovie & SearchTv)[]> {
    const searchParams = new URLSearchParams();

    searchParams.append('query', query);
    searchParams.append('page', String(page));
    searchParams.append('language', 'pt-BR');
    searchParams.append('include_adult', String(true));

    const params = searchParams.toString();
    const uri = `search/${type}?${params}`;

    const { status, data } =
      await this.api.get<Search<SearchMovie & SearchTv>>(uri);

    if (status === 200) {
      const formatted = this.formatSearch(data);
      return formatted;
    }

    return [];
  }

  public async getTrending(
    type: ContentType,
    trending: TrendingType,
    page: number = 1,
  ): Promise<(SearchMovie & SearchTv)[]> {
    const searchParams = new URLSearchParams();

    searchParams.append('page', String(page));
    searchParams.append('language', 'pt-BR');
    searchParams.append('include_adult', String(false));

    switch (trending) {
      case TrendingType.POPULAR:
        searchParams.append('sort_by', 'popularity.desc');
        break;

      case TrendingType.TOP_RATED:
        searchParams.append('sort_by', 'vote_average.desc');
        searchParams.append('vote_count.gte', String(200));
        break;

      case TrendingType.THEATHER:
        searchParams.append('sort_by', 'popularity.desc');
        searchParams.append('with_release_type', '2|3');
        break;
    }

    const params = searchParams.toString();
    const uri = `discover/${type}?${params}`;

    const { status, data } =
      await this.api.get<Search<SearchMovie & SearchTv>>(uri);

    if (status === 200) {
      const formatted = this.formatSearch(data);
      return formatted;
    }

    return [];
  }

  public async getMovieExternalIds(
    movieId: number,
  ): Promise<{ imdb_id: string | null } | null> {
    try {
      const uri = `movie/${movieId}/external_ids`;
      const { status, data } = await this.api.get<{ imdb_id: string | null }>(
        uri,
      );
      return status === 200 ? data : null;
    } catch {
      return null;
    }
  }

  private formatSearch(
    data: Search<SearchMovie & SearchTv>,
  ): (SearchMovie & SearchTv)[] {
    const formatted: (SearchMovie & SearchTv)[] = [];

    for (const item of data.results) {
      const backdropPath = `${IMAGE_URL}${item.backdrop_path}`;
      const posterPath = `${IMAGE_URL}${item.poster_path}`;
      const popularity = item.popularity ?? 0;
      const voteAverage = item.vote_average ?? 0;
      const genresId = item.genre_ids ?? [];

      item.backdrop_path = backdropPath;
      item.poster_path = posterPath;
      item.popularity = Number(popularity.toFixed(1));
      item.vote_average = Number(voteAverage.toFixed(1));
      item.genre_ids = genresId;

      formatted.push(item);
    }

    return formatted;
  }
}
