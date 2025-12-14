import { EnvService } from '@/modules/env/env.service';
import { ProvidersService } from '@/modules/providers/providers.service';
import { ProvidersTrendingService } from '@/modules/providers/services/trending.service';
import { StremioService } from '@/modules/stremio/stremio.service';
import { TmdbService } from '@/modules/tmdb/tmdb.service';
import { ContentType } from '@/modules/tmdb/types/tmdb';
import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Res,
} from '@nestjs/common';
import { MovieStream, SeriesStream } from '@prisma/client';
import { Response } from 'express';

@Controller('/stream')
export class StreamController {
  public constructor(
    private readonly envService: EnvService,
    private readonly providersService: ProvidersService,
    private readonly providersTrendingService: ProvidersTrendingService,
    private readonly stremioService: StremioService,
    private readonly tmdbService: TmdbService,
  ) {}

  @Get('/:category/lumecine:params.json')
  public async getStream(
    @Param('category') category: string,
    @Param('params') params: string,
  ) {
    const [id, season, episode] = params.slice(1).split('.');
    const type =
      this.providersTrendingService.convertStringToContentType(category);

    const coerceId = Number(id);
    const coerceSeason = !Number.isNaN(Number(season)) ? Number(season) : 0;
    const coerceEpisode = !Number.isNaN(Number(episode)) ? Number(episode) : 0;

    if (!type || Number.isNaN(coerceId)) {
      throw new BadRequestException();
    }

    if (type === ContentType.MOVIE) {
      const movie = await this.providersService.getMovie(coerceId);
      const streams = await this.providersService.getMovieStreams(movie);

      return {
        streams: await this.stremioService.getStreams(streams),
      };
    }

    const series = await this.providersService.getSeries(coerceId);
    const streams = await this.providersService.getSeriesStreams(
      series,
      coerceSeason,
      coerceEpisode,
    );

    return {
      streams: await this.stremioService.getStreams(streams),
    };
  }

  /**
   * Handle streams for IMDB IDs (Cinemeta catalog)
   * Format: movie -> tt1234567, series -> tt1234567:1:1 (for S01E01)
   */
  @Get('/:type/:id.json')
  public async getStreamByImdb(
    @Param('type') type: string,
    @Param('id') id: string,
  ) {
    // Skip if not an IMDB ID
    if (!id.startsWith('tt')) {
      return { streams: [] };
    }

    const imdbId = id.split(':')[0]; // For series: tt123:1:1 -> tt123
    const contentType = type === 'movie' ? ContentType.MOVIE : ContentType.TV;

    // Convert IMDB ID to TMDB ID
    const tmdbId = await this.tmdbService.findByImdbId(imdbId, contentType);

    if (!tmdbId) {
      return { streams: [] };
    }

    if (contentType === ContentType.MOVIE) {
      const movie = await this.providersService.getMovie(tmdbId);
      if (!movie) {
        return { streams: [] };
      }
      const streams = await this.providersService.getMovieStreams(movie);
      return { streams: await this.stremioService.getStreams(streams) };
    }

    // For series, extract season/episode from ID (format: tt123:1:1)
    const parts = id.split(':');
    const season = Number.parseInt(parts[1]) || 1;
    const episode = Number.parseInt(parts[2]) || 1;

    const series = await this.providersService.getSeries(tmdbId);
    if (!series) {
      return { streams: [] };
    }
    const streams = await this.providersService.getSeriesStreams(
      series,
      season - 1, // Adjust to 0-indexed
      episode - 1,
    );
    return { streams: await this.stremioService.getStreams(streams) };
  }

  @Get('/watch/:id')
  public async watchStream(@Param('id') id: string, @Res() res: Response) {
    const stream = await this.providersService.getStream(id);

    if (!stream) {
      throw new BadRequestException();
    }

    const asMovie = stream as MovieStream;
    const asSeries = stream as SeriesStream;

    const isMovie = asMovie.movieId;
    const isSeries = asSeries.seriesId;

    if (isMovie) {
      const movie = await this.providersService.getMovie(asMovie.movieId);
      const url = await this.providersService.refreshMovieUrl(
        stream.provider,
        movie,
        asMovie.audio,
        asMovie.quality,
      );

      const proxied = `${this.envService.get('PROXY_URL')}?url=${encodeURIComponent(url)}`;
      return res.status(302).redirect(proxied);
    }

    if (isSeries) {
      const series = await this.providersService.getSeries(asSeries.seriesId);
      const url = await this.providersService.refreshSeriesUrl(
        stream.provider,
        series,
        asSeries.season,
        asSeries.episode,
        asSeries.audio,
      );

      const proxied = `${this.envService.get('PROXY_URL')}?url=${encodeURIComponent(url)}`;
      return res.status(302).redirect(proxied);
    }

    throw new BadRequestException();
  }
}
