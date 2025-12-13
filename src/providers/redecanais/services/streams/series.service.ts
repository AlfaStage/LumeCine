import { PrismaService } from '@/modules/prisma/prisma.service';
import { DelegateSeriesProperties } from '@/modules/providers/providers.service';
import { EXPIRES_AT } from '@/providers/redecanais/constants/misc';
import { RedeCanaisProvider } from '@/providers/redecanais/redecanais.provider';
import { RedeCanaisMovieSeriesSourcesService } from '@/providers/redecanais/services/sources/movie-series.service';
import { RedeCanaisSeriesSourcesService } from '@/providers/redecanais/services/sources/series.service';
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { Audio } from '@prisma/client';

@Injectable()
export class RedeCanaisSeriesStreamsService {
  public constructor(
    @Inject(forwardRef(() => RedeCanaisProvider))
    private readonly redeCanaisProvider: RedeCanaisProvider,
    private readonly prismaService: PrismaService,
    private readonly movieSeriesSourcesService: RedeCanaisMovieSeriesSourcesService,
    private readonly redeCanaisSeriesSourcesService: RedeCanaisSeriesSourcesService,
  ) {}

  public async getStream(
    series: DelegateSeriesProperties,
    season: number,
    episode: number,
    audio: Audio,
  ): Promise<string> {
    const seasons = await this.getSeasons(series);
    const episodes = seasons[season][episode];
    const track = episodes.tracks.find((track) => track.audio === audio);

    if (!episodes || !track) {
      return null;
    }

    let stream = await this.prismaService.seriesStream.findFirst({
      where: {
        seriesId: series.id,
        season,
        episode,
        audio,
      },
    });

    if (!stream) {
      stream = await this.prismaService.seriesStream.create({
        data: {
          provider: this.redeCanaisProvider.provider,
          season,
          episode,
          audio,
          refreshUrl: track.url,
          expiresAt: new Date(0),
          seriesId: series.id,
        },
      });
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

    await this.prismaService.seriesStream.update({
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

  public async getSeasons(series: DelegateSeriesProperties) {
    const stream = await this.prismaService.seriesStream.findFirst({
      where: { seriesId: series.id, season: null, episode: null },
    });

    if (!stream) {
      return [];
    }

    const episodes = await this.redeCanaisSeriesSourcesService.build(
      stream.refreshUrl,
    );

    return episodes;
  }
}
