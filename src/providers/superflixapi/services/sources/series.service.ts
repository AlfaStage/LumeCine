import { EnvService } from '@/modules/env/env.service';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SuperflixSeriesSourcesService {
  private readonly logger = new Logger(SuperflixSeriesSourcesService.name);

  public constructor(private readonly envService: EnvService) {}

  /**
   * Build a stream URL for a series episode.
   * SuperflixAPI uses TMDB IDs for series, season number and episode number.
   * Returns an embed URL hosted by LumeCine that contains the SuperflixAPI iframe.
   */
  public async build(
    tmdbId: number,
    season: number,
    episode: number,
  ): Promise<string | null> {
    try {
      // Return the LumeCine embed URL (which serves an HTML page with SuperflixAPI iframe)
      const appUrl =
        this.envService.get('APP_URL') || 'https://lumecine.qzz.io';
      const embedUrl = `${appUrl}/stream/embed/series/${tmdbId}/${season}/${episode}`;
      this.logger.log(
        `Generated embed URL for TMDB ${tmdbId} S${season}E${episode}: ${embedUrl}`,
      );
      return embedUrl;
    } catch (error) {
      this.logger.error(`Failed to build series stream URL: ${error.message}`);
      return null;
    }
  }
}
