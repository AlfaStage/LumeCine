import { TmdbService } from '@/modules/tmdb/tmdb.service';
import { MOVIE_URL } from '@/providers/superflixapi/constants/url';
import { SuperflixApiService } from '@/providers/superflixapi/services/api.service';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SuperflixMovieSourcesService {
  private readonly logger = new Logger(SuperflixMovieSourcesService.name);

  public constructor(
    private readonly apiService: SuperflixApiService,
    private readonly tmdbService: TmdbService,
  ) {}

  /**
   * Build a stream URL for a movie.
   * SuperflixAPI uses IMDB IDs for movies, so we need to fetch the IMDB ID from TMDB first.
   * Returns the direct player URL (like the reference stremio-superflix-addon project).
   */
  public async build(tmdbId: number): Promise<string | null> {
    try {
      // Get IMDB ID from TMDB
      const imdbId = await this.getImdbId(tmdbId);
      if (!imdbId) {
        this.logger.warn(`No IMDB ID found for TMDB ID: ${tmdbId}`);
        return null;
      }

      // Return the direct player URL (Stremio will handle the player)
      const playerUrl = `${this.apiService.url}${MOVIE_URL}/${imdbId}`;
      this.logger.log(`Generated stream URL for TMDB ${tmdbId}: ${playerUrl}`);
      return playerUrl;
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
