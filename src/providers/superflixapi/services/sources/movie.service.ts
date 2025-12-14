import { EnvService } from '@/modules/env/env.service';
import { TmdbService } from '@/modules/tmdb/tmdb.service';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SuperflixMovieSourcesService {
  private readonly logger = new Logger(SuperflixMovieSourcesService.name);

  public constructor(
    private readonly envService: EnvService,
    private readonly tmdbService: TmdbService,
  ) {}

  /**
   * Build a stream URL for a movie.
   * SuperflixAPI uses IMDB IDs for movies, so we need to fetch the IMDB ID from TMDB first.
   * Returns an embed URL hosted by LumeCine that contains the SuperflixAPI iframe.
   */
  public async build(tmdbId: number): Promise<string | null> {
    try {
      // Get IMDB ID from TMDB
      const imdbId = await this.getImdbId(tmdbId);
      if (!imdbId) {
        this.logger.warn(`No IMDB ID found for TMDB ID: ${tmdbId}`);
        return null;
      }

      // Return the LumeCine embed URL (which serves an HTML page with SuperflixAPI iframe)
      const appUrl =
        this.envService.get('APP_URL') || 'https://lumecine.qzz.io';
      const embedUrl = `${appUrl}/stream/embed/movie/${imdbId}`;
      this.logger.log(`Generated embed URL for TMDB ${tmdbId}: ${embedUrl}`);
      return embedUrl;
    } catch (error) {
      this.logger.error(`Failed to build movie stream URL: ${error.message}`);
      return null;
    }
  }

  private async getImdbId(tmdbId: number): Promise<string | null> {
    try {
      // Use TMDB API to get external IDs
      const response = await this.tmdbService.getMovieExternalIds(tmdbId);
      return response?.imdb_id ?? null;
    } catch (error) {
      this.logger.error(`Failed to get IMDB ID from TMDB: ${error.message}`);
      return null;
    }
  }
}
