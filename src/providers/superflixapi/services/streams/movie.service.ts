import { PrismaService } from '@/modules/prisma/prisma.service';
import { DelegateMovieProperties } from '@/modules/providers/providers.service';
import { EXPIRES_AT } from '@/providers/superflixapi/constants/misc';
import { SuperflixMovieSourcesService } from '@/providers/superflixapi/services/sources/movie.service';
import { Injectable } from '@nestjs/common';
import { Audio, Quality } from '@prisma/client';

@Injectable()
export class SuperflixMovieStreamsService {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly movieSourcesService: SuperflixMovieSourcesService,
  ) {}

  public async getStream(
    movie: DelegateMovieProperties,
    audio: Audio,
    quality: Quality,
  ): Promise<string> {
    const stream = await this.prismaService.movieStream.findFirst({
      where: {
        movieId: movie.id,
        audio,
        quality,
        provider: 'SUPERFLIXAPI',
      },
    });

    if (!stream) {
      // Create new stream entry
      const source = await this.movieSourcesService.build(movie.id);
      if (!source) {
        return null;
      }

      await this.prismaService.movieStream.create({
        data: {
          provider: 'SUPERFLIXAPI',
          refreshUrl: String(movie.id),
          accessUrl: source,
          audio,
          quality,
          movieId: movie.id,
          expiresAt: EXPIRES_AT(),
        },
      });

      return source;
    }

    if (stream.expiresAt > new Date()) {
      return stream.accessUrl;
    }

    const source = await this.movieSourcesService.build(movie.id);

    if (!source) {
      return null;
    }

    await this.prismaService.movieStream.update({
      where: {
        id: stream.id,
      },
      data: {
        accessUrl: source,
        expiresAt: EXPIRES_AT(),
      },
    });

    return source;
  }
}
