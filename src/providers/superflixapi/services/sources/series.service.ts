import { SERIES_URL } from '@/providers/superflixapi/constants/url';
import { SuperflixApiService } from '@/providers/superflixapi/services/api.service';
import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';

@Injectable()
export class SuperflixSeriesSourcesService {
  private readonly logger = new Logger(SuperflixSeriesSourcesService.name);

  public constructor(private readonly apiService: SuperflixApiService) {}

  /**
   * Build a stream URL for a series episode.
   * SuperflixAPI uses TMDB IDs for series, season number and episode number.
   */
  public async build(
    tmdbId: number,
    season: number,
    episode: number,
  ): Promise<string | null> {
    try {
      // SuperflixAPI URL format: /serie/TMDB_ID/SEASON/EPISODE
      const playerUrl = `${SERIES_URL}/${tmdbId}/${season}/${episode}`;
      const streamUrl = await this.extractStreamUrl(playerUrl);

      return streamUrl;
    } catch (error) {
      this.logger.error(`Failed to build series stream URL: ${error.message}`);
      return null;
    }
  }

  private async extractStreamUrl(playerUrl: string): Promise<string | null> {
    try {
      const response = await this.apiService.http.get(playerUrl);
      const $ = cheerio.load(response.data);

      // Look for iframe src or video source
      const iframeSrc = $('iframe').attr('src');
      if (iframeSrc) {
        // Follow the iframe to get the actual video URL
        return await this.extractFromIframe(iframeSrc);
      }

      // Look for direct video sources
      const videoSrc =
        $('video source').attr('src') || $('video').attr('src');
      if (videoSrc) {
        return this.resolveUrl(videoSrc);
      }

      // Look for HLS sources in scripts
      const scripts = $('script')
        .toArray()
        .map((el) => $(el).html())
        .join('\n');

      const hlsMatch = scripts.match(/['"]?(https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/);
      if (hlsMatch) {
        return hlsMatch[1];
      }

      const mp4Match = scripts.match(/['"]?(https?:\/\/[^'"]+\.mp4[^'"]*)['"]/);
      if (mp4Match) {
        return mp4Match[1];
      }

      this.logger.warn(`No stream URL found in player page: ${playerUrl}`);
      return null;
    } catch (error) {
      this.logger.error(`Failed to extract stream URL: ${error.message}`);
      return null;
    }
  }

  private async extractFromIframe(iframeUrl: string): Promise<string | null> {
    try {
      const fullUrl = this.resolveUrl(iframeUrl);
      const response = await this.apiService.http.get(fullUrl, {
        headers: {
          Referer: this.apiService.url,
        },
      });

      const $ = cheerio.load(response.data);
      const scripts = $('script')
        .toArray()
        .map((el) => $(el).html())
        .join('\n');

      // Look for video URLs in the iframe content
      const hlsMatch = scripts.match(/['"]?(https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/);
      if (hlsMatch) {
        return hlsMatch[1];
      }

      const mp4Match = scripts.match(/['"]?(https?:\/\/[^'"]+\.mp4[^'"]*)['"]/);
      if (mp4Match) {
        return mp4Match[1];
      }

      // Look for file parameter
      const fileMatch = scripts.match(/file\s*[:=]\s*['"]([^'"]+)['"]/);
      if (fileMatch) {
        return fileMatch[1];
      }

      // Look for sources array 
      const sourcesMatch = scripts.match(/sources\s*[:=]\s*\[([\s\S]*?)\]/);
      if (sourcesMatch) {
        const urlMatch = sourcesMatch[1].match(/['"]?(https?:\/\/[^'"]+)['"]/);
        if (urlMatch) {
          return urlMatch[1];
        }
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to extract from iframe: ${error.message}`);
      return null;
    }
  }

  private resolveUrl(url: string): string {
    if (url.startsWith('http')) {
      return url;
    }
    if (url.startsWith('//')) {
      return `https:${url}`;
    }
    return `${this.apiService.url}${url.startsWith('/') ? '' : '/'}${url}`;
  }
}
