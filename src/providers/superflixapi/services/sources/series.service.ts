import { SERIES_URL } from '@/providers/superflixapi/constants/url';
import { SuperflixApiService } from '@/providers/superflixapi/services/api.service';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SuperflixSeriesSourcesService {
  private readonly logger = new Logger(SuperflixSeriesSourcesService.name);

  public constructor(private readonly apiService: SuperflixApiService) {}

  /**
   * Build a stream URL for a series episode.
   * SuperflixAPI uses TMDB IDs for series, season number and episode number.
   * Returns the direct player URL (like the reference stremio-superflix-addon project).
   */
  public async build(
    tmdbId: number,
    season: number,
    episode: number,
  ): Promise<string | null> {
    try {
      // Return the direct player URL (Stremio will handle the player)
      // SuperflixAPI URL format: /serie/TMDB_ID/SEASON/EPISODE
      const playerUrl = `${this.apiService.url}${SERIES_URL}/${tmdbId}/${season}/${episode}`;
      this.logger.log(
        `Generated stream URL for TMDB ${tmdbId} S${season}E${episode}: ${playerUrl}`,
      );
      return playerUrl;
    } catch (error) {
      this.logger.error(`Failed to build series stream URL: ${error.message}`);
      return null;
    }
  }
}
