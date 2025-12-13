import { NlpQueriesService } from '@/modules/nlp/services/queries.service';
import { PrismaService } from '@/modules/prisma/prisma.service';
import {
  DelegateMovieProperties,
  DelegateMovieProviders,
  DelegateMovieStreams,
  DelegateSeriesProperties,
  DelegateSeriesProviders,
  DelegateSeriesStreams,
} from '@/modules/providers/providers.service';
import { TmdbService } from '@/modules/tmdb/tmdb.service';
import { ContentType } from '@/modules/tmdb/types/tmdb';
import { RedeCanaisProvider } from '@/providers/redecanais/redecanais.provider';
import { chunk } from '@/utils/misc';
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { Audio } from '@prisma/client';
import PromisePool from '@supercharge/promise-pool';

export const CONCURRENCY_LIMIT = 25;
export const PROCESS_LIMIT = 10;

@Injectable()
export class RedeCanaisProcessorService {
  public constructor(
    @Inject(forwardRef(() => RedeCanaisProvider))
    private readonly redeCanaisProvider: RedeCanaisProvider,
    private readonly prismaService: PrismaService,
    private readonly tmdbService: TmdbService,
    private readonly nlpQueriesService: NlpQueriesService,
  ) {}

  public async indexMovies(
    movies: DelegateMovieProviders[],
  ): Promise<DelegateMovieStreams[]> {
    const chunks = chunk(movies, CONCURRENCY_LIMIT);
    const result: DelegateMovieStreams[] = [];

    await new PromisePool()
      .withConcurrency(PROCESS_LIMIT)
      .for(chunks)
      .process(async (chunk) => {
        await Promise.all(
          chunk.map(async (provider) => {
            const search = await this.tmdbService.searchMedia(
              ContentType.MOVIE,
              provider.title,
            );

            const nlp = await this.nlpQueriesService.search(
              ContentType.MOVIE,
              provider.title,
              search,
            );

            if (nlp) {
              result.push({ ...nlp, provider });
            }
          }),
        );
      });

    return result;
  }

  public async indexSeries(
    series: DelegateSeriesProviders[],
  ): Promise<DelegateSeriesStreams[]> {
    const chunks = chunk(series, CONCURRENCY_LIMIT);
    const result: DelegateSeriesStreams[] = [];

    await new PromisePool()
      .withConcurrency(PROCESS_LIMIT)
      .for(chunks)
      .process(async (chunk) => {
        await Promise.all(
          chunk.map(async (provider) => {
            const search = await this.tmdbService.searchMedia(
              ContentType.TV,
              provider.title,
            );

            const nlp = await this.nlpQueriesService.search(
              ContentType.TV,
              provider.title,
              search,
            );

            if (nlp) {
              result.push({ ...nlp, provider });
            }
          }),
        );
      });

    return result;
  }

  public async saveMovies(
    movies: DelegateMovieStreams[],
  ): Promise<DelegateMovieProperties[]> {
    const chunks = chunk(movies, CONCURRENCY_LIMIT);
    const result: DelegateMovieProperties[] = [];

    await new PromisePool()
      .withConcurrency(PROCESS_LIMIT)
      .for(chunks)
      .process(async (chunks) => {
        for (const chunk of chunks) {
          const { provider, ...data } = chunk;
          const foundStream = await this.prismaService.movie.findFirst({
            where: {
              id: chunk.id,
              streams: {
                some: {
                  provider: this.redeCanaisProvider.provider,
                  audio: provider.audio,
                  quality: provider.quality,
                },
              },
            },
            include: { genres: true },
          });

          if (foundStream) {
            result.push(foundStream);
            continue;
          }

          const foundMovie = await this.prismaService.movie.findFirst({
            where: { id: chunk.id },
            include: { genres: true },
          });

          if (foundMovie) {
            const updated = await this.prismaService.movie.update({
              where: { id: chunk.id },
              data: {
                streams: {
                  create: {
                    provider: this.redeCanaisProvider.provider,
                    refreshUrl: provider.url,
                    audio: provider.audio,
                    quality: provider.quality,
                    expiresAt: new Date(0),
                  },
                },
              },
              include: { genres: true },
            });

            result.push(updated);
            continue;
          }

          const created = await this.prismaService.movie.create({
            data: {
              ...data,
              genres: {
                connect: data.genres.map((genre) => ({ id: genre.id })),
              },
              streams: {
                create: {
                  provider: this.redeCanaisProvider.provider,
                  refreshUrl: provider.url,
                  audio: provider.audio,
                  quality: provider.quality,
                  expiresAt: new Date(0),
                },
              },
            },
            include: { genres: true },
          });

          result.push(created);
        }
      });

    return result;
  }

  public async saveSeries(
    series: DelegateSeriesStreams[],
  ): Promise<DelegateSeriesProperties[]> {
    const chunks = chunk(series, CONCURRENCY_LIMIT);
    const result: DelegateSeriesProperties[] = [];

    await new PromisePool()
      .withConcurrency(PROCESS_LIMIT)
      .for(chunks)
      .process(async (chunks) => {
        for (const chunk of chunks) {
          const { provider, ...data } = chunk;
          const found = await this.prismaService.series.findFirst({
            where: { id: chunk.id },
            include: { genres: true },
          });

          if (found) {
            result.push(found);
            continue;
          }

          const created = await this.prismaService.series.create({
            data: {
              ...data,
              genres: {
                connect: data.genres.map((genre) => ({ id: genre.id })),
              },
              streams: {
                create: {
                  provider: this.redeCanaisProvider.provider,
                  refreshUrl: provider.url,
                  audio: Audio.UNKNOWN,
                  expiresAt: new Date(0),
                },
              },
            },
            include: { genres: true },
          });

          result.push(created);
        }
      });

    return result;
  }
}
