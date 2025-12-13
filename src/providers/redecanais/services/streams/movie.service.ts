import { PrismaService } from '@/modules/prisma/prisma.service';
import { DelegateMovieProperties } from '@/modules/providers/providers.service';
import { EXPIRES_AT } from '@/providers/redecanais/constants/misc';
import { RedeCanaisMovieSeriesSourcesService } from '@/providers/redecanais/services/sources/movie-series.service';
import { Injectable } from '@nestjs/common';
import { Audio, Quality } from '@prisma/client';

@Injectable()
export class RedeCanaisMovieStreamsService {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly movieSeriesSourcesService: RedeCanaisMovieSeriesSourcesService,
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
      },
    });

    if (!stream) {
      return null;
    }

    if (stream.expiresAt > new Date()) {
      return stream.accessUrl;
    }

    const source = await this.movieSeriesSourcesService.build(
      stream.refreshUrl,
    );

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
