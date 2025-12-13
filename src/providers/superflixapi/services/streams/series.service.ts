import { PrismaService } from '@/modules/prisma/prisma.service';
import { DelegateSeriesProperties } from '@/modules/providers/providers.service';
import { EXPIRES_AT } from '@/providers/superflixapi/constants/misc';
import { SuperflixSeriesSourcesService } from '@/providers/superflixapi/services/sources/series.service';
import { Injectable } from '@nestjs/common';
import { Audio } from '@prisma/client';

@Injectable()
export class SuperflixSeriesStreamsService {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly seriesSourcesService: SuperflixSeriesSourcesService,
  ) {}

  public async getStream(
    series: DelegateSeriesProperties,
    season: number,
    episode: number,
    audio: Audio,
  ): Promise<string> {
    const stream = await this.prismaService.seriesStream.findFirst({
      where: {
        seriesId: series.id,
        season,
        episode,
        audio,
        provider: 'SUPERFLIXAPI',
      },
    });

    if (!stream) {
      // Create new stream entry
      const source = await this.seriesSourcesService.build(
        series.id,
        season + 1, // API uses 1-indexed seasons
        episode + 1, // API uses 1-indexed episodes
      );
      if (!source) {
        return null;
      }

      await this.prismaService.seriesStream.create({
        data: {
          provider: 'SUPERFLIXAPI',
          refreshUrl: `${series.id}/${season}/${episode}`,
          accessUrl: source,
          season,
          episode,
          audio,
          seriesId: series.id,
          expiresAt: EXPIRES_AT(),
        },
      });

      return source;
    }

    if (stream.expiresAt > new Date()) {
      return stream.accessUrl;
    }

    const source = await this.seriesSourcesService.build(
      series.id,
      season + 1,
      episode + 1,
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

  public async getSeasons(
    series: DelegateSeriesProperties,
  ): Promise<{ title: string; tracks: { url: string; audio: Audio }[] }[][]> {
    // For SuperflixAPI, we'll return empty seasons array since we don't have 
    // a dedicated endpoint to fetch all episodes. Episodes are fetched on-demand
    // when the user selects a specific season/episode.
    // The RedeCanais provider has this data from scraping, but SuperflixAPI
    // works differently with direct URL access.
    return [];
  }
}
